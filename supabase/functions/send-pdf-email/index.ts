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
    const authHeader = req.headers.get('Authorization')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { email, pdf_urls, order_id } = await req.json()
    if (!email || !pdf_urls?.length) {
      return new Response(JSON.stringify({ error: 'Missing email or pdf_urls' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) {
      console.log('GMAIL_USER/GMAIL_APP_PASSWORD not set')
      return new Response(JSON.stringify({ status: 'logged', note: 'Gmail not configured' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://HetanshTechnologie.github.io'

    const attachments = []
    for (const url of pdf_urls) {
      try {
        const res = await fetch(`${siteUrl}${url}`)
        if (!res.ok) continue
        const buf = await res.arrayBuffer()
        const ext = url.includes('.pdf') ? '.pdf' : ''
        const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
        const filename = `tutorial-${rand}${ext}`
        attachments.push({ filename, content: new Uint8Array(buf) })
      } catch (_) {
        console.error('Failed to fetch PDF:', url)
      }
    }

    if (!attachments.length) {
      return new Response(JSON.stringify({ error: 'No PDFs could be fetched' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    })

    await transporter.sendMail({
      from: `"Hetansh Technologie" <${gmailUser}>`,
      to: email,
      subject: 'Your Tutorial PDFs from Hetansh Technologie',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
          <h2 style="color:#1e293b;">Thank you for your purchase!</h2>
          <p style="color:#475569;">Order ID: <strong>${order_id}</strong></p>
          <p style="color:#475569;">Your purchased tutorial PDFs are attached to this email.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
          <p style="color:#94a3b8;font-size:.85rem;">These files are for personal use only. Please do not share.</p>
          <p style="color:#94a3b8;font-size:.85rem;">— Hetansh Technologie</p>
        </div>`,
      attachments,
    })

    return new Response(JSON.stringify({ status: 'sent', count: attachments.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})