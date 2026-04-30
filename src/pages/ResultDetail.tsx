import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import PublicLayout from '../components/public/PublicLayout'
import ReportForm from '../components/results/ReportForm'
import Button from '../components/ui/Button'
import { groupResultsByForm, FORM_META, type FormType } from '../lib/reportForms'

const FORM_ORDER: FormType[] = ['chemistry', 'haematology', 'microbiology', 'other']

export default function ResultDetail() {
  const { tracking_number } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state?.data

  useEffect(() => {
    if (!data) navigate('/results', { replace: true })
  }, [data, navigate])

  if (!data) return null

  const grouped = groupResultsByForm(data.results ?? [])
  const activeForms = FORM_ORDER.filter(f => grouped[f]?.length)

  const patient = {
    name: data.patient_name,
    tracking_number: tracking_number ?? '',
    date_of_birth: data.date_of_birth,
    gender: data.gender,
    pickup_location: data.pickup_location,
    collected_at: data.collected_at,
  }

  function printForm(formType: FormType) {
    const title = FORM_META[formType].title
    const section = document.getElementById(`report-${formType}`)
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
          {activeForms.length > 1 && (
            <p className="text-gray-400 text-xs mt-2">
              {activeForms.length} report forms below — each can be printed separately
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
          These results are for your reference. Please consult a licensed healthcare professional for medical advice and diagnosis.
        </div>

        {/* One card per form type */}
        {activeForms.length > 0 ? (
          activeForms.map(formType => (
            <div key={formType} id={`report-${formType}`}>
              <ReportForm
                formType={formType}
                results={grouped[formType]!}
                patient={patient}
                onPrint={() => printForm(formType)}
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
