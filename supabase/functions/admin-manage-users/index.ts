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
    const { action, user_id, apps } = await req.json()

    if (!action || !user_id) {
      return new Response(JSON.stringify({ error: 'action and user_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    switch (action) {
      case 'delete': {
        const { data: vendor } = await supabase.from('ec_vendors').select('id').eq('user_id', user_id).maybeSingle()
        if (vendor) {
          const { data: items } = await supabase.from('ec_order_items').select('id').eq('vendor_id', vendor.id)
          if (items && items.length) {
            await supabase.from('ec_order_items').delete().in('id', items.map(i => i.id))
          }
          const { data: products } = await supabase.from('ec_products').select('id').eq('vendor_id', vendor.id)
          if (products && products.length) {
            await supabase.from('ec_reviews').delete().in('product_id', products.map(p => p.id))
            await supabase.from('ec_cart_items').delete().in('product_id', products.map(p => p.id))
          }
        }
        const { error: delErr } = await supabase.auth.admin.deleteUser(user_id)
        if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      case 'set_apps': {
        if (!Array.isArray(apps)) {
          return new Response(JSON.stringify({ error: 'apps must be an array' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const cleanApps = [...new Set(apps.map(a => String(a).trim()).filter(a => a !== ''))]
        const { data: existing } = await supabase.from('user_apps').select('app').eq('user_id', user_id)
        const existingSet = new Set((existing || []).map(r => r.app))
        const toAdd = cleanApps.filter(a => !existingSet.has(a))
        const toRemove = (existing || []).filter(r => !cleanApps.includes(r.app)).map(r => r.app)

        let err = null
        if (toAdd.length) {
          const ins = await supabase.from('user_apps').upsert(toAdd.map(a => ({ user_id, app: a })), { onConflict: 'user_id,app' })
          if (ins.error) err = ins.error
        }
        if (!err && toRemove.length) {
          const del = await supabase.from('user_apps').delete().eq('user_id', user_id).in('app', toRemove)
          if (del.error) err = del.error
        }
        if (err) return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true, apps: cleanApps }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      case 'toggle_status': {
        const { data: u } = await supabase.auth.admin.getUserById(user_id)
        if (!u?.user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        const isBanned = u.user.banned_until && new Date(u.user.banned_until) > new Date()
        if (isBanned) {
          const { error: updErr } = await supabase.auth.admin.updateUserById(user_id, { ban_duration: '0s' })
          if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } else {
          const { error: updErr } = await supabase.auth.admin.updateUserById(user_id, { ban_duration: '876000h' })
          if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        return new Response(JSON.stringify({ success: true, new_status: isBanned ? 'active' : 'inactive' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  } catch (err) {
    const msg = err?.message || err?.toString() || 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
