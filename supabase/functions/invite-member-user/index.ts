import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
      return jsonResponse({ error: 'Benutzer konnte nicht geprüft werden.' }, 401)
    }

    const { data: callerMember, error: callerError } = await adminClient
      .from('members')
      .select('id, app_role, email')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (callerError) {
      return jsonResponse({ error: callerError.message }, 500)
    }

    if (callerMember?.app_role !== 'admin') {
      return jsonResponse({ error: 'Nur Admins dürfen Benutzer einladen.' }, 403)
    }

    const body = await req.json()
    const memberId = String(body.member_id || '')
    const email = String(body.email || '').trim().toLowerCase()
    const appRole = String(body.app_role || 'readonly')
    const redirectTo = body.redirect_to ? String(body.redirect_to) : undefined

    const allowedRoles = ['admin', 'cashier', 'members', 'checkin', 'readonly']

    if (!memberId || !email) {
      return jsonResponse({ error: 'Mitglied und E-Mail sind Pflicht.' }, 400)
    }

    if (!allowedRoles.includes(appRole)) {
      return jsonResponse({ error: 'Ungültige App-Rolle.' }, 400)
    }

    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('*')
      .eq('id', memberId)
      .maybeSingle()

    if (memberError) {
      return jsonResponse({ error: memberError.message }, 500)
    }

    if (!member) {
      return jsonResponse({ error: 'Mitglied nicht gefunden.' }, 404)
    }

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        member_id: memberId,
        app_role: appRole,
        first_name: member.first_name || '',
        last_name: member.last_name || '',
      },
      redirectTo,
    })

    if (inviteError) {
      return jsonResponse({ error: inviteError.message }, 400)
    }

    const authUserId = inviteData?.user?.id

    if (!authUserId) {
      return jsonResponse({ error: 'Supabase hat keinen Auth User zurückgegeben.' }, 500)
    }

    const { error: updateError } = await adminClient
      .from('members')
      .update({
        auth_user_id: authUserId,
        app_role: appRole,
        email,
      })
      .eq('id', memberId)

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500)
    }

    await adminClient.from('audit_logs').insert({
      action: 'invite_user',
      table_name: 'members',
      record_id: memberId,
      old_data: member,
      new_data: {
        auth_user_id: authUserId,
        app_role: appRole,
        email,
      },
      user_id: user.id,
      user_email: user.email,
    })

    return jsonResponse({
      success: true,
      user_id: authUserId,
      email,
      app_role: appRole,
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
