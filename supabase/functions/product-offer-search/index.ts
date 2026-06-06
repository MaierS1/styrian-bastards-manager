import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const purchaseRoles = new Set([
  'admin',
  'cashier',
  'obmann',
  'obmann_stv',
  'schriftfuehrer',
  'schriftfuehrer_stv',
  'kassier',
  'kassier_stv',
])

const allowedSupplierNames = new Set(['METRO', 'Transgourmet'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse({ ok: true }, 200)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        {
          error: 'Suche konnte nicht ausgefuehrt werden.',
          details: 'Supabase Function Secrets fehlen.',
        },
        500,
      )
    }

    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Nicht angemeldet.' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse(
        {
          error: 'Suche konnte nicht ausgefuehrt werden.',
          details: 'Benutzer konnte nicht geprueft werden.',
        },
        401,
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('id, app_role, role')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (memberError) {
      return jsonResponse(
        {
          error: 'Suche konnte nicht ausgefuehrt werden.',
          details: memberError.message,
        },
        500,
      )
    }

    if (!member || !isPurchaseManager(member)) {
      return jsonResponse({ error: 'Keine Berechtigung fuer Einkauf & Preisvergleich.' }, 403)
    }

    const body = await parseRequestBody(req)
    const query = String(body.query || '').trim()

    if (!query) {
      return jsonResponse({ error: 'Bitte Suchbegriff eingeben.' }, 400)
    }

    const searchOutcome = await searchPublicOffers(query)
    const filteredResults = searchOutcome.results.filter((result) => isAllowedSupplier(result.supplier_name))

    if (filteredResults.length === 0) {
      return jsonResponse({
        results: [],
        message: 'Keine Angebote von METRO oder Transgourmet gefunden.',
      })
    }

    const rows = filteredResults.map((result) => ({
      search_query: query,
      supplier_name: result.supplier_name,
      product_name: result.product_name,
      price_net: result.price_net,
      price_gross: result.price_gross,
      unit_price: result.unit_price,
      unit: result.unit,
      package_size: result.package_size,
      offer_valid_from: result.offer_valid_from,
      offer_valid_until: result.offer_valid_until,
      source_url: result.source_url,
      source_type: result.source_type || 'public_offer',
      raw_data: result.raw_data,
    }))

    const { data: insertedRows, error: insertError } = await adminClient
      .from('purchase_search_results')
      .insert(rows)
      .select('*')

    if (insertError) {
      return jsonResponse(
        {
          error: 'Suche konnte nicht ausgefuehrt werden.',
          details: insertError.message,
        },
        500,
      )
    }

    return jsonResponse({
      results: insertedRows || [],
      message: `Es wurden ${insertedRows?.length || 0} oeffentlich verfuegbare Angebote gefunden.`,
      fallback_used: false,
    })
  } catch (error) {
    return jsonResponse(
      {
        error: 'Suche konnte nicht ausgefuehrt werden.',
        details: getErrorDetails(error),
      },
      500,
    )
  }
})

async function parseRequestBody(req: Request) {
  try {
    const body = await req.json()
    return typeof body === 'object' && body !== null ? body : {}
  } catch {
    return {}
  }
}

async function searchPublicOffers(query: string) {
  const terms = buildSearchTerms(query)
  const collected: SearchResult[] = []
  const seenUrls = new Set<string>()
  let hadFetchError = false

  for (const term of terms) {
    const pageResults = await searchDuckDuckGo(term)
    if (!pageResults.ok) {
      hadFetchError = true
    }

    for (const result of pageResults.results) {
      if (!result.source_url || seenUrls.has(result.source_url)) continue
      seenUrls.add(result.source_url)
      collected.push(result)

      if (collected.length >= 12) {
        return { results: collected, hadFetchError }
      }
    }
  }

  return { results: collected, hadFetchError }
}

function buildSearchTerms(query: string) {
  const synonyms = buildQuerySynonyms(query)
  const terms = new Set<string>()

  for (const synonym of synonyms) {
    terms.add(synonym)
    terms.add(`${synonym} Angebot`)
    terms.add(`${synonym} Aktion`)
    terms.add(`site:shop.transgourmet.at ${synonym}`)
    terms.add(`site:www.shop.transgourmet.at ${synonym}`)
    terms.add(`site:metro.at ${synonym}`)
    terms.add(`site:www.metro.at ${synonym}`)
  }

  return [...terms].slice(0, 24)
}

