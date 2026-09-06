import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function safeSelect(supabase, table) {
  try {
    const { data, error } = await supabase.from(table).select('*')
    if (error) return { data: null, error: null }
    return { data, error: null }
  } catch {
    return { data: null, error: null }
  }
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

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: authUsers, error: auErr } = await supabase.auth.admin.listUsers()
    if (auErr) return new Response(JSON.stringify({ error: auErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: qnaUserPlans } = await safeSelect(supabase, 'qna_user_plans')
    const { data: todoUserPlans } = await safeSelect(supabase, 'todo_user_plans')
    const { data: ecUserPlans } = await safeSelect(supabase, 'user_ec_plans')
    const { data: qnaPlanDefs } = await safeSelect(supabase, 'qna_plans')
    const { data: todoPlanDefs } = await safeSelect(supabase, 'todo_plans')
    const { data: ecPlanDefs } = await safeSelect(supabase, 'ec_plans')
    const { data: vendors } = await safeSelect(supabase, 'ec_vendors')

    const qnaPlanNames = {}
    if (qnaPlanDefs) qnaPlanDefs.forEach(p => { qnaPlanNames[p.id] = p.name })

    const todoPlanNames = {}
    if (todoPlanDefs) todoPlanDefs.forEach(p => { todoPlanNames[p.id] = p.name })

    const ecPlanNames = {}
    if (ecPlanDefs) ecPlanDefs.forEach(p => { ecPlanNames[p.id] = p.name })

    const vendorStoreMap = {}
    if (vendors) vendors.forEach(v => { vendorStoreMap[v.user_id] = v.store_name })

    const qnaMap = {}
    if (qnaUserPlans) qnaUserPlans.forEach(p => {
      qnaMap[p.user_id] = { plan_id: p.plan_id, plan_name: qnaPlanNames[p.plan_id] || 'Unknown', status: p.status, start_date: p.start_date, end_date: p.end_date }
    })

    const todoMap = {}
    if (todoUserPlans) todoUserPlans.forEach(p => {
      todoMap[p.user_id] = { plan_id: p.plan_id, plan_name: todoPlanNames[p.plan_id] || 'Unknown', status: p.status, start_date: p.current_period_start, end_date: p.current_period_end }
    })

    const ecMap = {}
    if (ecUserPlans) ecUserPlans.forEach(p => {
      ecMap[p.user_id] = { plan_id: p.plan_id, plan_name: ecPlanNames[p.plan_id] || 'Unknown', status: p.status, start_date: p.start_date, end_date: p.end_date }
    })

    const users = (authUsers.users || []).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: u.banned_until,
      qna_plan: qnaMap[u.id] || null,
      todo_plan: todoMap[u.id] || null,
      ec_plan: ecMap[u.id] || null,
      vendor_store: vendorStoreMap[u.id] || null
    }))

    return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err?.message || err?.toString() || 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
