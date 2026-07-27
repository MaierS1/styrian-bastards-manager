import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  dangerButtonStyle,
  headingStyle,
  isMobile,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'
import { PushService } from '../../services/communication/PushService'
import { supabase } from '../../lib/supabase'
import {
  fetchNotificationPreferences,
  saveNotificationPreferences,
} from '../../services/repositories/notificationRepository'
import {
  deactivatePushSubscription,
  fetchOwnPushSubscriptions,
  markPushSubscriptionSeen,
  savePushSubscription,
  updateDeviceLabel,
} from '../../services/repositories/pushSubscriptionRepository'
import {
  notificationCategoryLabels,
  notificationPreferenceConfig,
  requiredNotificationTypes,
} from './notificationPreferenceConfig'

const ACTIVE_CHANNELS = ['in_app', 'email', 'push']
const PREPARED_CHANNELS = []

const channelLabels = {
  in_app: 'In-App',
  push: 'Push',
  email: 'E-Mail',
}

function buildPreferenceKey(notificationType, channel) {
  return `${notificationType}:${channel}`
}

function createDefaultPreference(configItem, channel, currentMember) {
  const isRequired = channel !== 'push' && requiredNotificationTypes.has(configItem.notification_type)
  const isPrepared = PREPARED_CHANNELS.includes(channel)

  return {
    auth_user_id: currentMember?.auth_user_id || null,
    member_id: currentMember?.id || null,
    notification_type: configItem.notification_type,
    category: configItem.category,
    channel,
    enabled: isPrepared ? false : true,
    required: isPrepared ? false : isRequired,
    opted_in_at: null,
    opted_out_at: null,
  }
}

function normalizePreference(configItem, channel, currentMember, existingPreference) {
  const isRequired = channel !== 'push' && requiredNotificationTypes.has(configItem.notification_type)
  const isPrepared = PREPARED_CHANNELS.includes(channel)
  const defaultPreference = createDefaultPreference(configItem, channel, currentMember)

  if (!existingPreference) return defaultPreference

  return {
    ...defaultPreference,
    ...existingPreference,
    auth_user_id: existingPreference.auth_user_id || currentMember?.auth_user_id || null,
    member_id: existingPreference.member_id || currentMember?.id || null,
    category: configItem.category,
    channel,
    required: isPrepared ? false : isRequired,
    enabled: isPrepared ? false : (isRequired ? true : Boolean(existingPreference.enabled)),
  }
}

function buildPreferenceState(rows, currentMember) {
  const preferencesByKey = new Map(
    (rows || []).map((preference) => [
      buildPreferenceKey(preference.notification_type, preference.channel),
      preference,
    ])
  )

  return notificationPreferenceConfig.reduce((state, configItem) => {
    ACTIVE_CHANNELS.forEach((channel) => {
      const preferenceKey = buildPreferenceKey(configItem.notification_type, channel)
      state[preferenceKey] = normalizePreference(
        configItem,
        channel,
        currentMember,
        preferencesByKey.get(preferenceKey)
      )
    })

    return state
  }, {})
}

function groupByCategory(configItems) {
  return configItems.reduce((groups, item) => {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
    return groups
  }, {})
}

