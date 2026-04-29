import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { compare } from 'https://esm.sh/bcryptjs@2.4.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Extract tracking number from URL: /v1-results/<tracking_number>
  const url = new URL(req.url)
  const parts = url.pathname.split('/')
  const tracking_number = parts[parts.length - 1]?.toUpperCase()

  if (!tracking_number || !tracking_number.startsWith('OSC-')) {
    return new Response(JSON.stringify({ error: 'Tracking number required in URL path' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Verify API key
  const authHeader = req.headers.get('Authorization') ?? ''
  const rawKey = authHeader.replace(/^Bearer\s+/, '').trim()
  if (!rawKey) {
    return new Response(JSON.stringify({ error: 'API key required' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const keyPrefix = rawKey.slice(0, 8)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: keyRow } = await supabase
    .from('api_keys')
    .select('id, key_hash, is_active')
    .eq('key_prefix', keyPrefix)
    .eq('is_active', true)
    .single()

  if (!keyRow) {
    return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const valid = await compare(rawKey, keyRow.key_hash)
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Update last_used_at (non-blocking)
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRow.id)

  // Fetch result
  const { data: app } = await supabase
    .from('applications')
    .select(`
      tracking_number, full_name, date_of_birth, gender, status, updated_at,
      pickup_locations(name, city),
      test_results(
        result_value, unit, reference_range, interpretation, notes, updated_at,
        test_types(name)
      )
    `)
    .eq('tracking_number', tracking_number)
    .single()

  if (!app) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (app.status !== 'complete') {
    return new Response(JSON.stringify({ error: 'Results not yet available', status: app.status }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const location = app.pickup_locations as any
  const results = (app.test_results as any[]).map(r => ({
    test_name: r.test_types?.name,
    result_value: r.result_value,
    unit: r.unit,
    reference_range: r.reference_range,
    interpretation: r.interpretation,
    notes: r.notes,
    reported_at: r.updated_at,
  }))

  return new Response(JSON.stringify({
    tracking_number: app.tracking_number,
    patient: {
      full_name: app.full_name,
      date_of_birth: app.date_of_birth,
      gender: app.gender,
    },
    pickup_location: location ? `${location.name}, ${location.city}` : null,
    completed_at: app.updated_at,
    results,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
