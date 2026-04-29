import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { tracking_number, date_of_birth } = await req.json()

    if (!tracking_number || !date_of_birth) {
      return new Response(JSON.stringify({ error: 'tracking_number and date_of_birth are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: app, error } = await supabase
      .from('applications')
      .select(`
        id, tracking_number, full_name, status, created_at,
        pickup_locations(name, city, state),
        test_results(
          result_value, unit, reference_range, interpretation, notes, updated_at,
          test_types(name)
        )
      `)
      .eq('tracking_number', tracking_number.trim().toUpperCase())
      .eq('date_of_birth', date_of_birth)
      .single()

    if (error || !app) {
      return new Response(JSON.stringify({ error: 'No matching record found. Check your tracking number and date of birth.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (app.status !== 'complete') {
      return new Response(JSON.stringify({
        status: app.status,
        tracking_number: app.tracking_number,
        message: 'Your results are not yet available. Please check back later.'
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const location = app.pickup_locations as any
    const results = (app.test_results as any[]).map(r => ({
      test_name: r.test_types?.name ?? 'Unknown',
      result_value: r.result_value,
      unit: r.unit,
      reference_range: r.reference_range,
      interpretation: r.interpretation,
      notes: r.notes,
      reported_at: r.updated_at,
    }))

    return new Response(JSON.stringify({
      status: 'complete',
      tracking_number: app.tracking_number,
      patient_name: app.full_name,
      pickup_location: location ? `${location.name}, ${location.city}` : null,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('results-lookup error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