function formatDateTime(value) {
  if (!value) return 'nie'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unbekannt'

  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function maskEndpoint(endpoint) {
  if (!endpoint) return 'kein Endpoint'
  if (endpoint.length <= 24) return endpoint

  return `${endpoint.slice(0, 16)}...${endpoint.slice(-8)}`
}

function getPermissionLabel(permission) {
  if (permission === 'granted') return 'granted'
  if (permission === 'denied') return 'denied'
  if (permission === 'default') return 'default'
  return 'unsupported'
}

function getSupportReasonText(reason) {
  const labels = {
    supported: 'Push ist technisch verfuegbar.',
    notification_unsupported: 'Die Notification API wird nicht unterstuetzt.',
    service_worker_unsupported: 'Service Worker werden nicht unterstuetzt.',
    push_manager_unsupported: 'PushManager wird nicht unterstuetzt.',
    insecure_context: 'Push benoetigt HTTPS oder localhost.',
    ios_home_screen_required: 'Push funktioniert auf iPhone/iPad nur mit installierter Home-Screen-App.',
    vapid_public_key_missing: 'VITE_VAPID_PUBLIC_KEY fehlt. Push kann noch nicht aktiviert werden.',
    permission_denied: 'Benachrichtigungen sind im Browser blockiert.',
  }

  return labels[reason] || 'Push-Status konnte nicht bestimmt werden.'
}

function getCurrentDeviceStatus({ supportStatus, currentBrowserSubscription, currentSavedSubscription }) {
  if (!supportStatus?.supported) return 'nicht unterstuetzt'
  if (!supportStatus.vapidPublicKey) return 'VAPID fehlt'
  if (supportStatus.permission === 'denied') return 'blockiert'
  if (currentBrowserSubscription && currentSavedSubscription?.is_active) return 'aktiv'
  return 'nicht aktiv'
}

export function PortalNotificationPreferences({ currentMember }) {
  const [preferencesByKey, setPreferencesByKey] = useState({})
  const [initialPreferencesByKey, setInitialPreferencesByKey] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const groupedPreferences = useMemo(() => groupByCategory(notificationPreferenceConfig), [])

  const loadPreferences = useCallback(async () => {
    if (!currentMember?.id && !currentMember?.auth_user_id) return

    setLoading(true)
    setError('')
    setSuccessMessage('')

    const result = await fetchNotificationPreferences({
      authUserId: currentMember.auth_user_id,
      memberId: currentMember.id,
    })

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    const nextState = buildPreferenceState(result.data || [], currentMember)
    setPreferencesByKey(nextState)
    setInitialPreferencesByKey(nextState)
    setLoading(false)
  }, [currentMember])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const togglePreference = useCallback((configItem, channel) => {
    if (PREPARED_CHANNELS.includes(channel)) return
    if (requiredNotificationTypes.has(configItem.notification_type)) return

    const key = buildPreferenceKey(configItem.notification_type, channel)

    setPreferencesByKey((currentPreferences) => ({
      ...currentPreferences,
      [key]: {
        ...currentPreferences[key],
        enabled: !currentPreferences[key]?.enabled,
      },
    }))
    setSuccessMessage('')
  }, [])

  const savePreferences = useCallback(async () => {
    if (!currentMember?.id && !currentMember?.auth_user_id) {
      setError('Kein Mitglied mit diesem Login verknuepft.')
      return
    }

    setSaving(true)
    setError('')
    setSuccessMessage('')

    const activePreferences = notificationPreferenceConfig.flatMap((configItem) => (
      ACTIVE_CHANNELS.map((channel) => {
        const key = buildPreferenceKey(configItem.notification_type, channel)
        const currentPreference = preferencesByKey[key] || createDefaultPreference(configItem, channel, currentMember)
        const isRequired = channel !== 'push' && requiredNotificationTypes.has(configItem.notification_type)
        const isPrepared = PREPARED_CHANNELS.includes(channel)
        const enabled = isPrepared ? false : (isRequired ? true : Boolean(currentPreference.enabled))
        const changedAt = new Date().toISOString()

        return {
          ...currentPreference,
          auth_user_id: currentPreference.auth_user_id || currentMember.auth_user_id || null,
          member_id: currentPreference.member_id || currentMember.id || null,
          notification_type: configItem.notification_type,
          category: configItem.category,
          channel,
          enabled,
          required: isPrepared ? false : isRequired,
          opted_in_at: enabled ? (currentPreference.opted_in_at || changedAt) : currentPreference.opted_in_at,
          opted_out_at: enabled ? null : changedAt,
        }
      })
    ))

    const result = await saveNotificationPreferences(activePreferences)

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    const nextState = buildPreferenceState(result.data || activePreferences, currentMember)
    setPreferencesByKey(nextState)
    setInitialPreferencesByKey(nextState)
    setSuccessMessage('Benachrichtigungseinstellungen gespeichert.')
    setSaving(false)
  }, [currentMember, preferencesByKey])

  const hasChanges = useMemo(() => {
    return notificationPreferenceConfig.some((configItem) => {
      return ACTIVE_CHANNELS.some((channel) => {
        const key = buildPreferenceKey(configItem.notification_type, channel)
        return (
          !preferencesByKey[key]?.id
          || Boolean(preferencesByKey[key]?.enabled) !== Boolean(initialPreferencesByKey[key]?.enabled)
        )
      })
    })
  }, [initialPreferencesByKey, preferencesByKey])

  return (
    <section style={styles.section} aria-label="Benachrichtigungseinstellungen">
      <h3 style={headingStyle}>Benachrichtigungseinstellungen</h3>

      <p style={mutedTextStyle}>
        In-App, E-Mail und Push verwenden dieselben fachlichen Einstellungen. Push wird nur nach Geraeteregistrierung und aktivierter Push-Praeferenz gesendet.
      </p>

      {loading && (
        <div style={styles.infoBox}>Einstellungen werden geladen...</div>
      )}

      {error && (
        <div style={styles.errorBox}>{error}</div>
      )}

      {successMessage && (
        <div style={styles.successBox}>{successMessage}</div>
      )}

      <PushDeviceSubscriptionPanel currentMember={currentMember} />

      {!loading && Object.entries(groupedPreferences).map(([category, items]) => (
        <div key={category} style={styles.categoryBlock}>
          <h4 style={styles.categoryTitle}>{notificationCategoryLabels[category] || category}</h4>

          <div style={styles.preferenceList}>
            {items.map((item) => {
              const isRequired = requiredNotificationTypes.has(item.notification_type)

              return (
                <article key={item.notification_type} style={styles.preferenceRow}>
                  <div style={styles.preferenceText}>
                    <div style={styles.preferenceTitleLine}>
                      <strong>{item.label}</strong>
                      {isRequired && <span style={styles.requiredBadge}>Pflicht</span>}
                    </div>
                    <p style={styles.preferenceDescription}>{item.description}</p>
                  </div>

                  <div style={styles.channelGrid}>
                    {ACTIVE_CHANNELS.map((channel) => {
                      const preferenceKey = buildPreferenceKey(item.notification_type, channel)
                      const channelPreference = preferencesByKey[preferenceKey] || createDefaultPreference(item, channel, currentMember)
                      const isPrepared = PREPARED_CHANNELS.includes(channel)
                      const isRequiredForChannel = channel !== 'push' && isRequired
                      const disabled = isPrepared || isRequiredForChannel || saving
                      const checked = isPrepared ? false : (isRequiredForChannel || Boolean(channelPreference.enabled))

                      return (
                        <label key={channel} style={isPrepared ? styles.preparedChannel : styles.channelToggle}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => togglePreference(item, channel)}
                            style={styles.checkbox}
                          />
                        <span>
                          <strong>{channelLabels[channel]}</strong>
                          <small style={styles.channelHint}>
                            {isPrepared ? 'noch nicht verfuegbar' : isRequiredForChannel ? 'immer aktiv' : 'aktiv'}
                          </small>
                        </span>
                        </label>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      ))}

      <div style={styles.actionRow}>
        <button
          type="button"
          onClick={savePreferences}
          disabled={loading || saving || !hasChanges}
          style={{
            ...buttonStyle,
            opacity: loading || saving || !hasChanges ? 0.65 : 1,
            cursor: loading || saving || !hasChanges ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Speichern...' : 'Einstellungen speichern'}
        </button>

        <button
          type="button"
          onClick={loadPreferences}
          disabled={loading || saving}
          style={{
            ...secondaryButtonStyle,
            opacity: loading || saving ? 0.65 : 1,
            cursor: loading || saving ? 'not-allowed' : 'pointer',
          }}
        >
          Neu laden
        </button>
      </div>
    </section>
  )
}

function PushDeviceSubscriptionPanel({ currentMember }) {
  const [supportStatus, setSupportStatus] = useState(() => PushService.getBrowserSupportStatus())
  const [permission, setPermission] = useState(() => PushService.getPermission())
  const [browserSubscription, setBrowserSubscription] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const currentEndpoint = browserSubscription?.endpoint || ''
  const currentSavedSubscription = useMemo(() => (
    subscriptions.find((subscription) => subscription.endpoint === currentEndpoint) || null
  ), [currentEndpoint, subscriptions])

  const currentDeviceStatus = getCurrentDeviceStatus({
    supportStatus,
    currentBrowserSubscription: browserSubscription,
    currentSavedSubscription,
  })

  const loadPushState = useCallback(async () => {
    if (!currentMember?.id && !currentMember?.auth_user_id) return

    setLoading(true)
    setError('')

    const reconcileResult = await PushService.reconcileSubscription({
      currentMember,
      fetchSubscriptions: fetchOwnPushSubscriptions,
      saveSubscription: savePushSubscription,
      markSeen: markPushSubscriptionSeen,
    })

    if (reconcileResult.error) {
      setError(reconcileResult.error.message || 'Push-Status konnte nicht geladen werden.')
      setLoading(false)
      return
    }

    setSupportStatus(reconcileResult.supportStatus)
    setPermission(reconcileResult.permission)
    setBrowserSubscription(reconcileResult.browserSubscription)
    setSubscriptions(reconcileResult.subscriptions)
    setLoading(false)
  }, [currentMember])

  useEffect(() => {
    loadPushState()
  }, [loadPushState])

  const handleActivatePush = useCallback(async () => {
    if (!currentMember?.auth_user_id) {
      setError('Kein Login fuer dieses Mitglied verknuepft.')
      return
    }

    setActionLoading(true)
    setError('')
    setMessage('')

    const nextSupportStatus = PushService.getBrowserSupportStatus()
    setSupportStatus(nextSupportStatus)

    if (!nextSupportStatus.supported || !nextSupportStatus.vapidPublicKey) {
      setError(getSupportReasonText(nextSupportStatus.reason))
      setActionLoading(false)
      return
    }

    const nextPermission = nextSupportStatus.permission === 'granted'
      ? 'granted'
      : await PushService.requestPermission()

    setPermission(nextPermission)

    if (nextPermission !== 'granted') {
      setError(nextPermission === 'denied'
        ? 'Benachrichtigungen sind im Browser blockiert.'
        : 'Push wurde nicht aktiviert.')
      setActionLoading(false)
      return
    }

    const subscriptionResult = await PushService.subscribe({
      currentMember,
      saveSubscription: savePushSubscription,
    })

    if (subscriptionResult.error || !subscriptionResult.subscription) {
      setError(getSupportReasonText(subscriptionResult.error) || subscriptionResult.saveError?.message || 'Push konnte nicht aktiviert werden.')
      setActionLoading(false)
      return
    }

    setMessage('Push ist auf diesem Geraet aktiviert.')
    await loadPushState()
    setActionLoading(false)
  }, [currentMember, loadPushState])

  const handleDeactivatePush = useCallback(async () => {
    setActionLoading(true)
    setError('')
    setMessage('')

    const unsubscribeResult = await PushService.unsubscribe({
      subscriptionId: currentSavedSubscription?.id,
      endpoint: currentSavedSubscription?.endpoint,
      deactivateSubscription: deactivatePushSubscription,
    })

    if (unsubscribeResult.deactivateError) {
      setError(unsubscribeResult.deactivateError.message)
      setActionLoading(false)
      return
    }

    setMessage('Push ist auf diesem Geraet deaktiviert.')
    await loadPushState()
    setActionLoading(false)
  }, [currentSavedSubscription, loadPushState])

  const handleRenameDevice = useCallback(async (subscription) => {
    const nextLabel = window.prompt('Geraetename', subscription.device_label || 'Browser')
    if (nextLabel === null) return

    setActionLoading(true)
    setError('')
    setMessage('')

    const result = await updateDeviceLabel({
      id: subscription.id,
      deviceLabel: nextLabel,
    })

    if (result.error) {
      setError(result.error.message)
      setActionLoading(false)
      return
    }

    setMessage('Geraetename gespeichert.')
    await loadPushState()
    setActionLoading(false)
  }, [loadPushState])

  const handleSendTestPush = useCallback(async () => {
    if (!currentMember?.auth_user_id) {
      setError('Kein Login fuer dieses Mitglied verknuepft.')
      return
    }

    setActionLoading(true)
    setError('')
    setMessage('')

    const { data, error: dispatchError } = await supabase.functions.invoke('notification-dispatch', {
      body: {
      type: 'staging_push_test',
      category: 'system',
      title: 'Staging Push-Test',
      message: 'Der Push-Kanal der Notification Engine funktioniert.',
      channels: ['push'],
      recipient_user_id: currentMember.auth_user_id,
      source: {
        module: 'communication',
        entity_type: 'staging_push_test',
        entity_id: currentMember.auth_user_id,
      },
      url: '/notifications',
      priority: 'normal',
      idempotency_key: `staging-push-test:${currentMember.auth_user_id}:${Date.now()}`,
      metadata: {
        staging_test: true,
      },
      },
    })

    if (dispatchError || data?.error) {
      setError(dispatchError?.message || data?.error || 'Test-Push konnte nicht gesendet werden.')
      setActionLoading(false)
      return
    }

    setMessage('Staging-Test-Push wurde an dieses Benutzerkonto gesendet.')
    await loadPushState()
    setActionLoading(false)
  }, [currentMember, loadPushState])

  const canActivate = supportStatus?.supported
    && supportStatus?.vapidPublicKey
    && permission !== 'denied'
    && currentDeviceStatus !== 'aktiv'
    && !actionLoading

  const canDeactivate = currentDeviceStatus === 'aktiv' && !actionLoading

  return (
    <section style={styles.pushPanel} aria-label="Push auf diesem Geraet">
      <div style={styles.pushHeader}>
        <div>
          <h4 style={styles.categoryTitle}>Push auf diesem Geraet</h4>
          <p style={styles.preferenceDescription}>
            Technische Geraete-Subscription. Fachliche Push-Meldungen werden nur gesendet, wenn die jeweilige Push-Praeferenz aktiv ist.
          </p>
        </div>
        <span style={{
          ...styles.statusBadge,
          ...(currentDeviceStatus === 'aktiv' ? styles.statusBadgeActive : null),
          ...(currentDeviceStatus === 'blockiert' || currentDeviceStatus === 'VAPID fehlt' ? styles.statusBadgeWarning : null),
        }}>
          {currentDeviceStatus}
        </span>
      </div>

      {supportStatus?.ios && !supportStatus?.standalone && (
        <div style={styles.infoBox}>
          Push funktioniert auf iPhone/iPad nur mit installierter Home-Screen-App.
        </div>
      )}

      <div style={styles.pushStatusGrid}>
        <StatusItem label="Browser unterstuetzt Push" value={supportStatus?.supported ? 'ja' : 'nein'} />
        <StatusItem label="Permission Status" value={getPermissionLabel(permission)} />
        <StatusItem label="Service Worker" value={supportStatus?.serviceWorker ? 'ja' : 'nein'} />
        <StatusItem label="VAPID Public Key" value={supportStatus?.vapidPublicKey ? 'vorhanden' : 'fehlt'} />
      </div>

      <p style={styles.supportReason}>
        {getSupportReasonText(supportStatus?.reason)} Push erzeugt keinen automatischen Permission-Prompt.
      </p>

      {loading && (
        <div style={styles.infoBox}>Push-Status wird geladen...</div>
      )}

      {error && (
        <div style={styles.errorBox}>{error}</div>
      )}

      {message && (
        <div style={styles.successBox}>{message}</div>
      )}

      <div style={styles.actionRow}>
        <button
          type="button"
          onClick={handleActivatePush}
          disabled={!canActivate}
          style={{
            ...buttonStyle,
            opacity: canActivate ? 1 : 0.65,
            cursor: canActivate ? 'pointer' : 'not-allowed',
          }}
        >
          {actionLoading ? 'Bitte warten...' : 'Push auf diesem Geraet aktivieren'}
        </button>

        <button
          type="button"
          onClick={handleDeactivatePush}
          disabled={!canDeactivate}
          style={{
            ...dangerButtonStyle,
            opacity: canDeactivate ? 1 : 0.65,
            cursor: canDeactivate ? 'pointer' : 'not-allowed',
          }}
        >
          Push auf diesem Geraet deaktivieren
        </button>

        <button
          type="button"
          onClick={loadPushState}
          disabled={loading || actionLoading}
          style={{
            ...secondaryButtonStyle,
            opacity: loading || actionLoading ? 0.65 : 1,
            cursor: loading || actionLoading ? 'not-allowed' : 'pointer',
          }}
        >
          Geraete neu laden
        </button>

        <button
          type="button"
          onClick={handleSendTestPush}
          disabled={currentDeviceStatus !== 'aktiv' || actionLoading}
          style={{
            ...secondaryButtonStyle,
            opacity: currentDeviceStatus === 'aktiv' && !actionLoading ? 1 : 0.65,
            cursor: currentDeviceStatus === 'aktiv' && !actionLoading ? 'pointer' : 'not-allowed',
          }}
        >
          Staging-Test-Push senden
        </button>
      </div>

      <div style={styles.deviceList}>
        <h5 style={styles.deviceListTitle}>Geraeteuebersicht</h5>

        {subscriptions.length === 0 && (
          <div style={styles.emptyDeviceState}>Keine Push-Geraete gespeichert.</div>
        )}

        {subscriptions.map((subscription) => {
          const isCurrentDevice = subscription.endpoint === currentEndpoint

          return (
            <article key={subscription.id} style={styles.deviceRow}>
              <div style={styles.deviceMain}>
                <strong>{subscription.device_label || 'Browser'}</strong>
                {isCurrentDevice && <span style={styles.currentDeviceBadge}>aktuelles Geraet</span>}
                <small style={styles.endpointText}>{maskEndpoint(subscription.endpoint)}</small>
              </div>
              <div style={styles.deviceMeta}>
                <span>{subscription.platform || 'Plattform unbekannt'}</span>
                <span>zuletzt gesehen: {formatDateTime(subscription.last_seen_at || subscription.updated_at)}</span>
                <span>Fehler: {Number(subscription.failure_count || 0)}</span>
                <span style={subscription.is_active ? styles.activeText : styles.inactiveText}>
                  {subscription.is_active ? 'aktiv' : 'inaktiv'}
                </span>
                <button
                  type="button"
                  onClick={() => handleRenameDevice(subscription)}
                  disabled={actionLoading}
                  style={styles.inlineButton}
                >
                  Umbenennen
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function StatusItem({ label, value }) {
  return (
    <div style={styles.statusItem}>
      <span style={styles.statusLabel}>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

const styles = {
  section: {
    ...cardStyle,
    marginTop: 12,
    borderTop: `6px solid ${colors.blue}`,
  },
  infoBox: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    background: colors.infoBg,
    color: colors.infoText,
    border: `1px solid ${colors.blue}`,
  },
  errorBox: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    background: colors.dangerBg,
    color: colors.dangerText,
    border: `1px solid ${colors.red}`,
  },
  successBox: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    background: colors.successBg,
    color: colors.successText,
    border: `1px solid ${colors.successText}`,
  },
  categoryBlock: {
    marginTop: 18,
  },
  categoryTitle: {
    margin: '0 0 10px',
    color: colors.black,
    fontSize: 18,
  },
  preferenceList: {
    display: 'grid',
    gap: 10,
  },
  preferenceRow: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 1fr) minmax(360px, 0.95fr)',
    gap: isMobile ? 12 : 18,
    padding: 14,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    background: colors.offWhite,
  },
  preferenceText: {
    minWidth: 0,
  },
  preferenceTitleLine: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    color: colors.black,
  },
  requiredBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 22,
    padding: '2px 8px',
    borderRadius: 999,
    background: colors.black,
    color: colors.white,
    fontSize: 12,
    fontWeight: 900,
  },
  preferenceDescription: {
    margin: '6px 0 0',
    color: colors.muted,
    lineHeight: 1.4,
  },
  channelGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
    gap: 8,
    alignItems: 'stretch',
  },
  channelToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    padding: 10,
    border: `1px solid ${colors.black}`,
    borderRadius: 8,
    background: colors.white,
    color: colors.text,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  checkbox: {
    width: 20,
    height: 20,
    flex: '0 0 auto',
  },
  preparedChannel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    padding: 10,
    border: `1px dashed ${colors.border}`,
    borderRadius: 8,
    background: '#f3f4f6',
    color: colors.muted,
    boxSizing: 'border-box',
  },
  disabledBox: {
    width: 20,
    height: 20,
    flex: '0 0 auto',
    borderRadius: 4,
    border: `2px solid ${colors.border}`,
    background: colors.offWhite,
    boxSizing: 'border-box',
  },
  channelHint: {
    display: 'block',
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 1.25,
  },
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  pushPanel: {
    marginTop: 18,
    padding: 14,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    background: colors.offWhite,
  },
  pushHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '4px 10px',
    borderRadius: 999,
    background: colors.white,
    color: colors.muted,
    border: `1px solid ${colors.border}`,
    fontWeight: 900,
  },
  statusBadgeActive: {
    background: colors.successBg,
    color: colors.successText,
    borderColor: colors.successText,
  },
  statusBadgeWarning: {
    background: colors.dangerBg,
    color: colors.dangerText,
    borderColor: colors.red,
  },
  pushStatusGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))',
    gap: 8,
    marginBottom: 10,
  },
  statusItem: {
    padding: 10,
    borderRadius: 8,
    background: colors.white,
    border: `1px solid ${colors.border}`,
  },
  statusLabel: {
    display: 'block',
    marginBottom: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 1.25,
  },
  supportReason: {
    margin: '0 0 12px',
    color: colors.muted,
  },
  deviceList: {
    marginTop: 16,
  },
  deviceListTitle: {
    margin: '0 0 8px',
    fontSize: 15,
    color: colors.black,
  },
  emptyDeviceState: {
    padding: 12,
    borderRadius: 8,
    background: colors.white,
    color: colors.muted,
    border: `1px dashed ${colors.border}`,
  },
  deviceRow: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 1fr) minmax(260px, 1fr)',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    background: colors.white,
    border: `1px solid ${colors.border}`,
    marginTop: 8,
  },
  deviceMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  currentDeviceBadge: {
    display: 'inline-flex',
    width: 'fit-content',
    padding: '2px 8px',
    borderRadius: 999,
    background: colors.infoBg,
    color: colors.infoText,
    fontSize: 12,
    fontWeight: 900,
  },
  endpointText: {
    color: colors.muted,
    overflowWrap: 'anywhere',
  },
  deviceMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: colors.muted,
    fontSize: 13,
  },
  activeText: {
    color: colors.successText,
    fontWeight: 900,
  },
  inactiveText: {
    color: colors.muted,
    fontWeight: 900,
  },
  inlineButton: {
    ...secondaryButtonStyle,
    width: 'fit-content',
    minHeight: 32,
    padding: '6px 10px',
    fontSize: 13,
  },
}
