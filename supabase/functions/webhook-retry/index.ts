import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  // Validate cron secret
  const auth = req.headers.get('Authorization') ?? ''
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: deliveries } = await supabase
    .from('webhook_deliveries')
    .select('id, application_id, payload, attempt_count, webhook_endpoints(id, url, secret, is_active)')
    .eq('status', 'failed')
    .lt('attempt_count', 5)
    .lte('next_retry_at', new Date().toISOString())
    .limit(20)

  if (!deliveries?.length) {
    return new Response(JSON.stringify({ retried: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  let retried = 0

  await Promise.all(deliveries.map(async (d) => {
    const ep = d.webhook_endpoints as any
    if (!ep?.is_active) {
      await supabase.from('webhook_deliveries').update({ status: 'permanently_failed' }).eq('id', d.id)
      return
    }

    const payloadStr = JSON.stringify(d.payload)
    const signature = await hmacSign(payloadStr, ep.secret)
    const nextAttempt = d.attempt_count + 1

    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Oscar-Signature': `sha256=${signature}`,
          'X-Oscar-Event': 'result.complete',
          'X-Delivery-Id': d.id,
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok) {
        await supabase.from('webhook_deliveries').update({ status: 'success', http_status_code: res.status, attempt_count: nextAttempt }).eq('id', d.id)
      } else {
        const backoff = nextAttempt >= 5 ? null : new Date(Date.now() + nextAttempt * 10 * 60 * 1000).toISOString()
        await supabase.from('webhook_deliveries').update({
          status: nextAttempt >= 5 ? 'permanently_failed' : 'failed',
          http_status_code: res.status,
          attempt_count: nextAttempt,
          next_retry_at: backoff,
        }).eq('id', d.id)
      }
    } catch {
      const backoff = nextAttempt >= 5 ? null : new Date(Date.now() + nextAttempt * 10 * 60 * 1000).toISOString()
      await supabase.from('webhook_deliveries').update({
        status: nextAttempt >= 5 ? 'permanently_failed' : 'failed',
        attempt_count: nextAttempt,
        next_retry_at: backoff,
      }).eq('id', d.id)
    }

    retried++
  }))

  return new Response(JSON.stringify({ retried }), { headers: { 'Content-Type': 'application/json' } })
})
