import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchPublicMediaItems } from '../../services/repositories/mediaRepository'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import {
  cardStyle,
  colors,
  headingStyle,
  isMobile,
  mutedTextStyle,
  pageStyle,
  pageWrapperStyle,
  secondaryButtonStyle,
  sectionStyle,
} from '../../styles/appStyles'

export function PublicPressPage({ detailIdentifier = '' }) {
  const [mediaItems, setMediaItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadPublicMediaItems() {
      const { data, error } = await fetchPublicMediaItems()

      if (!isMounted) return

      if (error) {
        setErrorMessage(error.message)
        setMediaItems([])
      } else {
        setErrorMessage('')
        setMediaItems(Array.isArray(data) ? data : [])
      }

      setLoading(false)
    }

    loadPublicMediaItems()

    return () => {
      isMounted = false
    }
  }, [])

  const selectedItem = useMemo(() => {
    if (!detailIdentifier) return null

    const normalizedIdentifier = decodeURIComponent(detailIdentifier).toLowerCase()

    return mediaItems.find((item) => {
      const slug = item.slug ? String(item.slug).toLowerCase() : ''
      const id = item.id ? String(item.id).toLowerCase() : ''

      return slug === normalizedIdentifier || id === normalizedIdentifier
    }) || null
  }, [detailIdentifier, mediaItems])

  const isDetailPage = Boolean(detailIdentifier)

  return (
    <main style={publicPageStyle}>
      <div style={pageWrapperStyle}>
        <section style={sectionStyle}>
          {isDetailPage ? (
            <PublicPressDetail
              item={selectedItem}
              loading={loading}
              errorMessage={errorMessage}
            />
          ) : (
            <PublicPressOverview
              mediaItems={mediaItems}
              loading={loading}
              errorMessage={errorMessage}
            />
          )}
        </section>
      </div>
    </main>
  )
}

function PublicPressOverview({ mediaItems, loading, errorMessage }) {
  return (
    <>
      <h1 style={headingStyle}>Presse</h1>

      {loading && (
        <p style={mutedTextStyle}>Presseartikel werden geladen...</p>
      )}

      {!loading && errorMessage && (
        <p style={mutedTextStyle}>Presseartikel konnten nicht geladen werden.</p>
      )}

      {!loading && !errorMessage && mediaItems.length === 0 && (
        <p style={mutedTextStyle}>Noch keine Presseartikel veröffentlicht.</p>
      )}

      <div style={pressGridStyle}>
        {mediaItems.map((item) => (
          <PublicPressCard key={item.id} item={item} />
        ))}
      </div>
    </>
  )
}

function PublicPressCard({ item }) {
  const imageUrl = getPublicImageUrl(item.image_path)

  return (
    <a href={getPressDetailHref(item)} style={pressCardLinkStyle}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={item.image_alt || item.title}
          style={pressCardImageStyle}
          loading="lazy"
        />
      )}

      <div style={pressCardContentStyle}>
        <p style={pressDateStyle}>{formatDate(item.publication_date)}</p>
        <h2 style={pressCardTitleStyle}>{item.title}</h2>

        {item.summary && (
          <p style={pressSummaryStyle}>{item.summary}</p>
        )}
      </div>
    </a>
  )
}

function PublicPressDetail({ item, loading, errorMessage }) {
  if (loading) {
    return (
      <>
        <BackToPressButton />
        <p style={mutedTextStyle}>Presseartikel wird geladen...</p>
      </>
    )
  }

  if (errorMessage) {
    return (
      <>
        <BackToPressButton />
        <p style={mutedTextStyle}>Presseartikel konnte nicht geladen werden.</p>
      </>
    )
  }

  if (!item) {
    return (
      <>
        <BackToPressButton />
        <h1 style={headingStyle}>Presseartikel nicht gefunden</h1>
        <p style={mutedTextStyle}>Der angefragte Presseartikel ist nicht verfügbar.</p>
      </>
    )
  }

  const imageUrl = getPublicImageUrl(item.image_path)
  const contentHtml = sanitizeHtml(item.content_html || '')
  const content = item.content || item.inhalt || ''

  return (
    <article>
      <BackToPressButton />

      {imageUrl && (
        <img
          src={imageUrl}
          alt={item.image_alt || item.title}
          style={pressDetailImageStyle}
        />
      )}

      <p style={pressDateStyle}>{formatDate(item.publication_date)}</p>
      <h1 style={headingStyle}>{item.title}</h1>

      {item.summary && (
        <p style={pressLeadStyle}>{item.summary}</p>
      )}

      <div style={pressContentStyle}>
        {contentHtml ? (
          <div
            style={pressRichContentStyle}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : content ? renderContent(content) : <p>Kein Inhalt hinterlegt.</p>}
      </div>
    </article>
  )
}

function BackToPressButton() {
  return (
    <a href="/presse" style={backButtonStyle}>
      Zurück zu Presse
    </a>
  )
}

function renderContent(content) {
  return String(content)
    .split(/\n{2,}/)
    .map((paragraph, index) => (
      <p key={index} style={pressParagraphStyle}>
        {paragraph.split('\n').map((line, lineIndex) => (
          <span key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < paragraph.split('\n').length - 1 && <br />}
          </span>
        ))}
      </p>
    ))
}

function getPressDetailHref(item) {
  return `/presse/${encodeURIComponent(item.slug || item.id)}`
}

function getPublicImageUrl(imagePath) {
  if (!imagePath) return ''
  if (/^https?:\/\//i.test(imagePath)) return imagePath

  const { data } = supabase.storage
    .from('public-assets')
    .getPublicUrl(imagePath)

  return data?.publicUrl || ''
}

function formatDate(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

const publicPageStyle = {
  ...pageStyle,
  padding: isMobile ? 16 : 32,
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: isMobile ? 16 : 15,
  lineHeight: 1.55,
}

const pressGridStyle = {
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
  gap: 16,
}

const pressCardLinkStyle = {
  ...cardStyle,
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : '180px minmax(0, 1fr)',
  gap: 16,
  color: colors.text,
  textDecoration: 'none',
  cursor: 'pointer',
}

const pressCardImageStyle = {
  width: '100%',
  height: isMobile ? 180 : 140,
  borderRadius: 8,
  objectFit: 'cover',
  background: colors.offWhite,
}

const pressCardContentStyle = {
  display: 'grid',
  alignContent: 'start',
  gap: 8,
}

const pressDateStyle = {
  ...mutedTextStyle,
  margin: 0,
  fontSize: 14,
  fontWeight: 800,
}

const pressCardTitleStyle = {
  margin: 0,
  color: colors.black,
  fontSize: isMobile ? 22 : 24,
  lineHeight: 1.15,
}

const pressSummaryStyle = {
  ...mutedTextStyle,
  margin: 0,
}

const pressDetailImageStyle = {
  width: '100%',
  maxHeight: 420,
  marginBottom: 18,
  borderRadius: 10,
  objectFit: 'cover',
  background: colors.offWhite,
}

const pressLeadStyle = {
  color: colors.text,
  fontSize: isMobile ? 18 : 20,
  lineHeight: 1.45,
  fontWeight: 700,
}

const pressContentStyle = {
  maxWidth: 860,
  color: colors.text,
}

const pressRichContentStyle = {
  lineHeight: 1.65,
}

const pressParagraphStyle = {
  margin: '0 0 16px',
}

const backButtonStyle = {
  ...secondaryButtonStyle,
  display: 'inline-block',
  width: 'auto',
  textDecoration: 'none',
}
