import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import nodemailer from 'https://esm.sh/nodemailer@6.9.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { subject, content, customer_emails, vendor_id, store_name } = await req.json()
    if (!subject || !content || !customer_emails?.length) {
      return new Response(JSON.stringify({ error: 'subject, content, and customer_emails are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) {
      return new Response(JSON.stringify({ error: 'Gmail not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    })

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#2563eb;color:white;padding:20px;text-align:center;">
          <h2 style="margin:0;">${store_name || 'Store Update'}</h2>
        </div>
        <div style="padding:20px;background:#f9fafb;color:#1e293b;line-height:1.6;">
          ${content.replace(/\n/g, '<br>')}
        </div>
        <div style="padding:15px;text-align:center;color:#94a3b8;font-size:12px;">
          <p>You are receiving this because you purchased from ${store_name || 'our store'}.</p>
          <p>&mdash; ${store_name || 'Hetansh Technologie'}</p>
        </div>
      </div>`

    let sentCount = 0
    for (const email of customer_emails) {
      try {
        await transporter.sendMail({
          from: `"${store_name || 'Store'}" <${gmailUser}>`,
          to: email,
          subject: subject,
          html: htmlContent,
        })
        sentCount++
      } catch (_) { console.error('Failed to send to', email) }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    await fetch(supabaseUrl + '/rest/v1/ec_newsletter_campaigns', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + supabaseKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ subject, content, sent_count: sentCount, status: 'sent' }),
    })

    return new Response(JSON.stringify({ success: true, sent: sentCount, total: customer_emails.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
