import {
  headingStyle,
  sectionStyle,
} from '../../styles/appStyles'
import { DocumentUploadForm } from './DocumentUploadForm'
import { DocumentsList } from './DocumentsList'

export function DocumentsPage({
  canManageDocuments,
  uploadFormProps,
  listProps,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Dokumente</h2>

      {canManageDocuments() && <DocumentUploadForm {...uploadFormProps} />}

      <DocumentsList {...listProps} />
    </section>
  )
}
