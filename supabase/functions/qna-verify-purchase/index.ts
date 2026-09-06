import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!keySecret) return false
  const encoder = new TextEncoder()
  const data = encoder.encode(`${orderId}|${paymentId}`)
  const key = await crypto.subtle.importKey('raw', encoder.encode(keySecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, data)
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === signature
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAnon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser()
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = await req.json()
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan_id) {
      return new Response(JSON.stringify({ error: 'Missing payment fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const valid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid) return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: plan } = await supabase.from('qna_plans').select('*').eq('id', plan_id).single()
    if (!plan) return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const endDate = plan.id === 4 ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19)

    const { error: upsertError } = await supabase.from('qna_user_plans').upsert({
      user_id: user.id,
      plan_id: plan_id,
      start_date: now,
      end_date: endDate,
      payment_id: razorpay_payment_id,
      status: 'active'
    })

    if (upsertError) return new Response(JSON.stringify({ error: 'Failed to assign plan', details: upsertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    return new Response(JSON.stringify({ status: 'success', plan_id, plan_name: plan.name }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
