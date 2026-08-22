export const API_VERSION = '35.6f.1'
export const V1_SOURCE_VERSION = 'v1.5.1'
export const SCHEMA_CONTRACT_VERSION = '35.7c.1'

export const SECRET_HEADER = 'x-v1-migration-read-secret'

export const ACTIONS = Object.freeze([
  'health',
  'source-info',
  'schema',
  'domain-counts',
  'domain-export',
  'finance-baseline',
  'member-baseline',
  'storage-list',
  'storage-download',
  'roles',
  'views-rpcs',
])

export const DOMAINS = Object.freeze([
  'members',
  'roles',
  'membership_fees',
  'cash',
  'cash_receipts',
  'invoices',
  'financing_liabilities',
  'sponsors',
  'inventory',
  'events',
  'event_registrations',
  'shop_products',
  'shop_orders',
  'documents',
])

export const STORAGE_BUCKETS = Object.freeze([
  'backups',
  'documents',
  'receipts',
])

export const MIGRATION_STORAGE_BUCKETS = Object.freeze([
  'documents',
  'receipts',
])

export const DIAGNOSTIC_STORAGE_BUCKETS = Object.freeze([
  'backups',
])

export const STORAGE_COLUMN_BUCKETS = Object.freeze({
  cash: { receipt_url: 'receipts' },
  cash_receipts: { receipt_url: 'receipts' },
  invoices: { pdf_url: 'documents' },
  financing_liabilities: { receipt_url: 'receipts' },
  documents: { file_path: 'documents', file_url: 'documents' },
})

