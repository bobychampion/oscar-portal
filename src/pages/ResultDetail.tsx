import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import PublicLayout from '../components/public/PublicLayout'
import ReportForm from '../components/results/ReportForm'
import Button from '../components/ui/Button'
import { groupResultsByLayout, layoutMeta, LAYOUT_ORDER, type DynamicResult, type ReportLayout } from '../lib/reportForms'

// The legacy public Applications flow (test_results table, free-text category)
// is out of scope for the dynamic test engine. This maps its flat shape onto
// the same ReportForm contract the Orders flow uses, purely for rendering —
// no schema or edge-function change.
const LEGACY_CATEGORY_LAYOUT: Record<string, ReportLayout> = {
  Biochemistry: 'structured_table', Endocrinology: 'structured_table',
  Haematology: 'structured_table', Reproductive: 'compact',
  Serology: 'compact', Parasitology: 'compact',
  Microbiology: 'matrix', Virology: 'compact',
}
const LEGACY_CATEGORY_COLOR: Record<ReportLayout, string> = {
  structured_table: '#1a2e4a', compact: '#7b1d1d', matrix: '#14532d', narrative: '#9333ea', upload_viewer: '#0ea5e9',
}

function adaptLegacyResults(results: any[]): DynamicResult[] {
  return results.map(r => {
    const layout = LEGACY_CATEGORY_LAYOUT[r.category] ?? 'structured_table'
    return {
      test_name: r.test_name,
      category_name: r.category ?? 'Other',
      report_layout: layout,
      color: LEGACY_CATEGORY_COLOR[layout],
      result_mode: 'numeric',
      result_data: { parameters: [{ parameter_id: null, label: r.test_name, value: r.result_value, unit: r.unit, reference_range: r.reference_range, interpretation: r.interpretation }] },
      file_url: null,
      status: 'submitted',
      reported_at: r.reported_at,
    }
  })
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

  const grouped = groupResultsByLayout(adaptLegacyResults(data.results ?? []))
  const activeLayouts = LAYOUT_ORDER.filter(l => grouped[l]?.length)

  const patient = {
    name: data.patient_name,
    tracking_number: tracking_number ?? '',
    date_of_birth: data.date_of_birth,
    gender: data.gender,
    pickup_location: data.pickup_location,
    collected_at: data.collected_at,
  }

  function printForm(layout: ReportLayout) {
    const title = layoutMeta(layout, grouped[layout] ?? []).title
    const section = document.getElementById(`report-${layout}`)
    if (!section) return
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Oscar Diagnostics – ${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #fff; color: #111; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
      <link rel="stylesheet" href="${document.querySelector('link[rel=stylesheet]')?.getAttribute('href') ?? ''}">
      </head><body>
      ${section.outerHTML}
      <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page header */}
        <div className="text-center mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">Diagnostic Results</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">{data.patient_name}</h1>
          <p className="font-mono text-brand-2 text-sm font-semibold mt-0.5">{tracking_number}</p>
          {activeLayouts.length > 1 && (
            <p className="text-gray-400 text-xs mt-2">
              {activeLayouts.length} report forms below — each can be printed separately
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
          These results are for your reference. Please consult a licensed healthcare professional for medical advice and diagnosis.
        </div>

        {/* One card per report layout */}
        {activeLayouts.length > 0 ? (
          activeLayouts.map(layout => (
            <div key={layout} id={`report-${layout}`}>
              <ReportForm
                layout={layout}
                results={grouped[layout]!}
                patient={patient}
                onPrint={() => printForm(layout)}
              />
            </div>
          ))
        ) : (
          <div className="bg-white/85 border border-black/8 rounded-2xl p-8 text-center">
            <p className="text-gray-500 text-sm font-medium">Results are being processed</p>
            <p className="text-gray-400 text-xs mt-1">Your test results haven't been entered yet. Please check back soon.</p>
          </div>
        )}

        <div className="flex justify-center pb-6">
          <Button variant="ghost" onClick={() => navigate('/results')}>
            Check another result
          </Button>
        </div>
      </div>
    </PublicLayout>
  )
}
