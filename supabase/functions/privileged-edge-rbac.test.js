import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const inviteMemberUser = readFileSync(
  new URL('./invite-member-user/index.ts', import.meta.url),
  'utf8',
)

const productOfferSearch = readFileSync(
  new URL('./product-offer-search/index.ts', import.meta.url),
  'utf8',
)

function stripStringsAndComments(source) {
  return source
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
}

function assertUsesRbacPermission(source, module, action) {
  assert.match(source, /userClient\.rpc\('has_app_permission'/)
  assert.match(source, new RegExp(`p_module:\\s*'${module}'`))
  assert.match(source, new RegExp(`p_action:\\s*'${action}'`))
}

function assertFailsClosedOnRbacError(source, permissionVariable) {
  const permissionErrorIndex = source.search(/if\s*\(permissionError\)\s*{/)
  const deniedIndex = source.search(new RegExp(`if\\s*\\(!${permissionVariable}\\)\\s*{`))

  assert.notEqual(permissionErrorIndex, -1)
  assert.notEqual(deniedIndex, -1)
  assert.ok(source.slice(permissionErrorIndex, deniedIndex).includes('500'))
  assert.ok(source.slice(deniedIndex, deniedIndex + 220).includes('403'))
}

test('invite-member-user authorizes with systemeinstellungen.edit through user JWT RBAC', () => {
  assertUsesRbacPermission(inviteMemberUser, 'systemeinstellungen', 'edit')
  assertFailsClosedOnRbacError(inviteMemberUser, 'canInviteUsers')
})

test('invite-member-user has no direct caller app_role authorization fallback', () => {
  const executableSource = stripStringsAndComments(inviteMemberUser)

  assert.doesNotMatch(executableSource, /\.select\([^)]*app_role[^)]*\)/)
  assert.doesNotMatch(executableSource, /\[['"]admin['"],\s*['"]super_admin['"],\s*['"]administrator['"]\]\.includes/)
  assert.doesNotMatch(executableSource, /callerMember|callerError/)
  assert.match(inviteMemberUser, /if\s*\(!authHeader\.startsWith\('Bearer '\)\)/)
})

test('product-offer-search authorizes with einkauf.edit through user JWT RBAC', () => {
  assertUsesRbacPermission(productOfferSearch, 'einkauf', 'edit')
  assertFailsClosedOnRbacError(productOfferSearch, 'canSearchOffers')
})

test('product-offer-search has no direct role-list authorization fallback', () => {
  const executableSource = stripStringsAndComments(productOfferSearch)

  assert.doesNotMatch(executableSource, /purchaseRoles|isPurchaseManager/)
  assert.doesNotMatch(executableSource, /\.select\([^)]*(app_role|role)[^)]*\)/)
  assert.doesNotMatch(executableSource, /memberError|member\?\./)
  assert.match(productOfferSearch, /if\s*\(!authHeader\.startsWith\('Bearer '\)\)/)
})

test('privileged edge functions do not check RBAC with service-role clients', () => {
  assert.doesNotMatch(inviteMemberUser, /adminClient\.rpc\('has_app_permission'/)
  assert.doesNotMatch(productOfferSearch, /adminClient\.rpc\('has_app_permission'/)
})
