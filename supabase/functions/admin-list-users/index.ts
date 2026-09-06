import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: authUsers, error: auErr } = await supabase.auth.admin.listUsers()
    if (auErr) return new Response(JSON.stringify({ error: auErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: profiles, error: prErr } = await supabase.from('blog_profiles').select('*')
    const profileMap = {}
    if (!prErr && profiles) profiles.forEach(p => { profileMap[p.id] = p })

    const { data: userApps, error: uaErr } = await supabase.from('user_apps').select('user_id, app')
    const appMap = {}
    if (!uaErr && userApps) userApps.forEach(r => {
      if (!appMap[r.user_id]) appMap[r.user_id] = []
      appMap[r.user_id].push(r.app)
    })

    const users = (authUsers.users || []).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      banned_until: u.banned_until,
      username: profileMap[u.id]?.username || '',
      full_name: profileMap[u.id]?.full_name || '',
      provider: u.app_metadata?.provider || u.identities?.[0]?.provider || 'email',
      apps: appMap[u.id] || []
    }))

    return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err?.message || err?.toString() || 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
