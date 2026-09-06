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
    const { table, action, data, filters, limit, offset, order_by } = await req.json()

    if (!table) return new Response(JSON.stringify({ error: 'table required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const allowedTables = [
      'organizations', 'user_profiles', 'chart_of_accounts', 'journal_entries', 'journal_lines',
      'parties', 'products', 'product_variants', 'inventory_batches', 'inventory_serial_numbers',
      'invoices', 'invoice_lines', 'payments',       'gst_records', 'gst_rates', 'gst_itc', 'gst_payments',
      'industry_configs', 'audit_log', 'godowns', 'payment_reminders', 'tds_rates',
      'bank_statements', 'bank_transactions', 'tds_challans', 'tds_certificates',
      'cost_centres', 'budgets', 'org_backups', 'eway_bills', 'eway_distance'
    ]
    if (!allowedTables.includes(table)) {
      return new Response(JSON.stringify({ error: 'Table not allowed' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let query = supabase.from(table)

    if (action === 'insert') {
      const { data: result, error } = await query.insert(data).select()
      if (error) throw error
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'update') {
      if (!filters || !filters.length) return new Response(JSON.stringify({ error: 'filters required for update' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      filters.forEach(f => { query = query[f.op || 'eq'](f.column, f.value) })
      const { data: result, error } = await query.update(data).select()
      if (error) throw error
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'delete') {
      if (!filters || !filters.length) return new Response(JSON.stringify({ error: 'filters required for delete' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      filters.forEach(f => { query = query[f.op || 'eq'](f.column, f.value) })
      const { error } = await query.delete()
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    filters?.forEach(f => { query = query[f.op || 'eq'](f.column, f.value) })
    if (order_by) query = query.order(order_by.column, { ascending: order_by.ascending ?? true })
    if (limit) query = query.limit(limit)
    if (offset) query = query.offset(offset)

    const { data: result, error } = await query.select(data?.select || '*')
    if (error) throw error
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
