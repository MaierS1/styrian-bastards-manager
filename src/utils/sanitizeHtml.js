import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'a',
  'blockquote',
  'br',
  'h1',
  'h2',
  'h3',
  'hr',
  'li',
  'ol',
  'p',
  'strong',
  'em',
  'ul',
]

const ALLOWED_ATTR = ['href', 'rel', 'target']

export function sanitizeHtml(html) {
  return DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}

export function normalizeRichTextHtml(html) {
  const cleanHtml = sanitizeHtml(html)
  const plainText = cleanHtml
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  return plainText || /<hr\s*\/?>/i.test(cleanHtml) ? cleanHtml : ''
}
