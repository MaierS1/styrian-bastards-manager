import { headingStyle, sectionStyle } from '../../styles/appStyles'
import { DashboardSmartAlerts } from './DashboardSmartAlerts'
import { DashboardSummaryCards } from './DashboardSummaryCards'
import { DashboardMonthlyChart } from './DashboardMonthlyChart'
import { DashboardStats } from './DashboardStats'
import { DashboardFinanceOverview } from './DashboardFinanceOverview'
import { DashboardCommercialOverview } from './DashboardCommercialOverview'
import { DashboardRecentActivities } from './DashboardRecentActivities'

export function DashboardPage(props) {
  const {
    alerts,
    getAlertStyle,
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
  } = props

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Dashboard</h2>

      <DashboardSmartAlerts alerts={alerts} getAlertStyle={getAlertStyle} />

      <DashboardSummaryCards
        cashBalance={cashBalance}
        incomeTotal={incomeTotal}
        expenseTotal={expenseTotal}
        inventoryTotalValue={inventoryTotalValue}
        testMembersCount={testMembersCount}
        openFeesCount={openFeesCount}
        openFeesTotal={openFeesTotal}
        nextEvent={nextEvent}
      />

      <DashboardMonthlyChart monthlyData={monthlyData} getDashboardBarHeight={getDashboardBarHeight} />

      <DashboardStats
        memberTypeStats={memberTypeStats}
        feeStats={feeStats}
        getStatsMax={getStatsMax}
      />

      <DashboardFinanceOverview
        financeData={financeData}
        financeHealthStatus={financeHealthStatus}
        getCategorySummary={getCategorySummary}
      />

      <DashboardCommercialOverview commercialData={commercialData} />

      <DashboardRecentActivities cashEntries={cashEntries} documents={documents} />
    </section>
  )
}
