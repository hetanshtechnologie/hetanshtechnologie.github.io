import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAnon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabaseAnon.auth.getUser()
    if (!user || user.email !== 'hetanshtechnologie@gmail.com') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { id } = await req.json()
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: contact, error } = await supabase.from('contact').select('name,email,service').eq('id', id).single()
    if (error || !contact) {
      return new Response(JSON.stringify({ error: 'Contact not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!contact.email) {
      return new Response(JSON.stringify({ error: 'Candidate has no email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const role = (contact.service || '')
      .replace('Career Application - ', '')
      .replace(' - Shortlisted', '')
      .replace(' - Rejected', '')

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) {
      return new Response(JSON.stringify({ status: 'logged', note: 'Gmail not configured' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const subject = `Application Update \u2013 ${role}`
    const text = `Dear ${contact.name || 'Candidate'},

Thank you for taking the time to apply for the ${role} position with us. We appreciate your interest in joining our team and the effort you put into your application.

After careful consideration, we regret to inform you that we will not be moving forward with your application at this time. While your background is impressive, we have decided to proceed with other candidates whose experience more closely matches our current requirements.

We encourage you to stay connected with us and apply for future opportunities that align with your skills and career goals.

Wishing you success in your job search and future endeavors.

Best regards,
Hetansh Technologie
+91 9974031480
Cloud Native Lead | Solution Architect | DevOps Expert
\uD83C\uDF10 hetanshtechnologie.github.io
Ahmedabad, Gujarat, India
Helping businesses design scalable, secure, and intelligent systems.`

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    })

    await transporter.sendMail({ from: `"Hetansh Technologie" <${gmailUser}>`, to: contact.email, subject, text })

    return new Response(JSON.stringify({ status: 'sent' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err?.message || err?.toString() || 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
