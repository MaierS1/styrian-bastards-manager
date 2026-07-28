import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migrations = [
  {
    file: '../supabase/migrations/20260728150218_harden_public_documents_rls.sql',
    tables: ['documents'],
    modules: ['dokumente'],
  },
  {
    file: '../supabase/migrations/20260728150227_harden_public_invoice_rls.sql',
    tables: ['invoice_customers', 'invoices', 'invoice_items'],
    modules: ['rechnungen', 'kassa'],
  },
  {
    file: '../supabase/migrations/20260728150227_harden_public_inventory_rls.sql',
    tables: ['inventory_items'],
    modules: ['inventar'],
  },
  {
    file: '../supabase/migrations/20260728150227_harden_public_member_fee_rls.sql',
    tables: ['membership_fees', 'member_change_requests'],
    modules: ['beitraege', 'kassa', 'mitglieder'],
  },
  {
    file: '../supabase/migrations/20260728150227_harden_public_event_cash_aux_rls.sql',
    tables: ['event_checkins', 'cash_month_closings'],
    modules: ['events', 'kassa'],
  },
  {
    file: '../supabase/migrations/20260728150227_harden_public_audit_system_rls.sql',
    tables: ['audit_logs'],
    modules: ['systemeinstellungen'],
  },
]

const sqlByFile = migrations.map((migration) => ({
  ...migration,
  sql: readFileSync(new URL(migration.file, import.meta.url), 'utf8'),
}))

const cashRlsProductionMigration = readFileSync(
  new URL('../supabase/migrations/20260728121000_replace_cash_entries_legacy_rls_with_rbac.sql', import.meta.url),
  'utf8',
)

function stripSqlStringsAndComments(value) {
  return value
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:''|[^'])*'/g, "''")
}

function countMatches(sql, pattern) {
  return [...sql.matchAll(pattern)].length
}

test('P0 hardening migrations are scoped to RLS, policies, and grants', () => {
  for (const { file, sql } of sqlByFile) {
    const executableSql = stripSqlStringsAndComments(sql)

    assert.match(executableSql, /^\s*begin;/i, `${file} starts transactionally`)
    assert.match(executableSql, /commit;\s*$/i, `${file} commits transactionally`)
    assert.doesNotMatch(executableSql, /\bforce\s+row\s+level\s+security\b/i, `${file} does not force RLS`)
    assert.doesNotMatch(executableSql, /\b(insert\s+into|update|delete\s+from|merge|truncate)\s+public\./i, `${file} does not mutate table data`)
    assert.doesNotMatch(executableSql, /\b(create|drop)\s+(table|index|function|trigger|view|type|schema)\b/i, `${file} does not create or drop schema objects`)
    assert.doesNotMatch(executableSql, /\balter\s+table\b[\s\S]*\b(add|drop|alter)\s+column\b/i, `${file} does not change columns`)
    assert.doesNotMatch(executableSql, /\bservice_role\b/i, `${file} leaves service_role untouched`)
    assert.doesNotMatch(executableSql, /\bgrant\b[\s\S]*\bto\s+anon\b/i, `${file} grants nothing to anon`)
    assert.doesNotMatch(executableSql, /\bgrant\b[^;]*(references|trigger|truncate)[^;]*\bto\s+authenticated\b/i, `${file} keeps authenticated grants narrow`)
    assert.doesNotMatch(executableSql, /using\s*\(\s*true\s*\)/i, `${file} has no broad USING true policy`)
    assert.doesNotMatch(executableSql, /with\s+check\s*\(\s*true\s*\)/i, `${file} has no broad WITH CHECK true policy`)
  }
})

test('P0 hardening migrations enable RLS and revoke broad client grants', () => {
  for (const { file, sql, tables } of sqlByFile) {
    for (const table of tables) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`, 'i'), `${file} enables RLS on ${table}`)
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon;`, 'i'), `${file} revokes anon on ${table}`)
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from authenticated;`, 'i'), `${file} resets authenticated on ${table}`)
    }
  }
})

test('P0 hardening migrations use public.has_app_permission module/action checks', () => {
  for (const { file, sql, modules } of sqlByFile) {
    for (const module of modules) {
      assert.match(
        sql,
        new RegExp(`public\\.has_app_permission\\('${module}',\\s*'(view|create|edit|delete)'\\)`, 'i'),
        `${file} checks ${module} permissions`,
      )
    }
  }
})

test('sensitive table policies separate SELECT, INSERT, UPDATE, and DELETE where direct CRUD is granted', () => {
  for (const { file, sql, tables } of sqlByFile) {
    for (const table of tables) {
      const hasDeleteGrant = new RegExp(`grant select, insert, update, delete on table public\\.${table} to authenticated;`, 'i').test(sql)

      assert.match(sql, new RegExp(`on public\\.${table}\\s+for select\\s+to authenticated\\s+using`, 'i'), `${file} has SELECT policy for ${table}`)
      assert.match(sql, new RegExp(`on public\\.${table}\\s+for insert\\s+to authenticated\\s+with check`, 'i'), `${file} has INSERT policy for ${table}`)

      if (hasDeleteGrant) {
        assert.match(sql, new RegExp(`on public\\.${table}\\s+for update\\s+to authenticated\\s+using[\\s\\S]+with check`, 'i'), `${file} has UPDATE policy for ${table}`)
        assert.match(sql, new RegExp(`on public\\.${table}\\s+for delete\\s+to authenticated\\s+using`, 'i'), `${file} has DELETE policy for ${table}`)
      }
    }
  }
})

test('P0 hardening migrations are idempotent for policy replacement', () => {
  for (const { file, sql } of sqlByFile) {
    const createPolicyNames = [...sql.matchAll(/create policy "([^"]+)"/gi)].map((match) => match[1])

    assert.ok(createPolicyNames.length > 0, `${file} creates policies`)
    assert.equal(new Set(createPolicyNames).size, createPolicyNames.length, `${file} creates each policy once`)

    for (const policyName of createPolicyNames) {
      assert.match(sql, new RegExp(`drop policy if exists "${policyName}" on public\\.`, 'i'), `${file} drops ${policyName} before creating it`)
      assert.equal(countMatches(sql, new RegExp(`create policy "${policyName}"`, 'gi')), 1, `${file} creates ${policyName} exactly once`)
    }
  }
})

test('P0 hardening migrations do not touch the pending cash entries migration', () => {
  assert.match(cashRlsProductionMigration, /public\.cash_entries/i)
  assert.doesNotMatch(
    sqlByFile.map(({ sql }) => sql).join('\n'),
    /public\.cash_entries|replace_cash_entries_legacy_rls_with_rbac/i,
  )
})
