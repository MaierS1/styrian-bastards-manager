import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('send-invoice-email handler avoids duplicate const declarations that break production boot', () => {
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
  const payloadResultDeclarations = source.match(/\bconst\s+payloadResult\b/g) || []

  assert.equal(payloadResultDeclarations.length, 1)
  assert.match(source, /\bconst\s+notificationPayloadResult\b/)
})
