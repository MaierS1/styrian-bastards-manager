import { createClient } from 'npm:@supabase/supabase-js@2'
import postgres from 'npm:postgres@3.4.7'
import {
  ACTIONS,
  API_VERSION,
  DIAGNOSTIC_STORAGE_BUCKETS,
  DOMAIN_CONFIG,
  DOMAINS,
  MIGRATION_STORAGE_BUCKETS,
  RELATED_TABLES,
  RPCS_AND_VIEWS,
  SCHEMA_TABLES,
  SECRET_HEADER,
  STORAGE_COLUMN_BUCKETS,
  STORAGE_BUCKETS,
  V1_SOURCE_VERSION,
  nextCursor,
  parseCursor,
  parseLimit,
  stableJson,
  toCents,
  validateAction,
  validateBucket,
  validateDomain,
} from './core.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': `authorization, x-client-info, apikey, content-type, ${SECRET_HEADER}, x-request-id`,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type SupabaseClientLike = {
  from: (table: string) => any
  storage: {
    from: (bucket: string) => {
      list: (path?: string, options?: Record<string, unknown>) => Promise<{ data: unknown[] | null; error: Error | null }>
      createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl?: string } | null; error: Error | null }>
    }
    listBuckets: () => Promise<{ data: Array<{ id: string; name: string; public?: boolean }> | null; error: Error | null }>
  }
}

type AuditPayload = {
  action: string
  domain?: string | null
  count?: number | null
  requestId: string
  success: boolean
  errorCode?: string | null
}

const rateBuckets = new Map<string, { windowStarted: number; count: number }>()
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 240

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405)
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  let action = 'unknown'
  let domain: string | null = null
  let adminClient: SupabaseClientLike | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const migrationSecret = Deno.env.get('V1_MIGRATION_READ_SECRET') || ''
    const providedSecret = req.headers.get(SECRET_HEADER) || ''

    if (!migrationSecret || providedSecret !== migrationSecret) {
      return jsonResponse({ error: 'forbidden' }, 403, requestId)
    }

    const clientFingerprint = `${await hashText(providedSecret)}:${req.headers.get('x-forwarded-for') || 'unknown'}`
    if (!consumeRateLimit(clientFingerprint)) {
      return jsonResponse({ error: 'rate_limited' }, 429, requestId)
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('migration-read-api configuration missing', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      })
      return jsonResponse({ error: 'configuration_missing' }, 500, requestId)
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as SupabaseClientLike

    const body = await readJsonBody(req)
    action = String(body?.action || 'health')
    const actionResult = validateAction(action)
    if (!actionResult.ok) {
      await audit(adminClient, { action, domain, count: 0, requestId, success: false, errorCode: actionResult.error })
      return jsonResponse({ error: actionResult.error }, actionResult.status, requestId)
    }

    if (body?.domain !== undefined) {
      domain = String(body.domain)
      const domainResult = validateDomain(domain)
      if (!domainResult.ok) {
        await audit(adminClient, { action, domain, count: 0, requestId, success: false, errorCode: domainResult.error })
        return jsonResponse({ error: domainResult.error }, domainResult.status, requestId)
      }
    }

    const response = await routeAction({
      action,
      body,
      domain,
      client: adminClient,
      requestId,
      supabaseUrl,
    })

    await audit(adminClient, {
      action,
      domain,
      count: typeof response.auditCount === 'number' ? response.auditCount : null,
      requestId,
      success: true,
    })

    return jsonResponse(response.body, response.status || 200, requestId)
  } catch (error) {
    console.error('migration-read-api unexpected failure', {
      requestId,
      action,
      domain,
      error: error instanceof Error ? error.message : 'unknown',
    })

    if (adminClient) {
      await audit(adminClient, {
        action,
        domain,
        count: 0,
        requestId,
        success: false,
        errorCode: 'unexpected_failure',
      })
    }

    return jsonResponse({ error: 'internal_error' }, 500, requestId)
  }
})

