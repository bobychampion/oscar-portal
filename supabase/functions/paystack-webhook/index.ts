import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

async function verifyPaystackSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === signature
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature') ?? ''
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''

  const valid = await verifyPaystackSignature(rawBody, signature, secret)
  if (!valid) return new Response('Unauthorized', { status: 401 })

  const event = JSON.parse(rawBody)
  if (event.event !== 'charge.success') return new Response('ok')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const reference = event.data?.reference

  // Find the payment record by paystack_reference
  const { data: payment } = await admin.from('payments').select('id,invoice_id').eq('paystack_reference', reference).maybeSingle()
  if (!payment) return new Response('ok')

  // Update payment status
  await admin.from('payments').update({ paystack_status: 'success' }).eq('id', payment.id)

  // Update invoice to paid
  await admin.from('invoices').update({ payment_status: 'paid' }).eq('id', payment.invoice_id)

  // Update linked order to paid
  const { data: invoice } = await admin.from('invoices').select('order_id').eq('id', payment.invoice_id).single()
  if (invoice?.order_id) {
    await admin.from('orders').update({ status: 'paid' }).eq('id', invoice.order_id).eq('status', 'pending_payment')
  }

  return new Response('ok')
})
