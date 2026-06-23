import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Search, Check } from 'lucide-react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'

const ORDER_TYPE_OPTIONS = [
  { value: 'walk_in',      label: 'Walk-in' },
  { value: 'referral',     label: 'Doctor Referral' },
  { value: 'corporate',    label: 'Corporate' },
  { value: 'home_service', label: 'Home Service' },
]

const PRIORITY_OPTIONS = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent',  label: 'Urgent' },
  { value: 'stat',    label: 'STAT' },
]

export default function CreateOrder() {
  const navigate = useNavigate()
  const location = useLocation()
  const preselected = location.state as { patient_id?: string; patient_name?: string; preSelectedTestIds?: string[] } | null

  const hasPatient = !!preselected?.patient_id
  const hasTests = (preselected?.preSelectedTestIds?.length ?? 0) > 0
  const [step, setStep] = useState(hasPatient && hasTests ? 3 : hasPatient ? 2 : 1)
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(
    hasPatient ? { id: preselected!.patient_id, full_name: preselected!.patient_name } : null
  )
  const [testTypes, setTestTypes] = useState<any[]>([])
  const [allPrices, setAllPrices] = useState<Record<string, Record<string, number>>>({})
  const [selectedTests, setSelectedTests] = useState<string[]>(preselected?.preSelectedTestIds ?? [])
  const [orderType, setOrderType] = useState('walk_in')
  const [priority, setPriority] = useState('routine')
  const [notes, setNotes] = useState('')
  const [corporateClient, setCorporateClient] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('test_types').select('id,name,category_id,test_categories(name)').eq('is_active', true),
      supabase.from('test_prices').select('test_type_id,price_type,amount').eq('is_active', true),
    ]).then(([{ data: types }, { data: prices }]) => {
      setTestTypes((types ?? [])
        .map((t: any) => ({ ...t, category: t.test_categories?.name ?? 'Uncategorized' }))
        .sort((a: any, b: any) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)))
      const map: Record<string, Record<string, number>> = {}
      for (const p of (prices ?? [])) {
        if (!map[p.test_type_id]) map[p.test_type_id] = {}
        map[p.test_type_id][p.price_type] = Number(p.amount)
      }
      setAllPrices(map)
    })
  }, [])

  useEffect(() => {
    if (!patientSearch) { setPatients([]); return }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      const { data } = await supabase.from('patients').select('id,patient_id,full_name,phone')
        .or(`full_name.ilike.%${patientSearch}%,phone.ilike.%${patientSearch}%,patient_id.ilike.%${patientSearch}%`)
        .limit(10)
      setPatients(data ?? [])
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

  function toggleTest(id: string) {
    setSelectedTests(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const byCategory = testTypes.reduce((acc: Record<string, any[]>, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  const priceTypeForOrder = orderType === 'referral' ? 'referral' : orderType === 'corporate' ? 'corporate' : 'walk_in'

  function getPrice(testId: string, type: string): number | null {
    return allPrices[testId]?.[type] ?? null
  }

  async function handleSubmit() {
    if (!selectedPatient || selectedTests.length === 0) { setError('Select a patient and at least one test.'); return }
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()

    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      patient_id: selectedPatient.id,
      order_type: orderType,
      priority,
      notes: notes || null,
      corporate_client: corporateClient || null,
      created_by: user?.id,
    }).select('id,order_number').single()

    if (orderErr) { setError(orderErr.message); setSaving(false); return }

    await supabase.from('order_tests').insert(selectedTests.map(tid => ({ order_id: order.id, test_type_id: tid })))

    // Auto-create invoice based on test prices
    const priceType = orderType === 'referral' ? 'referral' : orderType === 'corporate' ? 'corporate' : 'walk_in'
    const { data: prices } = await supabase.from('test_prices')
      .select('test_type_id,amount')
      .in('test_type_id', selectedTests)
      .eq('price_type', priceType)
      .eq('is_active', true)

    const lineItems = selectedTests.map(tid => {
      const tt = testTypes.find(t => t.id === tid)
      const price = prices?.find(p => p.test_type_id === tid)
      return { test_id: tid, test_name: tt?.name ?? '', price_type: priceType, amount: price?.amount ?? 0 }
    })
    const subtotal = lineItems.reduce((s, l) => s + Number(l.amount), 0)

    await supabase.from('invoices').insert({
      order_id: order.id,
      patient_name: selectedPatient.full_name,
      line_items: lineItems,
      subtotal,
      total: subtotal,
      created_by: user?.id,
    })

    setSaving(false)
    navigate(`/admin/orders/${order.id}`)
  }

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/orders')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Tests
      </button>
      <h1 className="text-2xl font-bold text-gray-900 font-heading mb-6">New Test</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {['Select Patient','Select Tests','Test Details','Review'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step > i + 1 ? 'bg-brand text-white' : step === i + 1 ? 'bg-brand-2 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > i + 1 ? <Check size={13} /> : i + 1}
            </span>
            <span className={step === i + 1 ? 'text-gray-900 font-medium' : 'text-gray-400'}>{label}</span>
            {i < 3 && <span className="text-gray-300">›</span>}
          </div>
        ))}
      </div>

      <div className="max-w-2xl">
        {/* Step 1: Patient */}
        {step === 1 && (
          <div className="bg-white/85 border border-black/8 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 font-heading mb-4">Select Patient</h2>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="Search by name, phone, or patient ID…"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-brand-2/40" />
            </div>
            {searchLoading && <div className="flex justify-center py-4"><Spinner size={6} /></div>}
            {patients.map(p => (
              <div key={p.id} onClick={() => { setSelectedPatient(p); setPatients([]); setPatientSearch('') }}
                className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-brand/5 cursor-pointer border border-transparent hover:border-brand/20 transition-all mb-1">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{p.full_name}</p>
                  <p className="text-xs text-gray-400">{p.patient_id} · {p.phone}</p>
                </div>
              </div>
            ))}
            {selectedPatient && (
              <div className="bg-brand/5 border border-brand/20 rounded-xl px-4 py-3 mt-3">
                <p className="text-sm font-semibold text-brand">{selectedPatient.full_name}</p>
                <p className="text-xs text-gray-500">{selectedPatient.patient_id}</p>
              </div>
            )}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => navigate('/admin/patients/new')}>Register New Patient</Button>
              <Button disabled={!selectedPatient} onClick={() => setStep(2)}>Next →</Button>
            </div>
          </div>
        )}

        {/* Step 2: Tests */}
        {step === 2 && (
          <div className="bg-white/85 border border-black/8 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 font-heading mb-1">Select Tests</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedTests.length} selected</p>
            {Object.entries(byCategory).map(([cat, tests]) => (
              <div key={cat} className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{cat}</p>
                <div className="space-y-1">
                  {tests.map((t: any) => {
                    const price = getPrice(t.id, 'walk_in')
                    return (
                      <label key={t.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedTests.includes(t.id)} onChange={() => toggleTest(t.id)}
                          className="rounded border-gray-300 text-brand accent-brand" />
                        <div>
                          <p className="text-sm text-gray-800">{t.name}</p>
                          {price != null && (
                            <p className="text-xs text-brand-2 font-semibold">₦{price.toLocaleString()}</p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button disabled={selectedTests.length === 0} onClick={() => setStep(3)}>Next →</Button>
            </div>
          </div>
        )}

        {/* Step 3: Test Details */}
        {step === 3 && (
          <div className="bg-white/85 border border-black/8 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 font-heading mb-2">Test Details</h2>
            <Select label="Test Type" value={orderType} onChange={e => setOrderType(e.target.value)} options={ORDER_TYPE_OPTIONS} />
            <Select label="Priority" value={priority} onChange={e => setPriority(e.target.value)} options={PRIORITY_OPTIONS} />
            {orderType === 'corporate' && (
              <Input label="Corporate Client Name" value={corporateClient} onChange={e => setCorporateClient(e.target.value)} />
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Optional notes…"
                className="w-full text-sm rounded-xl border border-black/10 bg-white/85 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2/40 resize-none" />
            </div>
            <div className="flex justify-between mt-2">
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button onClick={() => setStep(4)}>Review →</Button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="bg-white/85 border border-black/8 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 font-heading mb-4">Review Test</h2>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between"><span className="text-gray-500">Patient</span><span className="font-semibold">{selectedPatient?.full_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Test Type</span><span className="capitalize">{orderType.replace('_', ' ')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className="capitalize">{priority}</span></div>
              <div className="flex flex-col gap-1.5">
                <span className="text-gray-500">Tests ({selectedTests.length})</span>
                {selectedTests.map(tid => {
                  const tt = testTypes.find(t => t.id === tid)
                  const price = getPrice(tid, priceTypeForOrder)
                  return (
                    <div key={tid} className="flex justify-between items-center ml-2">
                      <span className="text-gray-800">· {tt?.name}</span>
                      {price != null
                        ? <span className="text-brand-2 font-semibold text-xs">₦{price.toLocaleString()}</span>
                        : <span className="text-gray-400 text-xs">—</span>
                      }
                    </div>
                  )
                })}
                {(() => {
                  const total = selectedTests.reduce((s, tid) => s + (getPrice(tid, priceTypeForOrder) ?? 0), 0)
                  return total > 0 ? (
                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-black/8 font-semibold">
                      <span className="text-gray-700">Estimated Total</span>
                      <span className="text-brand-2">₦{total.toLocaleString()}</span>
                    </div>
                  ) : null
                })()}
              </div>
              {notes && <div className="flex flex-col gap-1"><span className="text-gray-500">Notes</span><span>{notes}</span></div>}
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>← Back</Button>
              <Button loading={saving} onClick={handleSubmit}>Create Test</Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
