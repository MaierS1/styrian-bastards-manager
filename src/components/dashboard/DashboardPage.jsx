import { headingStyle, sectionStyle } from '../../styles/appStyles'
import { DashboardSmartAlerts } from './DashboardSmartAlerts'
import { DashboardMemberOverview } from './DashboardMemberOverview'
import { DashboardCashOverview } from './DashboardCashOverview'
import { DashboardFinanceOverview } from './DashboardFinanceOverview'
import { DashboardCommercialOverview } from './DashboardCommercialOverview'
import { DashboardRecentActivities } from './DashboardRecentActivities'
import { DashboardParkedProjectsCard } from './DashboardParkedProjectsCard'
import { DashboardNextEventCard } from './DashboardNextEventCard'
import { DashboardQuickActions } from './DashboardQuickActions'

export function DashboardPage(props) {
  const {
    alerts,
    getAlertStyle,
    activeMembersCount,
    newMembersCount,
    cashBalance,
    incomeTotal,
    expenseTotal,
    inventoryTotalValue,
    testMembersCount,
    openFeesCount,
    openFeesTotal,
    nextEvent,
    monthlyData,
    getDashboardBarHeight,
    memberTypeStats,
    feeStats,
    getStatsMax,
    financeData,
    financeHealthStatus,
    commercialData,
    getCategorySummary,
    cashEntries,
    documents,
    onNavigate,
    parkedProjectsVisible,
  } = props

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Dashboard</h2>

      <DashboardSmartAlerts alerts={alerts} getAlertStyle={getAlertStyle} />

      <div style={{ marginBottom: 18 }}>
        <h3 style={headingStyle}>Mitglieder-Übersicht</h3>
        <DashboardMemberOverview
          activeMembersCount={activeMembersCount}
          newMembersCount={newMembersCount}
          openFeesCount={openFeesCount}
          openFeesTotal={openFeesTotal}
          testMembersCount={testMembersCount}
          memberTypeStats={memberTypeStats}
          feeStats={feeStats}
          getStatsMax={getStatsMax}
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <h3 style={headingStyle}>Kassa-Übersicht</h3>
        <DashboardCashOverview
          cashBalance={cashBalance}
          incomeTotal={incomeTotal}
          expenseTotal={expenseTotal}
          inventoryTotalValue={inventoryTotalValue}
          cashEntries={cashEntries}
          monthlyData={monthlyData}
          getDashboardBarHeight={getDashboardBarHeight}
        />

        <div style={{ marginTop: 18 }}>
          <DashboardFinanceOverview
            financeData={financeData}
            financeHealthStatus={financeHealthStatus}
            getCategorySummary={getCategorySummary}
            onNavigate={onNavigate}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <DashboardRecentActivities cashEntries={cashEntries} documents={documents} />
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <h3 style={headingStyle}>Nächstes Event</h3>
        <DashboardNextEventCard nextEvent={nextEvent} onNavigate={onNavigate} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <h3 style={headingStyle}>Fanartikel/Shop-Status</h3>
        <DashboardCommercialOverview commercialData={commercialData} onNavigate={onNavigate} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <h3 style={headingStyle}>Schnellaktionen</h3>
        <DashboardQuickActions onNavigate={onNavigate} />
      </div>

      {parkedProjectsVisible && (
        <div style={{ marginBottom: 0 }}>
          <h3 style={headingStyle}>Geparkte Projekte</h3>
          <DashboardParkedProjectsCard onNavigate={onNavigate} />
        </div>
      )}
    </section>
  )
}
