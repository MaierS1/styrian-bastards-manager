import { AdminExports } from './AdminExports'
import { AdminBackupRestore } from './AdminBackupRestore'
import { AdminUserInvites } from './AdminUserInvites'
import { AdminChangeRequests } from './AdminChangeRequests'
import { AdminTestData } from './AdminTestData'
import { AdminAuditLog } from './AdminAuditLog'

export function AdminPage({
  exportsProps,
  backupProps,
  userInvitesProps,
  changeRequestsProps,
  testDataProps,
  auditLogProps,
}) {
  return (
    <>
      <AdminExports {...exportsProps} />
      <AdminBackupRestore {...backupProps} />
      {userInvitesProps && <AdminUserInvites {...userInvitesProps} />}
      {changeRequestsProps && <AdminChangeRequests {...changeRequestsProps} />}
      {testDataProps && <AdminTestData {...testDataProps} />}
      {auditLogProps && <AdminAuditLog {...auditLogProps} />}
    </>
  )
}
