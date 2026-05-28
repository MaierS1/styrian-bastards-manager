import {
  buttonStyle,
  cardStyle,
  colors,
  dashboardLabelStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'

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

function getTaskTargetPage(task) {
  return task?.target?.page || task?.targetPage
}

export function DashboardCockpit({ tasks = [], onNavigate }) {
  const totalCritical = getTasksByPriority(tasks, 'critical').length
  const totalImportant = getTasksByPriority(tasks, 'important').length
  const totalInfo = getTasksByPriority(tasks, 'info').length

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

      {tasks.length === 0 ? (
        <div style={{ ...cardStyle, marginTop: 14, marginBottom: 0, borderTop: `4px solid ${colors.successText}` }}>
          <strong>Keine offenen Aufgaben</strong>
          <br />
          <span style={mutedTextStyle}>Aktuell sind keine kritischen, wichtigen oder informativen Cockpit-Aufgaben vorhanden.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 14 }}>
          {['critical', 'important', 'info'].map((priority) => {
            const config = priorityConfig[priority]
            const priorityTasks = getTasksByPriority(tasks, priority)

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
                          {task.count > 0 && <span style={{ color: colors.muted }}>Anzahl: {task.count}</span>}
                          {task.dueDate && <span style={{ color: colors.muted }}>Faellig: {formatDueDate(task.dueDate)}</span>}
                        </div>

                        <strong>{task.title}</strong>
                        <p style={{ marginTop: 6, marginBottom: 6, fontWeight: 800 }}>{task.message}</p>

                        {task.summary && (
                          <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 8 }}>{task.summary}</p>
                        )}

                        {task.nextAction && (
                          <div
                            style={{
                              marginBottom: 8,
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: colors.offWhite,
                              border: `1px solid ${colors.border}`,
                              fontWeight: 900,
                            }}
                          >
                            Naechster Schritt: {task.nextAction}
                          </div>
                        )}

                        {task.items?.length > 0 && (
                          <ul style={{ marginTop: 0, marginBottom: 10, paddingLeft: 18, color: colors.muted }}>
                            {task.items.slice(0, 2).map((item, index) => {
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

                        <button
                          type="button"
                          onClick={() => onNavigate?.(task)}
                          style={{
                            ...(task.priority === 'critical' ? buttonStyle : secondaryButtonStyle),
                            width: '100%',
                            marginTop: 0,
                            marginRight: 0,
                            marginBottom: 0,
                          }}
                        >
                          {targetLabels[getTaskTargetPage(task)] || 'Oeffnen'}
                        </button>
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
