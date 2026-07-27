import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const foundationMigration = readFileSync(
  new URL('../../../supabase/migrations/20260705120000_create_communication_foundation.sql', import.meta.url),
  'utf8'
)
const hardeningMigration = readFileSync(
  new URL('../../../supabase/migrations/20260728100000_harden_push_subscription_infrastructure.sql', import.meta.url),
  'utf8'
)

test('push subscriptions foundation keeps ownership and RLS policies scoped to the current user', () => {
  assert.match(foundationMigration, /create table if not exists public\.push_subscriptions/)
  assert.match(foundationMigration, /auth_user_id uuid not null references auth\.users/)
  assert.match(foundationMigration, /create unique index if not exists push_subscriptions_endpoint_uidx/)
  assert.match(foundationMigration, /alter table public\.push_subscriptions enable row level security/)
  assert.match(foundationMigration, /members can create own push subscriptions/)
  assert.match(foundationMigration, /auth_user_id = auth\.uid\(\)/)
  assert.match(foundationMigration, /members can update own push subscriptions/)
})

test('push subscription hardening migration adds failure count and deterministic endpoint hash', () => {
  assert.match(hardeningMigration, /add column if not exists failure_count integer not null default 0/)
  assert.match(hardeningMigration, /add column if not exists endpoint_hash text generated always as \(md5\(endpoint\)\) stored/)
  assert.match(hardeningMigration, /push_subscriptions_failure_count_check/)
  assert.match(hardeningMigration, /push_subscriptions_endpoint_hash_idx/)
})