async function routeAction({
  action,
  body,
  domain,
  client,
  requestId,
  supabaseUrl,
}: {
  action: string
  body: Record<string, unknown>
  domain: string | null
  client: SupabaseClientLike
  requestId: string
  supabaseUrl: string
}) {
  if (action === 'health') {
    return {
      body: {
        status: 'ok',
        source_version: V1_SOURCE_VERSION,
        migration_read_api_version: API_VERSION,
      },
    }
  }

  if (action === 'schema') {
    const counts = await getDomainCounts(client)
    const buckets = await getStorageBuckets(client)
    const tables = await getSchemaTables(client)
    const payload = {
      source_version: V1_SOURCE_VERSION,
      migration_read_api_version: API_VERSION,
      schema_metadata_source: tables.source,
      tables: tables.tables,
      domains: DOMAINS,
      buckets,
      domain_counts: counts,
      storage: await getStorageBaseline(client),
      migration_storage_buckets: MIGRATION_STORAGE_BUCKETS,
      diagnostic_storage_buckets: DIAGNOSTIC_STORAGE_BUCKETS,
    }
    const encoded = new TextEncoder().encode(stableJson(payload))
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    return {
      body: {
        ...payload,
        schema_hash: [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
      },
      auditCount: tables.tables.length,
    }
  }

  if (action === 'domain-counts') {
    const counts = await getDomainCounts(client)
    return { body: counts, auditCount: Object.keys(counts).length }
  }

  if (action === 'domain-export') {
    if (!domain) return { body: { error: 'domain_required' }, status: 400, auditCount: 0 }
    return exportDomain(client, domain, body)
  }

  if (action === 'finance-baseline') {
    return { body: await getFinanceBaseline(client), auditCount: 1 }
  }

  if (action === 'member-baseline') {
    return { body: await getMemberBaseline(client), auditCount: 1 }
  }

  if (action === 'storage-list') {
    return listStorage(client, body)
  }

  if (action === 'storage-download') {
    return downloadStorage(client, body, supabaseUrl)
  }

  if (action === 'roles') {
    return exportRoles(client)
  }

  if (action === 'views-rpcs') {
    return { body: RPCS_AND_VIEWS, auditCount: RPCS_AND_VIEWS.rpcs.length + RPCS_AND_VIEWS.views.length }
  }

  return { body: { error: 'unknown_action' }, status: 400, auditCount: 0 }
}

async function exportDomain(client: SupabaseClientLike, domain: string, body: Record<string, unknown>) {
  const config = DOMAIN_CONFIG[domain]
  const cursor = parseCursor(body.cursor ?? body.page)
  if (cursor === null) return { body: { error: 'invalid_cursor' }, status: 400, auditCount: 0 }
  const limit = parseLimit(body.limit, 100, 500)
  const from = cursor
  const to = cursor + limit - 1

  let query = client
    .from(config.primaryTable)
    .select(config.select.join(','), { count: 'exact' })
    .range(from, to)

  for (const order of config.order) {
    query = query.order(order.column, { ascending: order.ascending })
  }

  if (config.filter) {
    if (config.filter.op === 'not.is') query = query.not(config.filter.column, 'is', config.filter.value)
  }

  const { data, error, count } = await query
  if (error) throw error

  const records = Array.isArray(data) ? data : []
  const related = await loadRelated(client, domain, records)
  const storageManifest = collectStorageReferences(domain, records)
  const total = count || 0

  return {
    body: {
      domain,
      source_tables: config.sourceTables,
      records,
      related,
      storage_manifest: storageManifest,
      next_cursor: nextCursor(cursor, limit, records.length, total),
      total_count: total,
      limit,
      cursor: String(cursor),
    },
    auditCount: records.length,
  }
}

async function loadRelated(client: SupabaseClientLike, domain: string, records: unknown[]) {
  const specs = RELATED_TABLES[domain] || []
  const related: Record<string, unknown[]> = {}

  for (const spec of specs) {
    let query = client.from(spec.table).select(spec.select.join(',')).limit(1000)

    if (spec.foreignKey && spec.localKey) {
      const ids = records.map((record: any) => record?.[spec.localKey]).filter(Boolean)
      if (ids.length === 0) {
        related[spec.table] = []
        continue
      }
      query = query.in(spec.foreignKey, ids)
    }

    const { data, error } = await query
    if (error) throw error
    related[spec.table] = Array.isArray(data) ? data : []
  }

  return related
}

async function getDomainCounts(client: SupabaseClientLike) {
  const counts: Record<string, number> = {}
  for (const domain of DOMAINS) {
    const config = DOMAIN_CONFIG[domain]
    let query = client.from(config.primaryTable).select('*', { count: 'exact', head: true })
    if (config.filter?.op === 'not.is') query = query.not(config.filter.column, 'is', config.filter.value)
    const { error, count } = await query
    if (error) throw error
    counts[domain] = count || 0
  }
  return counts
}

async function getFinanceBaseline(client: SupabaseClientLike) {
  const cash = await selectAll(client, 'cash_entries', 'type,amount,is_cancelled')
  const activeCash = cash.filter((row: any) => row?.is_cancelled !== true)
  const incomes = activeCash.filter((row: any) => row?.type === 'einnahme')
  const expenses = activeCash.filter((row: any) => row?.type === 'ausgabe')
  const incomeCents = sumCents(incomes, 'amount')
  const expenseCents = sumCents(expenses, 'amount')

  const feeItems = await selectAll(client, 'membership_fee_items', 'amount,status')
  const invoices = await selectAll(client, 'invoices', 'total_amount,status')
  const financing = await selectAll(client, 'financing_liabilities', 'id,original_amount,status')
  const repayments = await selectAll(client, 'financing_liability_repayments', 'liability_id,amount,cancelled_at')
  const activeRepayments = repayments.filter((row: any) => !row?.cancelled_at)
  const activeFinancing = financing.filter((row: any) => row?.status !== 'cancelled')

  return {
    cash: {
      income_count: incomes.length,
      income_cents: incomeCents,
      expense_count: expenses.length,
      expense_cents: expenseCents,
      balance_cents: incomeCents - expenseCents,
    },
    membership_fees: {
      count: feeItems.length,
      total_cents: sumCents(feeItems, 'amount'),
      paid_cents: sumCents(feeItems.filter((row: any) => row?.status === 'paid'), 'amount'),
      open_cents: sumCents(feeItems.filter((row: any) => ['open', 'reminded'].includes(row?.status)), 'amount'),
    },
    invoices: {
      count: invoices.length,
      total_cents: sumCents(invoices, 'total_amount'),
      paid_cents: sumCents(invoices.filter((row: any) => row?.status === 'bezahlt'), 'total_amount'),
      open_cents: sumCents(invoices.filter((row: any) => row?.status === 'offen'), 'total_amount'),
      status_counts: groupCount(invoices, 'status'),
    },
    financing: {
      total_cents: sumCents(activeFinancing, 'original_amount'),
      remaining_cents: activeFinancing.reduce((sum, liability: any) => {
        const repaid = activeRepayments
          .filter((repayment: any) => repayment?.liability_id === liability?.id)
          .reduce((repaymentSum, repayment: any) => repaymentSum + toCents(repayment?.amount), 0)
        return sum + Math.max(toCents(liability?.original_amount) - repaid, 0)
      }, 0),
      repayments_cents: sumCents(activeRepayments, 'amount'),
    },
  }
}

async function getMemberBaseline(client: SupabaseClientLike) {
  const members = await selectAll(client, 'members', 'id,status,member_type,auth_user_id,app_role')
  const userRoles = await selectAll(client, 'user_roles', 'role_key')

  return {
    total: members.length,
    active: members.filter((row: any) => row?.status === 'aktiv').length,
    inactive: members.filter((row: any) => row?.status === 'inaktiv').length,
    exited: members.filter((row: any) => row?.status === 'ausgetreten').length,
    membership_type_counts: groupCount(members, 'member_type'),
    auth_linked: members.filter((row: any) => Boolean(row?.auth_user_id)).length,
    role_counts: {
      app_role: groupCount(members, 'app_role'),
      rbac_role: groupCount(userRoles, 'role_key'),
    },
  }
}

async function listStorage(client: SupabaseClientLike, body: Record<string, unknown>) {
  const bucket = String(body.bucket || '')
  const bucketResult = validateBucket(bucket)
  if (!bucketResult.ok) return { body: { error: bucketResult.error }, status: bucketResult.status, auditCount: 0 }

  const prefix = normalizeStoragePath(String(body.prefix || ''))
  const cursor = parseCursor(body.cursor)
  if (cursor === null) return { body: { error: 'invalid_cursor' }, status: 400, auditCount: 0 }
  const limit = parseLimit(body.limit, 100, 500)

  const { data, error } = await client.storage.from(bucket).list(prefix, {
    limit,
    offset: cursor,
    sortBy: { column: 'name', order: 'asc' },
  })
  if (error) throw error

  const items = (Array.isArray(data) ? data : []).map((item: any) => ({
    bucket,
    path: prefix ? `${prefix}/${item.name}` : item.name,
    name: item.name,
    size: item.metadata?.size ?? item.size ?? null,
    mime: item.metadata?.mimetype ?? item.metadata?.mimeType ?? null,
    metadata: minimalStorageMetadata(item.metadata),
    updated_at: item.updated_at || null,
    created_at: item.created_at || null,
  }))

  return {
    body: {
      bucket,
      prefix,
      migration_relevant: MIGRATION_STORAGE_BUCKETS.includes(bucket),
      diagnostic_only: DIAGNOSTIC_STORAGE_BUCKETS.includes(bucket),
      files: items,
      next_cursor: items.length >= limit ? String(cursor + items.length) : null,
      limit,
      cursor: String(cursor),
    },
    auditCount: items.length,
  }
}

async function downloadStorage(client: SupabaseClientLike, body: Record<string, unknown>, supabaseUrl: string) {
  const bucket = String(body.bucket || '')
  const bucketResult = validateBucket(bucket)
  if (!bucketResult.ok) return { body: { error: bucketResult.error }, status: bucketResult.status, auditCount: 0 }

  const path = normalizeStoragePath(String(body.path || ''))
  if (!path || path.includes('..')) {
    return { body: { error: 'invalid_path' }, status: 400, auditCount: 0 }
  }

  const allowed = await isKnownStorageReference(client, bucket, path, supabaseUrl)
  if (!allowed) {
    return { body: { error: 'path_not_in_migration_manifest' }, status: 403, auditCount: 0 }
  }

  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 300)
  if (error) throw error

  return {
    body: {
      bucket,
      path,
      signed_url: data?.signedUrl || null,
      expires_in_seconds: 300,
    },
    auditCount: 1,
  }
}