const SELECTS = {
  members: [
    'id',
    'member_number',
    'first_name',
    'last_name',
    'email',
    'phone',
    'member_type',
    'role',
    'app_role',
    'status',
    'joined_at',
    'street',
    'postal_code',
    'city',
    'birthdate',
    'clothing_size',
    'auth_user_id',
    'notes',
    'created_at',
    'updated_at',
  ],
  membership_fee_periods: ['id', 'year', 'title', 'due_date', 'status', 'created_at', 'updated_at'],
  membership_fee_items: [
    'id',
    'period_id',
    'member_id',
    'amount',
    'status',
    'due_date',
    'paid_at',
    'cash_entry_id',
    'created_at',
    'updated_at',
  ],
  membership_fees: ['id', 'member_id', 'year', 'amount', 'paid', 'paid_at', 'payment_method', 'created_at', 'updated_at'],
  cash_entries: [
    'id',
    'entry_date',
    'entry_year',
    'receipt_number',
    'is_cancelled',
    'cancelled_at',
    'cancellation_reason',
    'type',
    'category',
    'amount',
    'description',
    'payment_method',
    'is_opening',
    'receipt_url',
    'event_id',
    'invoice_id',
    'membership_fee_id',
    'membership_fee_item_id',
    'member_id',
    'financing_liability_id',
    'financing_liability_repayment_id',
    'shop_order_id',
    'created_at',
    'updated_at',
  ],
  invoices: [
    'id',
    'invoice_number',
    'customer_id',
    'customer_name',
    'customer_email',
    'customer_address',
    'customer_street',
    'customer_house_number',
    'customer_address_addition',
    'customer_postal_code',
    'customer_city',
    'customer_country',
    'issue_date',
    'due_date',
    'total_amount',
    'status',
    'invoice_type',
    'original_invoice_id',
    'cancellation_reason',
    'notes',
    'member_id',
    'membership_fee_id',
    'paid_at',
    'cancelled_at',
    'pdf_url',
    'created_at',
    'updated_at',
  ],
  invoice_items: ['id', 'invoice_id', 'description', 'quantity', 'unit_price', 'total_price', 'created_at', 'updated_at'],
  invoice_customers: [
    'id',
    'name',
    'email',
    'street',
    'house_number',
    'address_addition',
    'postal_code',
    'city',
    'country',
    'notes',
    'created_at',
    'updated_at',
  ],
  financing_liabilities: [
    'id',
    'creditor_member_id',
    'creditor_name',
    'description',
    'original_amount',
    'financed_at',
    'due_date',
    'category',
    'status',
    'internal_note',
    'linked_cash_entry_id',
    'receipt_url',
    'created_by_member_id',
    'cancelled_at',
    'cancellation_reason',
    'created_at',
    'updated_at',
  ],
  financing_liability_repayments: [
    'id',
    'liability_id',
    'amount',
    'paid_at',
    'note',
    'cash_entry_id',
    'cancelled_at',
    'cancellation_reason',
    'created_at',
  ],
  sponsors: [
    'id',
    'name',
    'contact_person',
    'email',
    'phone',
    'website',
    'logo_path',
    'logo_alt',
    'description',
    'public_description',
    'public_description_html',
    'is_public',
    'sponsor_level',
    'public_sort_order',
    'status',
    'notes',
    'created_at',
    'updated_at',
  ],
  sponsor_contracts: [
    'id',
    'sponsor_id',
    'title',
    'starts_on',
    'ends_on',
    'amount_cents',
    'currency',
    'billing_cycle',
    'signed_on',
    'document_path',
    'status',
    'notes',
    'created_at',
    'updated_at',
  ],
  inventory_items: [
    'id',
    'inventory_number',
    'name',
    'category',
    'responsible',
    'location',
    'purchase_date',
    'condition',
    'status',
    'last_check_date',
    'check_status',
    'serial_number',
    'value',
    'qr_url',
    'notes',
    'created_at',
    'updated_at',
  ],
  events: [
    'id',
    'name',
    'title',
    'public_title',
    'event_date',
    'starts_at',
    'ends_at',
    'location',
    'status',
    'is_public',
    'public_status',
    'public_published_at',
    'registration_enabled',
    'registration_deadline',
    'max_participants',
    'allow_waitlist',
    'meeting_point',
    'event_category',
    'event_image_url',
    'public_image_path',
    'public_image_url',
    'public_registration_url',
    'public_external_url',
    'notes',
    'internal_notes',
    'created_at',
    'updated_at',
  ],
  event_registrations: [
    'id',
    'event_id',
    'full_name',
    'email',
    'phone',
    'member_status',
    'participant_count',
    'note',
    'team_name',
    'status',
    'checked_in_at',
    'checkin_status',
    'confirmation_sent_at',
    'reminder_sent_at',
    'notification_status',
    'created_at',
    'updated_at',
  ],
  merch_items: [
    'id',
    'name',
    'description',
    'short_description',
    'public_description',
    'public_description_html',
    'category',
    'image_path',
    'image_alt',
    'item_number',
    'status',
    'is_public',
    'public_title',
    'public_image_alt',
    'public_cta_label',
    'public_cta_url',
    'public_sort_order',
    'base_price_cents',
    'purchase_price_cents',
    'member_price_cents',
    'storage_location',
    'is_preorder',
    'is_limited',
    'is_bestseller',
    'is_new',
    'is_clearance',
    'pickup_available',
    'shipping_available',
    'shipping_cost_cents',
    'created_at',
    'updated_at',
  ],
  merch_variants: [
    'id',
    'merch_item_id',
    'variant_name',
    'sku',
    'size',
    'color',
    'price_cents',
    'stock_quantity',
    'reorder_level',
    'status',
    'is_public',
    'public_sort_order',
    'created_at',
    'updated_at',
  ],
  shop_orders: [
    'id',
    'order_number',
    'order_date',
    'member_id',
    'cash_entry_id',
    'status',
    'payment_status',
    'payment_method',
    'delivery_method',
    'currency',
    'subtotal_cents',
    'discount_cents',
    'shipping_cost_cents',
    'total_cents',
    'buyer_name',
    'buyer_email',
    'buyer_phone',
    'notes',
    'internal_notes',
    'created_at',
    'updated_at',
  ],
  shop_order_items: [
    'id',
    'shop_order_id',
    'merch_item_id',
    'merch_variant_id',
    'item_name',
    'item_number',
    'variant_name',
    'sku',
    'size',
    'color',
    'quantity',
    'unit_price_cents',
    'member_price_cents',
    'subtotal_cents',
    'discount_cents',
    'total_cents',
    'currency',
    'created_at',
    'updated_at',
  ],
  documents: [
    'id',
    'title',
    'category',
    'file_url',
    'visibility',
    'uploaded_by',
    'document_date',
    'description',
    'file_path',
    'file_name',
    'mime_type',
    'show_in_member_area',
    'member_area_category',
    'members_only',
    'is_active',
    'sort_order',
    'created_at',
    'updated_at',
  ],
  roles: ['key', 'label', 'description', 'is_system', 'created_at'],
  permissions: ['key', 'module', 'action', 'label', 'created_at'],
  role_permissions: ['role_key', 'permission_key', 'created_at'],
  user_roles: ['auth_user_id', 'role_key', 'assigned_at', 'assigned_by'],
  user_permissions: ['auth_user_id', 'permission_key', 'effect', 'assigned_at', 'assigned_by'],
}

