import {
  buttonStyle,
  cardStyle,
  colors,
  headingStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'
import { RichTextEditor } from '../common/RichTextEditor'

const mediaCategories = [
  ['presseartikel', 'Presseartikel'],
  ['podcast', 'Podcast'],
  ['radiosendung', 'Radiosendung'],
  ['interview', 'Interview'],
  ['eventbericht', 'Eventbericht'],
  ['vereinsnews', 'Vereinsnews'],
  ['sponsor-news', 'Sponsor-News'],
  ['sonstiges', 'Sonstiges'],
]

const mediaStatuses = [
  ['draft', 'Entwurf'],
  ['published', 'Veröffentlicht'],
  ['archived', 'Archiviert'],
]

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '8px 0',
  color: colors.text,
}

const textareaStyle = {
  ...inputStyle,
  minHeight: 92,
  resize: 'vertical',
}

export function MediaPage({
  mediaItems,
  canManageMedia,
  mediaEditingId,
  mediaTitle,
  setMediaTitle,
  mediaSlug,
  setMediaSlug,
  mediaCategory,
  setMediaCategory,
  mediaSourceName,
  setMediaSourceName,
  mediaSummary,
  setMediaSummary,
  mediaContent,
  setMediaContent,
  mediaContentHtml,
  setMediaContentHtml,
  mediaSocialText,
  setMediaSocialText,
  mediaHashtags,
  setMediaHashtags,
  mediaExternalUrl,
  setMediaExternalUrl,
  mediaAudioUrl,
  setMediaAudioUrl,
  mediaImagePath,
  setMediaImagePath,
  mediaImageAlt,
  setMediaImageAlt,
  mediaPublicationDate,
  setMediaPublicationDate,
  mediaPublishedAt,
  setMediaPublishedAt,
  mediaScheduledAt,
  setMediaScheduledAt,
  mediaStatus,
  setMediaStatus,
  mediaIsPublic,
  setMediaIsPublic,
  mediaChannelSettings,
  setMediaChannelEnabled,
  mediaMembersOnly,
  setMediaMembersOnly,
  mediaInternalOnly,
  setMediaInternalOnly,
  mediaIsFeatured,
  setMediaIsFeatured,
  mediaPublicSortOrder,
  setMediaPublicSortOrder,
  mediaInternalNotes,
  setMediaInternalNotes,
  mediaSaving,
  mediaDeletingId,
  saveMediaItem,
  resetMediaForm,
  editMediaItem,
  deleteMediaItem,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Media Center</h2>

      {canManageMedia() && (
        <>
          <h3 style={headingStyle}>{mediaEditingId ? 'Medienbeitrag bearbeiten' : 'Medienbeitrag anlegen'}</h3>

          <h4 style={subHeadingStyle}>Inhalt</h4>

          <input
            placeholder="Titel"
            value={mediaTitle}
            onChange={(event) => setMediaTitle(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Slug"
            value={mediaSlug}
            onChange={(event) => setMediaSlug(event.target.value)}
            style={inputStyle}
          />

          <select value={mediaCategory} onChange={(event) => setMediaCategory(event.target.value)} style={inputStyle}>
            {mediaCategories.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <input
            placeholder="Quelle"
            value={mediaSourceName}
            onChange={(event) => setMediaSourceName(event.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder="Kurzbeschreibung"
            value={mediaSummary}
            onChange={(event) => setMediaSummary(event.target.value)}
            style={textareaStyle}
          />

          <textarea
            placeholder="Inhalt als Plain Text / Fallback"
            value={mediaContent}
            onChange={(event) => setMediaContent(event.target.value)}
            style={{ ...textareaStyle, minHeight: 140 }}
          />

          <div style={richTextFieldStyle}>
            <strong>Formatierter Inhalt</strong>
            <p style={richTextHintStyle}>
              Optional. Wenn dieses Feld leer bleibt, wird öffentlich weiterhin der Plain-Text-Inhalt verwendet.
            </p>
            <RichTextEditor
              value={mediaContentHtml}
              onChange={setMediaContentHtml}
              placeholder="Formatierten Presse-/News-Inhalt schreiben..."
              disabled={mediaSaving}
              minHeight={180}
            />
          </div>

          <textarea
            placeholder="Social Text"
            value={mediaSocialText}
            onChange={(event) => setMediaSocialText(event.target.value)}
            style={textareaStyle}
          />

          <input
            placeholder="Hashtags, mit Komma getrennt"
            value={mediaHashtags}
            onChange={(event) => setMediaHashtags(event.target.value)}
            style={inputStyle}
          />

          <h4 style={subHeadingStyle}>Medien</h4>

          <input
            placeholder="Externer Link"
            value={mediaExternalUrl}
            onChange={(event) => setMediaExternalUrl(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Audio-Link"
            value={mediaAudioUrl}
            onChange={(event) => setMediaAudioUrl(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Bildpfad"
            value={mediaImagePath}
            onChange={(event) => setMediaImagePath(event.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Alt-Text"
            value={mediaImageAlt}
            onChange={(event) => setMediaImageAlt(event.target.value)}
            style={inputStyle}
          />

          <h4 style={subHeadingStyle}>Sichtbarkeit</h4>

          <input
            type="date"
            value={mediaPublicationDate}
            onChange={(event) => setMediaPublicationDate(event.target.value)}
            style={inputStyle}
          />

          <input
            type="datetime-local"
            value={mediaPublishedAt}
            onChange={(event) => setMediaPublishedAt(event.target.value)}
            style={inputStyle}
          />

          <input
            type="datetime-local"
            value={mediaScheduledAt}
            onChange={(event) => setMediaScheduledAt(event.target.value)}
            style={inputStyle}
          />

          <select value={mediaStatus} onChange={(event) => setMediaStatus(event.target.value)} style={inputStyle}>
            {mediaStatuses.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <h4 style={subHeadingStyle}>Veröffentlichungen</h4>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={mediaIsPublic}
              onChange={(event) => {
                setMediaIsPublic(event.target.checked)
                setMediaChannelEnabled('homepage', event.target.checked)
              }}
            />
            Homepage
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={Boolean(mediaChannelSettings?.facebook?.enabled)}
              onChange={(event) => setMediaChannelEnabled('facebook', event.target.checked)}
            />
            Facebook
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={Boolean(mediaChannelSettings?.instagram?.enabled)}
              onChange={(event) => setMediaChannelEnabled('instagram', event.target.checked)}
            />
            Instagram
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={mediaMembersOnly}
              onChange={(event) => {
                setMediaMembersOnly(event.target.checked)
                setMediaChannelEnabled('member_area', event.target.checked || mediaInternalOnly)
              }}
            />
            Mitgliederbereich
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={mediaInternalOnly}
              onChange={(event) => {
                setMediaInternalOnly(event.target.checked)
                setMediaChannelEnabled('member_area', event.target.checked || mediaMembersOnly)
              }}
            />
            Interne News
          </label>

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={mediaIsFeatured}
              onChange={(event) => setMediaIsFeatured(event.target.checked)}
            />
            Featured
          </label>

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Sortierung"
            value={mediaPublicSortOrder}
            onChange={(event) => setMediaPublicSortOrder(event.target.value)}
            style={inputStyle}
          />

          <textarea
            placeholder="Interne Notizen"
            value={mediaInternalNotes}
            onChange={(event) => setMediaInternalNotes(event.target.value)}
            style={textareaStyle}
          />

          <button onClick={saveMediaItem} disabled={mediaSaving} style={buttonStyle}>
            {mediaSaving ? 'Medienbeitrag wird gespeichert...' : mediaEditingId ? 'Medienbeitrag speichern' : 'Medienbeitrag anlegen'}
          </button>

          {mediaEditingId && (
            <button onClick={resetMediaForm} style={secondaryButtonStyle}>
              Bearbeiten abbrechen
            </button>
          )}
        </>
      )}

      <p>
        Medienbeiträge: <strong>{mediaItems.length}</strong>
      </p>

      {mediaItems.length === 0 && (
        <p style={mutedTextStyle}>Noch keine Medienbeiträge angelegt.</p>
      )}

      {mediaItems.map((item) => (
        <MediaItemCard
          key={item.id}
          item={item}
          canManageMedia={canManageMedia}
          editMediaItem={editMediaItem}
          deleteMediaItem={deleteMediaItem}
          mediaDeletingId={mediaDeletingId}
        />
      ))}
    </section>
  )
}

function MediaItemCard({
  item,
  canManageMedia,
  editMediaItem,
  deleteMediaItem,
  mediaDeletingId,
}) {
  return (
    <div
      style={{
        ...cardStyle,
        borderLeft: `6px solid ${item.status === 'published' ? colors.blue : colors.muted}`,
        opacity: item.status === 'archived' ? 0.72 : 1,
      }}
    >
      <strong>{item.title}</strong>
      <br />
      Slug: {item.slug || '-'}
      <br />
      Kategorie: {getCategoryLabel(item.category)} - Status: {getStatusLabel(item.status)}
      <br />
      Quelle: {item.source_name || '-'}
      <br />
      Veröffentlicht am: {item.publication_date || '-'} - Zeitpunkt: {formatDateTime(item.published_at)}
      <br />
      Öffentlich: {item.is_public ? 'Ja' : 'Nein'} - Mitglieder-only: {item.members_only ? 'Ja' : 'Nein'} - Intern: {item.internal_only ? 'Ja' : 'Nein'} - Featured: {item.is_featured ? 'Ja' : 'Nein'} - Sortierung: {item.public_sort_order ?? 0}
      <br />
      Geplant: {formatDateTime(item.scheduled_at)} - Hashtags: {formatHashtags(item.hashtags)}
      <br />
      Kanäle: {formatChannelStatus(item.channels, 'homepage')} - {formatChannelStatus(item.channels, 'facebook')} - {formatChannelStatus(item.channels, 'instagram')} - {formatChannelStatus(item.channels, 'member_area')}
      <br />
      Externer Link: {item.external_url || '-'}
      <br />
      Audio-Link: {item.audio_url || '-'}
      <br />
      Bildpfad: {item.image_path || '-'} - Alt-Text: {item.image_alt || '-'}
      <br />
      Kurzbeschreibung: {item.summary || '-'}
      <br />
      Inhalt: {item.content || '-'}
      <br />
      Formatierter Inhalt: {item.content_html ? 'Vorhanden' : '-'}
      <br />
      Social Text: {item.social_text || '-'}
      <br />
      Interne Notizen: {item.internal_notes || '-'}

      {canManageMedia() && (
        <>
          <br />
          <button onClick={() => editMediaItem(item)} style={buttonStyle}>
            Bearbeiten
          </button>
          <button
            onClick={() => deleteMediaItem(item)}
            disabled={mediaDeletingId === item.id}
            style={{ ...secondaryButtonStyle, borderColor: '#7f1d1d', color: '#7f1d1d' }}
          >
            {mediaDeletingId === item.id ? 'Medienbeitrag wird gelöscht...' : 'Medienbeitrag löschen'}
          </button>
        </>
      )}
    </div>
  )
}

function getCategoryLabel(category) {
  return mediaCategories.find(([value]) => value === category)?.[1] || category || '-'
}

function getStatusLabel(status) {
  return mediaStatuses.find(([value]) => value === status)?.[1] || status || '-'
}

function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

function formatHashtags(value) {
  if (!Array.isArray(value) || value.length === 0) return '-'
  return value.join(', ')
}

function formatChannelStatus(channels, channel) {
  const labels = {
    homepage: 'Homepage',
    facebook: 'Facebook',
    instagram: 'Instagram',
    member_area: 'Mitgliederbereich',
  }
  const statusLabels = {
    draft: 'Entwurf',
    scheduled: 'Geplant',
    published: 'Veröffentlicht',
    failed: 'Fehler',
    archived: 'Archiviert',
  }
  const row = Array.isArray(channels) ? channels.find((item) => item.channel === channel) : null
  const enabled = row?.enabled ? 'aktiv' : 'inaktiv'
  const status = statusLabels[row?.status] || row?.status || 'Entwurf'

  return `${labels[channel]}: ${enabled}, ${status}`
}

const subHeadingStyle = {
  margin: '18px 0 8px',
  color: colors.text,
}

const richTextFieldStyle = {
  marginBottom: 12,
}

const richTextHintStyle = {
  margin: '6px 0 10px',
  color: colors.muted,
  lineHeight: 1.45,
}
