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
    const { email } = await req.json()
    if (!email) return new Response(JSON.stringify({ error: 'email required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Find user by email
    const { data: users, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) throw listErr

    const user = users.users.find(u => u.email === email)
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (user.email_confirmed_at) {
      return new Response(JSON.stringify({ ok: true, already_confirmed: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Auto-confirm
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true })
    if (updateErr) throw updateErr

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
