export function createNotificationDispatcher(client) {
  return async function dispatch(payload) {
    const { data, error } = await client.functions.invoke('notification-dispatch', {
      body: payload,
    })

    if (error) {
      return {
        data: null,
        error: normalizeNotificationDispatchError(error),
      }
    }

    if (data?.error) {
      return {
        data: null,
        error: normalizeNotificationDispatchError(data),
      }
    }

    return {
      data,
      error: null,
    }
  }
}

export function normalizeNotificationDispatchError(error) {
  const message = error?.message || error?.error || 'Benachrichtigung konnte nicht gesendet werden.'
  const status = error?.status || error?.context?.status || null

  return {
    message,
    status,
    original: error,
  }
}
