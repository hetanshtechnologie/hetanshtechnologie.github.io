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

async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!keySecret) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${orderId}|${paymentId}`))
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === signature
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan_id) {
      return json({ error: 'Missing payment fields' }, 400)
    }

    const valid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid) return json({ error: 'Invalid signature' }, 400)

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .single()
    if (planError || !plan) return json({ error: 'Plan not found' }, 404)
    if (Number(plan.price) <= 0) return json({ error: 'Invalid plan' }, 400)

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) return json({ error: 'Razorpay is not configured' }, 500)

    const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` }
    })
    if (!paymentRes.ok) return json({ error: 'Could not verify payment with Razorpay' }, 502)
    const payment = await paymentRes.json()

    const expectedAmount = Math.round(Number(plan.price) * 100)
    if (payment.order_id !== razorpay_order_id) return json({ error: 'Payment order mismatch' }, 400)
    if (Number(payment.amount) !== expectedAmount) return json({ error: 'Payment amount mismatch' }, 400)
    if (!['captured', 'authorized'].includes(payment.status)) {
      return json({ error: `Payment is ${payment.status}` }, 400)
    }

    const now = new Date()
    const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_id,
        status: 'active',
        start_date: now.toISOString(),
        end_date: endDate
      }, { onConflict: 'user_id' })
      .select('id')
      .single()
    if (subError) return json({ error: 'Failed to activate subscription', details: subError.message }, 500)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan_id, subscription_status: 'active' })
      .eq('id', user.id)
    if (profileError) return json({ error: 'Failed to update profile', details: profileError.message }, 500)

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: user.id,
      subscription_id: subscription.id,
      amount: Number(plan.price),
      currency: 'INR',
      payment_provider: 'razorpay',
      payment_status: 'success',
      transaction_id: razorpay_payment_id
    })
    if (paymentError) console.error('payment log failed', paymentError.message)

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      actor_id: user.id,
      action: 'purchase_plan',
      entity: 'plan',
      entity_id: plan_id,
      meta: {
        plan_name: plan.name,
        amount: Number(plan.price),
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      }
    })

    return json({ status: 'success', plan_id, plan_name: plan.name })
  } catch (error) {
    return json({ error: (error as Error).message || 'Unexpected error' }, 500)
  }
})
