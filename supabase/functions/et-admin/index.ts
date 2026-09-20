import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user || user.email !== 'hetanshtechnologie@gmail.com') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseService = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const body = await req.json().catch(() => ({}))
    const { action, userId, block, planId } = body

    if (action === 'toggleBlock' && userId) {
      await supabaseService.auth.admin.updateUserById(userId, { ban_duration: block ? '876000h' : 'none' })
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'upgradeUser' && userId && planId) {
      await supabaseService.from('et_user_plans').upsert({ user_id: userId, plan_id: planId, status: 'active', start_date: new Date().toISOString() }, { onConflict: 'user_id' })
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Dashboard data
    const { count: totalUsers } = await supabaseService.from('et_user_plans').select('*', { count: 'exact', head: true })
    const { count: activeSubs } = await supabaseService.from('et_user_plans').select('*', { count: 'exact', head: true }).not('plan_id', 'eq', 1).eq('status', 'active')
    const { data: paidPlans } = await supabaseService.from('et_user_plans').select('plan_id').not('plan_id', 'eq', 1)
    let revenue = 0
    if (paidPlans) {
      for (const pp of paidPlans) {
        const { data: p } = await supabaseService.from('et_plans').select('price').eq('id', pp.plan_id).single()
        if (p) revenue += p.price
      }
    }
    const freeUsers = totalUsers - (activeSubs || 0)

    // List users
    const { data: authUsers } = await supabaseService.auth.admin.listUsers()
    const users = await Promise.all((authUsers?.users || []).map(async (u) => {
      const { data: up } = await supabaseService.from('et_user_plans').select('plan_id,status').eq('user_id', u.id).maybeSingle()
      const { data: plan } = up ? await supabaseService.from('et_plans').select('name').eq('id', up.plan_id).maybeSingle() : { data: null }
      const { count } = await supabaseService.from('et_expenses').select('*', { count: 'exact', head: true }).eq('user_id', u.id)
      return { id: u.id, email: u.email, plan: plan?.name || 'Free', blocked: !!u.banned_until, expenseCount: count }
    }))

    return new Response(JSON.stringify({ totalUsers: totalUsers || 0, activeSubs: activeSubs || 0, revenue, freeUsers: freeUsers || 0, users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
