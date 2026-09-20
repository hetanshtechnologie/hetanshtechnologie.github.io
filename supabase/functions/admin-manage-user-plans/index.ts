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
    const { action, user_id, plan_type, plan_id } = await req.json()

    if (!action || !user_id || !plan_type) {
      return new Response(JSON.stringify({ error: 'action, user_id, and plan_type required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const table = plan_type === 'todo' ? 'todo_user_plans' : plan_type === 'ec' ? 'user_ec_plans' : 'qna_user_plans'

    switch (action) {
      case 'assign': {
        if (!plan_id) return new Response(JSON.stringify({ error: 'plan_id required for assign' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
        const { error } = await supabase.from(table).upsert({
          user_id,
          plan_id,
          current_period_start: now,
          current_period_end: null,
          status: 'active'
        })
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      case 'block': {
        const { error } = await supabase.from(table).update({ status: 'blocked' }).eq('user_id', user_id)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true, new_status: 'blocked' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      case 'unblock': {
        const { error } = await supabase.from(table).update({ status: 'active' }).eq('user_id', user_id)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true, new_status: 'active' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      case 'delete': {
        const { error } = await supabase.from(table).delete().eq('user_id', user_id)
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  } catch (err) {
    const msg = err?.message || err?.toString() || 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
