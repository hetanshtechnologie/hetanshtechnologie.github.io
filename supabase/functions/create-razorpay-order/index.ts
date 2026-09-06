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

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: cart, error: cartError } = await supabase
      .from('shop_cart')
      .select('*, shop_products(*)')
      .eq('user_id', user.id)

    if (cartError || !cart?.length) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const totalAmount = cart.reduce((sum, item) => sum + Number(item.shop_products?.price || 0), 0)
    const amountPaise = Math.round(totalAmount * 100)

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) return new Response(JSON.stringify({ error: 'Razorpay not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const basicAuth = btoa(`${keyId}:${keySecret}`)
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${basicAuth}` },
      body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: `rcpt_${Date.now()}_${user.id.slice(0,8)}` })
    })

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text()
      return new Response(JSON.stringify({ error: 'Razorpay order failed', details: errBody }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const order = await rzpRes.json()

    const { data: dbOrder, error: orderError } = await supabase.from('shop_orders').insert({
      user_id: user.id,
      email: user.email,
      total_amount: totalAmount,
      razorpay_order_id: order.id,
      payment_status: 'pending'
    }).select().single()

    if (orderError) {
      return new Response(JSON.stringify({ error: 'Failed to save order', details: orderError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      db_order_id: dbOrder.id,
      user_name: user.email?.split('@')[0] || 'Customer',
      user_email: user.email
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
