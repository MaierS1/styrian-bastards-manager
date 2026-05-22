import { getCashAmountCents, isValidCashEntry } from '../../helpers/dashboardHelpers'

export function getCashbookDetailedSummaryService({
  entries,
  selectedCashYear,
  getCashMonthKey,
  getPaymentMethod,
}) {
  const grouped = {}

  entries.filter((entry) => isValidCashEntry(entry)).forEach((entry) => {
    const monthKey = getCashMonthKey(entry.entry_date)

    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        monthKey,
        year: String(entry.entry_year || String(entry.entry_date || '').slice(0, 4)),
        openingBankIncome: 0,
        openingBankExpense: 0,
        openingCashIncome: 0,
        openingCashExpense: 0,
        openingBank: 0,
        openingCash: 0,
        incomeBank: 0,
        expenseBank: 0,
        incomeCash: 0,
        expenseCash: 0,
        totalIncome: 0,
        totalExpense: 0,
        totalIncomeWithOpening: 0,
        totalExpenseWithOpening: 0,
        monthMovement: 0,
        differenceWithOpening: 0,
        runningBalance: 0,
        entries: [],
      }
    }

    const amount = getCashAmountCents(entry) / 100
    const paymentMethod = getPaymentMethod(entry)

    if (entry.is_opening) {
      if (paymentMethod === 'ebanking') {
        if (entry.type === 'einnahme') grouped[monthKey].openingBankIncome += amount
        if (entry.type === 'ausgabe') grouped[monthKey].openingBankExpense += amount
      } else {
        if (entry.type === 'einnahme') grouped[monthKey].openingCashIncome += amount
        if (entry.type === 'ausgabe') grouped[monthKey].openingCashExpense += amount
      }

      grouped[monthKey].openingBank = grouped[monthKey].openingBankIncome - grouped[monthKey].openingBankExpense
      grouped[monthKey].openingCash = grouped[monthKey].openingCashIncome - grouped[monthKey].openingCashExpense

      grouped[monthKey].entries.push(entry)
      return
    }

    if (entry.type === 'einnahme') {
      grouped[monthKey].totalIncome += amount
      if (paymentMethod === 'ebanking') grouped[monthKey].incomeBank += amount
      else grouped[monthKey].incomeCash += amount
    }

    if (entry.type === 'ausgabe') {
      grouped[monthKey].totalExpense += amount
      if (paymentMethod === 'ebanking') grouped[monthKey].expenseBank += amount
      else grouped[monthKey].expenseCash += amount
    }

    grouped[monthKey].entries.push(entry)
  })

  let runningBalance = 0
  let currentYear = null

  return Object.values(grouped)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((month) => {
      const monthYear = String(month.year || month.monthKey.slice(0, 4))

      if (selectedCashYear === 'alle' && currentYear !== monthYear) {
        runningBalance = 0
        currentYear = monthYear
      }

      const openingTotal = month.openingBank + month.openingCash
      month.monthMovement = month.totalIncome - month.totalExpense
      month.totalIncomeWithOpening =
        month.openingBankIncome + month.openingCashIncome + month.totalIncome
      month.totalExpenseWithOpening =
        month.openingBankExpense + month.openingCashExpense + month.totalExpense
      month.differenceWithOpening =
        month.totalIncomeWithOpening - month.totalExpenseWithOpening

      runningBalance += openingTotal + month.monthMovement

      return {
        ...month,
        openingTotal,
        runningBalance,
      }
    })
}