async function exportRoles(client: SupabaseClientLike) {
  const [roles, permissions, rolePermissions, userRoles, userPermissions] = await Promise.all([
    selectAll(client, 'roles', 'key,label,description,is_system,created_at'),
    selectAll(client, 'permissions', 'key,module,action,label,created_at'),
    selectAll(client, 'role_permissions', 'role_key,permission_key,created_at'),
    selectAll(client, 'user_roles', 'auth_user_id,role_key,assigned_at,assigned_by'),
    selectAll(client, 'user_permissions', 'auth_user_id,permission_key,effect,assigned_at,assigned_by'),
  ])

  return {
    body: {
      roles,
      permissions,
      role_permissions: rolePermissions,
      user_roles: userRoles,
      user_permissions: userPermissions,
    },
    auditCount: roles.length + userRoles.length + userPermissions.length,
  }
}

async function withRowCounts(client: SupabaseClientLike, tables: unknown[]) {
  const result = []
  for (const table of tables as Array<{ table: string }>) {
    const { count, error } = await client.from(table.table).select('*', { count: 'exact', head: true })
    result.push({
      ...table,
      row_count: error ? null : count || 0,
    })
  }
  return result
}

async function getSchemaTables(client: SupabaseClientLike) {
  const live = await getLiveSchemaTables(client)
  if (live) return { source: 'information_schema', tables: live }
  return { source: 'static_contract_fallback', tables: await withRowCounts(client, SCHEMA_TABLES) }
}

