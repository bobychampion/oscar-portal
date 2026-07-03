import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { order_number, phone } = await req.json()

    if (!order_number || !phone) {
      return new Response(JSON.stringify({ error: 'order_number and phone are required' }), {
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
          entered_by, verified_by,
          test_types!test_type_id(name, specimen_type, test_categories!category_id(name, color))
        )
      `)
      .eq('order_number', order_number.trim().toUpperCase())
      .maybeSingle()

    if (!order) {
      return new Response(JSON.stringify({ error: 'No matching record found. Check your order number and phone number.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const patient = order.patients as any
    if (patient?.phone !== phone.trim()) {
      return new Response(JSON.stringify({ error: 'No matching record found. Check your order number and phone number.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

    // Collect unique staff IDs for signature lookup
    const staffIds = [...new Set([
      ...visibleResults.map(r => r.entered_by).filter(Boolean),
      ...visibleResults.map(r => r.verified_by).filter(Boolean),
    ])]

    let profileMap: Record<string, { full_name: string; signature_url: string | null }> = {}
    if (staffIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, signature_url')
        .in('id', staffIds)
      for (const p of (profiles ?? [])) {
        profileMap[p.id] = { full_name: p.full_name, signature_url: (p as any).signature_url ?? null }
      }
    }

    const results = await Promise.all(visibleResults.map(async r => {
      let fileUrl: string | null = null
      if (r.file_url) {
        const { data: signed } = await supabase.storage.from('lab-results').createSignedUrl(r.file_url, 60 * 60)
        fileUrl = signed?.signedUrl ?? null
      }
      const tt = Array.isArray(r.test_types) ? r.test_types[0] : r.test_types
      const category = Array.isArray(tt?.test_categories) ? tt?.test_categories[0] : tt?.test_categories
      return {
        test_name: tt?.name ?? 'Unknown',
        category_name: category?.name ?? 'Other',
        specimen_type: tt?.specimen_type ?? null,
        color: category?.color ?? '#374151',
        result_mode: r.result_mode,
        result_data: r.result_data,
        file_url: fileUrl,
        status: r.status,
        reported_at: r.updated_at,
      }
    }))

    // Pick the first reporter and reviewer for the report footer
    const firstReporterEntry = visibleResults.find(r => r.entered_by && profileMap[r.entered_by])
    const firstReviewerEntry = visibleResults.find(r => r.verified_by && profileMap[r.verified_by])

    const reportedBy = firstReporterEntry
      ? profileMap[firstReporterEntry.entered_by]
      : null

    let reviewedBySignatureUrl: string | null = null
    if (firstReviewerEntry && profileMap[firstReviewerEntry.verified_by]?.signature_url) {
      const { data: signed } = await supabase.storage
        .from('signatures')
        .createSignedUrl(profileMap[firstReviewerEntry.verified_by].signature_url!, 60 * 60)
      reviewedBySignatureUrl = signed?.signedUrl ?? null
    }

    let reportedBySignatureUrl: string | null = null
    if (reportedBy?.signature_url) {
      const { data: signed } = await supabase.storage
        .from('signatures')
        .createSignedUrl(reportedBy.signature_url, 60 * 60)
      reportedBySignatureUrl = signed?.signedUrl ?? null
    }

    return new Response(JSON.stringify({
      status: 'complete',
      order_number: order.order_number,
      patient_name: patient.full_name,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      collected_at: order.created_at,
      results,
      reported_by: reportedBy ? { name: reportedBy.full_name, signature_url: reportedBySignatureUrl } : null,
      reviewed_by: firstReviewerEntry ? { name: profileMap[firstReviewerEntry.verified_by]?.full_name ?? null, signature_url: reviewedBySignatureUrl } : null,
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
