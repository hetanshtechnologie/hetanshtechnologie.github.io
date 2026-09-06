import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'https://esm.sh/nodemailer@6.9.3'

const GMAIL_USER = Deno.env.get('GMAIL_USER') || ''
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') || ''
const SITE_URL = Deno.env.get('SITE_URL') || 'https://Hetansh Technologie .github.io'

serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const today = new Date().toISOString()
    const { data: reminders, error } = await supabase
      .from('payment_reminders')
      .select('*, invoices!inner(*, parties(*)), parties!inner(*)')
      .eq('is_active', true)
      .lte('next_send_at', today)
      .in('invoices.status', ['sent', 'overdue'])

    if (error) throw error
    if (!reminders || !reminders.length) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
    })

    let sent = 0
    for (const r of reminders) {
      const inv = r.invoices
      const party = r.parties
      if (!party?.email) continue

      const subject = `Payment Reminder: ${inv.invoice_no} - \u20B9${Number(inv.total).toFixed(2)}`
      const text = `Dear ${party.name || 'Customer'},\n\nThis is a reminder that ${inv.doc_type === 'invoice' ? 'invoice' : 'document'} #${inv.invoice_no} dated ${inv.invoice_date} for \u20B9${Number(inv.total).toFixed(2)} is overdue.\n\nOriginal Due Date: ${inv.due_date || 'N/A'}\nAmount Due: \u20B9${Number(inv.total).toFixed(2)}\nStatus: ${inv.status}\n\nPlease make the payment at your earliest convenience.\n\nPayment Options:\n- UPI: Hetansh Technologie @okaxis\n- Bank Transfer: HDFC Bank, a/c 0481050073021, IFSC HDFC0001567\n- Online: ${SITE_URL}/ecommerce/index.html\n\nThank you for your business!\n\nRegards,\nHetansh Technologie Solutions\n${SITE_URL}`

      try {
        await transporter.sendMail({ from: `"Hetansh Technologie ERP" <${GMAIL_USER}>`, to: party.email, subject, text })
        sent++

        const nextDate = new Date()
        if (r.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1)
        else if (r.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7)
        else if (r.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1)

        await supabase.from('payment_reminders').update({
          last_sent_at: new Date().toISOString(),
          next_send_at: nextDate.toISOString()
        }).eq('id', r.id)
      } catch { /* skip if email fails */ }
    }

    return new Response(JSON.stringify({ sent, total: reminders.length }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
