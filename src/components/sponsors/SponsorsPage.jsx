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
  sponsorStatus,
  setSponsorStatus,
  sponsorNotes,
  setSponsorNotes,
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
  contractBillingCycle,
  setContractBillingCycle,
  contractNotes,
  setContractNotes,
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

          <input
            placeholder="Name"
            value={sponsorName}
            onChange={(event) => setSponsorName(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Kontaktperson"
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

          <input
            placeholder="Logo-Pfad"
            value={sponsorLogoPath}
            onChange={(event) => setSponsorLogoPath(event.target.value)}
            style={inputStyle}
          />

          <select
            value={sponsorStatus}
            onChange={(event) => setSponsorStatus(event.target.value)}
            style={inputStyle}
          >
            <option value="active">Aktiv</option>
            <option value="prospect">Interessent</option>
            <option value="inactive">Inaktiv</option>
          </select>

          <input
            placeholder="Notizen"
            value={sponsorNotes}
            onChange={(event) => setSponsorNotes(event.target.value)}
            style={inputStyle}
          />

          <button onClick={saveSponsor} style={buttonStyle}>
            {sponsorEditingId ? 'Anderungen speichern' : 'Sponsor speichern'}
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

          <select
            value={contractSponsorId}
            onChange={(event) => setContractSponsorId(event.target.value)}
            style={inputStyle}
          >
            <option value="">Sponsor auswahlen</option>
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
            <option value="bronze">Bronze</option>
            <option value="silver">Silber</option>
            <option value="gold">Gold</option>
            <option value="main">Hauptsponsor</option>
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
            placeholder="Betrag in EUR"
            value={contractAmount}
            onChange={(event) => setContractAmount(event.target.value)}
            style={inputStyle}
          />

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

          <input
            placeholder="Notizen zum Vertrag"
            value={contractNotes}
            onChange={(event) => setContractNotes(event.target.value)}
            style={inputStyle}
          />

          <button onClick={saveSponsorContract} style={buttonStyle}>
            {sponsorContractEditingId ? 'Vertrag speichern' : 'Vertrag anlegen'}
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

      {sponsors.length === 0 && (
        <p style={mutedTextStyle}>Noch keine Sponsoren angelegt.</p>
      )}

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
          Kontakt: {sponsor.contact_person || '-'}
          <br />
          E-Mail: {sponsor.email || '-'} - Telefon: {sponsor.phone || '-'}
          <br />
          Website: {sponsor.website || '-'}
          <br />
          Logo: {sponsor.logo_path || '-'}
          <br />
          Notizen: {sponsor.notes || '-'}

          <SponsorContractsList
            contracts={sponsorContracts.filter((contract) => contract.sponsor_id === sponsor.id)}
            canManageSponsors={canManageSponsors}
            editSponsorContract={editSponsorContract}
            deleteSponsorContract={deleteSponsorContract}
          />

          {canManageSponsors() && (
            <>
              <br />
              <button onClick={() => editSponsor(sponsor)} style={buttonStyle}>
                Bearbeiten
              </button>
              <button
                onClick={() => deleteSponsor(sponsor)}
                style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
              >
                Sponsor loschen
              </button>
            </>
          )}
        </div>
      ))}
    </section>
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
          Level: {getSponsorLevelLabel(contract.category)} - Status: {getContractStatusLabel(contract.status)}
          <br />
          Laufzeit: {formatDate(contract.starts_on)} bis {formatDate(contract.ends_on)}
          <br />
          Betrag: {formatAmount(contract.amount_cents)} - Abrechnung: {getBillingCycleLabel(contract.billing_cycle)}
          <br />
          Notizen: {contract.notes || '-'}

          {canManageSponsors() && (
            <>
              <br />
              <button onClick={() => editSponsorContract(contract)} style={buttonStyle}>
                Vertrag bearbeiten
              </button>
              <button
                onClick={() => deleteSponsorContract(contract)}
                style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
              >
                Vertrag loschen
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function getSponsorLevelLabel(level) {
  if (level === 'bronze') return 'Bronze'
  if (level === 'silver') return 'Silber'
  if (level === 'gold') return 'Gold'
  if (level === 'main') return 'Hauptsponsor'
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
