import {
  buttonStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'

export function MemberFeeSection({
  member,
  fee,
  createMembershipFeeInvoice,
  markFeePaid,
  markFeeOpen,
  children,
}) {
  return (
    <>
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

      {children}

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
    </>
  )
}
