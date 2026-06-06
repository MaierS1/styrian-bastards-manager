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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase Function Secrets fehlen.' }, 500)
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
      return jsonResponse({ error: 'Benutzer konnte nicht geprueft werden.' }, 401)
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
      return jsonResponse({ error: memberError.message }, 500)
    }

    if (!member || !isPurchaseManager(member)) {
      return jsonResponse({ error: 'Keine Berechtigung fuer Einkauf & Preisvergleich.' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const query = String(body?.query || '').trim()

    if (!query) {
      return jsonResponse({ error: 'query ist Pflicht.' }, 400)
    }

    const searchOutcome = await searchPublicOffers(query)
    const results = searchOutcome.results

    if (results.length === 0) {
      return jsonResponse({
        results: [],
        message: searchOutcome.hadFetchError
          ? 'Eine oeffentliche Angebotsquelle ist derzeit nicht erreichbar.'
          : 'Fuer diesen Suchbegriff wurden keine oeffentlich verfuegbaren Angebote gefunden.',
      })
    }

    const rows = results.map((result) => ({
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
      return jsonResponse({ error: insertError.message }, 500)
    }

    return jsonResponse({
      results: insertedRows || [],
      message: insertedRows?.length
        ? `Es wurden ${insertedRows.length} oeffentlich verfuegbare Angebote gefunden.`
        : 'Fuer diesen Suchbegriff wurden keine oeffentlich verfuegbaren Angebote gefunden.',
    })
  } catch (error) {
    return jsonResponse({
      error: getErrorMessage(error, 'Unbekannter Fehler bei der Angebotssuche.'),
    }, 500)
  }
})

async function searchPublicOffers(query: string) {
  const searchTerms = [
    query,
    `${query} Angebot`,
    `${query} Aktion`,
  ]

  const collected: SearchResult[] = []
  const seenUrls = new Set<string>()
  let hadFetchError = false

  for (const term of searchTerms) {
    const pageResults = await searchDuckDuckGo(term)
    if (!pageResults.ok) {
      hadFetchError = true
    }

    for (const result of pageResults.results) {
      if (!result.source_url || seenUrls.has(result.source_url)) continue
      seenUrls.add(result.source_url)
      collected.push(result)

      if (collected.length >= 12) {
        return collected
      }
    }
  }

  return {
    results: collected,
    hadFetchError,
  }
}

async function searchDuckDuckGo(term: string) {
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
    results: titleMatches.slice(0, 10).map((match, index) => {
    const url = normalizeResultUrl(match[1])
    const title = cleanHtmlText(match[2])
    const snippet = cleanHtmlText(snippetMatches[index]?.[1] || '')
    return buildSearchResult(term, url, title, snippet)
    }).filter((result): result is SearchResult => Boolean(result.source_url)),
  }
}

function buildSearchResult(query: string, sourceUrl: string, title: string, snippet: string): SearchResult {
  const combinedText = [title, snippet].join(' ').trim()
  const priceInfo = extractPriceInfo(combinedText)
  const unitInfo = extractUnitInfo(combinedText)
  const supplierName = extractSupplierName(title, sourceUrl)
  const productName = extractProductName(title, query)
  const { validFrom, validUntil } = extractDateRange(combinedText)

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
    raw_data: {
      query,
      title,
      snippet,
      source_url: sourceUrl,
      source_type: 'public_offer',
      extracted: {
        price: priceInfo,
        unit: unitInfo,
        dates: { validFrom, validUntil },
      },
    },
  }
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
  const parsedPrices = matches.map((value) => Number(String(value).replace(',', '.'))).filter((value) => Number.isFinite(value))
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

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback
  if (typeof error === 'string' && error.trim()) return error
  return fallback
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
