export function MemberFeeDetails({ fee }) {
  return (
    <>
      <strong>Mitgliedsbeitrag 2026</strong>
      <br />
      Betrag: {fee ? `${Number(fee.amount).toFixed(2)} â‚¬` : 'kein Beitrag angelegt'}
      <br />
      Status: {fee ? (fee.paid ? 'bezahlt' : 'offen') : '-'}
      <br />
      Zahlungsdatum: {fee?.paid_at || '-'}
      <br />
      Zahlungsart: {fee?.payment_method || '-'}
    </>
  )
}
