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

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: actor } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (actor?.role !== 'admin') return json({ error: 'Admin access required' }, 403)

    const body = await req.json().catch(() => ({}))
    if (body.action !== 'refund-payment') return json({ error: 'Unsupported action' }, 400)

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', body.payment_id)
      .single()
    if (paymentError || !payment) return json({ error: 'Payment not found' }, 404)
    if (payment.payment_status === 'refunded') return json({ status: 'already_refunded', payment_id: payment.id })
    if (payment.payment_status !== 'success') return json({ error: 'Only successful payments can be refunded' }, 400)
    if (!payment.transaction_id) return json({ error: 'Payment has no Razorpay transaction id' }, 400)

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!keyId || !keySecret) return json({ error: 'Razorpay is not configured' }, 500)

    const refundRes = await fetch(`https://api.razorpay.com/v1/payments/${payment.transaction_id}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`
      },
      body: JSON.stringify({
        notes: { reason: 'Refunded by Kankotri admin', payment_row: payment.id }
      })
    })

    if (!refundRes.ok) {
      const details = await refundRes.text()
      return json({ error: 'Razorpay refund failed', details }, 502)
    }

    const refund = await refundRes.json()

    const { error: updateError } = await supabase
      .from('payments')
      .update({ payment_status: 'refunded' })
      .eq('id', payment.id)
    if (updateError) return json({ error: 'Refund created but status update failed', details: updateError.message }, 500)

    await supabase.from('audit_logs').insert({
      user_id: payment.user_id,
      actor_id: user.id,
      action: 'refund_payment',
      entity: 'payment',
      entity_id: payment.id,
      meta: {
        amount: payment.amount,
        transaction_id: payment.transaction_id,
        refund_id: refund.id,
        refund_status: refund.status
      }
    })

    return json({ status: 'refunded', refund_id: refund.id, refund_status: refund.status })
  } catch (error) {
    return json({ error: (error as Error).message || 'Unexpected error' }, 500)
  }
})
