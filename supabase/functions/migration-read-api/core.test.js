import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  ACTIONS,
  DOMAIN_CONFIG,
  DOMAINS,
  DIAGNOSTIC_STORAGE_BUCKETS,
  MIGRATION_STORAGE_BUCKETS,
  SCHEMA_TABLES,
  SECRET_HEADER,
  STORAGE_COLUMN_BUCKETS,
  STORAGE_BUCKETS,
  canonicalizeMigrationSchema,
  nextCursor,
  parseCursor,
  parseLimit,
  stableJson,
  toCents,
  validateAction,
  validateBucket,
  validateDomain,
} from './core.js'

describe('migration read api contract', () => {
  it('exposes only whitelisted read actions', () => {
    assert.deepEqual(ACTIONS, [
      'health',
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

    for (const action of ['insert', 'update', 'upsert', 'delete', 'upload', 'remove', 'sql', 'query']) {
      assert.equal(validateAction(action).ok, false)
    }
  })

  it('requires exact domain whitelist', () => {
    assert.deepEqual(DOMAINS, [
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

    for (const domain of DOMAINS) {
      assert.equal(validateDomain(domain).ok, true)
      assert.ok(DOMAIN_CONFIG[domain])
    }

    assert.equal(validateDomain('auth.users').ok, false)
    assert.equal(validateDomain('audit_logs').ok, false)
  })

  it('keeps storage access bucket-scoped', () => {
    assert.deepEqual(STORAGE_BUCKETS, ['backups', 'documents', 'receipts'])
    assert.deepEqual(MIGRATION_STORAGE_BUCKETS, ['documents', 'receipts'])
    assert.deepEqual(DIAGNOSTIC_STORAGE_BUCKETS, ['backups'])
    assert.equal(validateBucket('documents').ok, true)
    assert.equal(validateBucket('public-assets').ok, false)
    assert.equal(validateBucket('private-user-secrets').ok, false)
    assert.equal(STORAGE_COLUMN_BUCKETS.documents.file_path, 'documents')
    assert.equal(STORAGE_COLUMN_BUCKETS.documents.file_url, 'documents')
    assert.equal(STORAGE_COLUMN_BUCKETS.cash.receipt_url, 'receipts')
  })

  it('uses deterministic schema serialization inputs', () => {
    const tableNames = SCHEMA_TABLES.map((table) => table.table)
    assert.deepEqual(tableNames, [...tableNames].sort())

    const first = stableJson({ b: 1, a: { d: 2, c: 3 } })
    const second = stableJson({ a: { c: 3, d: 2 }, b: 1 })
    assert.equal(first, second)
  })

  it('hashes only a canonical structural projection across repeated analyses', () => {
    const base = {
      schema_contract_version: '35.7c.1',
      source_version: 'v1.5.1',
      tables: [{
        table: 'members',
        row_count: 13,
        columns: [
          { name: 'email', data_type: 'text', nullable: true, default: null },
          { name: 'id', data_type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
        ],
        primary_key: ['id'],
        fk_hints: [],
        status_values: { status: ['aktiv', 'inaktiv'] },
      }],
      buckets: [{ name: 'documents', object_count: 15, bytes: 1234 }],
      rpc_contracts: { rpcs: ['get_public_events'], views: [] },
    }
    assert.equal(canonicalizeMigrationSchema(base), canonicalizeMigrationSchema({
      ...base,
      generated_at: '2026-08-22T12:00:00Z',
      tables: [{ ...base.tables[0], row_count: 14, columns: [...base.tables[0].columns].reverse() }],
      buckets: [{ name: 'documents', object_count: 16, bytes: 9999 }],
    }))
    assert.notEqual(canonicalizeMigrationSchema(base), canonicalizeMigrationSchema({
      ...base,
      tables: [{ ...base.tables[0], columns: [...base.tables[0].columns, { name: 'new_column', data_type: 'text', nullable: true, default: null }] }],
    }))
  })

  it('matches live V1 member and document contract fields', () => {
    const members = SCHEMA_TABLES.find((table) => table.table === 'members')
    const documents = SCHEMA_TABLES.find((table) => table.table === 'documents')
    assert.ok(members.status_values.member_type.includes('ehrenmitglied'))
    assert.ok(documents.columns.some((column) => column.name === 'file_url'))
    assert.ok(documents.columns.some((column) => column.name === 'visibility'))
    assert.equal(documents.columns.some((column) => column.name === 'published_at'), false)
  })

  it('uses stable offset cursors without duplicates or gaps', () => {
    assert.equal(parseCursor(undefined), 0)
    assert.equal(parseCursor('25'), 25)
    assert.equal(parseCursor('-1'), null)
    assert.equal(parseLimit(9999, 100, 500), 500)
    assert.equal(nextCursor(0, 100, 100, 250), '100')
    assert.equal(nextCursor(100, 100, 100, 250), '200')
    assert.equal(nextCursor(200, 100, 50, 250), null)
  })

  it('sums decimal money values as integer cents', () => {
    assert.equal(toCents('10'), 1000)
    assert.equal(toCents('10.2'), 1020)
    assert.equal(toCents('10.23'), 1023)
    assert.equal(toCents('-1.05'), -105)
    assert.equal(toCents(null), 0)
  })
})

describe('migration read api static security checks', () => {
  const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')

  it('uses the migration read secret header', () => {
    assert.equal(SECRET_HEADER, 'x-v1-migration-read-secret')
    assert.match(indexSource, /V1_MIGRATION_READ_SECRET/)
    assert.match(indexSource, /providedSecret !== migrationSecret/)
  })

  it('does not expose service role keys in responses', () => {
    assert.doesNotMatch(indexSource, /serviceRoleKey[^;\n]*(jsonResponse|body|Response)/)
    assert.doesNotMatch(indexSource, /SUPABASE_SERVICE_ROLE_KEY[^;\n]*(jsonResponse|body|Response)/)
  })

  it('has no database mutation paths except audit logging', () => {
    const strippedAudit = indexSource.replace(/client\.from\('audit_logs'\)\.insert/g, '')
    assert.doesNotMatch(strippedAudit, /\.insert\s*\(/)
    assert.doesNotMatch(strippedAudit, /\.update\s*\(/)
    assert.doesNotMatch(strippedAudit, /\.upsert\s*\(/)
    assert.doesNotMatch(strippedAudit, /\.delete\s*\(/)
  })

  it('has no storage write paths', () => {
    assert.doesNotMatch(indexSource, /\.upload\s*\(/)
    assert.doesNotMatch(indexSource, /\.update\s*\(/)
    assert.doesNotMatch(indexSource, /\.move\s*\(/)
    assert.doesNotMatch(indexSource, /\.copy\s*\(/)
    assert.doesNotMatch(indexSource, /\.remove\s*\(/)
  })

  it('returns recursive file listings instead of folder placeholders', () => {
    assert.match(indexSource, /listAllStorageFiles\(client, bucket, prefix\)/)
    assert.match(indexSource, /isStorageFolder\(item\)/)
    assert.match(indexSource, /rows\.push\(\.\.\.await listAllStorageFiles\(client, bucket, path\)\)/)
    assert.doesNotMatch(indexSource, /path: prefix \? `\$\{prefix\}\/\$\{item\.name\}` : item\.name/)
  })

  it('exposes a canonical signed binary read descriptor with verified bytes', () => {
    assert.match(indexSource, /downloadStorage\(client, body, supabaseUrl\)/)
    assert.match(indexSource, /client\.storage\.from\(bucket\)\.download\(path\)/)
    assert.match(indexSource, /createSignedUrl\(path, 300\)/)
    assert.match(indexSource, /sha256/)
    assert.match(indexSource, /byte_size/)
    assert.match(indexSource, /mime_type/)
    assert.match(indexSource, /download_url/)
    assert.match(indexSource, /download:\s*{\s*type: 'signed_url'/)
    assert.match(indexSource, /normalizeSignedUrl/)
    assert.match(indexSource, /binary_size_mismatch/)
  })

  it('rejects unsafe paths and permits listed migration storage files', () => {
    assert.match(indexSource, /\['documents', 'file_url', 'documents'\]/)
    assert.match(indexSource, /path_is_folder/)
    assert.match(indexSource, /isSafeStorageDownloadPath/)
    assert.match(indexSource, /isListedMigrationStorageObject/)
    assert.match(indexSource, /MIGRATION_STORAGE_BUCKETS\.includes\(bucket\)/)
    assert.match(indexSource, /isLikelyStorageObjectPath/)
  })
})
