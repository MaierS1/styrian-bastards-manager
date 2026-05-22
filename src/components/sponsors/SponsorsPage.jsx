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
  contractBillingCycle,
  setContractBillingCycle,
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
            placeholder="Logo-Pfad in public-assets"
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

          {sponsorLogoFile && (
            <p style={mutedTextStyle}>Neues Logo: {sponsorLogoFile.name}</p>
          )}

          <input
            placeholder="Logo Alt-Text"
            value={sponsorLogoAlt}
            onChange={(event) => setSponsorLogoAlt(event.target.value)}
            style={inputStyle}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
            <input
              type="checkbox"
              checked={sponsorIsPublic}
              onChange={(event) => setSponsorIsPublic(event.target.checked)}
            />
            Öffentlich anzeigen
          </label>

          <select
            value={sponsorLevel}
            onChange={(event) => setSponsorLevel(event.target.value)}
            style={inputStyle}
          >
            <option value="main">Hauptsponsor</option>
            <option value="premium">Premium</option>
            <option value="partner">Partner</option>
            <option value="supporter">Supporter</option>
          </select>

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Öffentliche Sortierung"
            value={sponsorPublicSortOrder}
            onChange={(event) => setSponsorPublicSortOrder(event.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder="Öffentliche Beschreibung"
            value={sponsorPublicDescription}
            onChange={(event) => setSponsorPublicDescription(event.target.value)}
            style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }}
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

          <button onClick={saveSponsor} disabled={sponsorSaving} style={buttonStyle}>
            {sponsorSaving ? 'Sponsor wird gespeichert...' : sponsorEditingId ? 'Änderungen speichern' : 'Sponsor speichern'}
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
            <option value="">Sponsor auswählen</option>
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
        Sponsor-Verträge: <strong>{sponsorContracts.length}</strong>
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
          Öffentlich: {sponsor.is_public ? 'Ja' : 'Nein'} - Level: {getSponsorLevelLabel(sponsor.sponsor_level)}
          <br />
          Öffentliche Sortierung: {sponsor.public_sort_order ?? 0}
          <br />
          Logo Alt-Text: {sponsor.logo_alt || '-'}
          <br />
          Öffentliche Beschreibung: {sponsor.public_description || '-'}
          <br />
          Notizen: {sponsor.notes || '-'}

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
                {sponsorDeletingId === sponsor.id ? 'Sponsor wird gelöscht...' : 'Sponsor löschen'}
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
  sponsorContractDeletingId,
}) {
  if (contracts.length === 0) {
    return (
      <>
        <br />
        <span style={mutedTextStyle}>Keine Verträge hinterlegt.</span>
      </>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      <strong>Verträge</strong>
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
                disabled={sponsorContractDeletingId === contract.id}
                style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
              >
                {sponsorContractDeletingId === contract.id ? 'Vertrag wird gelöscht...' : 'Vertrag löschen'}
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
  if (level === 'premium') return 'Premium'
  if (level === 'partner') return 'Partner'
  if (level === 'supporter') return 'Supporter'
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
