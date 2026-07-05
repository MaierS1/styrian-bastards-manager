import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  isMobile,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'
import {
  fetchNotificationPreferences,
  saveNotificationPreferences,
} from '../../services/repositories/notificationRepository'
import {
  notificationCategoryLabels,
  notificationPreferenceConfig,
  requiredNotificationTypes,
} from './notificationPreferenceConfig'

const ACTIVE_CHANNEL = 'in_app'
const PREPARED_CHANNELS = ['push', 'email']

const channelLabels = {
  in_app: 'In-App',
  push: 'Push',
  email: 'E-Mail',
}

function buildPreferenceKey(notificationType, channel) {
  return `${notificationType}:${channel}`
}

function createDefaultPreference(configItem, channel, currentMember) {
  const isRequired = requiredNotificationTypes.has(configItem.notification_type)

  return {
    auth_user_id: currentMember?.auth_user_id || null,
    member_id: currentMember?.id || null,
    notification_type: configItem.notification_type,
    category: configItem.category,
    channel,
    enabled: channel === ACTIVE_CHANNEL ? true : false,
    required: isRequired,
    opted_in_at: null,
    opted_out_at: null,
  }
}

function normalizePreference(configItem, channel, currentMember, existingPreference) {
  const isRequired = requiredNotificationTypes.has(configItem.notification_type)
  const defaultPreference = createDefaultPreference(configItem, channel, currentMember)

  if (!existingPreference) return defaultPreference

  return {
    ...defaultPreference,
    ...existingPreference,
    auth_user_id: existingPreference.auth_user_id || currentMember?.auth_user_id || null,
    member_id: existingPreference.member_id || currentMember?.id || null,
    category: configItem.category,
    channel,
    required: isRequired,
    enabled: isRequired ? true : Boolean(existingPreference.enabled),
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
    const activeKey = buildPreferenceKey(configItem.notification_type, ACTIVE_CHANNEL)
    state[activeKey] = normalizePreference(
      configItem,
      ACTIVE_CHANNEL,
      currentMember,
      preferencesByKey.get(activeKey)
    )

    PREPARED_CHANNELS.forEach((channel) => {
      const preparedKey = buildPreferenceKey(configItem.notification_type, channel)
      state[preparedKey] = normalizePreference(
        configItem,
        channel,
        currentMember,
        preferencesByKey.get(preparedKey)
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

  const toggleInAppPreference = useCallback((configItem) => {
    if (requiredNotificationTypes.has(configItem.notification_type)) return

    const key = buildPreferenceKey(configItem.notification_type, ACTIVE_CHANNEL)

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

    const activePreferences = notificationPreferenceConfig.map((configItem) => {
      const key = buildPreferenceKey(configItem.notification_type, ACTIVE_CHANNEL)
      const currentPreference = preferencesByKey[key] || createDefaultPreference(configItem, ACTIVE_CHANNEL, currentMember)
      const isRequired = requiredNotificationTypes.has(configItem.notification_type)
      const enabled = isRequired ? true : Boolean(currentPreference.enabled)
      const changedAt = new Date().toISOString()

      return {
        ...currentPreference,
        auth_user_id: currentPreference.auth_user_id || currentMember.auth_user_id || null,
        member_id: currentPreference.member_id || currentMember.id || null,
        notification_type: configItem.notification_type,
        category: configItem.category,
        channel: ACTIVE_CHANNEL,
        enabled,
        required: isRequired,
        opted_in_at: enabled ? (currentPreference.opted_in_at || changedAt) : currentPreference.opted_in_at,
        opted_out_at: enabled ? null : changedAt,
      }
    })

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
      const key = buildPreferenceKey(configItem.notification_type, ACTIVE_CHANNEL)
      return (
        !preferencesByKey[key]?.id
        || Boolean(preferencesByKey[key]?.enabled) !== Boolean(initialPreferencesByKey[key]?.enabled)
      )
    })
  }, [initialPreferencesByKey, preferencesByKey])

  return (
    <section style={styles.section} aria-label="Benachrichtigungseinstellungen">
      <h3 style={headingStyle}>Benachrichtigungseinstellungen</h3>

      <p style={mutedTextStyle}>
        In-App Benachrichtigungen sind aktiv. Push und E-Mail sind vorbereitet und werden noch nicht verwendet.
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

      {!loading && Object.entries(groupedPreferences).map(([category, items]) => (
        <div key={category} style={styles.categoryBlock}>
          <h4 style={styles.categoryTitle}>{notificationCategoryLabels[category] || category}</h4>

          <div style={styles.preferenceList}>
            {items.map((item) => {
              const activeKey = buildPreferenceKey(item.notification_type, ACTIVE_CHANNEL)
              const inAppPreference = preferencesByKey[activeKey] || createDefaultPreference(item, ACTIVE_CHANNEL, currentMember)
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
                    <label style={styles.channelToggle}>
                      <input
                        type="checkbox"
                        checked={isRequired || Boolean(inAppPreference.enabled)}
                        disabled={isRequired || saving}
                        onChange={() => toggleInAppPreference(item)}
                        style={styles.checkbox}
                      />
                      <span>
                        <strong>{channelLabels.in_app}</strong>
                        <small style={styles.channelHint}>
                          {isRequired ? 'immer aktiv' : 'aktiv nutzbar'}
                        </small>
                      </span>
                    </label>

                    {PREPARED_CHANNELS.map((channel) => (
                      <div key={channel} style={styles.preparedChannel} aria-disabled="true">
                        <span style={styles.disabledBox} />
                        <span>
                          <strong>{channelLabels[channel]}</strong>
                          <small style={styles.channelHint}>vorbereitet</small>
                        </span>
                      </div>
                    ))}
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
}