async function getLiveSchemaTables(client: SupabaseClientLike) {
  const dbUrl = Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL') || ''
  if (!dbUrl) return null

  const sql = postgres(dbUrl, { max: 1, ssl: 'require' })
  try {
    const [columns, constraints] = await Promise.all([
      sql`
        select
          c.table_name,
          c.column_name,
          c.ordinal_position,
          c.data_type,
          c.is_nullable,
          c.column_default
        from information_schema.columns c
        join information_schema.tables t
          on t.table_schema = c.table_schema
         and t.table_name = c.table_name
        where c.table_schema = 'public'
          and t.table_type = 'BASE TABLE'
        order by c.table_name asc, c.ordinal_position asc
      `,
      sql`
        select
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          kcu.ordinal_position,
          ccu.table_name as foreign_table_name,
          ccu.column_name as foreign_column_name
        from information_schema.table_constraints tc
        left join information_schema.key_column_usage kcu
          on kcu.constraint_schema = tc.constraint_schema
         and kcu.constraint_name = tc.constraint_name
         and kcu.table_schema = tc.table_schema
         and kcu.table_name = tc.table_name
        left join information_schema.constraint_column_usage ccu
          on ccu.constraint_schema = tc.constraint_schema
         and ccu.constraint_name = tc.constraint_name
        where tc.table_schema = 'public'
          and tc.constraint_type in ('PRIMARY KEY', 'FOREIGN KEY')
        order by tc.table_name asc, tc.constraint_name asc, kcu.ordinal_position asc
      `,
    ])

    const byTable = new Map<string, any>()
    for (const column of columns as any[]) {
      const tableName = String(column.table_name)
      if (!byTable.has(tableName)) {
        byTable.set(tableName, {
          table: tableName,
          migration_scope: migrationScopeForTable(tableName),
          columns: [],
          primary_key: [],
          fk_hints: [],
          status_values: null,
          row_count: null,
        })
      }
      byTable.get(tableName).columns.push({
        name: column.column_name,
        ordinal_position: Number(column.ordinal_position),
        data_type: column.data_type,
        nullable: column.is_nullable === 'YES',
        default: column.column_default || null,
      })
    }

    const seenFk = new Set<string>()
    for (const constraint of constraints as any[]) {
      const table = byTable.get(String(constraint.table_name))
      if (!table || !constraint.column_name) continue
      if (constraint.constraint_type === 'PRIMARY KEY') table.primary_key.push(String(constraint.column_name))
      if (constraint.constraint_type === 'FOREIGN KEY' && constraint.foreign_table_name && constraint.foreign_column_name) {
        const hint = `${constraint.column_name}->${constraint.foreign_table_name}.${constraint.foreign_column_name}`
        if (!seenFk.has(`${constraint.table_name}:${hint}`)) {
          seenFk.add(`${constraint.table_name}:${hint}`)
          table.fk_hints.push({
            column: String(constraint.column_name),
            references: `${constraint.foreign_table_name}.${constraint.foreign_column_name}`,
          })
        }
      }
    }

    const tables = [...byTable.values()].sort((a, b) => a.table.localeCompare(b.table))
    for (const table of tables) {
      table.primary_key = table.primary_key.sort()
      table.fk_hints = table.fk_hints.sort((a: any, b: any) => `${a.column}:${a.references}`.localeCompare(`${b.column}:${b.references}`))
      table.status_values = STATUS_VALUES_FOR_TABLE(table.table)
      const { count, error } = await client.from(table.table).select('*', { count: 'exact', head: true })
      table.row_count = error ? null : count || 0
    }
    return tables
  } catch (error) {
    console.error('migration-read-api live schema metadata failed', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return null
  } finally {
    await sql.end({ timeout: 1 })
  }
}

function migrationScopeForTable(table: string) {
  const domain = DOMAINS.find((item) => DOMAIN_CONFIG[item].sourceTables.includes(table))
  if (domain) return 'domain'
  if (['invoice_items', 'sponsor_contracts', 'merch_variants', 'shop_order_items', 'financing_liability_repayments', 'membership_fee_periods'].includes(table)) return 'supporting'
  if (/notification|push|backup|restore|search|audit|log|session|job|temp/i.test(table)) return 'not_migrated'
  return 'review'
}

function STATUS_VALUES_FOR_TABLE(table: string) {
  const staticTable = (SCHEMA_TABLES as any[]).find((item) => item.table === table)
  return staticTable?.status_values || null
}

async function getStorageBuckets(client: SupabaseClientLike) {
  const { data, error } = await client.storage.listBuckets()
  if (error) throw error
  return (data || [])
    .filter((bucket) => STORAGE_BUCKETS.includes(bucket.name))
    .map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      public: bucket.public === true,
      migration_relevant: MIGRATION_STORAGE_BUCKETS.includes(bucket.name),
      diagnostic_only: DIAGNOSTIC_STORAGE_BUCKETS.includes(bucket.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function getStorageBaseline(client: SupabaseClientLike) {
  const buckets: Record<string, { files: number; bytes: number; migration_relevant: boolean; diagnostic_only: boolean }> = {}
  for (const bucket of STORAGE_BUCKETS) {
    const files = await listAllStorageFiles(client, bucket)
    buckets[bucket] = {
      files: files.length,
      bytes: files.reduce((sum, file: any) => sum + Number(file?.metadata?.size ?? file?.size ?? 0), 0),
      migration_relevant: MIGRATION_STORAGE_BUCKETS.includes(bucket),
      diagnostic_only: DIAGNOSTIC_STORAGE_BUCKETS.includes(bucket),
    }
  }

  const receiptRefs = await selectAll(client, 'cash_entries', 'receipt_url')
  const knownReceiptPaths = new Set(
    receiptRefs
      .map((row: any) => parseStorageReference(row?.receipt_url, '', 'receipts'))
      .filter((ref: any) => ref?.bucket === 'receipts')
      .map((ref: any) => ref.path),
  )
  const receiptFiles = await listAllStorageFiles(client, 'receipts')

  return {
    buckets,
    orphan_storage_files: {
      receipts: receiptFiles.filter((file: any) => !knownReceiptPaths.has(file.path)).length,
    },
  }
}

async function listAllStorageFiles(client: SupabaseClientLike, bucket: string, prefix = '') {
  const rows: any[] = []
  const pageSize = 1000
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) return rows
    const batch = Array.isArray(data) ? data : []
    rows.push(...batch.map((item: any) => ({ ...item, path: prefix ? `${prefix}/${item.name}` : item.name })))
    if (batch.length < pageSize) break
  }
  return rows
}


async function selectAll(client: SupabaseClientLike, table: string, select: string) {
  const pageSize = 1000
  const rows: unknown[] = []
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const { data, error } = await client.from(table).select(select).range(offset, offset + pageSize - 1)
    if (error) throw error
    const batch = Array.isArray(data) ? data : []
    rows.push(...batch)
    if (batch.length < pageSize) break
  }
  return rows
}

