import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { phone, latitude, longitude, accuracy, battery_level, recorded_at } = await req.json()
    if (!phone || latitude == null || longitude == null) {
      return new Response(JSON.stringify({ error: 'phone, latitude, longitude required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: last } = await supabase
      .from('location_history')
      .select('latitude, longitude, recorded_at')
      .eq('phone', phone)
      .order('recorded_at', { ascending: false })
      .limit(1)

    const MIN_DISTANCE_KM = 1.0 // 100m
    const MIN_INTERVAL_MIN = 30 // force insert after 30 min even if close

    if (last && last.length) {
      const dist = haversineKm(latitude, longitude, last[0].latitude, last[0].longitude)
      const lastTime = new Date(last[0].recorded_at).getTime()
      const elapsedMin = (Date.now() - lastTime) / 60000

      if (dist < MIN_DISTANCE_KM && elapsedMin < MIN_INTERVAL_MIN) {
        return new Response(JSON.stringify({ inserted: false, reason: 'too_close', distance_km: Math.round(dist * 1000) / 1000, elapsed_min: Math.round(elapsedMin) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    const { data, error } = await supabase.from('location_history').insert({
      phone,
      latitude,
      longitude,
      accuracy: accuracy || null,
      battery_level: battery_level || null,
      recorded_at: recorded_at || new Date().toISOString(),
    }).select('id').single()

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    return new Response(JSON.stringify({ inserted: true, id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err?.message || err?.toString() || 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
