import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { Download } from 'lucide-react'
import PublicLayout from '../components/public/PublicLayout'
import ResultCard from '../components/results/ResultCard'
import Button from '../components/ui/Button'

export default function ResultDetail() {
  const { tracking_number } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state?.data

  // Guard: if no state, patient must re-verify
  useEffect(() => {
    if (!data) navigate('/results', { replace: true })
  }, [data, navigate])

  if (!data) return null

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand to-brand-2 rounded-2xl p-6 mb-6 text-white">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Diagnostic Report</p>
          <h1 className="text-xl font-bold font-heading mb-1">{data.patient_name}</h1>
          <p className="font-mono text-white/80 text-sm tracking-widest">{tracking_number}</p>
          {data.pickup_location && (
            <p className="text-white/70 text-sm mt-2">Sample collected at {data.pickup_location}</p>
          )}
        </div>

        {/* Results */}
        <div className="space-y-3 mb-6">
          {data.results?.map((result: any, i: number) => (
            <ResultCard key={i} {...result} />
          ))}
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 mb-6">
          These results are for your reference. Please consult a licensed healthcare professional for medical advice and diagnosis.
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.print()}>
            <Download size={16} /> Download / Print
          </Button>
          <Button variant="ghost" onClick={() => navigate('/results')}>
            Check another result
          </Button>
        </div>
      </div>
    </PublicLayout>
  )
}
