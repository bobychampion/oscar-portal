import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const [{ data: types, error }, { data: prices }] = await Promise.all([
    supabase
      .from('test_types')
      .select('id, name, category, description')
      .eq('is_active', true)
      .order('category')
      .order('name'),
    supabase
      .from('test_prices')
      .select('test_type_id, amount')
      .eq('price_type', 'walk_in')
      .eq('is_active', true),
  ])

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const priceMap = Object.fromEntries((prices ?? []).map(p => [p.test_type_id, p.amount]))
  const result = (types ?? []).map(t => ({ ...t, walk_in_price: priceMap[t.id] ?? null }))

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
