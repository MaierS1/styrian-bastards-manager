import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const componentSource = readFileSync(
  new URL('./PortalNotificationPreferences.jsx', import.meta.url),
  'utf8',
)

test('staging push test reads safe edge function error details', () => {
  assert.match(componentSource, /async function getSafeFunctionErrorMessage/)
  assert.match(componentSource, /response\.json\(\)/)
  assert.match(componentSource, /Test-Push fehlgeschlagen \(\$\{status\}\)/)
  assert.doesNotMatch(componentSource, /setError\(dispatchError\?\.message \|\| data\?\.error/)
})
