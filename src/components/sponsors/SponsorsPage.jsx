import {
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'
import { RichTextEditor } from '../common/RichTextEditor'

export function SponsorsPage({
  sponsors,
  sponsorContracts,
  canManageSponsors,
  sponsorEditingId,
  sponsorName,
  setSponsorName,
  sponsorContactPerson,
  setSponsorContactPerson,
  sponsorEmail,
  setSponsorEmail,
  sponsorPhone,
  setSponsorPhone,
  sponsorWebsite,
  setSponsorWebsite,
  sponsorLogoPath,
  setSponsorLogoPath,
  sponsorLogoFile,
  setSponsorLogoFile,
  sponsorLogoAlt,
  setSponsorLogoAlt,
  sponsorIsPublic,
  setSponsorIsPublic,
  sponsorLevel,
  setSponsorLevel,
  sponsorPublicSortOrder,
  setSponsorPublicSortOrder,
  sponsorPublicDescription,
  setSponsorPublicDescription,
  sponsorPublicDescriptionHtml,
  setSponsorPublicDescriptionHtml,
  sponsorStatus,
  setSponsorStatus,
  sponsorNotes,
  setSponsorNotes,
  sponsorSaving,
  sponsorDeletingId,
  saveSponsor,
  resetSponsorForm,
  editSponsor,
  deleteSponsor,
  sponsorContractEditingId,
  contractSponsorId,
  setContractSponsorId,
  contractTitle,
  setContractTitle,
  contractLevel,
  setContractLevel,
  contractStatus,
  setContractStatus,
  contractStartsOn,
  setContractStartsOn,
  contractEndsOn,
  setContractEndsOn,
  contractAmount,
  setContractAmount,
  contractPaymentStatus,
  setContractPaymentStatus,
  contractBillingCycle,
  setContractBillingCycle,
  contractBenefits,
  setContractBenefits,
  contractNotes,
  setContractNotes,
  sponsorContractSaving,
  sponsorContractDeletingId,
  saveSponsorContract,
  resetSponsorContractForm,
  editSponsorContract,
  deleteSponsorContract,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Sponsoren</h2>

      {canManageSponsors() && (
        <>
          <h3 style={headingStyle}>{sponsorEditingId ? 'Sponsor bearbeiten' : 'Sponsor anlegen'}</h3>

          <FormSection title="Stammdaten">
            <input
              placeholder="Sponsorname"
              value={sponsorName}
              onChange={(event) => setSponsorName(event.target.value)}
              style={inputStyle}
            />

            <select
              value={sponsorLevel}
              onChange={(event) => setSponsorLevel(event.target.value)}
              style={inputStyle}
            >
              <option value="main">Hauptsponsor</option>
              <option value="premium">Sponsor</option>
              <option value="partner">Partner</option>
              <option value="supporter">Unterstuetzer</option>
            </select>

            <select
              value={sponsorStatus}
              onChange={(event) => setSponsorStatus(event.target.value)}
              style={inputStyle}
            >
              <option value="active">Aktiv</option>
              <option value="prospect">Interessent</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </FormSection>

          <FormSection title="Kontakt">
            <input
              placeholder="Ansprechpartner"
              value={sponsorContactPerson}
              onChange={(event) => setSponsorContactPerson(event.target.value)}
              style={inputStyle}
            />

            <input
              type="email"
              placeholder="E-Mail"
              value={sponsorEmail}
              onChange={(event) => setSponsorEmail(event.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Telefon"
              value={sponsorPhone}
              onChange={(event) => setSponsorPhone(event.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Website"
              value={sponsorWebsite}
              onChange={(event) => setSponsorWebsite(event.target.value)}
              style={inputStyle}
            />
          </FormSection>

          <FormSection title="Oeffentliche Anzeige">
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={sponsorIsPublic}
                onChange={(event) => setSponsorIsPublic(event.target.checked)}
              />
              Oeffentlich anzeigen
            </label>

            <input
              placeholder="Logo-/Bild-Pfad in public-assets"
              value={sponsorLogoPath}
              onChange={(event) => setSponsorLogoPath(event.target.value)}
              style={inputStyle}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(event) => setSponsorLogoFile(event.target.files?.[0] || null)}
              style={inputStyle}
            />

            {sponsorLogoFile && <p style={mutedTextStyle}>Neues Logo: {sponsorLogoFile.name}</p>}

            <input
              placeholder="Logo Alt-Text"
              value={sponsorLogoAlt}
              onChange={(event) => setSponsorLogoAlt(event.target.value)}
              style={inputStyle}
            />

            <input
              type="number"
              min="0"
              step="1"
              placeholder="Sortierung auf Homepage"
              value={sponsorPublicSortOrder}
              onChange={(event) => setSponsorPublicSortOrder(event.target.value)}
              style={inputStyle}
            />

            <textarea
              placeholder="Oeffentliche Beschreibung"
              value={sponsorPublicDescription}
              onChange={(event) => setSponsorPublicDescription(event.target.value)}
              style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }}
            />

            <div style={richTextFieldStyle}>
              <p style={richTextHintStyle}>Formatierte Beschreibung fuer Homepage-Ausgaben</p>
              <RichTextEditor
                value={sponsorPublicDescriptionHtml}
                onChange={setSponsorPublicDescriptionHtml}
                placeholder="Formatierte Sponsoren-Beschreibung"
                disabled={sponsorSaving}
                minHeight={150}
              />
            </div>
          </FormSection>

          <FormSection title="Notizen">
            <textarea
              placeholder="Interne Notizen"
              value={sponsorNotes}
              onChange={(event) => setSponsorNotes(event.target.value)}
              style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }}
            />
          </FormSection>

          <button onClick={saveSponsor} disabled={sponsorSaving} style={buttonStyle}>
            {sponsorSaving ? 'Sponsor wird gespeichert...' : sponsorEditingId ? 'Aenderungen speichern' : 'Sponsor speichern'}
          </button>

          {sponsorEditingId && (
            <button onClick={resetSponsorForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          )}
        </>
      )}

      {canManageSponsors() && (
        <>
          <h3 style={headingStyle}>
            {sponsorContractEditingId ? 'Sponsor-Vertrag bearbeiten' : 'Sponsor-Vertrag anlegen'}
          </h3>

          <FormSection title="Vertrag & Zahlung">
            <select
              value={contractSponsorId}
              onChange={(event) => setContractSponsorId(event.target.value)}
              style={inputStyle}
            >
              <option value="">Sponsor auswaehlen</option>
              {sponsors.map((sponsor) => (
                <option key={sponsor.id} value={sponsor.id}>
                  {sponsor.name}
                </option>
              ))}
            </select>

            <input
              placeholder="Vertragstitel"
              value={contractTitle}
              onChange={(event) => setContractTitle(event.target.value)}
              style={inputStyle}
            />

            <select
              value={contractLevel}
              onChange={(event) => setContractLevel(event.target.value)}
              style={inputStyle}
            >
              <option value="main">Hauptsponsor</option>
              <option value="premium">Sponsor</option>
              <option value="partner">Partner</option>
              <option value="supporter">Unterstuetzer</option>
              <option value="other">Sonstiges</option>
            </select>

            <select
              value={contractStatus}
              onChange={(event) => setContractStatus(event.target.value)}
              style={inputStyle}
            >
              <option value="draft">Entwurf</option>
              <option value="active">Aktiv</option>
              <option value="expired">Abgelaufen</option>
              <option value="cancelled">Gekuendigt</option>
            </select>

            <input
              type="date"
              value={contractStartsOn}
              onChange={(event) => setContractStartsOn(event.target.value)}
              style={inputStyle}
            />

            <input
              type="date"
              value={contractEndsOn}
              onChange={(event) => setContractEndsOn(event.target.value)}
              style={inputStyle}
            />

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Sponsoring-Betrag in EUR"
              value={contractAmount}
              onChange={(event) => setContractAmount(event.target.value)}
              style={inputStyle}
            />

            <select
              value={contractPaymentStatus}
              onChange={(event) => setContractPaymentStatus(event.target.value)}
              style={inputStyle}
            >
              <option value="open">Offen</option>
              <option value="partial">Teilbezahlt</option>
              <option value="paid">Bezahlt</option>
              <option value="overdue">Ueberfaellig</option>
              <option value="waived">Erlassen</option>
            </select>

            <select
              value={contractBillingCycle}
              onChange={(event) => setContractBillingCycle(event.target.value)}
              style={inputStyle}
            >
              <option value="one_time">Einmalig</option>
              <option value="monthly">Monatlich</option>
              <option value="quarterly">Quartalsweise</option>
              <option value="yearly">Jaehrlich</option>
              <option value="custom">Individuell</option>
            </select>
          </FormSection>

          <FormSection title="Leistungen">
            <textarea
              placeholder="Leistungen / Gegenleistungen"
              value={contractBenefits}
              onChange={(event) => setContractBenefits(event.target.value)}
              style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }}
            />
          </FormSection>

          <FormSection title="Notizen">
            <textarea
              placeholder="Interne Notizen zum Vertrag"
              value={contractNotes}
              onChange={(event) => setContractNotes(event.target.value)}
              style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }}
            />
          </FormSection>

          <button onClick={saveSponsorContract} disabled={sponsorContractSaving} style={buttonStyle}>
            {sponsorContractSaving ? 'Vertrag wird gespeichert...' : sponsorContractEditingId ? 'Vertrag speichern' : 'Vertrag anlegen'}
          </button>

          {sponsorContractEditingId && (
            <button onClick={resetSponsorContractForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          )}
        </>
      )}

      <p>
        Sponsoren: <strong>{sponsors.length}</strong>
        <br />
        Sponsor-Vertraege: <strong>{sponsorContracts.length}</strong>
      </p>

      {sponsors.length === 0 && <p style={mutedTextStyle}>Noch keine Sponsoren angelegt.</p>}

      {sponsors.map((sponsor) => (
        <div
          key={sponsor.id}
          style={{
            ...cardStyle,
            borderLeft: `6px solid ${sponsor.status === 'active' ? colors.blue : colors.muted}`,
            opacity: sponsor.status === 'inactive' ? 0.72 : 1,
          }}
        >
          <strong>{sponsor.name}</strong>
          <br />
          Status: {getSponsorStatusLabel(sponsor.status)}
          <br />
          Stufe: {getSponsorLevelLabel(sponsor.sponsor_level)}
          <br />
          Kontakt: {sponsor.contact_person || '-'}
          <br />
          E-Mail: {sponsor.email || '-'} - Telefon: {sponsor.phone || '-'}
          <br />
          Website: {sponsor.website || '-'}
          <br />
          Logo/Bild: {sponsor.logo_path || '-'}
          <br />
          Oeffentlich: {sponsor.is_public ? 'Ja' : 'Nein'} - Sortierung: {sponsor.public_sort_order ?? 0}
          <br />
          Logo Alt-Text: {sponsor.logo_alt || '-'}
          <br />
          Oeffentliche Beschreibung: {sponsor.public_description || '-'}
          <br />
          Formatierte Beschreibung: {sponsor.public_description_html ? 'Vorhanden' : '-'}
          <br />
          Interne Notizen: {sponsor.notes || '-'}

          <SponsorContractsList
            contracts={sponsorContracts.filter((contract) => contract.sponsor_id === sponsor.id)}
            canManageSponsors={canManageSponsors}
            editSponsorContract={editSponsorContract}
            deleteSponsorContract={deleteSponsorContract}
            sponsorContractDeletingId={sponsorContractDeletingId}
          />

          {canManageSponsors() && (
            <>
              <br />
              <button onClick={() => editSponsor(sponsor)} style={buttonStyle}>
                Bearbeiten
              </button>
              <button
                onClick={() => deleteSponsor(sponsor)}
                disabled={sponsorDeletingId === sponsor.id}
                style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
              >
                {sponsorDeletingId === sponsor.id ? 'Sponsor wird geloescht...' : 'Sponsor loeschen'}
              </button>
            </>
          )}
        </div>
      ))}
    </section>
  )
}

