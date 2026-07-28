import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  new URL('../../../supabase/migrations/20260728120000_harden_cash_entries_rls.sql', import.meta.url),
  'utf8',
)

const productionMigration = readFileSync(
  new URL('../../../supabase/migrations/20260728121000_replace_cash_entries_legacy_rls_with_rbac.sql', import.meta.url),
  'utf8',
)

const normalizeSql = (sql) => sql.replace(/\s+/g, ' ').trim()

const countMatches = (sql, pattern) => [...sql.matchAll(pattern)].length

test('cash entries migration enables RLS and removes anonymous table access', () => {
  assert.match(migration, /alter table public\.cash_entries enable row level security;/i)
  assert.match(migration, /revoke all on table public\.cash_entries from anon;/i)
  assert.match(migration, /grant select, insert, update, delete on table public\.cash_entries to authenticated;/i)
})

test('cash entries policies restrict access to explicit kassa permissions', () => {
  assert.match(migration, /for select[\s\S]+has_app_permission\('kassa', 'view'\)/i)
  assert.match(migration, /for insert[\s\S]+has_app_permission\('kassa', 'create'\)/i)
  assert.match(migration, /for update[\s\S]+has_app_permission\('kassa', 'edit'\)/i)
  assert.match(migration, /for delete[\s\S]+has_app_permission\('kassa', 'delete'\)/i)
  assert.doesNotMatch(migration, /to anon/i)
})

test('production cash entries migration removes legacy policies and keeps RBAC access model', () => {
  const legacyPolicyNames = [
    'cash_entries_delete',
    'cash_entries_update',
    'finance_all_cash_entries',
  ]

  for (const policyName of legacyPolicyNames) {
    assert.match(
      productionMigration,
      new RegExp(`drop policy if exists "${policyName}" on public\\.cash_entries;`, 'i'),
    )
  }

  assert.match(productionMigration, /alter table public\.cash_entries enable row level security;/i)
  assert.match(productionMigration, /revoke all on table public\.cash_entries from anon;/i)
  assert.match(productionMigration, /revoke all on table public\.cash_entries from authenticated;/i)
  assert.match(productionMigration, /grant select, insert, update, delete on table public\.cash_entries to authenticated;/i)
  assert.match(productionMigration, /has_app_permission\('kassa', 'view'\)/i)
  assert.match(productionMigration, /has_app_permission\('kassa', 'create'\)[\s\S]+has_app_permission\('kassa', 'edit'\)/i)
  assert.match(productionMigration, /has_app_permission\('kassa', 'delete'\)/i)
  assert.doesNotMatch(productionMigration, /current_user_role/i)
  assert.doesNotMatch(productionMigration, /using\s*\(\s*true\s*\)/i)
  assert.doesNotMatch(productionMigration, /with check\s*\(\s*true\s*\)/i)
})

test('production cash entries migration rebuilds existing target policies exactly once', () => {
  const targetPolicyNames = [
    'cash users can read cash entries',
    'cash editors can create cash entries',
    'cash editors can update cash entries',
    'cash deleters can delete cash entries',
  ]

  for (const policyName of targetPolicyNames) {
    const dropIndex = productionMigration.search(
      new RegExp(`drop policy if exists "${policyName}" on public\\.cash_entries;`, 'i'),
    )
    const createIndex = productionMigration.search(
      new RegExp(`create policy "${policyName}"\\s+on public\\.cash_entries`, 'i'),
    )

    assert.notEqual(dropIndex, -1, `${policyName} is dropped before recreation`)
    assert.notEqual(createIndex, -1, `${policyName} is recreated`)
    assert.ok(dropIndex < createIndex, `${policyName} drop precedes create`)
    assert.equal(
      countMatches(
        productionMigration,
        new RegExp(`create policy "${policyName}"\\s+on public\\.cash_entries`, 'gi'),
      ),
      1,
      `${policyName} is created exactly once`,
    )
  }

  assert.equal(countMatches(productionMigration, /create policy "/gi), 4)
  assert.doesNotMatch(productionMigration, /if not exists/i)
  assert.doesNotMatch(productionMigration, /from pg_policy/i)
})

test('production cash entries migration keeps grants narrow and service role untouched', () => {
  assert.match(productionMigration, /revoke all on table public\.cash_entries from anon;/i)
  assert.match(productionMigration, /revoke all on table public\.cash_entries from authenticated;/i)
  assert.match(productionMigration, /grant select, insert, update, delete on table public\.cash_entries to authenticated;/i)
  assert.doesNotMatch(productionMigration, /grant\s+[^;]*(truncate|references|trigger)[^;]*on table public\.cash_entries/i)
  assert.doesNotMatch(productionMigration, /\bservice_role\b/i)
  assert.doesNotMatch(productionMigration, /grant\s+[^;]*\bto anon\b/i)
})

test('production cash entries migration is transactional and does not mutate cash data', () => {
  const sql = normalizeSql(productionMigration)

  assert.match(sql, /^begin; /i)
  assert.match(sql, / commit;$/i)
  assert.doesNotMatch(productionMigration, /force row level security/i)
  assert.doesNotMatch(productionMigration, /\b(insert|update|delete|truncate)\s+(?:into\s+|from\s+)?public\.cash_entries\b/i)
})

test('production cash entries policies bind authenticated RBAC checks to each operation', () => {
  assert.match(
    productionMigration,
    /create policy "cash users can read cash entries"\s+on public\.cash_entries\s+for select\s+to authenticated\s+using\s*\(\s*public\.has_app_permission\('kassa', 'view'\)\s*\);/i,
  )
  assert.match(
    productionMigration,
    /create policy "cash editors can create cash entries"\s+on public\.cash_entries\s+for insert\s+to authenticated\s+with check\s*\(\s*public\.has_app_permission\('kassa', 'create'\)\s+or\s+public\.has_app_permission\('kassa', 'edit'\)\s*\);/i,
  )
  assert.match(
    productionMigration,
    /create policy "cash editors can update cash entries"\s+on public\.cash_entries\s+for update\s+to authenticated\s+using\s*\(\s*public\.has_app_permission\('kassa', 'edit'\)\s*\)\s+with check\s*\(\s*public\.has_app_permission\('kassa', 'edit'\)\s*\);/i,
  )
  assert.match(
    productionMigration,
    /create policy "cash deleters can delete cash entries"\s+on public\.cash_entries\s+for delete\s+to authenticated\s+using\s*\(\s*public\.has_app_permission\('kassa', 'delete'\)\s*\);/i,
  )
})
