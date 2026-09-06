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
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { plan_id } = await req.json()
    if (!plan_id) return new Response(JSON.stringify({ error: 'plan_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: plan, error: planError } = await supabase.from('plans').select('*').eq('id', plan_id).single()
    if (planError || !plan) return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (plan.price <= 0) return new Response(JSON.stringify({ error: 'Free plan cannot be purchased' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) return new Response(JSON.stringify({ error: 'Razorpay not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const basicAuth = btoa(`${keyId}:${keySecret}`)
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${basicAuth}` },
      body: JSON.stringify({ amount: Number(plan.price) * 100, currency: 'INR', receipt: `edu_${plan_id}_${user.id.slice(0, 8)}_${Date.now()}` })
    })

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text()
      return new Response(JSON.stringify({ error: 'Razorpay order failed', details: errBody }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const order = await rzpRes.json()

    return new Response(JSON.stringify({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      plan_id: plan.id,
      plan_name: plan.name,
      user_email: user.email,
      user_name: user.email?.split('@')[0] || 'User'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})