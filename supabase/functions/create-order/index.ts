import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { payment_method, transaction_id } = await req.json()
    if (!payment_method || !transaction_id) {
      return new Response(JSON.stringify({ error: 'Missing payment_method or transaction_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: cart, error: cartError } = await supabase
      .from('shop_cart')
      .select('*, shop_products(*)')
      .eq('user_id', user.id)

    if (cartError || !cart?.length) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const totalAmount = cart.reduce((sum, item) => sum + Number(item.shop_products?.price || 0), 0)

    const { data: order, error: orderError } = await supabase
      .from('shop_orders')
      .insert({
        user_id: user.id,
        email: user.email,
        total_amount: totalAmount,
        payment_method,
        transaction_id,
        payment_status: 'confirmed'
      })
      .select()
      .single()

    if (orderError) {
      return new Response(JSON.stringify({ error: 'Failed to create order', details: orderError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const items = cart.map(c => ({
      order_id: order.id,
      product_id: c.product_id,
      title: c.shop_products?.title || 'Unknown',
      price: c.shop_products?.price || 0,
      pdf_url: c.shop_products?.pdf_url || ''
    }))

    const { error: itemsError } = await supabase.from('shop_order_items').insert(items)
    if (itemsError) {
      return new Response(JSON.stringify({ error: 'Failed to save order items', details: itemsError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.from('shop_cart').delete().eq('user_id', user.id)

    let emailSent = false
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (user.email && serviceKey) {
      try {
        const pdfUrls = items.map(i => i.pdf_url).filter(Boolean)
        const emailRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-pdf-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
          body: JSON.stringify({ email: user.email, pdf_urls: pdfUrls, order_id: order.id })
        })
        emailSent = emailRes.ok
      } catch (_) { /* email not critical for order */ }
    }

    return new Response(JSON.stringify({ status: 'confirmed', order_id: order.id, email_sent: emailSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
