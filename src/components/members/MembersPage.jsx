import { MemberForm } from './MemberForm'
import { MembersCsvImport } from './MembersCsvImport'
import { MembersOverview } from './MembersOverview'

export function MembersPage({
  canManageMembers,
  csvImportProps,
  formProps,
  overviewProps,
}) {
  return (
    <>
      {canManageMembers() && <MembersCsvImport {...csvImportProps} />}
      {canManageMembers() && <MemberForm {...formProps} />}
      <MembersOverview {...overviewProps} />
    </>
  )
}
