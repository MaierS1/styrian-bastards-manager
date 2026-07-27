import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  new URL('../../../supabase/migrations/20260728120000_harden_cash_entries_rls.sql', import.meta.url),
  'utf8',
)

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
