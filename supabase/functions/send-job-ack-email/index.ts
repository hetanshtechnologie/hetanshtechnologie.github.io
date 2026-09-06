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
    if (!contact.service || contact.service.indexOf('Career Application -') !== 0) {
      return new Response(JSON.stringify({ error: 'Not a job application' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const role = contact.service.replace('Career Application - ', '')

    const gmailUser = Deno.env.get('GMAIL_USER')
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!gmailUser || !gmailPass) {
      return new Response(JSON.stringify({ status: 'logged', note: 'Gmail not configured' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const subject = `Thank You for Your Application \u2013 ${role}`
    const text = `Dear ${contact.name || 'Candidate'},

Thank you for applying for the ${role} position at Hetansh Technologie. We have received your application through our portal and our recruitment team will review it shortly.

If your profile matches our current requirements, we will reach out to you to discuss the next steps.

We appreciate your interest in joining our team and wish you the best in the process.

Best regards,
Hetansh Technologie
+91 9974031480
Cloud Native Lead | Solution Architect | DevOps Expert
\uD83C\uDF10 Hetansh Technologie .github.io
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
