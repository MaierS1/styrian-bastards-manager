import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const migrationsDir = new URL('../../../supabase/migrations/', import.meta.url)

const hardeningMigrations = [
  {
    file: '20260728150218_harden_public_documents_rls.sql',
    tables: ['documents'],
    permissions: ['dokumente'],
    grants: 'select, insert, update, delete',
    policyCount: 4,
  },
  {
    file: '20260728150227_harden_public_audit_system_rls.sql',
    tables: ['audit_logs'],
    permissions: ['systemeinstellungen'],
    grants: 'select, insert',
    policyCount: 2,
  },
  {
    file: '20260728150228_harden_public_event_cash_aux_rls.sql',
    tables: ['event_checkins', 'cash_month_closings'],
    permissions: ['events', 'kassa'],
    grants: 'select, insert, update, delete',
    policyCount: 8,
  },
  {
    file: '20260728150229_harden_public_inventory_rls.sql',
    tables: ['inventory_items'],
    permissions: ['inventar'],
    grants: 'select, insert, update, delete',
    policyCount: 4,
  },
  {
    file: '20260728150230_harden_public_invoice_rls.sql',
    tables: ['invoice_customers', 'invoices', 'invoice_items'],
    permissions: ['rechnungen', 'kassa'],
    grants: 'select, insert, update, delete',
    policyCount: 12,
  },
  {
    file: '20260728150231_harden_public_member_fee_rls.sql',
    tables: ['membership_fees', 'member_change_requests'],
    permissions: ['beitraege', 'kassa', 'mitglieder'],
    grants: 'select, insert, update, delete',
    policyCount: 9,
  },
]

const readMigration = (file) => readFileSync(new URL(file, migrationsDir), 'utf8')
const countMatches = (text, pattern) => [...text.matchAll(pattern)].length
const stripSqlStringsAndComments = (sql) => sql
  .replace(/--.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/'(?:''|[^'])*'/g, "''")

test('public RLS hardening migrations use unique migration versions', () => {
  const migrationFiles = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'))
  const versions = migrationFiles.map((file) => file.match(/^(\d+)_/)?.[1]).filter(Boolean)
  const duplicateVersions = versions.filter((version, index) => versions.indexOf(version) !== index)

  assert.deepEqual(duplicateVersions, [])
})

test('public RLS hardening package keeps expected chronological filenames', () => {
  for (const migration of hardeningMigrations) {
    assert.ok(readdirSync(migrationsDir).includes(migration.file), `${migration.file} exists`)
  }
})

test('public RLS hardening migrations enable RLS and remove anonymous table grants', () => {
  for (const migration of hardeningMigrations) {
    const sql = readMigration(migration.file)

    for (const table of migration.tables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`, 'i'))
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon;`, 'i'))
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from authenticated;`, 'i'))
      assert.match(sql, new RegExp(`grant ${migration.grants} on table public\\.${table} to authenticated;`, 'i'))
    }
  }
})

test('public RLS hardening migrations define expected RBAC policies', () => {
  for (const migration of hardeningMigrations) {
    const sql = readMigration(migration.file)
    const executableSql = stripSqlStringsAndComments(sql)

    assert.equal(countMatches(sql, /create policy "/gi), migration.policyCount)
    assert.doesNotMatch(executableSql, /current_user_role/i)
    assert.doesNotMatch(executableSql, /grant\s+[^;]*\bto anon\b/i)
    assert.doesNotMatch(executableSql, /\bservice_role\b/i)
    assert.doesNotMatch(executableSql, /force row level security/i)

    for (const permission of migration.permissions) {
      assert.match(sql, new RegExp(`has_app_permission\\('${permission}',`, 'i'))
    }
  }
})

test('public RLS hardening migrations only touch table RLS, policies, and grants', () => {
  for (const migration of hardeningMigrations) {
    const sql = readMigration(migration.file)

    assert.match(sql.trim(), /^begin;[\s\S]+commit;$/i)
    assert.doesNotMatch(sql, /\bcreate\s+(?:or\s+replace\s+)?function\b/i)
    assert.doesNotMatch(sql, /\bcreate\s+(?:or\s+replace\s+)?view\b/i)
    assert.doesNotMatch(sql, /\bcreate\s+trigger\b/i)
    assert.doesNotMatch(sql, /\b(drop|truncate)\s+table\b/i)
    assert.doesNotMatch(sql, /\b(insert|update|delete)\s+(?:into\s+|from\s+)?public\./i)
  }
})
