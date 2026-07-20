import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateJobStatus,
  createResponseSummary,
  dedupeRecipients,
  sanitizeLogErrorMessage,
  shouldDeliverInApp,
} from './engineCore.js'

const payload = {
  category: 'system',
  priority: 'normal',
}

test('deduplicates recipients by auth user first', () => {
  const recipients = dedupeRecipients([
    { auth_user_id: 'user-1', member_id: 'member-1' },
    { auth_user_id: 'user-1', member_id: 'member-1' },
    { auth_user_id: null, member_id: 'member-2' },
  ])

  assert.equal(recipients.length, 2)
})

test('delivers active in-app recipient by default', () => {
  const decision = shouldDeliverInApp({
    payload,
    recipient: { auth_user_id: 'user-1', member_id: 'member-1', status: 'aktiv' },
    preference: null,
  })

  assert.equal(decision.deliver, true)
})

test('skips recipients without app account or inactive members', () => {
  assert.equal(shouldDeliverInApp({
    payload,
    recipient: { auth_user_id: null, member_id: 'member-1', status: 'aktiv' },
    preference: null,
  }).errorCode, 'no_app_user')

  assert.equal(shouldDeliverInApp({
    payload,
    recipient: { auth_user_id: 'user-1', member_id: 'member-1', status: 'ausgetreten' },
    preference: null,
  }).errorCode, 'inactive_user')
})

test('respects disabled in-app preferences for normal messages', () => {
  const decision = shouldDeliverInApp({
    payload,
    recipient: { auth_user_id: 'user-1', member_id: 'member-1', status: 'aktiv' },
    preference: { enabled: false, required: false },
  })

  assert.equal(decision.deliver, false)
  assert.equal(decision.errorCode, 'preference_disabled')
})

test('delivers critical system messages despite optional disabled preference', () => {
  const decision = shouldDeliverInApp({
    payload: { category: 'system', priority: 'critical' },
    recipient: { auth_user_id: 'user-1', member_id: 'member-1', status: 'aktiv' },
    preference: { enabled: false, required: false },
  })

  assert.equal(decision.deliver, true)
})

test('calculates job status from delivery counters', () => {
  assert.equal(calculateJobStatus({ deliveredCount: 2, skippedCount: 0, failedCount: 0, recipientCount: 2 }), 'sent')
  assert.equal(calculateJobStatus({ deliveredCount: 1, skippedCount: 1, failedCount: 0, recipientCount: 2 }), 'partial')
  assert.equal(calculateJobStatus({ deliveredCount: 0, skippedCount: 0, failedCount: 2, recipientCount: 2 }), 'failed')
})

test('creates response summaries and sanitizes log errors', () => {
  assert.deepEqual(createResponseSummary({
    jobId: 'job-1',
    existing: true,
    recipientCount: 1,
    deliveredCount: 1,
    skippedCount: 0,
    failedCount: 0,
  }), {
    success: true,
    existing: true,
    job_id: 'job-1',
    recipient_count: 1,
    delivered_count: 1,
    skipped_count: 0,
    failed_count: 0,
  })

  assert.equal(sanitizeLogErrorMessage('x'.repeat(200)).length, 180)
})
