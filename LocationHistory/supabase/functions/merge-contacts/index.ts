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
    const { phone } = await req.json()
    if (!phone) {
      return new Response(JSON.stringify({ error: 'phone required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: contacts, error: fetchErr } = await supabase.from('phone_contacts').select('*').eq('phone', phone).order('name')
    if (fetchErr) return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const groups = {}
    for (const c of contacts) {
      const key = (c.name || '').toLowerCase().trim()
      if (!key) continue
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }

    let mergedCount = 0
    for (const [name, group] of Object.entries(groups)) {
      if (group.length < 2) continue
      const keep = group[0]
      const deleteIds = []
      const allNums = new Set((keep.number || '').split(',').map(s => s.trim()).filter(Boolean))
      const allEmails = new Set((keep.email || '').split(',').map(s => s.trim()).filter(Boolean))

      for (let i = 1; i < group.length; i++) {
        const dup = group[i]
        deleteIds.push(dup.id)
        if (dup.number) dup.number.split(',').map(s => s.trim()).filter(Boolean).forEach(n => allNums.add(n))
        if (dup.email) dup.email.split(',').map(s => s.trim()).filter(Boolean).forEach(e => allEmails.add(e))
      }

      const mergedNum = Array.from(allNums).join(', ')
      const mergedEmail = Array.from(allEmails).join(', ')

      if (mergedNum !== (keep.number || '') || mergedEmail !== (keep.email || '')) {
        await supabase.from('phone_contacts').update({ number: mergedNum, email: mergedEmail }).eq('id', keep.id)
      }

      if (deleteIds.length) {
        await supabase.from('phone_contacts').delete().in('id', deleteIds)
      }

      mergedCount += deleteIds.length
    }

    return new Response(JSON.stringify({ merged: mergedCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err?.message || err?.toString() || 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
