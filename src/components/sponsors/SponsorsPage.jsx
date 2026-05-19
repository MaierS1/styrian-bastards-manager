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

      <p>
        Sponsoren: <strong>{sponsors.length}</strong>
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
