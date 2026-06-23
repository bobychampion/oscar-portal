import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { order_number, date_of_birth } = await req.json()

    if (!order_number || !date_of_birth) {
      return new Response(JSON.stringify({ error: 'order_number and date_of_birth are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: order } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, created_at,
        patients(full_name, date_of_birth, gender, phone, email),
        order_results(
          result_mode, result_data, file_url, status, updated_at,
          test_types(name, test_categories(name, report_layout, color))
        )
      `)
      .eq('order_number', order_number.trim().toUpperCase())
      .maybeSingle()

    if (!order) {
      return new Response(JSON.stringify({ error: 'No matching record found. Check your order number and date of birth.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const patient = order.patients as any
    if (patient?.date_of_birth !== date_of_birth) {
      return new Response(JSON.stringify({ error: 'No matching record found. Check your order number and date of birth.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (order.status !== 'complete') {
      return new Response(JSON.stringify({
        status: order.status,
        order_number: order.order_number,
        message: 'Your results are not yet available. Please check back later.',
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Drafts stay internal — only surface results staff have submitted or verified.
    const visibleResults = (order.order_results as any[]).filter(r => r.status === 'submitted' || r.status === 'verified')

    const results = await Promise.all(visibleResults.map(async r => {
      let fileUrl: string | null = null
      if (r.file_url) {
        const { data: signed } = await supabase.storage.from('lab-results').createSignedUrl(r.file_url, 60 * 60)
        fileUrl = signed?.signedUrl ?? null
      }
      const category = r.test_types?.test_categories
      return {
        test_name: r.test_types?.name ?? 'Unknown',
        category_name: category?.name ?? 'Other',
        report_layout: category?.report_layout ?? 'structured_table',
        color: category?.color ?? '#374151',
        result_mode: r.result_mode,
        result_data: r.result_data,
        file_url: fileUrl,
        status: r.status,
        reported_at: r.updated_at,
      }
    }))

    return new Response(JSON.stringify({
      status: 'complete',
      order_number: order.order_number,
      patient_name: patient.full_name,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      collected_at: order.created_at,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('order-results-lookup error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
