import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const { invoice_id } = await req.json()
  if (!invoice_id) return new Response(JSON.stringify({ error: 'invoice_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: invoice } = await admin.from('invoices').select('*').eq('id', invoice_id).single()
  if (!invoice) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  // Generate a unique reference
  const reference = `OSC-PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  // Initialize Paystack transaction
  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference,
      amount: Math.round(invoice.total * 100), // Paystack uses kobo
      currency: 'NGN',
      metadata: { invoice_id, invoice_number: invoice.invoice_number, patient_name: invoice.patient_name },
    }),
  })

  const paystackData = await paystackRes.json()
  if (!paystackData.status) {
    return new Response(JSON.stringify({ error: paystackData.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Record the pending payment
  await admin.from('payments').insert({
    invoice_id,
    amount: invoice.total,
    payment_method: 'paystack',
    paystack_reference: reference,
    paystack_status: 'pending',
  })

  return new Response(JSON.stringify({
    authorization_url: paystackData.data.authorization_url,
    reference,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
