import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import test from 'node:test'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260724180804_create_financing_liabilities_mvp.sql'),
  'utf8'
)

test('migration creates liability and repayment tables with RLS', () => {
  assert.match(migration, /create table if not exists public\.financing_liabilities/)
  assert.match(migration, /create table if not exists public\.financing_liability_repayments/)
  assert.match(migration, /alter table public\.financing_liabilities enable row level security/)
  assert.match(migration, /alter table public\.financing_liability_repayments enable row level security/)
})

test('migration provides computed balances through a security invoker view', () => {
  assert.match(migration, /create or replace view public\.financing_liability_balances\s+with \(security_invoker = true\)/)
  assert.match(migration, /greatest\(liability\.original_amount - coalesce\(repayments\.repaid_amount, 0\), 0\)/)
})

test('migration makes repayment and cash entry creation atomic in one RPC', () => {
  assert.match(migration, /create or replace function public\.create_financing_liability_repayment/)
  assert.match(migration, /insert into public\.cash_entries/)
  assert.match(migration, /insert into public\.financing_liability_repayments/)
  assert.match(migration, /repayment exceeds open amount/)
})

test('migration cancels repayments by soft-cancelling the linked cash entry', () => {
  assert.match(migration, /create or replace function public\.cancel_financing_liability_repayment/)
  assert.match(migration, /set\s+is_cancelled = true,/)
  assert.match(migration, /Rueckzahlung Vorfinanzierung storniert/)
})

test('migration grants vorfinanzierungen permissions to finance roles and not members', () => {
  assert.match(migration, /'kassier', 'vorfinanzierungen\.' \|\| action/)
  assert.match(migration, /'vorstand', 'vorfinanzierungen\.' \|\| action/)
  assert.match(migration, /'schriftfuehrer', 'vorfinanzierungen\.view'/)
  assert.doesNotMatch(migration, /'mitglied', 'vorfinanzierungen/)
})
