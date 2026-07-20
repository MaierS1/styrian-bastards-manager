import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildStableIdempotencyKey,
  buildTargetPayload,
  buildTargetType,
  MAX_SYSTEM_RECIPIENTS,
  requiresCommunicationCreate,
  validateDispatchPayload,
} from './validation.js'
import {
  calculateJobStatus,
  createResponseSummary,
  dedupeRecipients,
  sanitizeLogErrorMessage,
  shouldDeliverInApp,
} from './engineCore.js'
import {
  buildNotificationEmail,
  maskEmail,
  MAX_EMAIL_RECIPIENTS,
  normalizeEmail,
  sendEmailWithResend,
  shouldDeliverEmail,
} from './emailAdapter.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type SupabaseClientLike = {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>
  auth?: {
    getUser?: () => Promise<{ data: { user: { id: string; email?: string } | null }; error: Error | null }>
    admin?: {
      getUserById?: (id: string) => Promise<{ data: { user: { id: string; email?: string } | null }; error: Error | null }>
    }
  }
}

type Recipient = {
  input_id?: string
  auth_user_id: string | null
  member_id: string | null
  event_registration_id?: string | null
  email?: string | null
  status?: string | null
  source: 'auth_user' | 'member' | 'system' | 'event_registration'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Nur POST ist erlaubt.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const internalNotificationSecret = Deno.env.get('INTERNAL_NOTIFICATION_SECRET') || ''
    const emailConfig = {
      resendApiKey: Deno.env.get('RESEND_API_KEY') || '',
      fromEmail: Deno.env.get('FROM_EMAIL') || 'Styrian Bastards <mail@styrian-bastards.at>',
      replyToEmail: Deno.env.get('REPLY_TO_EMAIL') || '',
      appPublicUrl: Deno.env.get('APP_PUBLIC_URL') || '',
    }

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('notification-dispatch configuration missing', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(anonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      })
      return jsonResponse({ error: 'Benachrichtigungen sind aktuell nicht verfuegbar.' }, 500)
    }

    const authHeader = req.headers.get('Authorization') || ''
    const internalHeader = req.headers.get('x-internal-notification-secret') || ''
    const internalActorUserId = req.headers.get('x-internal-actor-user-id') || ''
    const isInternalRequest = Boolean(internalNotificationSecret && internalHeader === internalNotificationSecret)

    if (!isInternalRequest && !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Nicht angemeldet.' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    }) as SupabaseClientLike

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as SupabaseClientLike

    let user: { id: string; email?: string } | null = null

    if (isInternalRequest) {
      user = isUuid(internalActorUserId) ? { id: internalActorUserId } : null
    } else {
      const {
        data: { user: authenticatedUser },
        error: userError,
      } = await userClient.auth!.getUser!()

      if (userError || !authenticatedUser) {
        return jsonResponse({ error: 'Nicht angemeldet.' }, 401)
      }

      user = authenticatedUser
    }

    const body = await readJsonBody(req)
    const validation = validateDispatchPayload(body)
    if (!validation.ok) return jsonResponse({ error: validation.error }, validation.status)

    const payload = validation.value
    if (payload.recipientEventRegistrationIds.length > 0 && !isInternalRequest) {
      return jsonResponse({ error: 'Event-Registrierungsempfaenger sind nur fuer interne Fachadapter erlaubt.' }, 403)
    }

    const canCreateCommunication = isInternalRequest
      ? true
      : await hasPermission(userClient, 'kommunikation', 'create')
    const resolvedRecipientsResult = await resolveRecipients(adminClient, payload)

    if (resolvedRecipientsResult.error) {
      return jsonResponse({ error: resolvedRecipientsResult.error }, resolvedRecipientsResult.status)
    }

    const recipients = resolvedRecipientsResult.recipients
    if (payload.channels.includes('email') && recipients.length > MAX_EMAIL_RECIPIENTS) {
      return jsonResponse({ error: 'Zu viele E-Mail-Empfaenger fuer synchronen Versand.' }, 429)
    }

    if (requiresCommunicationCreate(payload) && !canCreateCommunication) {
      return jsonResponse({ error: 'Keine Berechtigung fuer administrative Kommunikation.' }, 403)
    }

    if (!requiresCommunicationCreate(payload) && !canCreateCommunication) {
      const allowed = recipients.every((recipient) => (
        recipient.auth_user_id === user.id
        || (recipient.member_id && recipient.auth_user_id === user.id)
      ))

      if (!allowed) {
        return jsonResponse({ error: 'Keine Berechtigung fuer diese Benachrichtigung.' }, 403)
      }
    }

    const rateLimitResult = user?.id
      ? await checkRateLimit(adminClient, user.id)
      : { ok: true }
    if (!rateLimitResult.ok) return jsonResponse({ error: rateLimitResult.error }, 429)

    const idempotencyKey = payload.idempotencyKey || buildStableIdempotencyKey(payload)
    const existingJob = await findExistingJob(adminClient, idempotencyKey)
    if (existingJob.error) {
      return jsonResponse({ error: 'Idempotenz konnte nicht geprueft werden.' }, 500)
    }

    if (existingJob.data) {
      return jsonResponse(createResponseSummary({
        jobId: existingJob.data.id,
        existing: true,
        recipientCount: Number(existingJob.data.recipient_count || 0),
        deliveredCount: Number(existingJob.data.success_count || 0),
        skippedCount: Number(existingJob.data.skipped_count || 0),
        failedCount: Number(existingJob.data.failure_count || 0),
      }))
    }

    const jobInsert = await createJob(adminClient, {
      payload,
      userId: user?.id || null,
      recipients,
      idempotencyKey,
    })

    if (jobInsert.duplicateJob) {
      return jsonResponse(createResponseSummary({
        jobId: jobInsert.duplicateJob.id,
        existing: true,
        recipientCount: Number(jobInsert.duplicateJob.recipient_count || 0),
        deliveredCount: Number(jobInsert.duplicateJob.success_count || 0),
        skippedCount: Number(jobInsert.duplicateJob.skipped_count || 0),
        failedCount: Number(jobInsert.duplicateJob.failure_count || 0),
      }))
    }

    if (jobInsert.error || !jobInsert.job) {
      console.error('notification-dispatch job insert failed', { error: jobInsert.error?.message })
      return jsonResponse({ error: 'Benachrichtigungsjob konnte nicht erstellt werden.' }, 500)
    }

    const deliveryResult = await deliverNotifications(adminClient, {
      jobId: jobInsert.job.id,
      payload,
      recipients,
      emailConfig,
    })

    const jobStatus = calculateJobStatus({
      deliveredCount: deliveryResult.deliveredCount,
      skippedCount: deliveryResult.skippedCount,
      failedCount: deliveryResult.failedCount,
      recipientCount: deliveryResult.recipientCount,
    })

    const { error: updateError } = await adminClient
      .from('notification_jobs')
      .update({
        status: jobStatus,
        finished_at: new Date().toISOString(),
        recipient_count: deliveryResult.recipientCount,
        success_count: deliveryResult.deliveredCount,
        skipped_count: deliveryResult.skippedCount,
        failure_count: deliveryResult.failedCount,
        error: deliveryResult.failedCount > 0 ? 'Einzelne Zustellungen fehlgeschlagen.' : null,
      })
      .eq('id', jobInsert.job.id)

    if (updateError) {
      console.error('notification-dispatch job update failed', {
        jobId: jobInsert.job.id,
        error: updateError.message,
      })
    }

    return jsonResponse(createResponseSummary({
      jobId: jobInsert.job.id,
      existing: false,
      recipientCount: deliveryResult.recipientCount,
      deliveredCount: deliveryResult.deliveredCount,
      skippedCount: deliveryResult.skippedCount,
      failedCount: deliveryResult.failedCount,
    }))
  } catch (error) {
    console.error('notification-dispatch unexpected failure', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return jsonResponse({ error: 'Interner Fehler beim Benachrichtigungsversand.' }, 500)
  }
})

