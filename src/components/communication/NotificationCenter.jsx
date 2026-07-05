import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  archiveInAppNotification,
  fetchInAppNotifications,
  fetchUnreadNotificationCount,
  markInAppNotificationRead,
  markInAppNotificationUnread,
  softDeleteInAppNotification,
  subscribeToInAppNotifications,
} from '../../services/repositories/notificationRepository'
import { colors, isMobile } from '../../styles/appStyles'

const POLLING_INTERVAL_MS = 60000

const categoryLabels = {
  event: 'Event',
  membership_fee: 'Beitrag',
  invoice: 'Rechnung',
  document: 'Dokument',
  club_news: 'News',
  board: 'Vorstand',
  system: 'System',
  backup: 'Backup',
}

function BellIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ReloadIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12a9 9 0 0 1-15.1 6.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12A9 9 0 0 1 18.1 5.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 2v4h-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 22v-4h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatNotificationDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getCategoryLabel(category) {
  return categoryLabels[category] || category || 'Info'
}

function mergeNotification(currentItems, updatedItem) {
  const nextItems = currentItems.filter((item) => item.id !== updatedItem.id)

  if (!updatedItem.deleted_at && !updatedItem.archived_at) {
    nextItems.unshift(updatedItem)
  }

  return nextItems.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
}

