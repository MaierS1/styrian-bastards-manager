export function MemberFeeDetails({ fee }) {
  return (
    <>
      <strong>{fee?.label || `Mitgliedsbeitrag ${fee?.year || new Date().getFullYear()}`}</strong>
      <br />
      Betrag: {fee ? `${Number(fee.amount).toFixed(2)} €` : 'kein Beitrag angelegt'}
      <br />
      Status: {fee ? (fee.paid ? 'bezahlt' : fee.status || 'offen') : '-'}
      <br />
      Zahlungsdatum: {fee?.paid_at || '-'}
      <br />
      Zahlungsart: {fee?.payment_method || '-'}
    </>
  )
}