async function resolveRecipients(adminClient: SupabaseClientLike, payload: any) {
  if (payload.systemWide) {
    const { count, error: countError } = await adminClient
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aktiv')
      .not('auth_user_id', 'is', null)

    if (countError) return { error: 'Empfaenger konnten nicht geladen werden.', status: 500, recipients: [] }
    if (Number(count || 0) > MAX_SYSTEM_RECIPIENTS) {
      return { error: 'Zu viele Empfaenger fuer eine systemweite Benachrichtigung.', status: 429, recipients: [] }
    }

    const { data, error } = await adminClient
      .from('members')
      .select('id, auth_user_id, email, status')
      .eq('status', 'aktiv')
      .not('auth_user_id', 'is', null)
      .limit(MAX_SYSTEM_RECIPIENTS)

    if (error) return { error: 'Empfaenger konnten nicht geladen werden.', status: 500, recipients: [] }

    return {
      recipients: dedupeRecipients((data || []).map((member: any) => ({
        auth_user_id: member.auth_user_id,
        member_id: member.id,
        email: member.email || null,
        status: member.status,
        source: 'system',
      }))),
    }
  }

  const recipients: Recipient[] = []

  if (payload.recipientUserIds.length > 0) {
    const { data, error } = await adminClient
      .from('members')
      .select('id, auth_user_id, email, status')
      .in('auth_user_id', payload.recipientUserIds)

    if (error) return { error: 'Empfaenger konnten nicht geladen werden.', status: 500, recipients: [] }

    const memberByAuthUserId = new Map((data || []).map((member: any) => [member.auth_user_id, member]))
    const missingAuthUserIds = payload.recipientUserIds.filter((userId: string) => !memberByAuthUserId.has(userId))
    const authEmailByUserId = await loadAuthEmails(adminClient, missingAuthUserIds)

    for (const userId of payload.recipientUserIds) {
      const member = memberByAuthUserId.get(userId)
      recipients.push({
        input_id: userId,
        auth_user_id: userId,
        member_id: member?.id || null,
        email: member?.email || authEmailByUserId.get(userId) || null,
        status: member?.status || null,
        source: 'auth_user',
      })
    }
  }

  if (payload.recipientMemberIds.length > 0) {
    const { data, error } = await adminClient
      .from('members')
      .select('id, auth_user_id, email, status')
      .in('id', payload.recipientMemberIds)

    if (error) return { error: 'Empfaenger konnten nicht geladen werden.', status: 500, recipients: [] }

    const memberById = new Map((data || []).map((member: any) => [member.id, member]))

    for (const memberId of payload.recipientMemberIds) {
      const member = memberById.get(memberId)
      recipients.push({
        input_id: memberId,
        auth_user_id: member?.auth_user_id || null,
        member_id: member?.id || memberId,
        email: member?.email || null,
        status: member?.status || null,
        source: 'member',
      })
    }
  }

  if (payload.recipientEventRegistrationIds.length > 0) {
    const { data, error } = await adminClient
      .from('event_registrations')
      .select('id, event_id, email, status')
      .in('id', payload.recipientEventRegistrationIds)

    if (error) return { error: 'Event-Empfaenger konnten nicht geladen werden.', status: 500, recipients: [] }

    const registrationById = new Map((data || []).map((registration: any) => [registration.id, registration]))
    const emails = [...new Set((data || [])
      .map((registration: any) => normalizeEmail(registration.email))
      .filter(Boolean))]
    const memberByEmail = await loadMembersByEmail(adminClient, emails)

    for (const registrationId of payload.recipientEventRegistrationIds) {
      const registration = registrationById.get(registrationId)
      const normalizedEmail = normalizeEmail(registration?.email)
      const member = normalizedEmail ? memberByEmail.get(normalizedEmail) : null
      recipients.push({
        input_id: registrationId,
        auth_user_id: member?.auth_user_id || null,
        member_id: member?.id || null,
        event_registration_id: registration?.id || registrationId,
        email: registration?.email || null,
        status: member?.status || null,
        source: 'event_registration',
      })
    }
  }

  return { recipients: dedupeRecipients(recipients) }
}

