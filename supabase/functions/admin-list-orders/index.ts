import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { data: { user } } = await supabaseAnon.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user || user.email !== 'hetanshtechnologie@gmail.com') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { order_id, delete_order_id, delete_order_ids } = await req.json()

    if (delete_order_ids && Array.isArray(delete_order_ids)) {
      await supabase.from('shop_order_items').delete().in('order_id', delete_order_ids)
      const { error } = await supabase.from('shop_orders').delete().in('id', delete_order_ids)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ ok: true, deleted: delete_order_ids.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (delete_order_id) {
      await supabase.from('shop_order_items').delete().eq('order_id', delete_order_id)
      const { error } = await supabase.from('shop_orders').delete().eq('id', delete_order_id)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (order_id) {
      const { data: items, error: itemsErr } = await supabase
        .from('shop_order_items')
        .select('*')
        .eq('order_id', order_id)
        .order('id')
      if (itemsErr) return new Response(JSON.stringify({ error: itemsErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ items }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: orders, error: ordersErr } = await supabase
      .from('shop_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (ordersErr) return new Response(JSON.stringify({ error: ordersErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    return new Response(JSON.stringify({ orders }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
