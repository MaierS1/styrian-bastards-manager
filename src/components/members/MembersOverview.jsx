import {
  buttonStyle,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  sectionStyle,
} from '../../styles/appStyles'
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
      <h2 style={headingStyle}>Mitglieder & Beiträge 2026</h2>

      <h3 style={headingStyle}>Mitglieder Suche & Filter</h3>

      <input
        placeholder="Mitglied suchen..."
        value={memberSearch}
        onChange={(e) => setMemberSearch(e.target.value)}
        style={inputStyle}
      />

      <select value={memberStatusFilter} onChange={(e) => setMemberStatusFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Status</option>
        <option value="aktiv">Aktiv</option>
        <option value="ruhend">Ruhend</option>
        <option value="ausgetreten">Ausgetreten</option>
      </select>

      <select value={memberTypeFilter} onChange={(e) => setMemberTypeFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Arten</option>
        <option value="vollmitglied">Vollmitglied</option>
        <option value="ehrenmitglied">Ehrenmitglied</option>
        <option value="foerdermitglied">Fördermitglied</option>
        <option value="probejahr">Probejahr</option>
      </select>

      <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Funktionen</option>
        <option value="mitglied">Mitglied</option>
        <option value="obmann">Obmann</option>
        <option value="obmann_stv">Obmann-Stellvertreter</option>
        <option value="kassier">Kassier</option>
        <option value="kassier_stv">Kassier-Stellvertreter</option>
        <option value="schriftfuehrer">Schriftführer</option>
        <option value="schriftfuehrer_stv">Schriftführer-Stellvertreter</option>
        <option value="beirat">Beirat</option>
        <option value="helfer">Helfer</option>
      </select>

      <select value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Beiträge</option>
        <option value="offen">Beitrag offen</option>
        <option value="bezahlt">Beitrag bezahlt</option>
        <option value="gratis">Kein Beitrag</option>
      </select>

      <select value={memberTestFilter} onChange={(e) => setMemberTestFilter(e.target.value)} style={inputStyle}>
        <option value="alle">Alle Mitglieder</option>
        <option value="echt">Nur echte Mitglieder</option>
        <option value="test">Nur Testmitglieder</option>
      </select>

      <button onClick={resetMemberFilters} style={buttonStyle}>
        Filter zurücksetzen
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
