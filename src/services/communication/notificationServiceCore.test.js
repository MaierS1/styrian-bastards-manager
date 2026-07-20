import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createNotificationDispatcher,
  normalizeNotificationDispatchError,
} from './notificationServiceCore.js'

test('dispatchNotification invokes the notification-dispatch Edge Function with the payload body', async () => {
  const payload = {
    type: 'system_notice',
    title: 'Hinweis',
    message: 'Text',
    channels: ['in_app'],
    recipient_user_ids: ['11111111-1111-4111-8111-111111111111'],
  }

  const client = {
    functions: {
      async invoke(functionName, options) {
        assert.equal(functionName, 'notification-dispatch')
        assert.deepEqual(options, { body: payload })
        return {
          data: { success: true, job_id: 'job-1' },
          error: null,
        }
      },
    },
  }

  const result = await createNotificationDispatcher(client)(payload)

  assert.equal(result.error, null)
  assert.deepEqual(result.data, { success: true, job_id: 'job-1' })
})

test('dispatchNotification normalizes Supabase invoke errors', async () => {
  const client = {
    functions: {
      async invoke() {
        return {
          data: null,
          error: { message: 'Forbidden', context: { status: 403 } },
        }
      },
    },
  }

  const result = await createNotificationDispatcher(client)({})

  assert.equal(result.data, null)
  assert.equal(result.error.message, 'Forbidden')
  assert.equal(result.error.status, 403)
})

test('dispatchNotification normalizes structured function error responses', async () => {
  const client = {
    functions: {
      async invoke() {
        return {
          data: { error: 'Dieser Kanal ist im V1-MVP noch nicht unterstuetzt.', status: 422 },
          error: null,
        }
      },
    },
  }

  const result = await createNotificationDispatcher(client)({})

  assert.equal(result.data, null)
  assert.equal(result.error.message, 'Dieser Kanal ist im V1-MVP noch nicht unterstuetzt.')
  assert.equal(result.error.status, 422)
})

test('normalizeNotificationDispatchError provides a safe fallback message', () => {
  const result = normalizeNotificationDispatchError(null)

  assert.equal(result.message, 'Benachrichtigung konnte nicht gesendet werden.')
  assert.equal(result.status, null)
})
