import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No auth' }, 401)

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const planId = body.plan_id
    if (!planId) return json({ error: 'plan_id required' }, 400)

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()
    if (planError || !plan) return json({ error: 'Plan not found' }, 404)
    if (!plan.is_active) return json({ error: 'Plan is not available' }, 400)
    if (Number(plan.price) <= 0) return json({ error: 'Free plan cannot be purchased' }, 400)

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) return json({ error: 'Razorpay is not configured' }, 500)

    const amount = Math.round(Number(plan.price) * 100)
    const basicAuth = btoa(`${keyId}:${keySecret}`)
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basicAuth}` },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `kankotri_${planId}_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { plan_id: planId, plan_name: plan.name, user_id: user.id }
      })
    })

    if (!rzpRes.ok) {
      const details = await rzpRes.text()
      return json({ error: 'Razorpay order creation failed', details }, 502)
    }

    const order = await rzpRes.json()

    return json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      plan_id: plan.id,
      plan_name: plan.name,
      user_email: user.email,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
    })
  } catch (error) {
    return json({ error: (error as Error).message || 'Unexpected error' }, 500)
  }
})