async function loadMembersByEmail(adminClient: SupabaseClientLike, emails: string[]) {
  const result = new Map<string, any>()
  if (emails.length === 0) return result

  const { data, error } = await adminClient
    .from('members')
    .select('id, auth_user_id, email, status')
    .in('email', emails)

  if (error) {
    console.error('notification-dispatch member email lookup failed', { error: error.message })
    return result
  }

  for (const member of data || []) {
    const email = normalizeEmail(member.email)
    if (email && !result.has(email)) result.set(email, member)
  }

  return result
}

async function loadAuthEmails(adminClient: SupabaseClientLike, authUserIds: string[]) {
  const result = new Map<string, string>()

  for (const authUserId of authUserIds) {
    const response = await adminClient.auth?.admin?.getUserById?.(authUserId)
    if (!response) continue

    const { data, error } = response
    if (error) {
      console.error('notification-dispatch auth email lookup failed', {
        authUserId,
        error: error.message,
      })
      continue
    }

    if (data?.user?.email) result.set(authUserId, data.user.email)
  }

  return result
}

async function deliverNotifications(adminClient: SupabaseClientLike, { jobId, payload, recipients, emailConfig }: {
  jobId: string
  payload: any
  recipients: Recipient[]
  emailConfig: {
    resendApiKey: string
    fromEmail: string
    replyToEmail: string
    appPublicUrl: string
  }
}) {
  const totals = {
    recipientCount: recipients.length * payload.channels.length,
    deliveredCount: 0,
    skippedCount: 0,
    failedCount: 0,
  }

  if (payload.channels.includes('in_app')) {
    const result = await deliverInApp(adminClient, { jobId, payload, recipients })
    totals.deliveredCount += result.deliveredCount
    totals.skippedCount += result.skippedCount
    totals.failedCount += result.failedCount
  }

  if (payload.channels.includes('email')) {
    const result = await deliverEmail(adminClient, { jobId, payload, recipients, emailConfig })
    totals.deliveredCount += result.deliveredCount
    totals.skippedCount += result.skippedCount
    totals.failedCount += result.failedCount
  }

  return totals
}