function FormSection({ title, children }) {
  return (
    <fieldset style={formSectionStyle}>
      <legend style={formSectionLegendStyle}>{title}</legend>
      {children}
    </fieldset>
  )
}

function getSponsorStatusLabel(status) {
  if (status === 'active') return 'Aktiv'
  if (status === 'prospect') return 'Interessent'
  if (status === 'inactive') return 'Inaktiv'
  return status || '-'
}

function SponsorContractsList({
  contracts,
  canManageSponsors,
  editSponsorContract,
  deleteSponsorContract,
  sponsorContractDeletingId,
}) {
  if (contracts.length === 0) {
    return (
      <>
        <br />
        <span style={mutedTextStyle}>Keine Vertraege hinterlegt.</span>
      </>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      <strong>Vertraege</strong>
      {contracts.map((contract) => (
        <div
          key={contract.id}
          style={{
            borderTop: `1px solid ${colors.border}`,
            marginTop: 10,
            paddingTop: 10,
          }}
        >
          <strong>{contract.title}</strong>
          <br />
          Stufe: {getSponsorLevelLabel(contract.category)} - Status: {getContractStatusLabel(contract.status)}
          <br />
          Laufzeit: {formatDate(contract.starts_on)} bis {formatDate(contract.ends_on)}
          <br />
          Betrag: {formatAmount(contract.amount_cents)} - Zahlung: {getPaymentStatusLabel(contract.payment_status)}
          <br />
          Abrechnung: {getBillingCycleLabel(contract.billing_cycle)}
          <br />
          Leistungen: {contract.benefits || '-'}
          <br />
          Interne Notizen: {contract.notes || '-'}

          {canManageSponsors() && (
            <>
              <br />
              <button onClick={() => editSponsorContract(contract)} style={buttonStyle}>
                Vertrag bearbeiten
              </button>
              <button
                onClick={() => deleteSponsorContract(contract)}
                disabled={sponsorContractDeletingId === contract.id}
                style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
              >
                {sponsorContractDeletingId === contract.id ? 'Vertrag wird geloescht...' : 'Vertrag loeschen'}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function getSponsorLevelLabel(level) {
  if (level === 'main') return 'Hauptsponsor'
  if (level === 'premium') return 'Sponsor'
  if (level === 'partner') return 'Partner'
  if (level === 'supporter') return 'Unterstuetzer'
  if (level === 'bronze') return 'Bronze'
  if (level === 'silver') return 'Silber'
  if (level === 'gold') return 'Gold'
  if (level === 'other') return 'Sonstiges'
  return level || '-'
}

function getContractStatusLabel(status) {
  if (status === 'draft') return 'Entwurf'
  if (status === 'active') return 'Aktiv'
  if (status === 'expired') return 'Abgelaufen'
  if (status === 'cancelled') return 'Gekuendigt'
  return status || '-'
}

function getPaymentStatusLabel(status) {
  if (status === 'open') return 'Offen'
  if (status === 'partial') return 'Teilbezahlt'
  if (status === 'paid') return 'Bezahlt'
  if (status === 'overdue') return 'Ueberfaellig'
  if (status === 'waived') return 'Erlassen'
  return status || '-'
}

function getBillingCycleLabel(billingCycle) {
  if (billingCycle === 'one_time') return 'Einmalig'
  if (billingCycle === 'monthly') return 'Monatlich'
  if (billingCycle === 'quarterly') return 'Quartalsweise'
  if (billingCycle === 'yearly') return 'Jaehrlich'
  if (billingCycle === 'custom') return 'Individuell'
  return billingCycle || '-'
}

function formatDate(value) {
  return value || '-'
}

function formatAmount(amountCents) {
  return `${(Number(amountCents || 0) / 100).toFixed(2)} EUR`
}

const formSectionStyle = {
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: 14,
  margin: '0 0 16px',
  background: colors.white,
}

const formSectionLegendStyle = {
  padding: '0 8px',
  fontWeight: 900,
  color: colors.black,
}

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '8px 0 12px',
}

const richTextFieldStyle = {
  marginTop: 4,
  marginBottom: 12,
}

const richTextHintStyle = {
  ...mutedTextStyle,
  margin: '0 0 8px',
  fontWeight: 700,
}
