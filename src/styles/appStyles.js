export const isMobile = window.innerWidth < 768

export const colors = {
  black: '#050505',
  white: '#ffffff',
  offWhite: '#f8fafc',
  border: '#d1d5db',
  text: '#111827',
  muted: '#4b5563',
  red: '#c1121f',
  blue: '#003f88',
  navy: '#0b1f3a',
  successBg: '#ecfdf5',
  successText: '#065f46',
  dangerBg: '#fef2f2',
  dangerText: '#991b1b',
  infoBg: '#eff6ff',
  infoText: '#1e3a8a',
}

export const pageStyle = {
  minHeight: '100vh',
  background: colors.black,
  color: colors.text,
}

export const inputStyle = {
  display: 'block',
  width: '100%',
  maxWidth: '100%',
  marginBottom: 12,
  padding: isMobile ? 15 : 12,
  fontSize: isMobile ? 17 : 16,
  lineHeight: 1.4,
  boxSizing: 'border-box',
  border: `2px solid ${colors.border}`,
  borderRadius: 10,
  background: colors.white,
  color: colors.text,
  outlineColor: colors.red,
}

export const buttonStyle = {
  padding: isMobile ? 15 : 12,
  fontSize: isMobile ? 17 : 15,
  fontWeight: 800,
  marginTop: 6,
  marginRight: isMobile ? 0 : 10,
  marginBottom: 8,
  width: isMobile ? '100%' : 'auto',
  cursor: 'pointer',
  border: `2px solid ${colors.black}`,
  borderRadius: 10,
  background: colors.black,
  color: colors.white,
  boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
}

export const secondaryButtonStyle = {
  ...buttonStyle,
  background: colors.white,
  color: colors.black,
  border: `2px solid ${colors.black}`,
}

export const dangerButtonStyle = {
  ...secondaryButtonStyle,
  borderColor: colors.red,
  color: colors.red,
}

export const cardStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${colors.border}`,
  padding: isMobile ? 16 : 16,
  marginBottom: 12,
  borderRadius: 14,
  background: colors.white,
  boxShadow: '0 3px 10px rgba(0,0,0,0.10)',
  lineHeight: 1.6,
  fontSize: isMobile ? 16 : 15,
  color: colors.text,
}

export const sectionStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: isMobile ? 16 : 24,
  marginBottom: 28,
  background: colors.offWhite,
  boxShadow: '0 4px 18px rgba(0,0,0,0.16)',
  color: colors.text,
}

export const headingStyle = {
  color: colors.black,
  marginTop: 0,
  letterSpacing: '-0.02em',
  borderLeft: `6px solid ${colors.red}`,
  paddingLeft: 10,
}

export const mutedTextStyle = {
  color: colors.muted,
  lineHeight: 1.5,
}

export const appHeaderStyle = {
  background: colors.black,
  color: colors.white,
  padding: isMobile ? 18 : 24,
  borderRadius: 18,
  marginBottom: 22,
  border: `2px solid ${colors.white}`,
  boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
}

export const dashboardNumberStyle = {
  fontSize: '30px',
  marginTop: 10,
  marginBottom: 0,
  color: colors.black,
  fontWeight: 900,
}

export const dashboardLabelStyle = {
  color: colors.black,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
}

export const navStyle = {
  width: '100%',
  boxSizing: 'border-box',
  position: 'sticky',
  top: 0,
  zIndex: 50,
  background: colors.black,
  padding: isMobile ? 10 : 14,
  borderRadius: 16,
  marginBottom: 22,
  border: `1px solid ${colors.white}`,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
}

export const navButtonStyle = (active) => ({
  padding: isMobile ? '12px 10px' : '12px 16px',
  borderRadius: 12,
  border: active ? `2px solid ${colors.red}` : `2px solid ${colors.white}`,
  background: active ? colors.white : colors.black,
  color: active ? colors.black : colors.white,
  fontWeight: 900,
  cursor: 'pointer',
  flex: isMobile ? '1 1 45%' : '0 0 auto',
})

export const pageWrapperStyle = {
  width: '100%',
  maxWidth: 1240,
  margin: '0 auto',
  boxSizing: 'border-box',
}
