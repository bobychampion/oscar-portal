import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PublicLayout from '../components/public/PublicLayout'
import ReportForm from '../components/results/ReportForm'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { supabase } from '../lib/supabase'

export default function OrderResults() {
  const [searchParams] = useSearchParams()
  const prefilledNumber = searchParams.get('n') ?? ''

  const [orderNumber, setOrderNumber] = useState(prefilledNumber)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  async function lookup() {
    if (!orderNumber.trim() || !phone.trim()) { setError('Both fields are required.'); return }
    setLoading(true)
    setError('')
    const { data: result, error: fnErr } = await supabase.functions.invoke('order-results-lookup', {
      body: { order_number: orderNumber.trim().toUpperCase(), phone: phone.trim() }
    })
    setLoading(false)
    if (fnErr || result?.error) { setError(result?.error ?? 'Something went wrong. Please try again.'); return }
    setData(result)
  }

  function printForm() {
    window.print()
  }

  if (data) {
    if (data.status !== 'complete') {
      return (
        <PublicLayout>
          <div className="max-w-md mx-auto text-center py-12">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
              <p className="text-amber-700 font-semibold mb-2">Results Not Ready Yet</p>
              <p className="text-amber-600 text-sm">{data.message}</p>
              <Button variant="ghost" className="mt-4" onClick={() => setData(null)}>← Try again</Button>
            </div>
          </div>
        </PublicLayout>
      )
    }

    const results = data.results ?? []
    const patient = {
      name: data.patient_name,
      tracking_number: data.order_number,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      pickup_location: undefined,
      collected_at: data.collected_at,
    }

    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto space-y-6 print:max-w-none print:space-y-0">
          <div className="text-center mb-2 print:hidden">
            <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">Diagnostic Results</p>
            <h1 className="text-2xl font-bold text-gray-900 font-heading">{data.patient_name}</h1>
            <p className="font-mono text-brand-2 text-sm font-semibold mt-0.5">{data.order_number}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 print:hidden">
            These results are for your reference. Please consult a licensed healthcare professional for medical advice.
          </div>
          {results.length > 0 ? (
            <div id="report-root">
              <ReportForm
                results={results}
                patient={patient}
                reportedBy={data.reported_by ?? null}
                reviewedBy={data.reviewed_by ?? null}
                onPrint={printForm}
              />
            </div>
          ) : (
            <div className="bg-white/85 border border-black/8 rounded-2xl p-8 text-center print:hidden">
              <p className="text-gray-500 text-sm">No results found for this order.</p>
            </div>
          )}
          <div className="flex justify-center pb-6 print:hidden">
            <Button variant="ghost" onClick={() => setData(null)}>← Check another result</Button>
          </div>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-brand mb-2">View Results</p>
          <h1 className="text-3xl font-bold text-gray-900 font-heading mb-3">Check Your Results</h1>
          <p className="text-gray-500 text-sm">Enter your order number and phone number to view your diagnostic results.</p>
        </div>
        <div className="bg-white/85 border border-black/8 rounded-2xl p-8 space-y-4">
          <Input
            label="Order Number"
            placeholder="e.g. OSC-ORD-2026-0001"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value.toUpperCase())}
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="e.g. 08012345678"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" loading={loading} onClick={lookup}>
            View Results
          </Button>
        </div>
      </div>
    </PublicLayout>
  )
}
