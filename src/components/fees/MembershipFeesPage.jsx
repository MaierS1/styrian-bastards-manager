import { useMemo } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  dangerButtonStyle,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
  isMobile,
} from '../../styles/appStyles'

const memberTypeLabels = {
  vollmitglied: 'Vollmitglied',
  foerdermitglied: 'Fördermitglied',
  probejahr: 'Probejahr',
  ehrenmitglied: 'Ehrenmitglied',
}

const statusLabels = {
  open: 'Offen',
  reminded: 'Erinnert',
  paid: 'Bezahlt',
  waived: 'Erlassen',
  cancelled: 'Storniert',
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} €`
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('de-AT')
}

function getNotificationLabel(item) {
  if (item.notification_status === 'sent') return 'gesendet'
  if (item.notification_status === 'error') return 'Fehler'
  return 'nicht gesendet'
}

function getStatusBadgeStyle(status) {
  if (status === 'paid') return { color: colors.successText }
  if (status === 'reminded') return { color: colors.infoText }
  if (status === 'waived') return { color: colors.muted }
  if (status === 'cancelled') return { color: colors.red }
  return { color: colors.red }
}

export function MembershipFeesPage({
  canAccess,
  members,
  membershipFeePeriods,
  membershipFeeItems,
  yearFilter,
  setYearFilter,
  statusFilter,
  setStatusFilter,
  memberTypeFilter,
  setMemberTypeFilter,
  paymentFilter,
  setPaymentFilter,
  createYear,
  setCreateYear,
  createTitle,
  setCreateTitle,
  createDueDate,
  setCreateDueDate,
  createCashEntryOnPayment,
  setCreateCashEntryOnPayment,
  paymentMethod,
  setPaymentMethod,
  generationResult,
  generationLoading,
  createMembershipFeesForYear,
  sendMembershipFeeNotification,
  markMembershipFeeItemPaid,
  reopenMembershipFeeItem,
  notificationLoadingId,
  setNotificationLoadingId,
}) {
  const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members])
  const periodMap = useMemo(() => new Map(membershipFeePeriods.map((period) => [period.id, period])), [membershipFeePeriods])

  const enrichedItems = useMemo(
    () =>
      membershipFeeItems.map((item) => {
        const member = memberMap.get(item.member_id) || null
        const period = periodMap.get(item.period_id) || null
        const memberName = member
          ? `${member.first_name || ''} ${member.last_name || ''}`.trim()
          : 'Gelöschtes Mitglied'

        return {
          ...item,
          member,
          period,
          memberName: memberName || 'Unbekannt',
          memberType: member?.member_type || '-',
          memberTypeLabel: memberTypeLabels[member?.member_type] || member?.member_type || '-',
          periodLabel: period
            ? `${period.year}${period.title ? ` · ${period.title}` : ''}`
            : '-',
        }
      }),
    [memberMap, periodMap, membershipFeeItems]
  )

  const selectedItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      const periodYear = String(item.period?.year || '')
      const matchesYear = yearFilter === 'alle' || periodYear === String(yearFilter)

      const matchesStatus =
        statusFilter === 'alle' || item.status === statusFilter

      const matchesMemberType =
        memberTypeFilter === 'alle' || item.memberType === memberTypeFilter

      const matchesPayment =
        paymentFilter === 'alle' ||
        (paymentFilter === 'offen' && ['open', 'reminded'].includes(item.status) && Number(item.amount || 0) > 0) ||
        (paymentFilter === 'bezahlt' && item.status === 'paid')

      return matchesYear && matchesStatus && matchesMemberType && matchesPayment
    })
  }, [enrichedItems, yearFilter, statusFilter, memberTypeFilter, paymentFilter])

  const summaryItems = useMemo(() => {
    return yearFilter === 'alle'
      ? enrichedItems
      : enrichedItems.filter((item) => String(item.period?.year || '') === String(yearFilter))
  }, [enrichedItems, yearFilter])

  const stats = useMemo(() => {
    const openItems = summaryItems.filter((item) => ['open', 'reminded'].includes(item.status))
    const paidItems = summaryItems.filter((item) => item.status === 'paid')

    return {
      openCount: openItems.length,
      paidCount: paidItems.length,
      openAmount: openItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paidAmount: paidItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      waivedCount: summaryItems.filter((item) => item.status === 'waived').length,
      cancelledCount: summaryItems.filter((item) => item.status === 'cancelled').length,
    }
  }, [summaryItems])

  const periodSummaries = useMemo(() => {
    return membershipFeePeriods
      .map((period) => {
        const items = enrichedItems.filter((item) => item.period?.id === period.id)
        const openItems = items.filter((item) => ['open', 'reminded'].includes(item.status))
        const paidItems = items.filter((item) => item.status === 'paid')
        return {
          ...period,
          itemCount: items.length,
          openCount: openItems.length,
          paidCount: paidItems.length,
          openAmount: openItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
          paidAmount: paidItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        }
      })
      .sort((a, b) => Number(b.year) - Number(a.year))
  }, [enrichedItems, membershipFeePeriods])

  const yearOptions = useMemo(() => {
    const years = new Set(membershipFeePeriods.map((period) => String(period.year)))
    years.add(String(new Date().getFullYear()))
    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [membershipFeePeriods])

  const openReminderItems = selectedItems.filter(
    (item) => ['open', 'reminded'].includes(item.status) && Number(item.amount || 0) > 0
  )

  async function handleCreateFees() {
    const result = await createMembershipFeesForYear({
      year: createYear,
      title: createTitle,
      dueDate: createDueDate,
    })

    if (result?.ok) {
      return
    }
  }

  async function handleSendReminder(item, resend = false) {
    setNotificationLoadingId(item.id)
    try {
      const confirmed = resend || !item.reminder_sent_at || window.confirm(
        item.reminder_sent_at
          ? 'Für diesen Beitrag wurde bereits eine Erinnerung gesendet. Wirklich erneut senden?'
          : `Erinnerung an ${item.memberName} senden?`
      )

      if (!confirmed) return

      await sendMembershipFeeNotification({
        type: 'fee_reminder',
        feeItemId: item.id,
      })
    } finally {
      setNotificationLoadingId(null)
    }
  }

  async function handleSendPaidConfirmation(item) {
    setNotificationLoadingId(item.id)
    try {
      await sendMembershipFeeNotification({
        type: 'fee_paid_confirmation',
        feeItemId: item.id,
      })
    } finally {
      setNotificationLoadingId(null)
    }
  }

  async function handleSendTestReminder(item) {
    setNotificationLoadingId(item.id)
    try {
      await sendMembershipFeeNotification({
        type: 'fee_reminder_test',
        feeItemId: item.id,
      })
    } finally {
      setNotificationLoadingId(null)
    }
  }

  async function handleSendTestPaidConfirmation(item) {
    setNotificationLoadingId(item.id)
    try {
      await sendMembershipFeeNotification({
        type: 'fee_paid_confirmation_test',
        feeItemId: item.id,
      })
    } finally {
      setNotificationLoadingId(null)
    }
  }

  async function handleMarkPaid(item) {
    setNotificationLoadingId(item.id)
    try {
      await markMembershipFeeItemPaid({
        feeItemId: item.id,
        paymentMethod,
        createCashEntry: createCashEntryOnPayment,
      })
    } finally {
      setNotificationLoadingId(null)
    }
  }

  async function handleReopen(item) {
    const hasCashEntry = Boolean(item.cash_entry_id)
    const confirmed = !hasCashEntry || window.confirm(
      'Zu diesem Beitrag existiert bereits ein Kassa-Eintrag. Beim Zurücksetzen wird er storniert. Wirklich fortfahren?'
    )

    if (!confirmed) return

    setNotificationLoadingId(item.id)
    try {
      await reopenMembershipFeeItem({
        feeItemId: item.id,
        cancelCashEntry: true,
      })
    } finally {
      setNotificationLoadingId(null)
    }
  }

  async function handleSendAllReminders() {
    if (openReminderItems.length === 0) {
      window.alert('Für den gewählten Filter gibt es keine offenen Beiträge.')
      return
    }

    const alreadyReminded = openReminderItems.filter((item) => item.reminder_sent_at).length
    const confirmed = window.confirm(
      alreadyReminded > 0
        ? `${openReminderItems.length} offene Beiträge gefunden, davon ${alreadyReminded} bereits erinnert. Erinnerungen jetzt trotzdem an alle senden?`
        : `${openReminderItems.length} offene Beiträge gefunden. Erinnerungen jetzt senden?`
    )

    if (!confirmed) return

    for (const item of openReminderItems) {
      // eslint-disable-next-line no-await-in-loop
      await handleSendReminder(item, true)
    }
  }

  if (!canAccess) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Beiträge</h2>
        <p>Nur Admins können die Beitragsverwaltung öffnen.</p>
      </section>
    )
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Beiträge</h2>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <div style={cardStyle}>
          <strong>Beitragsperiode anlegen</strong>
          <br />
          <span style={mutedTextStyle}>Erzeugt bei Bedarf die Periode und legt danach die Jahresbeiträge für aktive Mitglieder an.</span>
          <input
            type="number"
            min="2000"
            value={createYear}
            onChange={(e) => setCreateYear(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Titel"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            style={inputStyle}
          />
          <input
            type="date"
            value={createDueDate}
            onChange={(e) => setCreateDueDate(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleCreateFees} style={buttonStyle} disabled={generationLoading}>
            {generationLoading ? 'Beiträge werden erstellt...' : 'Jahresbeiträge erstellen'}
          </button>
          {generationResult && (
            <p style={{ marginTop: 8 }}>
              Erstellt: <strong>{generationResult.created_count}</strong> · Übersprungen: <strong>{generationResult.skipped_count}</strong>
            </p>
          )}
        </div>

        <div style={cardStyle}>
          <strong>Zahlungsoptionen</strong>
          <br />
          <label style={{ display: 'block', marginTop: 10, marginBottom: 8, fontWeight: 800 }}>
            <input
              type="checkbox"
              checked={createCashEntryOnPayment}
              onChange={(e) => setCreateCashEntryOnPayment(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Kassa-Eintrag beim Bezahlen anlegen
          </label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
            <option value="bar">Bar</option>
            <option value="ebanking">E-Banking</option>
          </select>
          <button onClick={handleSendAllReminders} style={secondaryButtonStyle}>
            Erinnerung an alle offenen senden ({openReminderItems.length})
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 12 }}>
        <strong>Statistik</strong>
        <br />
        Offen gesamt: <strong>{stats.openCount}</strong>
        <br />
        Bezahlt gesamt: <strong>{stats.paidCount}</strong>
        <br />
        Summe offen: <strong>{formatMoney(stats.openAmount)}</strong>
        <br />
        Summe bezahlt: <strong>{formatMoney(stats.paidAmount)}</strong>
        <br />
        Erlassen: <strong>{stats.waivedCount}</strong>
        <br />
        Storniert: <strong>{stats.cancelledCount}</strong>
      </div>

      <h3 style={headingStyle}>Perioden</h3>
      <div style={{ ...cardStyle, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Jahr', 'Titel', 'Fällig am', 'Status', 'Beiträge', 'Offen', 'Bezahlt'].map((header) => (
                <th key={header} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodSummaries.map((period) => (
              <tr key={period.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{period.year}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{period.title || '-'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{period.due_date || '-'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{period.status || '-'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{period.itemCount}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{formatMoney(period.openAmount)}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{formatMoney(period.paidAmount)}</td>
              </tr>
            ))}
            {periodSummaries.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 12 }}>
                  Noch keine Beitragsperiode vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 style={headingStyle}>Filter</h3>
      <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Jahre</option>
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Status</option>
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select value={memberTypeFilter} onChange={(e) => setMemberTypeFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Mitgliedsarten</option>
        {Object.entries(memberTypeLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Beiträge</option>
        <option value="offen">Offen</option>
        <option value="bezahlt">Bezahlt</option>
      </select>

      <div style={{ ...cardStyle, background: colors.infoBg, borderColor: colors.border }}>
        <strong style={{ color: colors.infoText }}>Hinweis</strong>
        <br />
        Die Beitragsverwaltung arbeitet additiv. Bestehende Mitglieds- und Kassa-Funktionen bleiben unverändert.
      </div>

      <h3 style={headingStyle}>Beitragspositionen</h3>
      <p style={mutedTextStyle}>
        Angezeigt: <strong>{selectedItems.length}</strong> von {summaryItems.length} Beitragspositionen im gewählten Jahr.
      </p>

      {selectedItems.map((item) => {
        const notificationLabel = getNotificationLabel(item)
        const isLoading = notificationLoadingId === item.id
        const showReminderButton = ['open', 'reminded'].includes(item.status)
        const showPaidButton = item.status !== 'paid'
        const showReopenButton = item.status === 'paid'
        const showPaymentConfirmationButton = item.status === 'paid'

        return (
          <div key={item.id} style={{ ...cardStyle, borderTop: `6px solid ${item.status === 'paid' ? colors.blue : colors.red}` }}>
            <strong>{item.memberName}</strong>
            <br />
            Beitragsperiode: {item.periodLabel}
            <br />
            Mitgliedsart: {item.memberTypeLabel}
            <br />
            Betrag: {formatMoney(item.amount)}
            <br />
            Fällig am: {item.due_date || '-'}
            <br />
            Status: <strong style={getStatusBadgeStyle(item.status)}>{statusLabels[item.status] || item.status || '-'}</strong>
            <br />
            Bezahlt am: {formatDateTime(item.paid_at)}
            <br />
            Erinnerung: {item.reminder_sent_at ? formatDateTime(item.reminder_sent_at) : 'nicht gesendet'}
            <br />
            Mail-Status: {notificationLabel}
            {item.notification_error && (
              <>
                <br />
                Fehler: {item.notification_error}
              </>
            )}
            <br />
            Erstellt am: {formatDateTime(item.created_at)}

            <div style={{ marginTop: 10 }}>
              {showPaidButton && (
                <button onClick={() => handleMarkPaid(item)} style={buttonStyle} disabled={isLoading}>
                  Als bezahlt markieren
                </button>
              )}

              {showReopenButton && (
                <button onClick={() => handleReopen(item)} style={dangerButtonStyle} disabled={isLoading}>
                  Bezahlt rückgängig
                </button>
              )}

              {showReminderButton && (
                <button
                  onClick={() => handleSendReminder(item)}
                  style={secondaryButtonStyle}
                  disabled={isLoading}
                >
                  {item.reminder_sent_at ? 'Erinnerung erneut senden' : 'Erinnerung senden'}
                </button>
              )}

              {showPaymentConfirmationButton && (
                <button
                  onClick={() => handleSendPaidConfirmation(item)}
                  style={secondaryButtonStyle}
                  disabled={isLoading}
                >
                  Zahlungsbestätigung senden
                </button>
              )}

              <button
                onClick={() => handleSendTestReminder(item)}
                style={secondaryButtonStyle}
                disabled={isLoading}
              >
                Test-Erinnerung senden
              </button>

              <button
                onClick={() => handleSendTestPaidConfirmation(item)}
                style={secondaryButtonStyle}
                disabled={isLoading}
              >
                Test-Zahlungsbestätigung senden
              </button>
            </div>
          </div>
        )
      })}

      {selectedItems.length === 0 && (
        <p style={mutedTextStyle}>Keine Beitragspositionen für die aktuellen Filter gefunden.</p>
      )}
    </section>
  )
}