async function deliverInApp(adminClient: SupabaseClientLike, { jobId, payload, recipients }: { jobId: string; payload: any; recipients: Recipient[] }) {
  let deliveredCount = 0
  let skippedCount = 0
  let failedCount = 0
  const preferences = await loadPreferences(adminClient, payload, recipients, 'in_app')

  for (const recipient of recipients) {
    const preference = getPreferenceForRecipient(preferences, recipient)
    const decision = shouldDeliverInApp({ payload, recipient, preference })

    if (!decision.deliver) {
      skippedCount += 1
      await writeLog(adminClient, {
        jobId,
        channel: 'in_app',
        recipient,
        status: 'skipped',
        errorCode: decision.errorCode,
      })
      continue
    }

    const { error } = await adminClient
      .from('in_app_notifications')
      .insert({
        job_id: jobId,
        auth_user_id: recipient.auth_user_id,
        member_id: recipient.member_id,
        type: payload.type,
        category: payload.category,
        title: payload.title,
        body: payload.message,
        url: payload.url,
        data: {
          priority: payload.priority,
          source: payload.source,
          metadata: payload.metadata,
        },
      })

    if (error) {
      if (isDuplicateError(error)) {
        skippedCount += 1
        await writeLog(adminClient, {
          jobId,
          channel: 'in_app',
          recipient,
          status: 'skipped',
          errorCode: 'duplicate_delivery',
        })
        continue
      }

      failedCount += 1
      await writeLog(adminClient, {
        jobId,
        channel: 'in_app',
        recipient,
        status: 'failed',
        errorCode: 'in_app_insert_failed',
        errorMessage: error.message,
      })
      continue
    }

    deliveredCount += 1
    await writeLog(adminClient, {
      jobId,
      channel: 'in_app',
      recipient,
      status: 'delivered',
    })
  }

  return {
    recipientCount: recipients.length,
    deliveredCount,
    skippedCount,
    failedCount,
  }
}

