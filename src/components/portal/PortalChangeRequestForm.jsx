import { buttonStyle, cardStyle, headingStyle, inputStyle, mutedTextStyle } from '../../styles/appStyles'

export function PortalChangeRequestForm({
  portalEmail,
  setPortalEmail,
  portalPhone,
  setPortalPhone,
  portalStreet,
  setPortalStreet,
  portalPostalCode,
  setPortalPostalCode,
  portalCity,
  setPortalCity,
  portalClothingSize,
  setPortalClothingSize,
  submitMemberChangeRequest,
}) {
  return (
    <>
      <h3 style={headingStyle}>Meine Daten ändern</h3>

      <div style={cardStyle}>
        <p style={mutedTextStyle}>
          Änderungen werden nicht sofort übernommen. Ein Vorstandsmitglied muss sie zuerst bestätigen.
        </p>

        <input
          placeholder="E-Mail"
          value={portalEmail}
          onChange={(e) => setPortalEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Telefon"
          value={portalPhone}
          onChange={(e) => setPortalPhone(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Straße"
          value={portalStreet}
          onChange={(e) => setPortalStreet(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="PLZ"
          value={portalPostalCode}
          onChange={(e) => setPortalPostalCode(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Ort"
          value={portalCity}
          onChange={(e) => setPortalCity(e.target.value)}
          style={inputStyle}
        />

        <select value={portalClothingSize} onChange={(e) => setPortalClothingSize(e.target.value)} style={inputStyle}>
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

        <button onClick={submitMemberChangeRequest} style={buttonStyle}>
          Änderung zur Freigabe einreichen
        </button>
      </div>
    </>
  )
}
