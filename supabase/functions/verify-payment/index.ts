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
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keySecret) return new Response(JSON.stringify({ error: 'Razorpay not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(keySecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`))
    const expectedSig = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (expectedSig !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: order } = await supabase.from('shop_orders')
      .update({ payment_status: 'success', razorpay_payment_id, transaction_id: razorpay_payment_id })
      .eq('razorpay_order_id', razorpay_order_id)
      .select()
      .single()

    const { data: cart } = await supabase.from('shop_cart')
      .select('*, shop_products(*)')
      .eq('user_id', user.id)

    if (cart?.length) {
      const items = cart.map(c => ({
        order_id: order.id,
        product_id: c.product_id,
        title: c.shop_products?.title || 'Unknown',
        price: c.shop_products?.price || 0,
        pdf_url: c.shop_products?.pdf_url || ''
      }))
      await supabase.from('shop_order_items').insert(items)
      await supabase.from('shop_cart').delete().eq('user_id', user.id)
    }

    let emailSent = false
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (user.email && serviceKey) {
      try {
        const pdfUrls = (cart || []).map(i => i.shop_products?.pdf_url).filter(Boolean)
        const emailRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-pdf-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify({ email: user.email, pdf_urls: pdfUrls, order_id: order.id })
        })
        emailSent = emailRes.ok
      } catch (_) {}
    }

    return new Response(JSON.stringify({
      status: 'verified',
      order_id: order.id,
      email_sent: emailSent,
      items: (cart || []).map(c => ({ title: c.shop_products?.title, price: c.shop_products?.price, pdf_url: c.shop_products?.pdf_url }))
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