async function deliverEmail(adminClient: SupabaseClientLike, { jobId, payload, recipients, emailConfig }: {
  jobId: string
  payload: any
  recipients: Recipient[]
  emailConfig: {
    resendApiKey: string
    fromEmail: string
    replyToEmail: string
    appPublicUrl: string
  }
}) {
  let deliveredCount = 0
  let skippedCount = 0
  let failedCount = 0
  const preferences = await loadPreferences(adminClient, payload, recipients, 'email')
  const seenEmailAddresses = new Set<string>()

  for (const recipient of recipients) {
    const existingDelivered = await hasDeliveredLog(adminClient, jobId, recipient, 'email')
    if (existingDelivered) {
      skippedCount += 1
      await writeLog(adminClient, {
        jobId,
        channel: 'email',
        recipient,
        status: 'skipped',
        errorCode: 'duplicate_delivery',
      })
      continue
    }

    const normalizedEmail = normalizeEmail(recipient.email)
    if (normalizedEmail && seenEmailAddresses.has(normalizedEmail)) {
      skippedCount += 1
      await writeLog(adminClient, {
        jobId,
        channel: 'email',
        recipient,
        status: 'skipped',
        errorCode: 'duplicate_delivery',
        emailMasked: maskEmail(normalizedEmail),
      })
      continue
    }

    if (normalizedEmail) seenEmailAddresses.add(normalizedEmail)

    const preference = getPreferenceForRecipient(preferences, recipient)
    const decision = shouldDeliverEmail({ payload, recipient, preference })

    if (!decision.deliver) {
      skippedCount += 1
      await writeLog(adminClient, {
        jobId,
        channel: 'email',
        recipient,
        status: 'skipped',
        errorCode: decision.errorCode,
        emailMasked: maskEmail(recipient.email),
      })
      continue
    }

    const email = buildNotificationEmail({
      payload,
      appPublicUrl: emailConfig.appPublicUrl,
    })

    try {
      const result = await sendEmailWithResend({
        resendApiKey: emailConfig.resendApiKey,
        fromEmail: emailConfig.fromEmail,
        replyToEmail: emailConfig.replyToEmail,
        to: normalizedEmail,
        email,
        idempotencyKey: `${jobId}:email:${recipient.auth_user_id || recipient.member_id || normalizedEmail}`,
      })

      if (!result.ok) {
        failedCount += 1
        await writeLog(adminClient, {
          jobId,
          channel: 'email',
          recipient,
          status: 'failed',
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          emailMasked: maskEmail(normalizedEmail),
          httpStatus: result.status,
          providerResponse: result.providerResponse,
        })
        continue
      }

      deliveredCount += 1
      await writeLog(adminClient, {
        jobId,
        channel: 'email',
        recipient,
        status: 'delivered',
        emailMasked: maskEmail(normalizedEmail),
        providerResponse: {
          resend_message_id: result.messageId,
        },
      })
    } catch (error) {
      failedCount += 1
      await writeLog(adminClient, {
        jobId,
        channel: 'email',
        recipient,
        status: 'failed',
        errorCode: 'email_send_failed',
        errorMessage: error instanceof Error ? error.message : 'email_send_failed',
        emailMasked: maskEmail(normalizedEmail),
      })
    }
  }

  return {
    recipientCount: recipients.length,
    deliveredCount,
    skippedCount,
    failedCount,
  }
}

async function loadPreferences(adminClient: SupabaseClientLike, payload: any, recipients: Recipient[], channel: 'in_app' | 'email') {
  const authUserIds = recipients.map((recipient) => recipient.auth_user_id).filter(Boolean)
  const memberIds = recipients.map((recipient) => recipient.member_id).filter(Boolean)

  if (authUserIds.length === 0 && memberIds.length === 0) return []

  let query = adminClient
    .from('notification_preferences')
    .select('auth_user_id, member_id, notification_type, channel, enabled, required')
    .eq('notification_type', payload.type)
    .eq('channel', channel)

  const filters = []
  if (authUserIds.length > 0) filters.push(`auth_user_id.in.(${authUserIds.join(',')})`)
  if (memberIds.length > 0) filters.push(`member_id.in.(${memberIds.join(',')})`)
  query = query.or(filters.join(','))

  const { data, error } = await query
  if (error) {
    console.error('notification-dispatch preferences failed', { error: error.message })
    return []
  }

  return data || []
}

function getPreferenceForRecipient(preferences: any[], recipient: Recipient) {
  return preferences.find((item) => item.auth_user_id && item.auth_user_id === recipient.auth_user_id)
    || preferences.find((item) => item.member_id && item.member_id === recipient.member_id)
    || null
}

