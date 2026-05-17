import { MemberFeeActions } from './MemberFeeActions'
import { MemberFeeDetails } from './MemberFeeDetails'

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

      <MemberFeeDetails fee={fee} />

      <br />
      <br />

      {children}

      <MemberFeeActions
        member={member}
        fee={fee}
        createMembershipFeeInvoice={createMembershipFeeInvoice}
        markFeePaid={markFeePaid}
        markFeeOpen={markFeeOpen}
      />
    </>
  )
}
