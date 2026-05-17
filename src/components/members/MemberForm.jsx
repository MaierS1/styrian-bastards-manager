import {
  buttonStyle,
  colors,
  headingStyle,
  inputStyle,
  sectionStyle,
} from '../../styles/appStyles'

export function MemberForm({
  isAdmin,
  editingId,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  memberEmail,
  setMemberEmail,
  phone,
  setPhone,
  memberType,
  setMemberType,
  role,
  setRole,
  appRole,
  setAppRole,
  isTestMember,
  setIsTestMember,
  street,
  setStreet,
  postalCode,
  setPostalCode,
  city,
  setCity,
  birthdate,
  setBirthdate,
  clothingSize,
  setClothingSize,
  saveMember,
  resetForm,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>{editingId ? 'Mitglied bearbeiten' : 'Mitglied hinzufügen'}</h2>

      <input placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
      <input placeholder="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
      <input placeholder="E-Mail" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} style={inputStyle} />
      <input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />

      <select value={memberType} onChange={(e) => setMemberType(e.target.value)} style={inputStyle}>
        <option value="vollmitglied">Vollmitglied</option>
        <option value="ehrenmitglied">Ehrenmitglied</option>
        <option value="foerdermitglied">Fördermitglied</option>
        <option value="probejahr">Probejahr</option>
      </select>

      <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
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

      {isAdmin() && (
        <>
          <select value={appRole} onChange={(e) => setAppRole(e.target.value)} style={inputStyle}>
            <option value="readonly">App-Recht: Nur Lesen</option>
            <option value="checkin">App-Recht: Check-in</option>
            <option value="cashier">App-Recht: Kassa</option>
            <option value="members">App-Recht: Mitgliederverwaltung</option>
            <option value="admin">App-Recht: Admin</option>
          </select>

          <label style={{ display: 'block', marginBottom: 12, fontWeight: 800, color: colors.black }}>
            <input
              type="checkbox"
              checked={isTestMember}
              onChange={(e) => setIsTestMember(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Testmitglied
          </label>
        </>
      )}

      <input placeholder="Straße" value={street} onChange={(e) => setStreet(e.target.value)} style={inputStyle} />
      <input placeholder="PLZ" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={inputStyle} />
      <input placeholder="Ort" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} />
      <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={inputStyle} />

      <select value={clothingSize} onChange={(e) => setClothingSize(e.target.value)} style={inputStyle}>
        <option value="">Kleidergröße wählen</option>
        <option>XXS</option>
        <option>XS</option>
        <option>S</option>
        <option>M</option>
        <option>L</option>
        <option>XL</option>
        <option>XXL</option>
        <option>3XL</option>
        <option>4XL</option>
        <option>5XL</option>
      </select>

      <button onClick={saveMember} style={buttonStyle}>
        {editingId ? 'Änderungen speichern' : 'Mitglied speichern'}
      </button>

      {editingId && (
        <button onClick={resetForm} style={buttonStyle}>
          Abbrechen
        </button>
      )}
    </section>
  )
}
