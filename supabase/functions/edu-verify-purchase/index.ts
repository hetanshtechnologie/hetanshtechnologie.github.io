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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id, org_name, org_email, org_phone, user_name } = await req.json()
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan_id || !org_name || !org_email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const valid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid) return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: plan } = await supabase.from('plans').select('*').eq('id', plan_id).single()
    if (!plan) return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const slug = org_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
    const maxS = plan.max_students || 100
    const maxT = plan.max_teachers || 20

    const { data: org, error: orgErr } = await supabase.from('organizations').insert({
      name: org_name, slug, email: org_email, phone: org_phone || null,
      subscription_plan: plan.slug, status: 'pending',
      max_students: maxS, max_teachers: maxT
    }).select().single()
    if (orgErr) return new Response(JSON.stringify({ error: 'Failed to create organization', details: orgErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    await supabase.from('profiles').update({ org_id: org.id, full_name: user_name || org_email, phone: org_phone || null }).eq('user_id', user.id)

    await supabase.from('payments').insert({
      org_id: org.id, plan_id: plan.id, amount: plan.price,
      type: 'subscription', status: 'completed', payment_method: 'razorpay',
      razorpay_payment_id: razorpay_payment_id,
      notes: 'Paid via Razorpay'
    })

    return new Response(JSON.stringify({ status: 'success', org_id: org.id, plan_name: plan.name }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})