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
  }
}

type Recipient = {
  input_id?: string
  auth_user_id: string | null
  member_id: string | null
  status?: string | null
  source: 'auth_user' | 'member' | 'system'
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

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('notification-dispatch configuration missing', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(anonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      })
      return jsonResponse({ error: 'Benachrichtigungen sind aktuell nicht verfuegbar.' }, 500)
    }

    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
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

    const {
      data: { user },
      error: userError,
    } = await userClient.auth!.getUser!()

    if (userError || !user) {
      return jsonResponse({ error: 'Nicht angemeldet.' }, 401)
    }

    const body = await readJsonBody(req)
    const validation = validateDispatchPayload(body)
    if (!validation.ok) return jsonResponse({ error: validation.error }, validation.status)

    const payload = validation.value
    const canCreateCommunication = await hasPermission(userClient, 'kommunikation', 'create')
    const resolvedRecipientsResult = await resolveRecipients(adminClient, payload)

    if (resolvedRecipientsResult.error) {
      return jsonResponse({ error: resolvedRecipientsResult.error }, resolvedRecipientsResult.status)
    }

    const recipients = resolvedRecipientsResult.recipients

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

    const rateLimitResult = await checkRateLimit(adminClient, user.id)
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
      userId: user.id,
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

    const deliveryResult = await deliverInApp(adminClient, {
      jobId: jobInsert.job.id,
      payload,
      recipients,
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
      .select('id, auth_user_id, status')
      .eq('status', 'aktiv')
      .not('auth_user_id', 'is', null)
      .limit(MAX_SYSTEM_RECIPIENTS)

    if (error) return { error: 'Empfaenger konnten nicht geladen werden.', status: 500, recipients: [] }

    return {
      recipients: dedupeRecipients((data || []).map((member: any) => ({
        auth_user_id: member.auth_user_id,
        member_id: member.id,
        status: member.status,
        source: 'system',
      }))),
    }
  }

  const recipients: Recipient[] = []

  if (payload.recipientUserIds.length > 0) {
    const { data, error } = await adminClient
      .from('members')
      .select('id, auth_user_id, status')
      .in('auth_user_id', payload.recipientUserIds)

    if (error) return { error: 'Empfaenger konnten nicht geladen werden.', status: 500, recipients: [] }

    const memberByAuthUserId = new Map((data || []).map((member: any) => [member.auth_user_id, member]))

    for (const userId of payload.recipientUserIds) {
      const member = memberByAuthUserId.get(userId)
      recipients.push({
        input_id: userId,
        auth_user_id: userId,
        member_id: member?.id || null,
        status: member?.status || null,
        source: 'auth_user',
      })
    }
  }

  if (payload.recipientMemberIds.length > 0) {
    const { data, error } = await adminClient
      .from('members')
      .select('id, auth_user_id, status')
      .in('id', payload.recipientMemberIds)

    if (error) return { error: 'Empfaenger konnten nicht geladen werden.', status: 500, recipients: [] }

    const memberById = new Map((data || []).map((member: any) => [member.id, member]))

    for (const memberId of payload.recipientMemberIds) {
      const member = memberById.get(memberId)
      recipients.push({
        input_id: memberId,
        auth_user_id: member?.auth_user_id || null,
        member_id: member?.id || memberId,
        status: member?.status || null,
        source: 'member',
      })
    }
  }

  return { recipients: dedupeRecipients(recipients) }
}

async function deliverInApp(adminClient: SupabaseClientLike, { jobId, payload, recipients }: { jobId: string; payload: any; recipients: Recipient[] }) {
  let deliveredCount = 0
  let skippedCount = 0
  let failedCount = 0
  const preferences = await loadPreferences(adminClient, payload, recipients)

  for (const recipient of recipients) {
    const preference = getPreferenceForRecipient(preferences, recipient)
    const decision = shouldDeliverInApp({ payload, recipient, preference })

    if (!decision.deliver) {
      skippedCount += 1
      await writeLog(adminClient, {
        jobId,
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
          recipient,
          status: 'skipped',
          errorCode: 'duplicate',
        })
        continue
      }

      failedCount += 1
      await writeLog(adminClient, {
        jobId,
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

async function loadPreferences(adminClient: SupabaseClientLike, payload: any, recipients: Recipient[]) {
  const authUserIds = recipients.map((recipient) => recipient.auth_user_id).filter(Boolean)
  const memberIds = recipients.map((recipient) => recipient.member_id).filter(Boolean)

  if (authUserIds.length === 0 && memberIds.length === 0) return []

  let query = adminClient
    .from('notification_preferences')
    .select('auth_user_id, member_id, notification_type, channel, enabled, required')
    .eq('notification_type', payload.type)
    .eq('channel', 'in_app')

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

async function writeLog(adminClient: SupabaseClientLike, { jobId, recipient, status, errorCode, errorMessage }: {
  jobId: string
  recipient: Recipient
  status: 'delivered' | 'skipped' | 'failed'
  errorCode?: string | null
  errorMessage?: string | null
}) {
  const payload = {
    job_id: jobId,
    channel: 'in_app',
    member_id: recipient.member_id,
    auth_user_id: recipient.auth_user_id,
    status,
    error_code: errorCode || null,
    error_message: sanitizeLogErrorMessage(errorMessage || errorCode || null),
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

async function createJob(adminClient: SupabaseClientLike, { payload, userId, recipients, idempotencyKey }: {
  payload: any
  userId: string
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
      recipient_count: recipients.length,
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
