import { useMemo, useState } from 'react'
import {
  buttonStyle,
  cardStyle,
  headingStyle,
  inputStyle,
  sectionStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'

export function AdminExports({
  clubPaymentSettings,
  saveClubPaymentSettings,
  exportMembersPdf,
  exportAllMemberCardsPdf,
  exportCashPdf,
  exportDetailedCashbookPdf,
  exportTaxAdvisorCsv,
  exportTaxAdvisorProCsv,
  exportCategorySummaryCsv,
  exportExcelStyleCashbookCsv,
  exportExcelStyleCashbookPdf,
  exportOpenFeesPdf,
  exportCheckinsPdf,
}) {
  const [paymentSettingsDraft, setPaymentSettingsDraft] = useState(null)
  const [paymentSettingsSaving, setPaymentSettingsSaving] = useState(false)
  const [paymentSettingsFeedback, setPaymentSettingsFeedback] = useState('')
  const paymentSettingsForm = paymentSettingsDraft || clubPaymentSettings || {}

  const defaultPaymentOptions = useMemo(() => {
    const options = [{ value: 'ebanking', label: 'E-Banking' }]

    if (paymentSettingsForm.cash_enabled) {
      options.push({ value: 'bar', label: 'Barzahlung' })
    }

    if (paymentSettingsForm.paypal_enabled) {
      options.push({ value: 'paypal', label: 'PayPal' })
    }

    return options
  }, [paymentSettingsForm.cash_enabled, paymentSettingsForm.paypal_enabled])

  const selectedDefaultPaymentMethod = defaultPaymentOptions.some(
    (option) => option.value === paymentSettingsForm.default_payment_method
  )
    ? paymentSettingsForm.default_payment_method
    : 'ebanking'

  function updatePaymentSettingsField(field, value) {
    setPaymentSettingsFeedback('')
    setPaymentSettingsDraft((current) => ({
      ...(current || clubPaymentSettings || {}),
      [field]: value,
    }))
  }

  async function handleSavePaymentSettings() {
    setPaymentSettingsSaving(true)
    setPaymentSettingsFeedback('')

    try {
      const result = await saveClubPaymentSettings(paymentSettingsForm)
      if (result?.ok) {
        setPaymentSettingsDraft(result.data)
        setPaymentSettingsFeedback('Zahlungseinstellungen gespeichert.')
      }
    } finally {
      setPaymentSettingsSaving(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Schnellexporte</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={exportMembersPdf} style={secondaryButtonStyle}>
          Mitgliederliste PDF
        </button>

        <button onClick={exportAllMemberCardsPdf} style={secondaryButtonStyle}>
          Mitgliedsausweise Druckbogen
        </button>
        <button onClick={exportCashPdf} style={secondaryButtonStyle}>
          Kassabuch PDF
        </button>
        <button onClick={exportDetailedCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch Detail PDF
        </button>

        <button onClick={exportTaxAdvisorCsv} style={secondaryButtonStyle}>
          Steuerberater CSV
        </button>

        <button onClick={exportTaxAdvisorProCsv} style={secondaryButtonStyle}>
          Steuerberater PRO CSV
        </button>

        <button onClick={exportCategorySummaryCsv} style={secondaryButtonStyle}>
          Kategorien-Auswertung CSV
        </button>

        <button onClick={exportExcelStyleCashbookCsv} style={secondaryButtonStyle}>
          Kassabuch wie Excel CSV
        </button>

        <button onClick={exportExcelStyleCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch wie Excel PDF
        </button>
        <button onClick={exportOpenFeesPdf} style={secondaryButtonStyle}>
          Offene Beiträge PDF
        </button>
        <button onClick={exportCheckinsPdf} style={secondaryButtonStyle}>
          Anwesenheitsliste PDF
        </button>
      </div>

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <strong>Vereins-Zahlungseinstellungen</strong>
        <input
          placeholder="Kontoinhaber"
          value={paymentSettingsForm.account_holder || ''}
          onChange={(event) => updatePaymentSettingsField('account_holder', event.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="IBAN"
          value={paymentSettingsForm.iban || ''}
          onChange={(event) => updatePaymentSettingsField('iban', event.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="BIC"
          value={paymentSettingsForm.bic || ''}
          onChange={(event) => updatePaymentSettingsField('bic', event.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Bankname optional"
          value={paymentSettingsForm.bank_name || ''}
          onChange={(event) => updatePaymentSettingsField('bank_name', event.target.value)}
          style={inputStyle}
        />

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 800 }}>
          <input
            type="checkbox"
            checked={Boolean(paymentSettingsForm.paypal_enabled)}
            onChange={(event) => updatePaymentSettingsField('paypal_enabled', event.target.checked)}
            style={{ marginRight: 8 }}
          />
          PayPal aktiv
        </label>
        <input
          placeholder="PayPal-Adresse"
          value={paymentSettingsForm.paypal_address || ''}
          onChange={(event) => updatePaymentSettingsField('paypal_address', event.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="PayPal-Link"
          value={paymentSettingsForm.paypal_link || ''}
          onChange={(event) => updatePaymentSettingsField('paypal_link', event.target.value)}
          style={inputStyle}
        />

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 800 }}>
          <input
            type="checkbox"
            checked={Boolean(paymentSettingsForm.cash_enabled)}
            onChange={(event) => updatePaymentSettingsField('cash_enabled', event.target.checked)}
            style={{ marginRight: 8 }}
          />
          Barzahlung aktiv
        </label>

        <select
          value={selectedDefaultPaymentMethod}
          onChange={(event) => updatePaymentSettingsField('default_payment_method', event.target.value)}
          style={inputStyle}
        >
          {defaultPaymentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button onClick={handleSavePaymentSettings} style={buttonStyle} disabled={paymentSettingsSaving}>
          {paymentSettingsSaving ? 'Speichern...' : 'Zahlungseinstellungen speichern'}
        </button>
        {paymentSettingsFeedback && <p style={{ marginTop: 8, fontWeight: 800 }}>{paymentSettingsFeedback}</p>}
      </div>
    </section>
  )
}
