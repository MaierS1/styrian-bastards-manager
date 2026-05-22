import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchPublicSponsors } from '../../services/repositories/sponsorsRepository'
import { colors, isMobile, mutedTextStyle } from '../../styles/appStyles'

const sponsorLevelLabels = {
  main: 'Hauptsponsor',
  premium: 'Premium-Sponsoren',
  partner: 'Partner',
  supporter: 'Unterstützer',
}

const sponsorLevelOrder = ['main', 'premium', 'partner', 'supporter']

export function PublicSponsors() {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadPublicSponsors() {
      const { data, error } = await fetchPublicSponsors()

      if (!isMounted) return

      if (error) {
        setErrorMessage(error.message)
        setSponsors([])
      } else {
        setSponsors(Array.isArray(data) ? data : [])
        setErrorMessage('')
      }

      setLoading(false)
    }

    loadPublicSponsors()

    return () => {
      isMounted = false
    }
  }, [])

  const groupedSponsors = useMemo(() => {
    return sponsorLevelOrder
      .map((level) => ({
        level,
        label: sponsorLevelLabels[level],
        sponsors: sponsors.filter((sponsor) => sponsor.sponsor_level === level),
      }))
      .filter((group) => group.sponsors.length > 0)
  }, [sponsors])

  if (loading) {
    return (
      <section style={publicSponsorsSectionStyle}>
        <h2 style={publicSponsorsHeadingStyle}>Sponsoren</h2>
        <p style={mutedTextStyle}>Sponsoren werden geladen...</p>
      </section>
    )
  }

  if (errorMessage) {
    return null
  }

  if (groupedSponsors.length === 0) {
    return null
  }

  return (
    <section style={publicSponsorsSectionStyle}>
      <h2 style={publicSponsorsHeadingStyle}>Sponsoren</h2>

      <div style={publicSponsorsGroupsStyle}>
        {groupedSponsors.map((group) => (
          <div key={group.level} style={publicSponsorsGroupStyle}>
            <h3 style={publicSponsorsGroupHeadingStyle}>{group.label}</h3>

            <div style={publicSponsorsGridStyle}>
              {group.sponsors.map((sponsor) => (
                <PublicSponsorCard key={sponsor.id} sponsor={sponsor} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PublicSponsorCard({ sponsor }) {
  const logoUrl = getPublicLogoUrl(sponsor.logo_path)
  const content = (
    <>
      <div style={publicSponsorLogoFrameStyle}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={sponsor.logo_alt || sponsor.name}
            style={publicSponsorLogoStyle}
            loading="lazy"
          />
        ) : (
          <span style={publicSponsorLogoFallbackStyle}>{sponsor.name}</span>
        )}
      </div>

      <strong style={publicSponsorNameStyle}>{sponsor.name}</strong>

      {sponsor.public_description && (
        <p style={publicSponsorDescriptionStyle}>{sponsor.public_description}</p>
      )}
    </>
  )

  if (sponsor.website) {
    return (
      <a
        href={sponsor.website}
        target="_blank"
        rel="noreferrer"
        style={publicSponsorCardLinkStyle}
      >
        {content}
      </a>
    )
  }

  return (
    <div style={publicSponsorCardStyle}>
      {content}
    </div>
  )
}

function getPublicLogoUrl(logoPath) {
  if (!logoPath) return ''
  if (/^https?:\/\//i.test(logoPath)) return logoPath

  const { data } = supabase.storage
    .from('public-assets')
    .getPublicUrl(logoPath)

  return data?.publicUrl || ''
}

const publicSponsorsSectionStyle = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 28,
  padding: isMobile ? 16 : 22,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  background: colors.offWhite,
  color: colors.text,
}

const publicSponsorsHeadingStyle = {
  margin: '0 0 18px',
  color: colors.black,
  fontSize: isMobile ? 24 : 28,
  lineHeight: 1.15,
}

const publicSponsorsGroupsStyle = {
  display: 'grid',
  gap: isMobile ? 22 : 26,
}

const publicSponsorsGroupStyle = {
  display: 'grid',
  gap: 12,
}

const publicSponsorsGroupHeadingStyle = {
  margin: 0,
  color: colors.black,
  fontSize: isMobile ? 16 : 18,
  lineHeight: 1.2,
  textAlign: 'left',
}

const publicSponsorsGridStyle = {
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
  gap: 12,
}

const publicSponsorCardStyle = {
  display: 'grid',
  gap: 10,
  alignContent: 'start',
  minHeight: 180,
  boxSizing: 'border-box',
  padding: 16,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.white,
  color: colors.text,
  textAlign: 'left',
  textDecoration: 'none',
}

const publicSponsorCardLinkStyle = {
  ...publicSponsorCardStyle,
  cursor: 'pointer',
}

const publicSponsorLogoFrameStyle = {
  width: '100%',
  height: 92,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  padding: 12,
  borderRadius: 6,
  background: colors.offWhite,
  border: `1px solid ${colors.border}`,
}

const publicSponsorLogoStyle = {
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  display: 'block',
}

const publicSponsorLogoFallbackStyle = {
  color: colors.muted,
  fontWeight: 800,
  textAlign: 'center',
}

const publicSponsorNameStyle = {
  color: colors.black,
  fontSize: 16,
  lineHeight: 1.25,
}

const publicSponsorDescriptionStyle = {
  ...mutedTextStyle,
  fontSize: 14,
}
