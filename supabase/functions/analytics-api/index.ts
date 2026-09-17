import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAnon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabaseAnon.auth.getUser()
    if (!user || user.email !== 'hetanshtechnologie@gmail.com') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    if (req.method === 'DELETE') {
      const { data, error } = await supabase
        .from('site_analytics')
        .delete()
        .like('page_path', '/admin/%')
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      return new Response(JSON.stringify({ success: true, message: 'Deleted all admin rows' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let range = '7d'
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (body && typeof body.range === 'string') range = body.range
      } catch (_) {}
    }

    const now = new Date()
    let since: Date
    if (range === '24h') since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    else if (range === '30d') since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    else since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const sinceStr = since.toISOString()

    const { data: pvRows } = await supabase
      .from('site_analytics')
      .select('created_at, session_id, page_path, device_type, browser, os, event_type, user_email, user_id, ip_address, country')
      .gte('created_at', sinceStr)
      .order('created_at', { ascending: false })
      .limit(50000)

    const rows = pvRows || []

    // Total pageviews
    const totalPV = rows.filter(r => r.event_type === 'pageview').length

    // Unique visitors (distinct session_id)
    const sessions = new Set(rows.map(r => r.session_id))
    const uniqueVisitors = sessions.size

    // Unique logged-in users
    const loggedEmails = new Set(rows.filter(r => r.user_email).map(r => r.user_email))
    const uniqueLoggedUsers = loggedEmails.size

    // Real-time active (last 5 min)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const realtimeRows = rows.filter(r => new Date(r.created_at) > fiveMinAgo)
    const realtimeSessions = new Set(realtimeRows.map(r => r.session_id))

    // Daily trend
    const dailyMap: Record<string, { pv: number; uv: Set<string>; lu: Set<string> }> = {}
    for (const r of rows) {
      if (r.event_type !== 'pageview') continue
      const day = r.created_at.substring(0, 10)
      if (!dailyMap[day]) dailyMap[day] = { pv: 0, uv: new Set(), lu: new Set() }
      dailyMap[day].pv++
      dailyMap[day].uv.add(r.session_id)
      if (r.user_email) dailyMap[day].lu.add(r.user_email)
    }
    const dailyTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, pageviews: v.pv, visitors: v.uv.size, loggedUsers: v.lu.size }))

    // Top pages
    const pageMap: Record<string, number> = {}
    for (const r of rows) {
      if (r.event_type !== 'pageview') continue
      pageMap[r.page_path] = (pageMap[r.page_path] || 0) + 1
    }
    const topPages = Object.entries(pageMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([path, count]) => ({ path, count }))

    // Device breakdown
    const deviceMap: Record<string, number> = {}
    for (const r of rows) {
      if (r.event_type !== 'pageview') continue
      deviceMap[r.device_type || 'unknown'] = (deviceMap[r.device_type || 'unknown'] || 0) + 1
    }
    const devices = Object.entries(deviceMap).map(([type, count]) => ({ type, count }))

    // Browser breakdown
    const browserMap: Record<string, number> = {}
    for (const r of rows) {
      if (r.event_type !== 'pageview') continue
      browserMap[r.browser || 'unknown'] = (browserMap[r.browser || 'unknown'] || 0) + 1
    }
    const browsers = Object.entries(browserMap).map(([name, count]) => ({ name, count }))

    // OS breakdown
    const osMap: Record<string, number> = {}
    for (const r of rows) {
      if (r.event_type !== 'pageview') continue
      osMap[r.os || 'unknown'] = (osMap[r.os || 'unknown'] || 0) + 1
    }
    const osList = Object.entries(osMap).map(([name, count]) => ({ name, count }))

    // Country breakdown
    const countryMap: Record<string, number> = {}
    for (const r of rows) {
      if (r.event_type !== 'pageview') continue
      countryMap[r.country || 'Unknown'] = (countryMap[r.country || 'Unknown'] || 0) + 1
    }
    const countries = Object.entries(countryMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }))

    // Logged-in users with their pages
    const userPages: Record<string, { pages: Set<string>; visits: number; lastSeen: string }> = {}
    for (const r of rows) {
      if (!r.user_email) continue
      if (!userPages[r.user_email]) userPages[r.user_email] = { pages: new Set(), visits: 0, lastSeen: r.created_at }
      userPages[r.user_email].pages.add(r.page_path)
      userPages[r.user_email].visits++
      if (r.created_at > userPages[r.user_email].lastSeen) userPages[r.user_email].lastSeen = r.created_at
    }
    const loggedInUsers = Object.entries(userPages)
      .map(([email, v]) => ({ email, visits: v.visits, pages: [...v.pages], lastSeen: v.lastSeen }))
      .sort((a, b) => b.visits - a.visits)

    // Recent visitors (last 20 pageviews with user info)
    const recentVisitors = rows
      .filter(r => r.event_type === 'pageview')
      .slice(0, 20)
      .map(r => ({
        email: r.user_email || 'Anonymous',
        page: r.page_path,
        browser: r.browser,
        os: r.os,
        device: r.device_type,
        country: r.country,
        ip: r.ip_address,
        time: r.created_at,
      }))

    return new Response(JSON.stringify({
      totalPageviews: totalPV,
      uniqueVisitors,
      uniqueLoggedUsers,
      realtimeActive: realtimeSessions.size,
      dailyTrend,
      topPages,
      devices,
      browsers,
      os: osList,
      countries,
      loggedInUsers,
      recentVisitors,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
