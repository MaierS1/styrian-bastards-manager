import { buttonStyle, cardStyle, headingStyle, mutedTextStyle } from '../../styles/appStyles'
import { QRCodeCanvas } from 'qrcode.react'

export function PortalQrCard({ currentMember, getMemberQrValue, exportMemberCardPdf }) {
  return (
    <>
      <h3 style={headingStyle}>Mein QR-Code</h3>

      <div style={cardStyle}>
        <QRCodeCanvas value={getMemberQrValue(currentMember)} size={190} />
        <p style={mutedTextStyle}>
          Dieser QR-Code kann für Check-ins bei Events verwendet werden.
        </p>

        <button onClick={() => exportMemberCardPdf(currentMember)} style={buttonStyle}>
          Mitgliedsausweis PDF
        </button>
      </div>
    </>
  )
}
