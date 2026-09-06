import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Razorpay from 'https://esm.sh/razorpay@2.9.4'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { plan_id } = await req.json()
    const { data: plan } = await supabase.from('et_plans').select('*').eq('id', plan_id).single()
    if (!plan || !plan.active) return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const razorpay = new Razorpay({ key_id: Deno.env.get('RAZORPAY_KEY_ID')!, key_secret: Deno.env.get('RAZORPAY_KEY_SECRET')! })
    const order = await razorpay.orders.create({ amount: plan.price, currency: 'INR', receipt: `et_${user.id}_${Date.now()}` })

    return new Response(JSON.stringify({
      id: order.id, amount: order.amount, currency: order.currency,
      key_id: Deno.env.get('RAZORPAY_KEY_ID'), plan_name: plan.name, user_email: user.email, user_name: user.email
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
