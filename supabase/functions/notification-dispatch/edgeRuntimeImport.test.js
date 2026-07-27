import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const indexSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
const adapterSource = readFileSync(new URL('./pushAdapter.js', import.meta.url), 'utf8')

test('notification-dispatch imports the web-push module at edge boot', () => {
  assert.match(indexSource, /import \* as webpush from 'jsr:@negrel\/webpush@0\.5\.0'/)
  assert.doesNotMatch(indexSource, /await import\(WEB_PUSH_MODULE_SPECIFIER\)/)
  assert.doesNotMatch(indexSource, /loadWebPushModule/)
  assert.doesNotMatch(indexSource, /WEB_PUSH_MODULE_SPECIFIER/)
  assert.doesNotMatch(adapterSource, /WEB_PUSH_MODULE_SPECIFIER/)
})
