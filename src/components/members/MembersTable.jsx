import { QRCodeCanvas } from 'qrcode.react'
import {
  buttonStyle,
  cardStyle,
  colors,
  secondaryButtonStyle,
} from '../../styles/appStyles'
import { MemberFeeSection } from '../fees/MemberFeeSection'

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

        <MemberFeeSection
          member={member}
          fee={fee}
          createMembershipFeeInvoice={createMembershipFeeInvoice}
          markFeePaid={markFeePaid}
          markFeeOpen={markFeeOpen}
        >
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
        </MemberFeeSection>
      </div>
    )
  })
}
