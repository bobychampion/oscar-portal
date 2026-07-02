import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import PublicLayout from '../components/public/PublicLayout'
import ReportForm from '../components/results/ReportForm'
import Button from '../components/ui/Button'
import { type DynamicResult } from '../lib/reportForms'

// The legacy public Applications flow (test_results table, free-text category)
// is out of scope for the dynamic test engine. This maps its flat shape onto
// the same ReportForm contract the Orders flow uses, purely for rendering —
// no schema or edge-function change.
const LEGACY_CATEGORY_COLOR: Record<string, string> = {
  Biochemistry: '#1a2e4a', Endocrinology: '#1a2e4a', Haematology: '#1a2e4a',
  Reproductive: '#7b1d1d', Serology: '#7b1d1d', Parasitology: '#7b1d1d',
  Microbiology: '#14532d', Virology: '#7b1d1d',
}

function adaptLegacyResults(results: any[]): DynamicResult[] {
  return results.map(r => ({
    test_name: r.test_name,
    category_name: r.category ?? 'Other',
    specimen_type: r.specimen_type ?? null,
    color: LEGACY_CATEGORY_COLOR[r.category] ?? '#374151',
    result_mode: 'numeric',
    result_data: { parameters: [{ parameter_id: null, label: r.test_name, value: r.result_value, unit: r.unit, reference_range: r.reference_range, interpretation: r.interpretation }] },
    file_url: null,
    status: 'submitted',
    reported_at: r.reported_at,
  }))
}

export default function ResultDetail() {
  const { tracking_number } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state?.data

  useEffect(() => {
    if (!data) navigate('/results', { replace: true })
  }, [data, navigate])

  if (!data) return null

  const results = adaptLegacyResults(data.results ?? [])

  const patient = {
    name: data.patient_name,
    tracking_number: tracking_number ?? '',
    date_of_birth: data.date_of_birth,
    gender: data.gender,
    pickup_location: data.pickup_location,
    collected_at: data.collected_at,
  }

  function printForm() {
    window.print()
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto space-y-6 print:max-w-none print:space-y-0">
        {/* Page header */}
        <div className="text-center mb-2 print:hidden">
          <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">Diagnostic Results</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">{data.patient_name}</h1>
          <p className="font-mono text-brand-2 text-sm font-semibold mt-0.5">{tracking_number}</p>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 print:hidden">
          These results are for your reference. Please consult a licensed healthcare professional for medical advice and diagnosis.
        </div>

        {results.length > 0 ? (
          <div id="report-root">
            <ReportForm results={results} patient={patient} onPrint={printForm} />
          </div>
        ) : (
          <div className="bg-white/85 border border-black/8 rounded-2xl p-8 text-center print:hidden">
            <p className="text-gray-500 text-sm font-medium">Results are being processed</p>
            <p className="text-gray-400 text-xs mt-1">Your test results haven't been entered yet. Please check back soon.</p>
          </div>
        )}

        <div className="flex justify-center pb-6 print:hidden">
          <Button variant="ghost" onClick={() => navigate('/results')}>
            Check another result
          </Button>
        </div>
      </div>
    </PublicLayout>
  )
}