function buildQuerySynonyms(query: string) {
  const normalized = normalizeQuery(query)
  const synonyms = new Set<string>([query])

  if (normalized.includes('cola')) {
    synonyms.add('Cola')
    synonyms.add('Coca Cola')
    synonyms.add('Coca-Cola')
    synonyms.add('Pepsi Cola')
    synonyms.add('Fritz Cola')
    synonyms.add('Cola Sortiment')
  }

  if (normalized.includes('red bull') || normalized.includes('redbull')) {
    synonyms.add('Red Bull')
    synonyms.add('RedBull')
    synonyms.add('Red Bull Energy Drink')
  }

  return [...synonyms]
}

function normalizeQuery(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
}

async function searchDuckDuckGo(term: string) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(term)}`
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StyrianBastardsPurchaseSearch/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      return { ok: false, results: [] as SearchResult[] }
    }

    const html = await response.text()
    const titleMatches = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    const snippetMatches = [...html.matchAll(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)]

    return {
      ok: true,
      results: titleMatches
        .slice(0, 10)
        .map((match, index) => {
          const url = normalizeResultUrl(match[1])
          const title = cleanHtmlText(match[2])
          const snippet = cleanHtmlText(snippetMatches[index]?.[1] || '')
          return buildSearchResult(term, url, title, snippet)
        })
        .filter((result): result is SearchResult => Boolean(result.source_url)),
    }
  } catch {
    return { ok: false, results: [] as SearchResult[] }
  }
}

function buildSearchResult(query: string, sourceUrl: string, title: string, snippet: string): SearchResult {
  const combinedText = [title, snippet].join(' ').trim()
  const priceInfo = extractPriceInfo(combinedText)
  const unitInfo = extractUnitInfo(combinedText)
  const supplierName = extractAllowedSupplierName(title, snippet, sourceUrl)
  const productName = extractProductName(title, query)
  const { validFrom, validUntil } = extractDateRange(combinedText)
  const priceNote = buildPriceNote(supplierName, priceInfo, sourceUrl)

  return {
    supplier_name: supplierName,
    product_name: productName,
    price_net: priceInfo.priceNet,
    price_gross: priceInfo.priceGross,
    unit_price: priceInfo.unitPrice,
    unit: unitInfo.unit,
    package_size: unitInfo.packageSize,
    offer_valid_from: validFrom,
    offer_valid_until: validUntil,
    source_url: sourceUrl,
    source_type: 'public_offer',
    price_note: priceNote,
    raw_data: {
      query,
      title,
      snippet,
      source_url: sourceUrl,
      source_type: 'public_offer',
      price_note: priceNote,
      extracted: {
        price: priceInfo,
        unit: unitInfo,
        dates: { validFrom, validUntil },
      },
    },
  }
}

function extractAllowedSupplierName(title: string, snippet: string, sourceUrl: string) {
  const combinedText = `${title} ${snippet} ${sourceUrl}`.toLowerCase()
  const hostName = new URL(sourceUrl).hostname.toLowerCase()

  if (combinedText.includes('transgourmet') || hostName.includes('transgourmet')) {
    return 'Transgourmet'
  }

  if (combinedText.includes('metro') || hostName.includes('metro')) {
    return 'METRO'
  }

  return getHostLabel(sourceUrl)
}

function buildPriceNote(
  supplierName: string,
  priceInfo: { priceNet: number | null; priceGross: number | null; unitPrice: number | null },
  sourceUrl: string,
) {
  const hasAnyPrice = [priceInfo.priceNet, priceInfo.priceGross, priceInfo.unitPrice]
    .some((value) => value !== null && value !== undefined)

  if (hasAnyPrice) return null

  if (supplierName === 'METRO') {
    return 'Preis nur im METRO Webshop/App oder nach Login verfügbar'
  }

  if (supplierName === 'Transgourmet') {
    return 'Preis nicht öffentlich verfügbar'
  }

  return `Preis nicht öffentlich verfügbar (${getHostLabel(sourceUrl)})`
}

function extractSupplierName(title: string, sourceUrl: string) {
  const titleParts = title.split(/\s[-|–—]\s/).map((part) => part.trim()).filter(Boolean)
  const firstPart = titleParts[0] || title
  const hostLabel = getHostLabel(sourceUrl)

  if (/angebot|aktion|prospekt|flyer|deal|sale/i.test(firstPart)) {
    return hostLabel
  }

  return firstPart || hostLabel
}

function extractProductName(title: string, query: string) {
  const cleanedTitle = title
    .replace(/\s*[-|–—]\s*(angebot|aktion|prospekt|flyer|shop).*$/i, '')
    .replace(/\s*\|\s*.*$/g, '')
    .trim()

  return cleanedTitle || query
}

function extractPriceInfo(text: string) {
  const pricePattern = /(?:€|EUR)\s?(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s?(?:€|EUR)/gi
  const matches = [...text.matchAll(pricePattern)].map((match) => match[1] || match[2]).filter(Boolean)
  const parsedPrices = matches
    .map((value) => Number(String(value).replace(',', '.')))
    .filter((value) => Number.isFinite(value))

  const firstPrice = parsedPrices[0] ?? null
  const secondPrice = parsedPrices[1] ?? null

  const isNetto = /netto/i.test(text)
  const isBrutto = /brutto|inkl\.?|inklusive/i.test(text)
  const unitPrice = extractUnitPrice(text)

  let priceNet: number | null = null
  let priceGross: number | null = null

  if (isNetto && firstPrice !== null) {
    priceNet = firstPrice
    priceGross = secondPrice
  } else if (isBrutto && firstPrice !== null) {
    priceGross = firstPrice
    priceNet = secondPrice
  } else {
    priceGross = firstPrice
    priceNet = secondPrice
  }

  return {
    priceNet,
    priceGross,
    unitPrice,
  }
}

function extractUnitPrice(text: string) {
  const unitPriceMatch = text.match(/(?:pro|je)\s*(\d+(?:[.,]\d{1,4})?)\s*(kg|g|l|ml|stk|st|stück|pack|paket|dose|flasche)/i)
    || text.match(/(\d+(?:[.,]\d{1,4})?)\s?(?:€|EUR)\s*\/\s*(kg|g|l|ml|stk|st|stück|pack|paket|dose|flasche)/i)

  if (!unitPriceMatch) return null

  const numeric = Number(String(unitPriceMatch[1]).replace(',', '.'))
  return Number.isFinite(numeric) ? numeric : null
}

function extractUnitInfo(text: string) {
  const match = text.match(/(\d+(?:[.,]\d{1,3})?)\s*(kg|g|l|ml|stk|st|stück|pack|paket|dose|flasche|beutel)/i)

  if (!match) {
    return { unit: null, packageSize: null }
  }

  const size = Number(String(match[1]).replace(',', '.'))
  const unit = normalizeUnitLabel(match[2])

  return {
    unit,
    packageSize: Number.isFinite(size) ? size : null,
  }
}

function extractDateRange(text: string) {
  const rangeMatch = text.match(/(\d{2}\.\d{2}\.\d{4})\s*(?:bis|-|–|—)\s*(\d{2}\.\d{2}\.\d{4})/i)

  if (!rangeMatch) {
    return { validFrom: null, validUntil: null }
  }

  return {
    validFrom: parseGermanDate(rangeMatch[1]),
    validUntil: parseGermanDate(rangeMatch[2]),
  }
}

function parseGermanDate(value: string) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

function normalizeUnitLabel(value: string) {
  const normalized = value.toLowerCase()
  if (normalized === 'st' || normalized === 'stück') return 'Stk'
  if (normalized === 'pack') return 'Pack'
  if (normalized === 'paket') return 'Paket'
  return normalized
}

function normalizeResultUrl(value: string) {
  try {
    const decoded = decodeURIComponent(value)
    const parsed = new URL(decoded.startsWith('//') ? `https:${decoded}` : decoded)
    const redirectedUrl = parsed.searchParams.get('uddg') || parsed.searchParams.get('u')

    if (redirectedUrl) {
      return decodeURIComponent(redirectedUrl)
    }

    return parsed.toString()
  } catch {
    return value
  }
}

function getHostLabel(sourceUrl: string) {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, '')
    return host.split('.').slice(0, -1).join('.') || host
  } catch {
    return 'public_offer'
  }
}

function cleanHtmlText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
}

function isPurchaseManager(member: { app_role?: string | null; role?: string | null }) {
  if (purchaseRoles.has(String(member?.app_role || '').trim())) {
    return true
  }

  return purchaseRoles.has(String(member?.role || '').trim())
}

function isAllowedSupplier(value: string | null | undefined) {
  const normalized = String(value || '').trim().toUpperCase()
  return allowedSupplierNames.has(normalized)
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join('\n')
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error)
    } catch {
      return 'Unbekannter Fehler'
    }
  }

  return String(error || 'Unbekannter Fehler')
}

type SearchResult = {
  supplier_name: string
  product_name: string
  price_net: number | null
  price_gross: number | null
  unit_price: number | null
  unit: string | null
  package_size: number | null
  offer_valid_from: string | null
  offer_valid_until: string | null
  source_url: string
  source_type: string
  raw_data: Record<string, unknown>
}
