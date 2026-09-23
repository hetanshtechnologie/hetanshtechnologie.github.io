import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = await req.json()
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = createHmac('sha256', Deno.env.get('RAZORPAY_KEY_SECRET')!).update(body).digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: plan } = await supabase.from('yt_plans').select('*').eq('id', plan_id).single()
    if (!plan) return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Already applied this payment? (idempotency check)
    const { data: existing } = await supabase.from('plan_purchases')
      .select('id').eq('razorpay_payment_id', razorpay_payment_id).maybeSingle()
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    if (existing) {
      return new Response(JSON.stringify({ success: true, message: plan.name + ' plan is already active.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: purchaseError } = await admin.from('plan_purchases').insert({
      user_id: user.id, plan_id: plan.id, amount: plan.price,
      razorpay_order_id, razorpay_payment_id, status: 'paid'
    })
    if (purchaseError) throw new Error('Failed to record payment: ' + purchaseError.message)

    const { error: userError } = await admin.from('users').update({
      plan: plan.name, plan_expires_at: expiresAt, plan_payment_id: razorpay_payment_id
    }).eq('id', user.id)
    if (userError) throw new Error('Failed to activate plan: ' + userError.message)

    return new Response(JSON.stringify({ success: true, message: plan.name + ' plan activated for 30 days!' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})