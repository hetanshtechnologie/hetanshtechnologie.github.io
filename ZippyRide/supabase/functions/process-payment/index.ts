import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { trip_id, payment_method, gateway, gateway_txn_id } = await req.json()

    if (!trip_id) {
      return new Response(JSON.stringify({ error: 'trip_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get trip details
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('*, driver:driver_id(id), rider:rider_id(id)')
      .eq('id', trip_id)
      .single()

    if (tripErr || !trip) throw tripErr || new Error('Trip not found')

    // Calculate commission (20% platform fee)
    const commission = Math.round((trip.fare_final || trip.fare_estimate || 0) * 0.2 * 100) / 100
    const driverEarnings = (trip.fare_final || trip.fare_estimate || 0) - commission

    // Insert payment record
    const { data: payment, error: payErr } = await supabase
      .from('ride_payments')
      .insert({
        trip_id: trip.id,
        rider_id: trip.rider_id,
        driver_id: trip.driver_id,
        amount: trip.fare_final || trip.fare_estimate,
        commission,
        driver_earnings: driverEarnings,
        method: payment_method || 'cash',
        gateway,
        gateway_txn_id,
        status: payment_method === 'cash' ? 'completed' : 'pending',
        settled_at: payment_method === 'cash' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()

    if (payErr) throw payErr

    // Update driver's total earnings
    if (trip.driver_id) {
      const { data: dd } = await supabase.from('driver_details').select('total_earnings, total_rides').eq('id', trip.driver_id).single()
      await supabase.from('driver_details').update({
        total_earnings: (dd?.total_earnings || 0) + driverEarnings,
        total_rides: (dd?.total_rides || 0) + 1,
      }).eq('id', trip.driver_id)
    }

    return new Response(JSON.stringify({ payment_id: payment.id, commission, driver_earnings: driverEarnings }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
