import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAnon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabaseAnon.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { action, invoice_id, period, org_id } = await req.json()

    if (action === 'dashboard_kpis') {
      const { data: kpis } = await supabase.rpc('get_dashboard_kpis', { org_id_param: parseInt(org_id) })
      return new Response(JSON.stringify(kpis), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate_irn') {
      const { data: inv } = await supabase.from('invoices').select('*, parties(*), invoice_lines(*)').eq('id', parseInt(invoice_id)).single()
      if (!inv) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      // Mock IRN generation - in production, call GST Suvidha Provider API
      const irn = 'IRN-' + Date.now() + '-' + String(Math.random()).slice(2, 10)
      const ackNo = 'ACK-' + Date.now()

      await supabase.from('invoices').update({ irn, status: 'sent' }).eq('id', parseInt(invoice_id))

      return new Response(JSON.stringify({ irn, ack_no: ackNo, ack_date: new Date().toISOString(), status: 'success' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'generate_ewaybill') {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', parseInt(invoice_id)).single()
      if (!inv) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const ewbNo = 'EWB-' + Date.now()
      await supabase.from('invoices').update({ eway_bill_no: ewbNo }).eq('id', parseInt(invoice_id))

      return new Response(JSON.stringify({ eway_bill_no: ewbNo, valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'gst_return_summary') {
      const { data: records } = await supabase.from('gst_records').select('return_type, status, count:invoice_id').eq('org_id', parseInt(org_id))
      const { data: invoices } = await supabase.from('invoices').select('cgst_amt, sgst_amt, igst_amt, total').eq('org_id', parseInt(org_id)).in('status', ['paid', 'sent'])

      const summary = {
        total_cgst: (invoices || []).reduce((s, i) => s + Number(i.cgst_amt || 0), 0),
        total_sgst: (invoices || []).reduce((s, i) => s + Number(i.sgst_amt || 0), 0),
        total_igst: (invoices || []).reduce((s, i) => s + Number(i.igst_amt || 0), 0),
        records: records || []
      }

      return new Response(JSON.stringify(summary), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
