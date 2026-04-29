import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    // Supabase DB webhook sends { type, table, record, old_record }
    const record = body.record
    if (!record || record.status !== 'complete') {
      return new Response('ok', { headers: corsHeaders })
    }

    const applicationId = record.id

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch full result payload
    const { data: app } = await supabase
      .from('applications')
      .select(`
        tracking_number, full_name, date_of_birth, gender, updated_at,
        pickup_locations(name, city),
        test_results(result_value, unit, reference_range, interpretation, notes, updated_at, test_types(name))
      `)
      .eq('id', applicationId)
      .single()

    if (!app) return new Response('ok', { headers: corsHeaders })

    const location = app.pickup_locations as any
    const payload = {
      event: 'result.complete',
      tracking_number: app.tracking_number,
      patient: { full_name: app.full_name, date_of_birth: app.date_of_birth, gender: app.gender },
      pickup_location: location ? `${location.name}, ${location.city}` : null,
      completed_at: app.updated_at,
      results: (app.test_results as any[]).map(r => ({
        test_name: r.test_types?.name,
        result_value: r.result_value,
        unit: r.unit,
        reference_range: r.reference_range,
        interpretation: r.interpretation,
        notes: r.notes,
      })),
    }

    const payloadStr = JSON.stringify(payload)

    // Fetch all active endpoints
    const { data: endpoints } = await supabase
      .from('webhook_endpoints')
      .select('id, url, secret')
      .eq('is_active', true)

    if (!endpoints?.length) return new Response('ok', { headers: corsHeaders })

    await Promise.all(endpoints.map(async (ep) => {
      // Insert delivery row
      const { data: delivery } = await supabase
        .from('webhook_deliveries')
        .insert({ webhook_endpoint_id: ep.id, application_id: applicationId, payload, status: 'pending', attempt_count: 0 })
        .select('id')
        .single()

      if (!delivery) return

      const signature = await hmacSign(payloadStr, ep.secret)

      try {
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Oscar-Signature': `sha256=${signature}`,
            'X-Oscar-Event': 'result.complete',
            'X-Delivery-Id': delivery.id,
          },
          body: payloadStr,
          signal: AbortSignal.timeout(10000),
        })

        await supabase.from('webhook_deliveries').update({
          status: res.ok ? 'success' : 'failed',
          http_status_code: res.status,
          attempt_count: 1,
          next_retry_at: res.ok ? null : new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }).eq('id', delivery.id)

      } catch {
        await supabase.from('webhook_deliveries').update({
          status: 'failed',
          attempt_count: 1,
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }).eq('id', delivery.id)
      }
    }))

    return new Response('ok', { headers: corsHeaders })

  } catch (err) {
    console.error('webhook-dispatch error:', err)
    return new Response('error', { status: 500, headers: corsHeaders })
  }
})
