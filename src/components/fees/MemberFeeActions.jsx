import {
  buttonStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'

export function MemberFeeActions({
  member,
  fee,
  createMembershipFeeInvoice,
  markFeePaid,
  markFeeOpen,
}) {
  const isLegacyFee = fee && fee.source !== 'membership_fee_items'

  return (
    <>
      {isLegacyFee && !fee.paid && (
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

      {isLegacyFee && fee.paid && (
        <button onClick={() => markFeeOpen(fee)} style={buttonStyle}>
          Beitrag wieder offen setzen
        </button>
      )}
    </>
  )
}
