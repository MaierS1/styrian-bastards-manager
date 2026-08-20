import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  ACTIONS,
  DOMAIN_CONFIG,
  DOMAINS,
  SCHEMA_TABLES,
  SECRET_HEADER,
  STORAGE_BUCKETS,
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
    assert.deepEqual(STORAGE_BUCKETS, ['public-assets', 'production-backups', 'cash-receipts'])
    assert.equal(validateBucket('public-assets').ok, true)
    assert.equal(validateBucket('private-user-secrets').ok, false)
  })

  it('uses deterministic schema serialization inputs', () => {
    const tableNames = SCHEMA_TABLES.map((table) => table.table)
    assert.deepEqual(tableNames, [...tableNames].sort())

    const first = stableJson({ b: 1, a: { d: 2, c: 3 } })
    const second = stableJson({ a: { c: 3, d: 2 }, b: 1 })
    assert.equal(first, second)
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
})