async function writeLog(adminClient: SupabaseClientLike, { jobId, channel, recipient, status, errorCode, errorMessage, emailMasked, httpStatus, providerResponse }: {
  jobId: string
  channel: 'in_app' | 'email'
  recipient: Recipient
  status: 'delivered' | 'skipped' | 'failed'
  errorCode?: string | null
  errorMessage?: string | null
  emailMasked?: string | null
  httpStatus?: number | null
  providerResponse?: Record<string, unknown> | null
}) {
  const payload = {
    job_id: jobId,
    channel,
    member_id: recipient.member_id,
    auth_user_id: recipient.auth_user_id,
    event_registration_id: recipient.event_registration_id || null,
    email: emailMasked || null,
    status,
    http_status: httpStatus || null,
    error_code: errorCode || null,
    error_message: sanitizeLogErrorMessage(errorMessage || errorCode || null),
    provider_response: providerResponse || null,
    attempt_count: 1,
    last_attempt_at: new Date().toISOString(),
    sent_at: status === 'delivered' ? new Date().toISOString() : null,
  }

  const { error } = await adminClient
    .from('notification_logs')
    .insert(payload)

  if (error && !isDuplicateError(error)) {
    console.error('notification-dispatch log insert failed', {
      jobId,
      status,
      error: error.message,
    })
  }
}

async function hasDeliveredLog(adminClient: SupabaseClientLike, jobId: string, recipient: Recipient, channel: 'in_app' | 'email') {
  let query = adminClient
    .from('notification_logs')
    .select('id')
    .eq('job_id', jobId)
    .eq('channel', channel)
    .eq('status', 'delivered')
    .limit(1)

  if (recipient.auth_user_id) {
    query = query.eq('auth_user_id', recipient.auth_user_id)
  } else if (recipient.member_id) {
    query = query.eq('member_id', recipient.member_id)
  } else if (recipient.event_registration_id) {
    query = query.eq('event_registration_id', recipient.event_registration_id)
  } else {
    return false
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('notification-dispatch delivered-log lookup failed', {
      jobId,
      channel,
      error: error.message,
    })
    return false
  }

  return Boolean(data)
}

async function createJob(adminClient: SupabaseClientLike, { payload, userId, recipients, idempotencyKey }: {
  payload: any
  userId: string | null
  recipients: Recipient[]
  idempotencyKey: string
}) {
  const now = new Date().toISOString()
  const { data, error } = await adminClient
    .from('notification_jobs')
    .insert({
      type: payload.type,
      category: payload.category,
      title: payload.title,
      body: payload.message,
      channels: payload.channels,
      target_type: buildTargetType(payload),
      target_payload: buildTargetPayload(payload),
      source_table: payload.source.entity_type || null,
      source_id: isUuid(payload.source.entity_id) ? payload.source.entity_id : null,
      source_module: payload.source.module || null,
      source_entity_type: payload.source.entity_type || null,
      source_entity_id: payload.source.entity_id || null,
      payload: {
        priority: payload.priority,
        url: payload.url,
        metadata: payload.metadata,
      },
      priority: payload.priority,
      status: 'processing',
      scheduled_at: payload.scheduledAt,
      started_at: now,
      created_by: userId,
      recipient_count: recipients.length * payload.channels.length,
      idempotency_key: idempotencyKey,
    })
    .select('id, recipient_count, success_count, skipped_count, failure_count')
    .single()

  if (isDuplicateError(error)) {
    const existingJob = await findExistingJob(adminClient, idempotencyKey)
    return { duplicateJob: existingJob.data || null, error: existingJob.error }
  }

  return { job: data || null, error }
}

async function findExistingJob(adminClient: SupabaseClientLike, idempotencyKey: string) {
  return adminClient
    .from('notification_jobs')
    .select('id, recipient_count, success_count, skipped_count, failure_count')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
}

async function checkRateLimit(adminClient: SupabaseClientLike, userId: string) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count, error } = await adminClient
    .from('notification_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .gte('created_at', since)

  if (error) {
    console.error('notification-dispatch rate limit failed', { error: error.message })
    return { ok: true }
  }

  if (Number(count || 0) >= 30) {
    return { ok: false, error: 'Zu viele Benachrichtigungsanfragen.' }
  }

  return { ok: true }
}

async function hasPermission(client: SupabaseClientLike, module: string, action: string) {
  const { data, error } = await client.rpc('has_app_permission', {
    p_module: module,
    p_action: action,
  })

  return !error && data === true
}

async function readJsonBody(req: Request) {
  try {
    return await req.json()
  } catch {
    return null
  }
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function isDuplicateError(error: unknown) {
  return Boolean(error)
    && (
      (error as { code?: string }).code === '23505'
      || String((error as { message?: string }).message || '').includes('duplicate key')
    )
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
