import { useMemo, useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  colors,
  dashboardLabelStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'

const dismissedTasksStorageKey = 'dashboardCockpitDismissedTasks'

const priorityConfig = {
  critical: {
    label: 'Kritisch',
    border: colors.red,
    background: colors.dangerBg,
    text: colors.dangerText,
  },
  important: {
    label: 'Wichtig',
    border: '#f59e0b',
    background: '#fffbeb',
    text: '#92400e',
  },
  info: {
    label: 'Hinweis',
    border: colors.blue,
    background: colors.infoBg,
    text: colors.infoText,
  },
}

const areaLabels = {
  cash: 'Kassa',
  invoices: 'Rechnungen',
  fees: 'Beitraege',
  merch: 'Fanartikel',
  sponsors: 'Sponsoren',
  events: 'Events',
  media: 'Medien',
  public: 'Oeffentlich',
}

const targetLabels = {
  cash: 'Kassa pruefen',
  invoices: 'Rechnungen pruefen',
  members: 'Mitglieder pruefen',
  merch: 'Fanartikel pruefen',
  sponsors: 'Sponsoren pruefen',
  events: 'Events pruefen',
  media: 'Medien pruefen',
  dashboard: 'Dashboard pruefen',
}

function getTasksByPriority(tasks, priority) {
  return tasks.filter((task) => task.priority === priority)
}

function readDismissedTasks() {
  try {
    return JSON.parse(localStorage.getItem(dismissedTasksStorageKey) || '{}')
  } catch {
    return {}
  }
}

function writeDismissedTasks(dismissedTasks) {
  try {
    localStorage.setItem(dismissedTasksStorageKey, JSON.stringify(dismissedTasks))
  } catch {
    // Local cockpit dismissals are optional; storage failures should not block the dashboard.
  }
}

function getItemLabel(item) {
  if (!item) return ''

  const entity = item.entity || item

  return (
    entity.title
    || entity.name
    || entity.invoice_number
    || entity.customer_name
    || `${entity.first_name || ''} ${entity.last_name || ''}`.trim()
    || entity.variant_name
    || entity.sku
    || entity.id
    || ''
  )
}

function formatDueDate(dateValue) {
  if (!dateValue) return null

  return String(dateValue).slice(0, 10)
}

function getDismissedItemSignature(item) {
  const entity = item?.entity || item || {}

  return [
    item?.type || '',
    entity.id || '',
    entity.invoice_number || '',
    entity.status || '',
    entity.due_date || '',
    entity.ends_on || '',
    entity.event_date || '',
    entity.published_at || '',
    entity.stock_quantity ?? '',
    entity.reorder_level ?? '',
    item?.issue || '',
  ].join(':')
}

function getTaskDismissSignature(task) {
  return [
    task.id,
    task.priority,
    task.count ?? 0,
    task.amount ?? '',
    task.dueDate || '',
    task.targetPage || '',
    task.items?.map(getDismissedItemSignature).join('|') || '',
  ].join('::')
}

export function DashboardCockpit({ tasks = [], onNavigate }) {
  const [dismissedTasks, setDismissedTasks] = useState(() => readDismissedTasks())
  const taskSignatures = useMemo(() => {
    return tasks.reduce((signatures, task) => {
      signatures[task.id] = getTaskDismissSignature(task)
      return signatures
    }, {})
  }, [tasks])
  const visibleTasks = tasks.filter((task) => dismissedTasks[task.id] !== taskSignatures[task.id])
  const hiddenTasksCount = tasks.length - visibleTasks.length
  const totalCritical = getTasksByPriority(visibleTasks, 'critical').length
  const totalImportant = getTasksByPriority(visibleTasks, 'important').length
  const totalInfo = getTasksByPriority(visibleTasks, 'info').length

  function dismissTask(task) {
    const nextDismissedTasks = {
      ...dismissedTasks,
      [task.id]: taskSignatures[task.id],
    }

    setDismissedTasks(nextDismissedTasks)
    writeDismissedTasks(nextDismissedTasks)
  }

  function showAllTasks() {
    setDismissedTasks({})
    writeDismissedTasks({})
  }

  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.black}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <strong style={dashboardLabelStyle}>Vereins-Cockpit</strong>
          <p style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 0 }}>
            Aufgaben-Center fuer Finanzen, Termine, Sponsoren, Fanartikel und oeffentliche Inhalte.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            ['critical', totalCritical],
            ['important', totalImportant],
            ['info', totalInfo],
          ].map(([priority, count]) => {
            const config = priorityConfig[priority]

            return (
              <span
                key={priority}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: `1px solid ${config.border}`,
                  background: config.background,
                  color: config.text,
                  fontWeight: 900,
                }}
              >
                {config.label}: {count}
              </span>
            )
          })}
        </div>
      </div>

      {(hiddenTasksCount > 0 || tasks.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={mutedTextStyle}>
            {hiddenTasksCount > 0 ? `${hiddenTasksCount} Aufgabe(n) lokal ausgeblendet.` : 'Keine lokal ausgeblendeten Aufgaben.'}
          </span>
          <button
            type="button"
            onClick={showAllTasks}
            disabled={hiddenTasksCount === 0}
            style={{
              ...secondaryButtonStyle,
              width: 'auto',
              marginTop: 0,
              marginRight: 0,
              marginBottom: 0,
              opacity: hiddenTasksCount === 0 ? 0.55 : 1,
              cursor: hiddenTasksCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Alle wieder anzeigen
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div style={{ ...cardStyle, marginTop: 14, marginBottom: 0, borderTop: `4px solid ${colors.successText}` }}>
          <strong>Keine offenen Aufgaben</strong>
          <br />
          <span style={mutedTextStyle}>Aktuell sind keine kritischen, wichtigen oder informativen Cockpit-Aufgaben vorhanden.</span>
        </div>
      ) : visibleTasks.length === 0 ? (
        <div style={{ ...cardStyle, marginTop: 14, marginBottom: 0, borderTop: `4px solid ${colors.successText}` }}>
          <strong>Alle Aufgaben ausgeblendet</strong>
          <br />
          <span style={mutedTextStyle}>Es gibt offene Cockpit-Aufgaben, sie sind aber lokal fuer dich ausgeblendet.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 14 }}>
          {['critical', 'important', 'info'].map((priority) => {
            const config = priorityConfig[priority]
            const priorityTasks = getTasksByPriority(visibleTasks, priority)

            return (
              <section
                key={priority}
                style={{
                  ...cardStyle,
                  marginBottom: 0,
                  borderTop: `5px solid ${config.border}`,
                  background: config.background,
                }}
              >
                <strong style={{ ...dashboardLabelStyle, color: config.text }}>{config.label}</strong>

                {priorityTasks.length === 0 ? (
                  <p style={{ ...mutedTextStyle, marginBottom: 0 }}>Keine Aufgaben in dieser Prioritaet.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                    {priorityTasks.map((task) => (
                      <article
                        key={task.id}
                        style={{
                          ...cardStyle,
                          marginBottom: 0,
                          boxShadow: 'none',
                          borderLeft: `5px solid ${config.border}`,
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 999,
                              background: colors.offWhite,
                              border: `1px solid ${colors.border}`,
                              color: colors.text,
                              fontWeight: 900,
                              fontSize: 13,
                            }}
                          >
                            {areaLabels[task.area] || task.area}
                          </span>
                          {task.count > 0 && <span style={{ color: colors.muted }}>{task.count} offen</span>}
                          {task.dueDate && <span style={{ color: colors.muted }}>Faellig: {formatDueDate(task.dueDate)}</span>}
                        </div>

                        <strong>{task.title}</strong>
                        <p style={{ ...mutedTextStyle, marginTop: 6, marginBottom: 8 }}>{task.message}</p>

                        {task.items?.length > 0 && (
                          <ul style={{ marginTop: 0, marginBottom: 10, paddingLeft: 18 }}>
                            {task.items.slice(0, 3).map((item, index) => {
                              const label = getItemLabel(item)
                              const issue = item.issue ? ` - ${item.issue}` : ''

                              return (
                                <li key={`${task.id}-${label}-${index}`}>
                                  {label || 'Eintrag'}{issue}
                                </li>
                              )
                            })}
                          </ul>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => onNavigate?.(task.targetPage)}
                            style={{
                              ...(task.priority === 'critical' ? buttonStyle : secondaryButtonStyle),
                              flex: '1 1 160px',
                              width: 'auto',
                              marginTop: 0,
                              marginRight: 0,
                              marginBottom: 0,
                            }}
                          >
                            {targetLabels[task.targetPage] || 'Oeffnen'}
                          </button>
                          <button
                            type="button"
                            onClick={() => dismissTask(task)}
                            style={{
                              ...secondaryButtonStyle,
                              flex: '1 1 160px',
                              width: 'auto',
                              marginTop: 0,
                              marginRight: 0,
                              marginBottom: 0,
                            }}
                          >
                            Fuer mich ausblenden
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
