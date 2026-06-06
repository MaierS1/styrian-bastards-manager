import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const signedUrlExpiresInSeconds = 10 * 60

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Nur POST ist erlaubt.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server secrets fehlen.' }, 500)
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'Benutzer konnte nicht geprueft werden.' }, 401)
    }

    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (memberError) {
      return jsonResponse({ error: memberError.message }, 500)
    }

    if (!member) {
      return jsonResponse({ error: 'Kein Mitglied mit diesem Login verknuepft.' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const documentId = String(body.document_id || '').trim()

    if (!documentId) {
      return jsonResponse({ error: 'document_id ist erforderlich.' }, 400)
    }

    const { data: document, error: documentError } = await adminClient
      .from('documents')
      .select('id, title, file_path, show_in_member_area, members_only, is_active')
      .eq('id', documentId)
      .maybeSingle()

    if (documentError) {
      return jsonResponse({ error: documentError.message }, 500)
    }

    if (!document) {
      return jsonResponse({ error: 'Dokument nicht gefunden.' }, 404)
    }

    if (!document.show_in_member_area || !document.members_only || !document.is_active) {
      return jsonResponse({ error: 'Dokument ist nicht fuer den Mitgliederbereich freigegeben.' }, 403)
    }

    if (!document.file_path) {
      return jsonResponse({ error: 'Dokument hat keinen Storage-Pfad.' }, 400)
    }

    // The documents bucket is private. Return only a short-lived signed URL for this allowed file.
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from('documents')
      .createSignedUrl(document.file_path, signedUrlExpiresInSeconds)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return jsonResponse({ error: signedUrlError?.message || 'Signed URL konnte nicht erstellt werden.' }, 500)
    }

    return jsonResponse({
      signedUrl: signedUrlData.signedUrl,
      expiresIn: signedUrlExpiresInSeconds,
      title: document.title,
    })
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unbekannter Fehler.' }, 500)
  }
})

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