function collectStorageReferences(domain: string, records: unknown[]) {
  const config = DOMAIN_CONFIG[domain]
  const refs = []
  for (const record of records as any[]) {
    for (const column of config.storageColumns || []) {
      const value = record?.[column]
      const defaultBucket = STORAGE_COLUMN_BUCKETS[domain]?.[column] || ''
      const parsed = parseStorageReference(value, '', defaultBucket)
      if (parsed) refs.push({ ...parsed, source_column: column, source_id: record?.id || null })
    }
  }
  return refs
}

async function isKnownStorageReference(client: SupabaseClientLike, bucket: string, path: string, supabaseUrl: string) {
  const checks = [
    ['documents', 'file_path', 'documents'],
    ['cash_entries', 'receipt_url', 'receipts'],
    ['invoices', 'pdf_url', 'documents'],
    ['financing_liabilities', 'receipt_url', 'receipts'],
    ['sponsors', 'logo_path', ''],
    ['inventory_items', 'qr_url', ''],
    ['events', 'event_image_url', ''],
    ['events', 'public_image_path', ''],
    ['events', 'public_image_url', ''],
    ['merch_items', 'image_path', ''],
  ]

  for (const [table, column, defaultBucket] of checks) {
    const { data, error } = await client.from(table).select(column).limit(1000)
    if (error) continue
    const found = (data || []).some((row: any) => {
      const parsed = parseStorageReference(row?.[column], supabaseUrl, defaultBucket)
      return parsed?.bucket === bucket && parsed?.path === path
    })
    if (found) return true
  }

  return false
}

