import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Verify caller is admin or front_desk
  const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'front_desk'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { order_id } = await req.json()
  if (!order_id) return new Response(JSON.stringify({ error: 'order_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const { data: order } = await admin
    .from('orders')
    .select(`
      order_number, status,
      patients(full_name, email, date_of_birth),
      order_results(result_value, unit, reference_range, interpretation, test_types(name, category))
    `)
    .eq('id', order_id)
    .single()

  if (!order) return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const patient = order.patients as any
  if (!patient?.email) return new Response(JSON.stringify({ error: 'Patient has no email address on file' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const resultsUrl = `${Deno.env.get('APP_URL') ?? 'https://app.oscardiagnostics.com'}/order-results?n=${encodeURIComponent(order.order_number)}`

  const resultsRows = (order.order_results as any[]).map(r => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#111;">${r.test_types?.name ?? ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;">${r.result_value}${r.unit ? ' ' + r.unit : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:12px;">${r.reference_range ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;
          background:${r.interpretation === 'normal' ? '#dcfce7' : r.interpretation === 'critical' ? '#fee2e2' : '#fef9c3'};
          color:${r.interpretation === 'normal' ? '#166534' : r.interpretation === 'critical' ? '#991b1b' : '#713f12'};">
          ${r.interpretation}
        </span>
      </td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family:'Manrope',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111;">
      <h1 style="font-size:22px;font-family:'Sora',sans-serif;margin:0 0 8px;">Your Results Are Ready</h1>
      <p style="color:#4b5563;margin:0 0 24px;">Hi ${patient.full_name}, your diagnostic test results from Oscar Diagnostics are now available.</p>

      <div style="background:linear-gradient(135deg,#0ca694,#0ea5e9);border-radius:16px;padding:24px;text-align:center;margin-bottom:28px;">
        <p style="color:rgba(255,255,255,0.85);font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.08em;">Order Reference</p>
        <p style="color:#fff;font-size:22px;font-family:'Sora',sans-serif;font-weight:700;letter-spacing:2px;margin:0 0 16px;">${order.order_number}</p>
        <a href="${resultsUrl}" style="display:inline-block;background:#fff;color:#0ca694;font-weight:700;font-size:14px;padding:10px 28px;border-radius:999px;text-decoration:none;">View Full Results →</a>
      </div>

      ${resultsRows ? `
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Test</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Result</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Reference</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Flag</th>
          </tr>
        </thead>
        <tbody>${resultsRows}</tbody>
      </table>` : ''}

      <p style="color:#6b7280;font-size:13px;border-top:1px solid #f0f0f0;padding-top:16px;">
        To view your full formatted report, click the button above or visit:<br/>
        <a href="${resultsUrl}" style="color:#0ea5e9;">${resultsUrl}</a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:8px;">
        These results are for your reference. Please consult a healthcare professional for medical advice.<br/>
        Oscar Diagnostics · Starting in Nigeria, scaling across Africa.
      </p>
    </div>
  `

  const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
  const { error: emailErr } = await resend.emails.send({
    from: Deno.env.get('EMAIL_FROM') ?? 'noreply@oscardiagnostics.com',
    to: patient.email,
    subject: `Your Oscar Diagnostics results are ready — ${order.order_number}`,
    html,
  })

  if (emailErr) return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  return new Response(JSON.stringify({ sent: true, to: patient.email }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
