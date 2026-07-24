import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchInAppNotifications,
  fetchUnreadNotificationCount,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
  subscribeToInAppNotifications,
} from '../../services/repositories/notificationRepository'
import { buttonStyle, cardStyle, colors, isMobile, secondaryButtonStyle } from '../../styles/appStyles'
import {
  applyOptimisticRead,
  createNotificationCursor,
  formatUnreadBadge,
  getCategoryLabel,
  getNotificationListState,
  mergeNotificationPage,
  mergeNotificationList,
  resolveNotificationTarget,
} from './notificationCenterCore'

const POPOVER_LIMIT = 12
const PAGE_LIMIT = 25

function BellIcon() {
  return (
    <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function getPriorityStyle(notification) {
  const priority = notification?.data?.priority
  if (priority === 'critical') return styles.priorityCritical
  if (priority === 'high') return styles.priorityHigh
  return styles.priorityNormal
}

function getMessage(notification) {
  return notification?.body || ''
}

export function NotificationCenter({ user, currentMember, onNavigate, canOpenNotificationPage }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState('')
  const popoverRef = useRef(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) return
    if (!silent) setLoading(true)
    setError('')

    const [listResult, countResult] = await Promise.all([
      fetchInAppNotifications({ limit: POPOVER_LIMIT }),
      fetchUnreadNotificationCount(),
    ])

    if (listResult.error) setError(listResult.error.message)
    else setNotifications(listResult.data || [])

    if (countResult.error) setError((current) => current || countResult.error.message)
    else setUnreadCount(countResult.count || 0)

    if (!silent) setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      return undefined
    }

    refresh()
    const subscription = subscribeToInAppNotifications({
      authUserId: user.id,
      memberId: currentMember?.id,
      onChange: (payload) => {
        if (payload.new?.id) {
          setNotifications((items) => mergeNotificationList(items, payload.new, { limit: POPOVER_LIMIT }))
        }
        refresh({ silent: true })
      },
    })

    return () => subscription.unsubscribe()
  }, [currentMember?.id, refresh, user?.id])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!popoverRef.current?.contains(event.target)) setIsOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const markRead = useCallback(async (notification) => {
    if (!notification?.id || notification.read_at) return
    const previousItems = notifications
    const previousCount = unreadCount
    const readAt = new Date().toISOString()

    setNotifications((items) => applyOptimisticRead(items, notification.id, readAt))
    setUnreadCount((count) => Math.max(0, count - 1))

    const result = await markInAppNotificationRead(notification.id)
    if (result.error) {
      setNotifications(previousItems)
      setUnreadCount(previousCount)
      setError(result.error.message)
    } else if (result.data) {
      setNotifications((items) => mergeNotificationList(items, result.data, { limit: POPOVER_LIMIT }))
      refresh({ silent: true })
    }
  }, [notifications, refresh, unreadCount])

  const markAllRead = useCallback(async () => {
    setActionBusy(true)
    setError('')
    const previousItems = notifications
    const previousCount = unreadCount
    const readAt = new Date().toISOString()

    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || readAt })))
    setUnreadCount(0)

    const result = await markAllInAppNotificationsRead()
    if (result.error) {
      setNotifications(previousItems)
      setUnreadCount(previousCount)
      setError(result.error.message)
    } else {
      refresh({ silent: true })
    }
    setActionBusy(false)
  }, [notifications, refresh, unreadCount])

  const openNotification = useCallback(async (notification) => {
    await markRead(notification)
    const target = resolveNotificationTarget(notification, {
      canOpenPage: canOpenNotificationPage,
    })
    if (target.page && onNavigate) {
      onNavigate(target.page)
      setIsOpen(false)
    }
  }, [canOpenNotificationPage, markRead, onNavigate])

  const badge = formatUnreadBadge(unreadCount)
  const listState = getNotificationListState({ loading, error, items: notifications })

  return (
    <div style={styles.root} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        style={styles.bellButton}
        aria-label={`Benachrichtigungen oeffnen, ${unreadCount} ungelesen`}
        aria-expanded={isOpen}
        title="Benachrichtigungen"
      >
        <BellIcon />
        {badge && <span style={styles.badge}>{badge}</span>}
      </button>

      {isOpen && (
        <section style={styles.popover} aria-label="Neueste Benachrichtigungen">
          <div style={styles.popoverHeader}>
            <div>
              <strong>Benachrichtigungen</strong>
              <div style={styles.metaText}>{unreadCount} ungelesen</div>
            </div>
            <button type="button" onClick={markAllRead} style={styles.textButton} disabled={actionBusy || unreadCount === 0}>
              Alle gelesen
            </button>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}
          {listState === 'loading' && <div style={styles.emptyState}>Lade...</div>}
          {listState === 'empty' && <div style={styles.emptyState}>Keine Benachrichtigungen</div>}

          <div style={styles.popoverList}>
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onOpen={openNotification}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              onNavigate?.('notifications')
              setIsOpen(false)
            }}
            style={styles.footerButton}
          >
            Alle Benachrichtigungen anzeigen
          </button>
        </section>
      )}
    </div>
  )
}

