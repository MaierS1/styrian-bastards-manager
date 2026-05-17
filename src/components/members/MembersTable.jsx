import { QRCodeCanvas } from 'qrcode.react'
import {
  buttonStyle,
  cardStyle,
  colors,
  secondaryButtonStyle,
} from '../../styles/appStyles'

export function MembersTable({
  members,
  getFee,
  getRoleLabel,
  getAppRoleLabel,
  isAdmin,
  editMember,
  changeMemberStatus,
  deleteMember,
  markMemberAsTest,
  deleteAllTestDataForMember,
  checkInMember,
  isCheckedInToday,
  showQR,
  setShowQR,
  exportMemberCardPdf,
  getMemberQrValue,
  createMembershipFeeInvoice,
  markFeePaid,
  markFeeOpen,
}) {
  return members.map((member) => {
    const fee = getFee(member.id)

    return (
      <div key={member.id} style={cardStyle}>
        <strong>
          {member.first_name} {member.last_name}
        </strong>
        <br />
        {member.email}
        <br />
        {member.phone}
        <br />
        Mitgliedsnummer: {member.member_number || '-'}
        <br />
        Mitgliedsart: {member.member_type}
        <br />
        Vereinsfunktion: {getRoleLabel(member.role || 'mitglied')}
        <br />
        App-Recht: {getAppRoleLabel(member.app_role || 'readonly')}
        {member.is_test && (
          <>
            <br />
            <strong style={{ color: colors.red }}>TESTMITGLIED</strong>
          </>
        )}
        <br />
        Adresse: {member.street}, {member.postal_code} {member.city}
        <br />
        Geburtsdatum: {member.birthdate || '-'}
        <br />
        Größe: {member.clothing_size || '-'}
        <br />
        Status: {member.status}

        <hr />

        <strong>Mitgliedsbeitrag 2026</strong>
        <br />
        Betrag: {fee ? `${Number(fee.amount).toFixed(2)} €` : 'kein Beitrag angelegt'}
        <br />
        Status: {fee ? (fee.paid ? 'bezahlt' : 'offen') : '-'}
        <br />
        Zahlungsdatum: {fee?.paid_at || '-'}
        <br />
        Zahlungsart: {fee?.payment_method || '-'}

        <br />
        <br />

        <button onClick={() => editMember(member)} style={buttonStyle}>
          Bearbeiten
        </button>

        <button onClick={() => changeMemberStatus(member.id, 'aktiv')} style={buttonStyle}>
          Aktiv
        </button>

        <button onClick={() => changeMemberStatus(member.id, 'ruhend')} style={buttonStyle}>
          Ruhend
        </button>

        <button onClick={() => changeMemberStatus(member.id, 'ausgetreten')} style={buttonStyle}>
          Ausgetreten
        </button>

        {isAdmin() && !member.is_test && (
          <button
            onClick={() => deleteMember(member)}
            style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
          >
            Mitglied löschen
          </button>
        )}

        {isAdmin() && !member.is_test && (
          <button
            onClick={() => markMemberAsTest(member)}
            style={{ ...secondaryButtonStyle, borderColor: colors.red, color: colors.red }}
          >
            Als Testmitglied markieren
          </button>
        )}

        {isAdmin() && member.is_test && (
          <button
            onClick={() => deleteAllTestDataForMember(member)}
            style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
          >
            Testdaten dieses Mitglieds löschen
          </button>
        )}

        <button onClick={() => checkInMember(member)} style={buttonStyle}>
          {isCheckedInToday(member.id) ? 'Heute eingecheckt' : 'Manuell einchecken'}
        </button>

        <button
          onClick={() => setShowQR(showQR === member.id ? null : member.id)}
          style={buttonStyle}
        >
          QR-Code
        </button>

        <button onClick={() => exportMemberCardPdf(member)} style={buttonStyle}>
          Mitgliedsausweis PDF
        </button>

        {showQR === member.id && (
          <div style={{ marginTop: 10 }}>
            <QRCodeCanvas value={getMemberQrValue(member)} size={160} />
            <p style={{ fontSize: 12 }}>
              QR-Code für {member.first_name} {member.last_name}
              <br />
              {member.member_number || 'ohne Mitgliedsnummer'}
              <br />
              App-Link QR-Code
            </p>
          </div>
        )}

        {fee && !fee.paid && (
          <>
            <button onClick={() => createMembershipFeeInvoice(member, fee)} style={secondaryButtonStyle}>
              Mitgliedsbeitrag Rechnung erstellen
            </button>

            <button onClick={() => markFeePaid(fee, 'bar')} style={buttonStyle}>
              Beitrag bar bezahlt
            </button>

            <button onClick={() => markFeePaid(fee, 'ueberweisung')} style={buttonStyle}>
              Beitrag per Überweisung bezahlt
            </button>
          </>
        )}

        {fee && fee.paid && (
          <button onClick={() => markFeeOpen(fee)} style={buttonStyle}>
            Beitrag wieder offen setzen
          </button>
        )}
      </div>
    )
  })
}
