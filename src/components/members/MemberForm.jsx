import {
  buttonStyle,
  colors,
  headingStyle,
  inputStyle,
  sectionStyle,
} from '../../styles/appStyles'
import { APP_ROLE_OPTIONS, CLUB_FUNCTIONS, MEMBER_TYPES } from '../../utils/permissions'

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
  memberFormMessage,
  memberSaving,
  saveMember,
  resetForm,
}) {
  function handleSubmit(event) {
    event.preventDefault()
    saveMember()
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>{editingId ? 'Mitglied bearbeiten' : 'Mitglied hinzufuegen'}</h2>

      <form onSubmit={handleSubmit}>
        <input placeholder="Vorname" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} disabled={memberSaving} />
        <input placeholder="Nachname" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} disabled={memberSaving} />
        <input placeholder="E-Mail" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} style={inputStyle} disabled={memberSaving} />
        <input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} disabled={memberSaving} />

        <label style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Mitgliedsart</label>
        <select value={memberType} onChange={(e) => setMemberType(e.target.value)} style={inputStyle} disabled={memberSaving}>
          {MEMBER_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <label style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Vereinsfunktion</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle} disabled={memberSaving}>
          {CLUB_FUNCTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {isAdmin() && editingId && (
          <>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>App-Recht</label>
            <select value={appRole} onChange={(e) => setAppRole(e.target.value)} style={inputStyle} disabled={memberSaving}>
              {APP_ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>App-Recht: {label}</option>
              ))}
            </select>
          </>
        )}

        {isAdmin() && (
          <label style={{ display: 'block', marginBottom: 12, fontWeight: 800, color: colors.black }}>
            <input
              type="checkbox"
              checked={isTestMember}
              onChange={(e) => setIsTestMember(e.target.checked)}
              style={{ marginRight: 8 }}
              disabled={memberSaving}
            />
            Testmitglied
          </label>
        )}

        <input placeholder="Strasse" value={street} onChange={(e) => setStreet(e.target.value)} style={inputStyle} disabled={memberSaving} />
        <input placeholder="PLZ" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={inputStyle} disabled={memberSaving} />
        <input placeholder="Ort" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} disabled={memberSaving} />
        <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={inputStyle} disabled={memberSaving} />

        <select value={clothingSize} onChange={(e) => setClothingSize(e.target.value)} style={inputStyle} disabled={memberSaving}>
          <option value="">Kleidergroesse waehlen</option>
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

        <button type="submit" style={buttonStyle} disabled={memberSaving}>
          {memberSaving ? 'Mitglied wird gespeichert...' : editingId ? 'Aenderungen speichern' : 'Mitglied speichern'}
        </button>

        {memberFormMessage && (
          <div
            role="alert"
            style={{
              marginTop: 8,
              marginBottom: 12,
              padding: 12,
              border: `2px solid ${memberFormMessage.type === 'error' ? colors.red : colors.successText}`,
              borderRadius: 10,
              background: memberFormMessage.type === 'error' ? colors.dangerBg : colors.successBg,
              color: memberFormMessage.type === 'error' ? colors.dangerText : colors.successText,
              fontWeight: 700,
            }}
          >
            {memberFormMessage.text}
          </div>
        )}
      </form>

      {editingId && (
        <button type="button" onClick={resetForm} style={buttonStyle} disabled={memberSaving}>
          Abbrechen
        </button>
      )}
    </section>
  )
}
