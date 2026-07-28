import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const sql = readFileSync(new URL('./rbac-user-migration-dry-run.sql', import.meta.url), 'utf8')

const knownRoles = new Set([
  'super_admin',
  'administrator',
  'vorstand',
  'kassier',
  'schriftfuehrer',
  'rechnungspruefer',
  'mitglied',
])

const appRoleCandidates = {
  super_admin: { target: 'super_admin' },
  administrator: { target: 'administrator' },
  vorstand: { target: 'vorstand' },
  kassier: { target: 'kassier' },
  schriftfuehrer: { target: 'schriftfuehrer' },
  rechnungspruefer: { target: 'rechnungspruefer' },
  mitglied: { target: 'mitglied' },
  admin: { target: 'super_admin' },
  cashier: { target: 'kassier' },
  readonly: { target: 'mitglied' },
  members: { manualReview: true },
  checkin: { manualReview: true },
}

const clubRoleCandidates = {
  obmann: 'super_admin',
  obmann_stv: 'administrator',
  kassier: 'kassier',
  kassier_stv: 'kassier',
  schriftfuehrer: 'schriftfuehrer',
  schriftfuehrer_stv: 'schriftfuehrer',
  rechnungspruefer: 'rechnungspruefer',
  vorstandsmitglied: 'vorstand',
  beirat: 'vorstand',
  mitglied: 'mitglied',
  keine: 'mitglied',
}

function stripSqlStringsAndComments(value) {
  return value
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:''|[^'])*'/g, "''")
}

function resolveDryRunStatus(member, existingUserRoles = []) {
  const appCandidate = appRoleCandidates[member.app_role]
  const clubCandidate = clubRoleCandidates[member.club_role]
  const appRoleCandidate = appCandidate?.target ?? null
  const appRoleManualReview = appCandidate?.manualReview === true
  const proposedRole = appRoleManualReview ? null : (appRoleCandidate ?? clubCandidate ?? null)
  const hasConflict = Boolean(appRoleCandidate && clubCandidate && appRoleCandidate !== clubCandidate)

  if (member.status !== 'aktiv') return { status: 'skip_inactive', proposedRole }
  if (!member.auth_user_id) return { status: 'skip_no_auth', proposedRole }
  if (appRoleManualReview) return { status: 'manual_review', proposedRole }
  if (hasConflict) return { status: 'skip_conflict', proposedRole }
  if (!proposedRole || !knownRoles.has(proposedRole)) return { status: 'skip_unknown_role', proposedRole }
  if (existingUserRoles.some((role) => role.auth_user_id === member.auth_user_id && role.role_key === proposedRole)) {
    return { status: 'already_assigned', proposedRole }
  }
  return { status: 'auto_insert', proposedRole }
}

test('RBAC user migration dry run SQL is read-only', () => {
  const executableSql = stripSqlStringsAndComments(sql)

  assert.doesNotMatch(executableSql, /\b(insert|update|delete|merge|upsert|truncate|call)\b/i)
  assert.doesNotMatch(executableSql, /\b(create|alter|drop)\b/i)
  assert.doesNotMatch(executableSql, /\b(grant|revoke)\b/i)
  assert.match(sql, /proposed_insert_preview/i)
  assert.match(sql, /INSERT INTO public\.user_roles \(auth_user_id, role_key\)/)
})

test('dry run SQL uses only expected read sources', () => {
  const executableSql = stripSqlStringsAndComments(sql)

  assert.match(executableSql, /public\.members/i)
  assert.match(executableSql, /auth\.users/i)
  assert.match(executableSql, /public\.roles/i)
  assert.match(executableSql, /public\.user_roles/i)
  assert.match(executableSql, /public\.user_permissions/i)
  assert.match(executableSql, /public\.role_permissions/i)
  assert.match(executableSql, /public\.permissions/i)
})

test('legacy app roles map according to the approved target model', () => {
  assert.deepEqual(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: 'admin', club_role: 'obmann' }), {
    status: 'auto_insert',
    proposedRole: 'super_admin',
  })
  assert.deepEqual(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: 'readonly', club_role: 'mitglied' }), {
    status: 'auto_insert',
    proposedRole: 'mitglied',
  })
  assert.deepEqual(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: 'cashier', club_role: 'kassier' }), {
    status: 'auto_insert',
    proposedRole: 'kassier',
  })
  assert.equal(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: 'members', club_role: 'mitglied' }).status, 'manual_review')
  assert.equal(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: 'checkin', club_role: 'mitglied' }).status, 'manual_review')
})

test('club roles map according to the approved target model', () => {
  assert.equal(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: null, club_role: 'obmann' }).proposedRole, 'super_admin')
  assert.equal(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: null, club_role: 'obmann_stv' }).proposedRole, 'administrator')
  assert.equal(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: null, club_role: 'kassier_stv' }).proposedRole, 'kassier')
  assert.equal(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: null, club_role: 'schriftfuehrer_stv' }).proposedRole, 'schriftfuehrer')
})

test('dry run status classes cover skipped and assigned cases', () => {
  assert.equal(resolveDryRunStatus({ auth_user_id: null, status: 'aktiv', app_role: 'mitglied', club_role: 'mitglied' }).status, 'skip_no_auth')
  assert.equal(resolveDryRunStatus(
    { auth_user_id: 'u1', status: 'aktiv', app_role: 'mitglied', club_role: 'mitglied' },
    [{ auth_user_id: 'u1', role_key: 'mitglied' }],
  ).status, 'already_assigned')
  assert.equal(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: 'mitglied', club_role: 'obmann' }).status, 'skip_conflict')
  assert.equal(resolveDryRunStatus({ auth_user_id: 'u1', status: 'aktiv', app_role: 'unknown', club_role: 'unknown' }).status, 'skip_unknown_role')
  assert.equal(resolveDryRunStatus({ auth_user_id: 'u1', status: 'inaktiv', app_role: 'mitglied', club_role: 'mitglied' }).status, 'skip_inactive')
})

test('dry run fixture has no duplicate auto insert candidates', () => {
  const fixture = [
    { auth_user_id: 'u1', status: 'aktiv', app_role: 'admin', club_role: 'obmann' },
    { auth_user_id: 'u2', status: 'aktiv', app_role: 'readonly', club_role: 'mitglied' },
    { auth_user_id: 'u3', status: 'aktiv', app_role: 'cashier', club_role: 'kassier' },
    { auth_user_id: 'u4', status: 'aktiv', app_role: 'mitglied', club_role: 'mitglied' },
  ]

  const autoInsertKeys = fixture
    .map((member) => [member.auth_user_id, resolveDryRunStatus(member)])
    .filter(([, result]) => result.status === 'auto_insert')
    .map(([authUserId, result]) => `${authUserId}:${result.proposedRole}`)

  assert.equal(new Set(autoInsertKeys).size, autoInsertKeys.length)
})
