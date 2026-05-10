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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Styrian Bastards <noreply@example.com>'

    if (!resendApiKey) {
      return jsonResponse({ error: 'RESEND_API_KEY fehlt in den Supabase Function Secrets.' }, 500)
    }

    const body = await req.json()

    const to = String(body.to || '').trim()
    const subject = String(body.subject || '').trim()
    const html = String(body.html || '').trim()
    const pdfBase64 = String(body.pdf_base64 || '')
    const filename = String(body.filename || 'rechnung.pdf')

    if (!to || !subject || !html || !pdfBase64) {
      return jsonResponse({ error: 'E-Mail, Betreff, Inhalt und PDF sind Pflicht.' }, 400)
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
        attachments: [
          {
            filename,
            content: pdfBase64,
          },
        ],
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return jsonResponse({ error: result?.message || 'E-Mail konnte nicht gesendet werden.', detail: result }, 400)
    }

    return jsonResponse({ success: true, result })
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unbekannter Fehler.' }, 500)
  }
})

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