function parseStorageReference(value: unknown, supabaseUrl = '', defaultBucket = '') {
  if (!value || typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  if (/^https?:\/\//i.test(text) && supabaseUrl && !text.startsWith(supabaseUrl)) return null

  for (const bucket of STORAGE_BUCKETS) {
    const marker = `/storage/v1/object/public/${bucket}/`
    const signedMarker = `/storage/v1/object/sign/${bucket}/`
    if (text.includes(marker)) return { bucket, path: normalizeStoragePath(text.split(marker)[1].split('?')[0]) }
    if (text.includes(signedMarker)) return { bucket, path: normalizeStoragePath(text.split(signedMarker)[1].split('?')[0]) }
    if (text.startsWith(`${bucket}/`)) return { bucket, path: normalizeStoragePath(text.slice(bucket.length + 1)) }
  }

  if (supabaseUrl && text.startsWith(supabaseUrl)) return null
  if (defaultBucket && !/^https?:\/\//i.test(text)) return { bucket: defaultBucket, path: normalizeStoragePath(text) }
  return null
}

function normalizeStoragePath(path: string) {
  return path.replace(/^\/+/, '').replace(/\/+/g, '/')
}

function minimalStorageMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || typeof metadata !== 'object') return null
  return {
    size: metadata.size ?? null,
    mimetype: metadata.mimetype ?? metadata.mimeType ?? null,
    cacheControl: metadata.cacheControl ?? null,
  }
}

function sumCents(rows: unknown[], column: string) {
  return rows.reduce((sum, row: any) => sum + toCents(row?.[column]), 0)
}

function groupCount(rows: unknown[], column: string) {
  return rows.reduce((acc: Record<string, number>, row: any) => {
    const key = String(row?.[column] || 'unknown')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

async function readJsonBody(req: Request) {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

async function audit(client: SupabaseClientLike, payload: AuditPayload) {
  const { error } = await client.from('audit_logs').insert({
    action: payload.success ? 'migration_read_api_success' : 'migration_read_api_failed',
    table_name: 'migration_read_api',
    record_id: payload.requestId,
    old_data: null,
    new_data: {
      action: payload.action,
      domain: payload.domain || null,
      count: payload.count ?? null,
      success: payload.success,
      error_code: payload.errorCode || null,
      api_version: API_VERSION,
    },
    user_id: null,
    user_email: null,
  })

  if (error) {
    console.error('migration-read-api audit failed', {
      requestId: payload.requestId,
      action: payload.action,
      domain: payload.domain || null,
      error: error.message,
    })
  }
}

function consumeRateLimit(key: string) {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || now - bucket.windowStarted > RATE_WINDOW_MS) {
    rateBuckets.set(key, { windowStarted: now, count: 1 })
    return true
  }
  bucket.count += 1
  return bucket.count <= RATE_LIMIT
}

async function hashText(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function jsonResponse(body: Record<string, unknown>, status = 200, requestId?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(requestId ? { 'x-request-id': requestId } : {}),
    },
  })
}
