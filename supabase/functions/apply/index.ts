import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { full_name, email, phone, date_of_birth, gender, city, state, pickup_location_id, test_type_ids, wants_dnpl } = body

    // Basic validation
    if (!full_name || !email || !phone || !date_of_birth || !gender || !city || !state || !pickup_location_id || !test_type_ids?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Generate unique tracking number with retry on collision
    let tracking_number = ''
    let inserted = false

    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const year = new Date().getFullYear()
      const rand = Math.floor(1000 + Math.random() * 9000)
      tracking_number = `OSC-${year}-${rand}`

      const { data, error } = await supabase
        .from('applications')
        .insert({ tracking_number, full_name, email, phone, date_of_birth, gender, city, state, pickup_location_id, wants_dnpl: wants_dnpl ?? false })
        .select('id')
        .single()

      if (!error && data) {
        // Insert test type junction rows
        const junctions = test_type_ids.map((id: string) => ({ application_id: data.id, test_type_id: id }))
        await supabase.from('application_tests').insert(junctions)

        // Auto-create or find a patient record and link it to the application
        const { data: existingPatient } = await supabase
          .from('patients')
          .select('id')
          .eq('phone', phone)
          .maybeSingle()

        let patientId = existingPatient?.id ?? null
        if (!patientId) {
          const { data: newPatient } = await supabase
            .from('patients')
            .insert({ full_name, email, phone, date_of_birth, gender, city, state })
            .select('id')
            .single()
          patientId = newPatient?.id ?? null
        }
        if (patientId) {
          await supabase.from('applications').update({ patient_id: patientId }).eq('id', data.id)
        }

        // Send confirmation email
        const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
        await resend.emails.send({
          from: Deno.env.get('EMAIL_FROM') ?? 'noreply@oscardiagnostics.com',
          to: email,
          subject: `Your Oscar Labs test application is confirmed — ${tracking_number}`,
          html: `
            <div style="font-family: 'Manrope', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
              <h1 style="font-size: 24px; font-family: 'Sora', sans-serif; color: #000; margin: 0 0 8px;">Application Confirmed</h1>
              <p style="color: #4b5563; margin: 0 0 24px;">Hi ${full_name}, your diagnostic test application has been received.</p>
              <div style="background: linear-gradient(135deg, #0ca694, #0ea5e9); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: rgba(255,255,255,0.85); font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.08em;">Your Tracking Number</p>
                <p style="color: #fff; font-size: 28px; font-family: 'Sora', sans-serif; font-weight: 700; letter-spacing: 2px; margin: 0;">${tracking_number}</p>
              </div>
              <p style="color: #4b5563; margin: 0 0 16px;">Keep this number safe. When your results are ready, visit our portal and enter your tracking number along with your date of birth to view them.</p>
              <p style="color: #4b5563; font-size: 13px; margin: 0;">Oscar Labs • Starting in Nigeria, scaling across Africa.</p>
            </div>
          `
        }).catch(() => {/* Non-blocking — don't fail the request if email fails */})

        // Mark confirmation sent
        await supabase.from('applications').update({ confirmation_sent: true }).eq('id', data.id)

        inserted = true
        return new Response(JSON.stringify({ tracking_number, id: data.id }), {
          status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Only retry on unique constraint violation (code 23505)
      if ((error as any)?.code !== '23505') {
        throw error
      }
    }

    throw new Error('Failed to generate unique tracking number after 5 attempts')

  } catch (err) {
    console.error('apply error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