export function NotificationCenterPage({ user, currentMember, onNavigate, canOpenNotificationPage }) {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadPage = useCallback(async ({ reset = false, silent = false } = {}) => {
    if (!user?.id) return
    if (!silent) setLoading(true)
    setError('')

    const listResult = await fetchInAppNotifications({
      limit: PAGE_LIMIT + 1,
      cursor: reset ? null : cursor,
      unreadOnly: filter === 'unread',
    })
    const countResult = await fetchUnreadNotificationCount()

    if (listResult.error) {
      setError(listResult.error.message)
    } else {
      const rows = listResult.data || []
      const visibleRows = rows.slice(0, PAGE_LIMIT)
      setItems((current) => mergeNotificationPage(current, visibleRows, { reset }))
      setCursor(createNotificationCursor(visibleRows[visibleRows.length - 1]))
      setHasMore(rows.length > PAGE_LIMIT)
    }

    if (countResult.error) setError((current) => current || countResult.error.message)
    else setUnreadCount(countResult.count || 0)

    if (!silent) setLoading(false)
  }, [cursor, filter, user?.id])

  useEffect(() => {
    setCursor(null)
    loadPage({ reset: true })
  }, [filter, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.id) return undefined

    const subscription = subscribeToInAppNotifications({
      authUserId: user.id,
      memberId: currentMember?.id,
      onChange: () => loadPage({ reset: true, silent: true }),
    })

    return () => subscription.unsubscribe()
  }, [currentMember?.id, loadPage, user?.id])

  const markRead = useCallback(async (notification) => {
    if (!notification?.id || notification.read_at) return
    const result = await markInAppNotificationRead(notification.id)
    if (result.error) setError(result.error.message)
    else loadPage({ reset: true, silent: true })
  }, [loadPage])

  const markAllRead = useCallback(async () => {
    const result = await markAllInAppNotificationsRead()
    if (result.error) setError(result.error.message)
    else loadPage({ reset: true, silent: true })
  }, [loadPage])

  const openNotification = useCallback(async (notification) => {
    await markRead(notification)
    const target = resolveNotificationTarget(notification, {
      canOpenPage: canOpenNotificationPage,
    })
    if (target.page && onNavigate) onNavigate(target.page)
  }, [canOpenNotificationPage, markRead, onNavigate])

  const listState = getNotificationListState({ loading, error, items })

  return (
    <section style={styles.pageSection}>
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>Benachrichtigungen</h2>
          <p style={styles.pageMeta}>{unreadCount} ungelesen</p>
        </div>
        <button type="button" onClick={markAllRead} style={secondaryButtonStyle} disabled={unreadCount === 0}>
          Alle als gelesen markieren
        </button>
      </div>

      <div style={styles.filterRow}>
        <button type="button" onClick={() => setFilter('all')} style={filter === 'all' ? buttonStyle : secondaryButtonStyle}>
          Alle
        </button>
        <button type="button" onClick={() => setFilter('unread')} style={filter === 'unread' ? buttonStyle : secondaryButtonStyle}>
          Ungelesen
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}
      {listState === 'loading' && <div style={cardStyle}>Lade...</div>}
      {listState === 'empty' && <div style={cardStyle}>Keine Benachrichtigungen vorhanden.</div>}

      {items.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onOpen={openNotification}
          onMarkRead={markRead}
        />
      ))}

      {hasMore && (
        <button type="button" onClick={() => loadPage()} style={secondaryButtonStyle} disabled={loading}>
          Weitere laden
        </button>
      )}
    </section>
  )
}

