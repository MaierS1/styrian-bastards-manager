import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  new URL('../supabase/migrations/20260728140504_assign_initial_users_to_rbac_roles.sql', import.meta.url),
  'utf8'
)

const writableTargets = Array.from(migration.matchAll(/\b(?:insert\s+into|update|delete\s+from)\s+([a-z_][\w."]*)/gi))
  .map((match) => match[1].replaceAll('"', '').toLowerCase())

function stripSqlStringsAndComments(value) {
  return value
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:''|[^'])*'/g, "''")
}

function resolveMigrationRole(member, existingRoles = [], availableRoles = new Set(['super_admin', 'mitglied'])) {
  if (member.status !== 'aktiv') return null
  if (!member.auth_user_id) return null
  if (existingRoles.some((role) => role.auth_user_id === member.auth_user_id && role.role_key === member.targetRole)) {
    return null
  }

  if (
    member.app_role === 'admin'
    && member.club_role === 'obmann'
    && availableRoles.has('super_admin')
  ) {
    return 'super_admin'
  }

  if (
    member.app_role === 'mitglied'
    && ['mitglied', 'keine', null, undefined].includes(member.club_role)
    && availableRoles.has('mitglied')
  ) {
    return 'mitglied'
  }

  return null
}

test('migration writes only to public.user_roles', () => {
  assert.deepEqual(new Set(writableTargets), new Set(['public.user_roles']))
  assert.doesNotMatch(migration, /\bupdate\s+public\.members\b/i)
  assert.doesNotMatch(migration, /\b(update|insert\s+into|delete\s+from)\s+public\.user_permissions\b/i)
  assert.doesNotMatch(migration, /\b(update|insert\s+into|delete\s+from)\s+public\.role_permissions\b/i)
  assert.doesNotMatch(migration, /\b(update|insert\s+into|delete\s+from)\s+public\.permissions\b/i)
  assert.doesNotMatch(migration, /\b(update|insert\s+into|delete\s+from)\s+public\.roles\b/i)
})

test('migration uses existing users and existing target roles only', () => {
  assert.match(migration, /join auth\.users au\s+on au\.id = m\.auth_user_id/i)
  assert.match(migration, /join public\.roles target_role\s+on target_role\.key = 'super_admin'/i)
  assert.match(migration, /join public\.roles target_role\s+on target_role\.key = 'mitglied'/i)
})

test('migration maps only approved active authenticated member combinations', () => {
  assert.equal(resolveMigrationRole({
    auth_user_id: 'u1',
    status: 'aktiv',
    app_role: 'admin',
    club_role: 'obmann',
  }), 'super_admin')
  assert.equal(resolveMigrationRole({
    auth_user_id: 'u2',
    status: 'aktiv',
    app_role: 'mitglied',
    club_role: 'keine',
  }), 'mitglied')
  assert.equal(resolveMigrationRole({
    auth_user_id: 'u3',
    status: 'aktiv',
    app_role: 'mitglied',
    club_role: 'mitglied',
  }), 'mitglied')
})

test('migration excludes unapproved and unsafe member combinations', () => {
  assert.equal(resolveMigrationRole({ auth_user_id: null, status: 'aktiv', app_role: 'admin', club_role: 'obmann' }), null)
  assert.equal(resolveMigrationRole({ auth_user_id: 'u1', status: 'aktiv', app_role: 'members', club_role: 'mitglied' }), null)
  assert.equal(resolveMigrationRole({ auth_user_id: 'u1', status: 'aktiv', app_role: 'cashier', club_role: 'kassier' }), null)
  assert.equal(resolveMigrationRole({ auth_user_id: 'u1', status: 'aktiv', app_role: 'checkin', club_role: 'mitglied' }), null)
  assert.equal(resolveMigrationRole({ auth_user_id: 'u1', status: 'aktiv', app_role: 'readonly', club_role: 'mitglied' }), null)
  assert.equal(resolveMigrationRole({ auth_user_id: 'u1', status: 'inaktiv', app_role: 'mitglied', club_role: 'mitglied' }), null)
  assert.equal(resolveMigrationRole({ auth_user_id: 'u1', status: 'aktiv', app_role: 'mitglied', club_role: 'obmann' }), null)
})

test('migration skips assignments when the target role does not exist', () => {
  assert.equal(resolveMigrationRole(
    { auth_user_id: 'u1', status: 'aktiv', app_role: 'admin', club_role: 'obmann' },
    [],
    new Set(['mitglied']),
  ), null)
  assert.equal(resolveMigrationRole(
    { auth_user_id: 'u2', status: 'aktiv', app_role: 'mitglied', club_role: 'keine' },
    [],
    new Set(['super_admin']),
  ), null)
})

test('migration is idempotent for existing assignments', () => {
  assert.match(migration, /on conflict \(auth_user_id, role_key\) do nothing/gi)
  assert.equal(resolveMigrationRole(
    {
      auth_user_id: 'u1',
      targetRole: 'super_admin',
      status: 'aktiv',
      app_role: 'admin',
      club_role: 'obmann',
    },
    [{ auth_user_id: 'u1', role_key: 'super_admin' }],
  ), null)
})

test('migration contains no hard-coded user identifiers or email addresses', () => {
  const executableSql = stripSqlStringsAndComments(migration)

  assert.doesNotMatch(executableSql, /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i)
  assert.doesNotMatch(migration, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
})

test('migration remains limited to two deterministic insert blocks', () => {
  assert.equal(writableTargets.length, 2)
  assert.match(migration, /m\.app_role = 'admin'\s+and m\.role = 'obmann'/i)
  assert.match(migration, /m\.app_role = 'mitglied'\s+and coalesce\(m\.role, 'keine'\) in \('mitglied', 'keine'\)/i)
})
