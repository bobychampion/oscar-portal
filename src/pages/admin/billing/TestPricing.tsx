import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'

const PRICE_TYPES = ['walk_in','referral','campaign','corporate','hmo'] as const

export default function TestPricing() {
  const [testTypes, setTestTypes] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: tt }, { data: tp }] = await Promise.all([
        supabase.from('test_types').select('id,name,category_id,test_categories(name)').eq('is_active', true),
        supabase.from('test_prices').select('test_type_id,price_type,amount').eq('is_active', true),
      ])
      setTestTypes((tt ?? []).map((t: any) => ({ ...t, category: t.test_categories?.name ?? 'Uncategorized' })).sort((a: any, b: any) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)))
      const map: Record<string, Record<string, string>> = {}
      for (const p of (tp ?? [])) {
        if (!map[p.test_type_id]) map[p.test_type_id] = {}
        map[p.test_type_id][p.price_type] = String(p.amount)
      }
      setPrices(map)
      setLoading(false)
    }
    load()
  }, [])

  function setPrice(testId: string, type: string, val: string) {
    setPrices(prev => ({ ...prev, [testId]: { ...(prev[testId] ?? {}), [type]: val } }))
  }

  async function save() {
    setSaving(true)
    const upserts: any[] = []
    for (const [testId, typeMap] of Object.entries(prices)) {
      for (const [priceType, amount] of Object.entries(typeMap)) {
        if (amount !== '' && !isNaN(Number(amount))) {
          upserts.push({ test_type_id: testId, price_type: priceType, amount: Number(amount), is_active: true })
        }
      }
    }
    await supabase.from('test_prices').upsert(upserts, { onConflict: 'test_type_id,price_type' })
    setSaving(false)
    setMsg('Prices saved.')
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Test Pricing</h1>
          <p className="text-gray-500 text-sm mt-0.5">Set prices per test type and patient category (₦)</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-green-600">{msg}</span>}
          <Button loading={saving} onClick={save}><Save size={16} /> Save All</Button>
        </div>
      </div>

      <div className="bg-white/85 border border-black/8 rounded-2xl overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/8 bg-gray-50/60">
              <th className="text-left px-5 py-3 font-semibold text-gray-600 min-w-48">Test</th>
              {PRICE_TYPES.map(pt => (
                <th key={pt} className="text-center px-4 py-3 font-semibold text-gray-600 capitalize min-w-28">{pt.replace('_',' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {testTypes.map((t, i) => (
              <tr key={t.id} className={`border-b border-black/5 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                <td className="px-5 py-2.5">
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.category}</p>
                </td>
                {PRICE_TYPES.map(pt => (
                  <td key={pt} className="px-4 py-2.5">
                    <input
                      type="number"
                      min="0"
                      value={prices[t.id]?.[pt] ?? ''}
                      onChange={e => setPrice(t.id, pt, e.target.value)}
                      placeholder="—"
                      className="w-full text-center text-sm rounded-lg border border-black/10 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-2/40"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
