import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PublicLayout from '../components/public/PublicLayout'
import ReportForm from '../components/results/ReportForm'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { groupResultsByForm, FORM_META, type FormType } from '../lib/reportForms'
import { supabase } from '../lib/supabase'

const FORM_ORDER: FormType[] = ['chemistry', 'haematology', 'microbiology', 'other']

export default function OrderResults() {
  const [searchParams] = useSearchParams()
  const prefilledNumber = searchParams.get('n') ?? ''

  const [orderNumber, setOrderNumber] = useState(prefilledNumber)
  const [dob, setDob] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  async function lookup() {
    if (!orderNumber.trim() || !dob) { setError('Both fields are required.'); return }
    setLoading(true)
    setError('')
    const { data: result, error: fnErr } = await supabase.functions.invoke('order-results-lookup', {
      body: { order_number: orderNumber.trim().toUpperCase(), date_of_birth: dob }
    })
    setLoading(false)
    if (fnErr || result?.error) { setError(result?.error ?? 'Something went wrong. Please try again.'); return }
    setData(result)
  }

  function printForm(formType: FormType) {
    const section = document.getElementById(`report-${formType}`)
    if (!section) return
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Oscar Diagnostics – ${FORM_META[formType].title}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:system-ui,sans-serif;background:#fff;color:#111;}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style>
      <link rel="stylesheet" href="${document.querySelector('link[rel=stylesheet]')?.getAttribute('href') ?? ''}">
      </head><body>${section.outerHTML}
      <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `)
    win.document.close()
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

    const grouped = groupResultsByForm(data.results ?? [])
    const activeForms = FORM_ORDER.filter(f => grouped[f]?.length)
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
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">Diagnostic Results</p>
            <h1 className="text-2xl font-bold text-gray-900 font-heading">{data.patient_name}</h1>
            <p className="font-mono text-brand-2 text-sm font-semibold mt-0.5">{data.order_number}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            These results are for your reference. Please consult a licensed healthcare professional for medical advice.
          </div>
          {activeForms.length > 0 ? (
            activeForms.map(formType => (
              <div key={formType} id={`report-${formType}`}>
                <ReportForm formType={formType} results={grouped[formType]!} patient={patient} onPrint={() => printForm(formType)} />
              </div>
            ))
          ) : (
            <div className="bg-white/85 border border-black/8 rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-sm">No results found for this order.</p>
            </div>
          )}
          <div className="flex justify-center pb-6">
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
          <p className="text-gray-500 text-sm">Enter your order number and date of birth to view your diagnostic results.</p>
        </div>
        <div className="bg-white/85 border border-black/8 rounded-2xl p-8 space-y-4">
          <Input
            label="Order Number"
            placeholder="e.g. OSC-ORD-2026-0001"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value.toUpperCase())}
          />
          <Input
            label="Date of Birth"
            type="date"
            value={dob}
            onChange={e => setDob(e.target.value)}
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