export function NotificationCenter({ user, currentMember }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [error, setError] = useState('')
  const panelRef = useRef(null)

  const selectedNotification = useMemo(() => (
    notifications.find((notification) => notification.id === selectedId) || notifications[0] || null
  ), [notifications, selectedId])

  const refreshNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) return

    if (!silent) setLoading(true)
    setError('')

    const [notificationsResult, countResult] = await Promise.all([
      fetchInAppNotifications({ limit: 20 }),
      fetchUnreadNotificationCount(),
    ])

    if (notificationsResult.error) {
      setError(notificationsResult.error.message)
    } else {
      const rows = notificationsResult.data || []
      setNotifications(rows)
      setSelectedId((currentSelectedId) => (
        currentSelectedId && rows.some((item) => item.id === currentSelectedId)
          ? currentSelectedId
          : rows[0]?.id || null
      ))
    }

    if (countResult.error) {
      setError((currentError) => currentError || countResult.error.message)
    } else {
      setUnreadCount(countResult.count || 0)
    }

    if (!silent) setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      setSelectedId(null)
      return undefined
    }

    refreshNotifications()

    const pollingId = window.setInterval(() => {
      refreshNotifications({ silent: true })
    }, POLLING_INTERVAL_MS)

    const subscription = subscribeToInAppNotifications({
      authUserId: user.id,
      memberId: currentMember?.id,
      onChange: () => {
        refreshNotifications({ silent: true })
      },
    })

    return () => {
      window.clearInterval(pollingId)
      subscription.unsubscribe()
    }
  }, [currentMember?.id, refreshNotifications, user?.id])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!panelRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const runNotificationAction = useCallback(async (notification, action) => {
    if (!notification?.id) return

    setActionId(notification.id)
    setError('')

    const result = await action(notification.id)

    if (result.error) {
      setError(result.error.message)
    } else if (result.data) {
      setNotifications((currentItems) => mergeNotification(currentItems, result.data))
      setSelectedId((currentSelectedId) => (
        result.data.deleted_at || result.data.archived_at
          ? currentItemsFallbackId(notifications, notification.id)
          : currentSelectedId
      ))
      await refreshNotifications({ silent: true })
    }

    setActionId(null)
  }, [notifications, refreshNotifications])

  const handleToggleRead = useCallback((notification) => {
    runNotificationAction(
      notification,
      notification.read_at ? markInAppNotificationUnread : markInAppNotificationRead
    )
  }, [runNotificationAction])

  const handleArchive = useCallback((notification) => {
    runNotificationAction(notification, archiveInAppNotification)
  }, [runNotificationAction])

  const handleSoftDelete = useCallback((notification) => {
    runNotificationAction(notification, softDeleteInAppNotification)
  }, [runNotificationAction])

  return (
    <div style={styles.root} ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        style={styles.bellButton}
        aria-label={`Benachrichtigungen oeffnen, ${unreadCount} ungelesen`}
        aria-expanded={isOpen}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section style={styles.panel} aria-label="Benachrichtigungen">
          <header style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>Benachrichtigungen</h2>
              <p style={styles.panelMeta}>
                {unreadCount} ungelesen
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshNotifications()}
              style={styles.iconButton}
              disabled={loading}
              aria-label="Benachrichtigungen neu laden"
              title="Neu laden"
            >
              <ReloadIcon />
            </button>
          </header>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <div style={styles.contentGrid}>
            <div style={styles.listPane}>
              {loading && notifications.length === 0 && (
                <div style={styles.emptyState}>Lade...</div>
              )}

              {!loading && notifications.length === 0 && (
                <div style={styles.emptyState}>Keine Benachrichtigungen</div>
              )}

              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => setSelectedId(notification.id)}
                  style={{
                    ...styles.listItem,
                    ...(notification.id === selectedNotification?.id ? styles.listItemActive : null),
                    ...(!notification.read_at ? styles.listItemUnread : null),
                  }}
                >
                  <span style={styles.listItemTopline}>
                    <span style={styles.categoryPill}>{getCategoryLabel(notification.category)}</span>
                    <span style={styles.dateText}>{formatNotificationDate(notification.created_at)}</span>
                  </span>
                  <span style={styles.listItemTitle}>{notification.title}</span>
                  {notification.body && (
                    <span style={styles.listItemBody}>{notification.body}</span>
                  )}
                </button>
              ))}
            </div>

            <div style={styles.detailPane}>
              {selectedNotification ? (
                <NotificationDetail
                  notification={selectedNotification}
                  actionId={actionId}
                  onToggleRead={handleToggleRead}
                  onArchive={handleArchive}
                  onSoftDelete={handleSoftDelete}
                />
              ) : (
                <div style={styles.emptyState}>Keine Auswahl</div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function currentItemsFallbackId(items, removedId) {
  return items.find((item) => item.id !== removedId && !item.deleted_at && !item.archived_at)?.id || null
}

function NotificationDetail({ notification, actionId, onToggleRead, onArchive, onSoftDelete }) {
  const isBusy = actionId === notification.id

  return (
    <article style={styles.detail}>
      <div style={styles.detailHeader}>
        <span style={styles.categoryPill}>{getCategoryLabel(notification.category)}</span>
        <span style={styles.dateText}>{formatNotificationDate(notification.created_at)}</span>
      </div>

      <h3 style={styles.detailTitle}>{notification.title}</h3>

      {notification.body ? (
        <p style={styles.detailBody}>{notification.body}</p>
      ) : (
        <p style={styles.detailBodyMuted}>Keine weiteren Details.</p>
      )}

      {notification.url && (
        <a href={notification.url} style={styles.detailLink}>
          Link oeffnen
        </a>
      )}

      <div style={styles.detailState}>
        Status: <strong>{notification.read_at ? 'gelesen' : 'ungelesen'}</strong>
      </div>

      <div style={styles.actionRow}>
        <button
          type="button"
          onClick={() => onToggleRead(notification)}
          style={styles.actionButton}
          disabled={isBusy}
        >
          {notification.read_at ? 'Ungelesen' : 'Gelesen'}
        </button>
        <button
          type="button"
          onClick={() => onArchive(notification)}
          style={styles.actionButton}
          disabled={isBusy}
        >
          Archivieren
        </button>
        <button
          type="button"
          onClick={() => onSoftDelete(notification)}
          style={styles.dangerButton}
          disabled={isBusy}
        >
          Entfernen
        </button>
      </div>
    </article>
  )
}

const styles = {
  root: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  bellButton: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 46,
    borderRadius: 10,
    border: `2px solid ${colors.white}`,
    background: colors.black,
    color: colors.white,
    cursor: 'pointer',
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 22,
    height: 22,
    padding: '0 6px',
    borderRadius: 999,
    background: colors.red,
    color: colors.white,
    border: `2px solid ${colors.black}`,
    fontSize: 12,
    lineHeight: '18px',
    fontWeight: 900,
    boxSizing: 'border-box',
  },
  panel: {
    position: 'absolute',
    top: 54,
    right: 0,
    width: isMobile ? 'calc(100vw - 32px)' : 720,
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: isMobile ? '78vh' : 620,
    overflow: 'hidden',
    zIndex: 100,
    background: colors.white,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    borderBottom: `1px solid ${colors.border}`,
    background: colors.offWhite,
  },
  panelTitle: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.2,
  },
  panelMeta: {
    margin: '4px 0 0',
    color: colors.muted,
    fontSize: 13,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.white,
    color: colors.text,
    cursor: 'pointer',
    fontSize: 20,
    lineHeight: 1,
  },
  errorBox: {
    margin: 12,
    padding: 10,
    borderRadius: 8,
    background: colors.dangerBg,
    color: colors.dangerText,
    border: `1px solid ${colors.red}`,
    fontSize: 13,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'minmax(240px, 320px) 1fr',
    minHeight: isMobile ? 360 : 460,
    maxHeight: isMobile ? 'calc(78vh - 74px)' : 546,
  },
  listPane: {
    overflowY: 'auto',
    borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
    borderBottom: isMobile ? `1px solid ${colors.border}` : 'none',
    maxHeight: isMobile ? 260 : 'none',
  },
  detailPane: {
    overflowY: 'auto',
    minHeight: 240,
  },
  listItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    minHeight: 104,
    padding: 14,
    border: 0,
    borderBottom: `1px solid ${colors.border}`,
    background: colors.white,
    color: colors.text,
    textAlign: 'left',
    cursor: 'pointer',
  },
  listItemActive: {
    background: '#f3f4f6',
  },
  listItemUnread: {
    borderLeft: `5px solid ${colors.red}`,
    paddingLeft: 9,
  },
  listItemTopline: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  categoryPill: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 24,
    padding: '2px 8px',
    borderRadius: 999,
    background: colors.infoBg,
    color: colors.infoText,
    fontSize: 12,
    fontWeight: 900,
  },
  dateText: {
    color: colors.muted,
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  listItemTitle: {
    fontWeight: 900,
    lineHeight: 1.3,
    marginBottom: 5,
  },
  listItemBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 1.35,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  detail: {
    padding: 18,
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  detailTitle: {
    margin: '0 0 12px',
    fontSize: 22,
    lineHeight: 1.25,
  },
  detailBody: {
    margin: '0 0 16px',
    whiteSpace: 'pre-wrap',
    color: colors.text,
  },
  detailBodyMuted: {
    margin: '0 0 16px',
    color: colors.muted,
  },
  detailLink: {
    display: 'inline-flex',
    marginBottom: 16,
    color: colors.blue,
    fontWeight: 900,
  },
  detailState: {
    marginBottom: 16,
    color: colors.muted,
  },
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    minHeight: 38,
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${colors.black}`,
    background: colors.white,
    color: colors.black,
    fontWeight: 900,
    cursor: 'pointer',
  },
  dangerButton: {
    minHeight: 38,
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${colors.red}`,
    background: colors.white,
    color: colors.red,
    fontWeight: 900,
    cursor: 'pointer',
  },
  emptyState: {
    padding: 18,
    color: colors.muted,
    textAlign: 'center',
  },
}
