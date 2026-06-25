import {
  buttonStyle,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  sectionStyle,
} from '../../styles/appStyles'
import { CLUB_FUNCTIONS, MEMBER_TYPES } from '../../utils/permissions'
import { MembersTable } from './MembersTable'

export function MembersOverview({
  members,
  filteredMembers,
  memberSearch,
  setMemberSearch,
  memberStatusFilter,
  setMemberStatusFilter,
  memberTypeFilter,
  setMemberTypeFilter,
  roleFilter,
  setRoleFilter,
  feeFilter,
  setFeeFilter,
  memberTestFilter,
  setMemberTestFilter,
  resetMemberFilters,
  exportAllMemberCardsPdf,
  tableProps,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Mitglieder & Beitraege 2026</h2>

      <h3 style={headingStyle}>Mitglieder Suche & Filter</h3>

      <input
        placeholder="Mitglied suchen..."
        value={memberSearch}
        onChange={(e) => setMemberSearch(e.target.value)}
        style={inputStyle}
      />

      <label style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Mitgliedsstatus</label>
      <select value={memberStatusFilter} onChange={(e) => setMemberStatusFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Status</option>
        <option value="aktiv">Aktiv</option>
        <option value="ruhend">Ruhend</option>
        <option value="ausgetreten">Ausgetreten</option>
      </select>

      <label style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Mitgliedsart</label>
      <select value={memberTypeFilter} onChange={(e) => setMemberTypeFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Arten</option>
        {MEMBER_TYPES.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <label style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Vereinsfunktion</label>
      <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Funktionen</option>
        {CLUB_FUNCTIONS.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <label style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Beitragsstatus</label>
      <select value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Beitraege</option>
        <option value="offen">Beitrag offen</option>
        <option value="bezahlt">Beitrag bezahlt</option>
        <option value="gratis">Kein Beitrag</option>
      </select>

      <label style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Teststatus</label>
      <select value={memberTestFilter} onChange={(e) => setMemberTestFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Mitglieder</option>
        <option value="echt">Nur echte Mitglieder</option>
        <option value="test">Nur Testmitglieder</option>
      </select>

      <button onClick={resetMemberFilters} style={buttonStyle}>
        Filter zuruecksetzen
      </button>

      <p>
        Angezeigt: <strong>{filteredMembers.length}</strong> von {members.length} Mitgliedern
      </p>

      <button onClick={exportAllMemberCardsPdf} style={buttonStyle}>
        Mitgliedsausweise als Druckbogen PDF
      </button>

      <p style={mutedTextStyle}>
        Druckformat: A4 Hochformat mit 10 Karten pro Seite im Visitenkartenformat.
        Es werden die aktuell gefilterten Mitglieder gedruckt.
      </p>

      <MembersTable members={filteredMembers} {...tableProps} />
    </section>
  )
}