export const DOMAIN_CONFIG = Object.freeze({
  members: {
    primaryTable: 'members',
    sourceTables: ['members'],
    order: [{ column: 'id', ascending: true }],
    select: SELECTS.members,
    storageColumns: [],
  },
  roles: {
    primaryTable: 'roles',
    sourceTables: ['roles', 'permissions', 'role_permissions', 'user_roles', 'user_permissions', 'members'],
    order: [{ column: 'key', ascending: true }],
    select: SELECTS.roles,
    storageColumns: [],
  },
  membership_fees: {
    primaryTable: 'membership_fee_items',
    sourceTables: ['membership_fee_periods', 'membership_fee_items', 'membership_fees'],
    order: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.membership_fee_items,
    storageColumns: [],
  },
  cash: {
    primaryTable: 'cash_entries',
    sourceTables: ['cash_entries', 'cash_month_closings'],
    order: [{ column: 'entry_date', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.cash_entries,
    storageColumns: ['receipt_url'],
  },
  cash_receipts: {
    primaryTable: 'cash_entries',
    sourceTables: ['cash_entries'],
    order: [{ column: 'entry_date', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.cash_entries,
    filter: { column: 'receipt_url', op: 'not.is', value: null },
    storageColumns: ['receipt_url'],
  },
  invoices: {
    primaryTable: 'invoices',
    sourceTables: ['invoice_customers', 'invoices', 'invoice_items'],
    order: [{ column: 'issue_date', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.invoices,
    storageColumns: ['pdf_url'],
  },
  financing_liabilities: {
    primaryTable: 'financing_liabilities',
    sourceTables: ['financing_liabilities', 'financing_liability_repayments', 'cash_entries'],
    order: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.financing_liabilities,
    storageColumns: ['receipt_url'],
  },
  sponsors: {
    primaryTable: 'sponsors',
    sourceTables: ['sponsors', 'sponsor_contracts'],
    order: [{ column: 'name', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.sponsors,
    storageColumns: ['logo_path'],
  },
  inventory: {
    primaryTable: 'inventory_items',
    sourceTables: ['inventory_items'],
    order: [{ column: 'name', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.inventory_items,
    storageColumns: ['qr_url'],
  },
  events: {
    primaryTable: 'events',
    sourceTables: ['events'],
    order: [{ column: 'event_date', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.events,
    storageColumns: ['event_image_url', 'public_image_path', 'public_image_url'],
  },
  event_registrations: {
    primaryTable: 'event_registrations',
    sourceTables: ['event_registrations'],
    order: [{ column: 'event_id', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.event_registrations,
    storageColumns: [],
  },
  shop_products: {
    primaryTable: 'merch_items',
    sourceTables: ['merch_items', 'merch_variants'],
    order: [{ column: 'name', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.merch_items,
    storageColumns: ['image_path'],
  },
  shop_orders: {
    primaryTable: 'shop_orders',
    sourceTables: ['shop_orders', 'shop_order_items'],
    order: [{ column: 'created_at', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.shop_orders,
    storageColumns: [],
  },
  documents: {
    primaryTable: 'documents',
    sourceTables: ['documents'],
    order: [{ column: 'document_date', ascending: true }, { column: 'id', ascending: true }],
    select: SELECTS.documents,
    storageColumns: ['file_path', 'file_url'],
  },
})

export const RELATED_TABLES = Object.freeze({
  membership_fees: [
    { table: 'membership_fee_periods', select: SELECTS.membership_fee_periods, foreignKey: null, localKey: null },
    { table: 'membership_fees', select: SELECTS.membership_fees, foreignKey: null, localKey: null },
  ],
  invoices: [
    { table: 'invoice_items', select: SELECTS.invoice_items, foreignKey: 'invoice_id', localKey: 'id' },
    { table: 'invoice_customers', select: SELECTS.invoice_customers, foreignKey: null, localKey: null },
  ],
  financing_liabilities: [
    { table: 'financing_liability_repayments', select: SELECTS.financing_liability_repayments, foreignKey: 'liability_id', localKey: 'id' },
  ],
  sponsors: [
    { table: 'sponsor_contracts', select: SELECTS.sponsor_contracts, foreignKey: 'sponsor_id', localKey: 'id' },
  ],
  shop_products: [
    { table: 'merch_variants', select: SELECTS.merch_variants, foreignKey: 'merch_item_id', localKey: 'id' },
  ],
  shop_orders: [
    { table: 'shop_order_items', select: SELECTS.shop_order_items, foreignKey: 'shop_order_id', localKey: 'id' },
  ],
})

export const STATUS_VALUES = Object.freeze({
  members: { status: ['aktiv', 'inaktiv', 'ausgetreten'], member_type: ['vollmitglied', 'foerdermitglied', 'probejahr', 'ehrenmitglied'] },
  membership_fee_periods: { status: ['open', 'closed'] },
  membership_fee_items: { status: ['open', 'reminded', 'paid', 'waived', 'cancelled'] },
  cash_entries: { type: ['einnahme', 'ausgabe'], payment_method: ['bar', 'ebanking'] },
  invoices: { status: ['offen', 'bezahlt', 'storniert'], invoice_type: ['rechnung', 'storno'] },
  financing_liabilities: { status: ['open', 'partially_paid', 'paid', 'cancelled'] },
  events: { status: ['geplant', 'laufend', 'abgeschlossen', 'abgesagt'], public_status: ['draft', 'published'] },
  event_registrations: { status: ['registered', 'waitlist', 'cancelled'], member_status: ['member', 'guest', 'unknown'] },
  documents: { category: ['verein', 'mitglied', 'vorstand', 'kassa', 'event', 'sonstiges'] },
})

export const SCHEMA_TABLES = Object.freeze(
  Object.keys(SELECTS)
    .sort()
    .map((table) => ({
      table,
      columns: SELECTS[table].map((name, index) => ({
        name,
        ordinal_position: index + 1,
        data_type: inferType(name),
        nullable: !['id', 'key', 'name', 'title', 'status', 'created_at', 'updated_at'].includes(name),
        default: defaultFor(name),
      })),
      primary_key: primaryKeyFor(table),
      fk_hints: fkHintsFor(table),
      status_values: STATUS_VALUES[table] || null,
    })),
)

export const RPCS_AND_VIEWS = Object.freeze({
  rpcs: [
    'get_public_events',
    'get_public_home_stats',
    'get_public_media_items',
    'get_public_merch_items',
    'get_public_sponsors',
    'get_member_documents',
    'has_app_permission',
  ].sort(),
  views: [
    'financing_liability_balances',
  ].sort(),
})

export function validateAction(action) {
  if (!ACTIONS.includes(action)) {
    return { ok: false, status: 400, error: 'unknown_action' }
  }
  return { ok: true, value: action }
}

export function validateDomain(domain) {
  if (!DOMAINS.includes(domain)) {
    return { ok: false, status: 400, error: 'unknown_domain' }
  }
  return { ok: true, value: domain }
}

export function validateBucket(bucket) {
  if (!STORAGE_BUCKETS.includes(bucket)) {
    return { ok: false, status: 400, error: 'unknown_bucket' }
  }
  return { ok: true, value: bucket }
}

export function parseLimit(value, fallback = 100, max = 500) {
  const numberValue = Number(value ?? fallback)
  if (!Number.isFinite(numberValue)) return fallback
  return Math.min(Math.max(Math.trunc(numberValue), 1), max)
}

export function parseCursor(cursor) {
  if (cursor === undefined || cursor === null || cursor === '') return 0
  const numberValue = Number(cursor)
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null
  }
  return Math.trunc(numberValue)
}

export function nextCursor(offset, limit, returned, total) {
  const next = offset + returned
  return next < total && returned >= limit ? String(next) : null
}

export function toCents(value) {
  if (value === null || value === undefined || value === '') return 0
  const text = String(value).trim()
  const negative = text.startsWith('-')
  const normalized = text.replace(/^-/, '')
  const [eurosRaw, centsRaw = ''] = normalized.split('.')
  const euros = Number(eurosRaw || 0)
  const cents = Number((centsRaw + '00').slice(0, 2))
  const total = euros * 100 + cents
  return negative ? -total : total
}

export function stableJson(value) {
  return JSON.stringify(sortValue(value))
}

// Keep runtime observations out of schema_hash. This is the sole structural
// fingerprint projection used by the migration read API.
export function canonicalizeMigrationSchema(input) {
  const tables = (Array.isArray(input?.tables) ? input.tables : [])
    .map((table) => ({
      name: String(table?.table ?? table?.name ?? ''),
      migration_scope: table?.migration_scope ?? null,
      columns: (Array.isArray(table?.columns) ? table.columns : [])
        .map((column) => ({
          name: String(column?.name ?? column?.column_name ?? ''),
          data_type: column?.data_type ?? null,
          nullable: column?.nullable ?? null,
          default: column?.default ?? column?.column_default ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      primary_key: [...(Array.isArray(table?.primary_key) ? table.primary_key : [])].map(String).sort(),
      foreign_keys: (Array.isArray(table?.foreign_keys) ? table.foreign_keys : Array.isArray(table?.fk_hints) ? table.fk_hints : [])
        .map((foreignKey) => typeof foreignKey === 'string'
          ? { column: foreignKey.split('->')[0] ?? foreignKey, references: foreignKey.split('->')[1] ?? '' }
          : { column: String(foreignKey?.column ?? ''), references: String(foreignKey?.references ?? '') })
        .sort((a, b) => `${a.column}:${a.references}`.localeCompare(`${b.column}:${b.references}`)),
      status_values: table?.status_values ?? null,
    }))
    .filter((table) => table.name)
    .sort((a, b) => a.name.localeCompare(b.name))
  const buckets = (Array.isArray(input?.buckets) ? input.buckets : [])
    .map((bucket) => typeof bucket === 'string' ? { name: bucket } : { name: String(bucket?.name ?? '') })
    .filter((bucket) => bucket.name)
    .sort((a, b) => a.name.localeCompare(b.name))
  return stableJson({
    schema_contract_version: input?.schema_contract_version ?? SCHEMA_CONTRACT_VERSION,
    source_version: input?.source_version ?? null,
    tables,
    buckets,
    rpc_contracts: {
      rpcs: [...(input?.rpc_contracts?.rpcs ?? [])].map(String).sort(),
      views: [...(input?.rpc_contracts?.views ?? [])].map(String).sort(),
    },
  })
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortValue(value[key])
        return acc
      }, {})
  }
  return value
}

function primaryKeyFor(table) {
  if (['roles', 'permissions'].includes(table)) return ['key']
  if (['role_permissions'].includes(table)) return ['role_key', 'permission_key']
  if (['user_roles'].includes(table)) return ['auth_user_id', 'role_key']
  if (['user_permissions'].includes(table)) return ['auth_user_id', 'permission_key']
  return ['id']
}

function fkHintsFor(table) {
  const hints = {
    membership_fee_items: [{ column: 'member_id', references: 'members.id' }, { column: 'period_id', references: 'membership_fee_periods.id' }],
    membership_fees: [{ column: 'member_id', references: 'members.id' }],
    cash_entries: [{ column: 'event_id', references: 'events.id' }, { column: 'invoice_id', references: 'invoices.id' }, { column: 'member_id', references: 'members.id' }],
    invoice_items: [{ column: 'invoice_id', references: 'invoices.id' }],
    invoices: [{ column: 'member_id', references: 'members.id' }, { column: 'customer_id', references: 'invoice_customers.id' }],
    financing_liability_repayments: [{ column: 'liability_id', references: 'financing_liabilities.id' }, { column: 'cash_entry_id', references: 'cash_entries.id' }],
    sponsor_contracts: [{ column: 'sponsor_id', references: 'sponsors.id' }],
    event_registrations: [{ column: 'event_id', references: 'events.id' }],
    merch_variants: [{ column: 'merch_item_id', references: 'merch_items.id' }],
    shop_order_items: [{ column: 'shop_order_id', references: 'shop_orders.id' }, { column: 'merch_item_id', references: 'merch_items.id' }, { column: 'merch_variant_id', references: 'merch_variants.id' }],
    role_permissions: [{ column: 'role_key', references: 'roles.key' }, { column: 'permission_key', references: 'permissions.key' }],
    user_roles: [{ column: 'role_key', references: 'roles.key' }],
    user_permissions: [{ column: 'permission_key', references: 'permissions.key' }],
  }
  return hints[table] || []
}

function defaultFor(name) {
  if (name === 'id') return 'gen_random_uuid()'
  if (name === 'created_at' || name === 'updated_at') return 'now()'
  if (name === 'status') return 'domain-specific'
  return null
}

function inferType(name) {
  if (name.endsWith('_id') || name === 'id' || name === 'auth_user_id' || name === 'assigned_by') return 'uuid'
  if (name.endsWith('_at') || name === 'checked_in_at') return 'timestamptz'
  if (name.endsWith('_date') || name.endsWith('_on') || name === 'due_date' || name === 'birthdate' || name === 'joined_at') return 'date'
  if (name.includes('amount') || name.includes('price') || name === 'value' || name === 'total_price' || name === 'unit_price') return 'numeric'
  if (name.includes('count') || name.includes('quantity') || name === 'year' || name === 'sort_order') return 'integer'
  if (name.startsWith('is_') || name.startsWith('allow_') || name.endsWith('_only')) return 'boolean'
  return 'text'
}