function NotificationRow({ notification, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      style={{
        ...styles.row,
        ...(!notification.read_at ? styles.rowUnread : null),
      }}
    >
      <span style={styles.rowTop}>
        <span style={{ ...styles.categoryPill, ...getPriorityStyle(notification) }}>{getCategoryLabel(notification.category)}</span>
        <span style={styles.dateText}>{formatNotificationDate(notification.created_at)}</span>
      </span>
      <span style={styles.rowTitle}>{notification.title}</span>
      {getMessage(notification) && <span style={styles.rowBody}>{getMessage(notification)}</span>}
    </button>
  )
}

function NotificationCard({ notification, onOpen, onMarkRead }) {
  return (
    <article style={{ ...cardStyle, ...(!notification.read_at ? styles.cardUnread : null) }}>
      <div style={styles.cardHeader}>
        <span style={{ ...styles.categoryPill, ...getPriorityStyle(notification) }}>{getCategoryLabel(notification.category)}</span>
        <span style={styles.dateText}>{formatNotificationDate(notification.created_at)}</span>
      </div>
      <h3 style={styles.cardTitle}>{notification.title}</h3>
      {getMessage(notification) && <p style={styles.cardBody}>{getMessage(notification)}</p>}
      <div style={styles.cardActions}>
        <button type="button" onClick={() => onOpen(notification)} style={buttonStyle}>
          Oeffnen
        </button>
        {!notification.read_at && (
          <button type="button" onClick={() => onMarkRead(notification)} style={secondaryButtonStyle}>
            Als gelesen markieren
          </button>
        )}
      </div>
    </article>
  )
}

const styles = {
  root: {
    position: 'relative',
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
  },
  bellButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 10,
    border: `2px solid ${colors.white}`,
    background: colors.black,
    color: colors.white,
    cursor: 'pointer',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
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
  popover: {
    position: 'absolute',
    top: 52,
    right: 0,
    width: isMobile ? 'calc(100vw - 32px)' : 420,
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: '78vh',
    zIndex: 100,
    overflow: 'hidden',
    background: colors.white,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
  },
  popoverHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    background: colors.offWhite,
    borderBottom: `1px solid ${colors.border}`,
  },
  metaText: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 13,
  },
  textButton: {
    border: 0,
    background: 'transparent',
    color: colors.blue,
    fontWeight: 900,
    cursor: 'pointer',
    padding: 0,
  },
  popoverList: {
    maxHeight: isMobile ? '55vh' : 430,
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: 92,
    padding: 13,
    border: 0,
    borderBottom: `1px solid ${colors.border}`,
    background: colors.white,
    color: colors.text,
    textAlign: 'left',
    cursor: 'pointer',
  },
  rowUnread: {
    borderLeft: `5px solid ${colors.red}`,
    paddingLeft: 8,
    background: '#fffafa',
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  categoryPill: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 23,
    padding: '2px 8px',
    borderRadius: 999,
    background: colors.infoBg,
    color: colors.infoText,
    fontSize: 12,
    fontWeight: 900,
  },
  priorityHigh: {
    background: '#fff7ed',
    color: '#9a3412',
  },
  priorityCritical: {
    background: colors.dangerBg,
    color: colors.dangerText,
  },
  priorityNormal: {},
  dateText: {
    color: colors.muted,
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  rowTitle: {
    fontWeight: 900,
    lineHeight: 1.3,
    marginBottom: 5,
  },
  rowBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 1.35,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  footerButton: {
    width: '100%',
    border: 0,
    borderTop: `1px solid ${colors.border}`,
    background: colors.offWhite,
    color: colors.black,
    fontWeight: 900,
    padding: 13,
    cursor: 'pointer',
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
  emptyState: {
    padding: 18,
    color: colors.muted,
    textAlign: 'center',
  },
  pageSection: {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: isMobile ? 16 : 24,
    marginBottom: 28,
    background: colors.offWhite,
    color: colors.text,
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  pageTitle: {
    margin: 0,
    fontSize: 28,
    color: colors.black,
  },
  pageMeta: {
    margin: '4px 0 0',
    color: colors.muted,
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  cardUnread: {
    borderLeft: `6px solid ${colors.red}`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    margin: '0 0 8px',
    fontSize: 20,
  },
  cardBody: {
    whiteSpace: 'pre-wrap',
    marginTop: 0,
  },
  cardActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
}
