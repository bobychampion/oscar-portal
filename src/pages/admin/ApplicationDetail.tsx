import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

interface ResultRow {
  test_type_id: string
  test_name: string
  result_value: string
  unit: string
  reference_range: string
  interpretation: 'normal' | 'abnormal' | 'critical' | ''
  notes: string
}

const INTERP_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'abnormal', label: 'Abnormal' },
  { value: 'critical', label: 'Critical' },
]

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<any>(null)
  const [results, setResults] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('applications')
        .select(`
          *, pickup_locations(name, city, state),
          application_tests(test_types(id, name)),
          test_results(test_type_id, result_value, unit, reference_range, interpretation, notes)
        `)
        .eq('id', id!)
        .single()

      if (!data) { navigate('/admin/applications'); return }
      setApp(data)

      const existingResults = data.test_results ?? []
      const rows: ResultRow[] = (data.application_tests ?? []).map((at: any) => {
        const existing = existingResults.find((r: any) => r.test_type_id === at.test_types?.id)
        return {
          test_type_id: at.test_types?.id,
          test_name: at.test_types?.name,
          result_value: existing?.result_value ?? '',
          unit: existing?.unit ?? '',
          reference_range: existing?.reference_range ?? '',
          interpretation: (existing?.interpretation ?? '') as any,
          notes: existing?.notes ?? '',
        }
      })
      setResults(rows)
      setLoading(false)
    }
    load()
  }, [id, navigate])

  function updateRow(idx: number, field: keyof ResultRow, value: string) {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function saveResults() {
    setSaving(true)
    setSaveMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    const upserts = results
      .filter(r => r.result_value && r.interpretation)
      .map(r => ({
        application_id: id,
        test_type_id: r.test_type_id,
        result_value: r.result_value,
        unit: r.unit || null,
        reference_range: r.reference_range || null,
        interpretation: r.interpretation,
        notes: r.notes || null,
        entered_by: user?.id ?? null,
      }))

    const { error } = await supabase
      .from('test_results')
      .upsert(upserts, { onConflict: 'application_id,test_type_id' })

    setSaving(false)
    if (error) {
      setSaveMsg('Error saving results. Please try again.')
    } else {
      setSaveMsg('Results saved successfully.')
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  async function markComplete() {
    setCompleting(true)
    // Save any pending results first before marking complete
    const { data: { user } } = await supabase.auth.getUser()
    const upserts = results
      .filter(r => r.result_value && r.interpretation)
      .map(r => ({
        application_id: id,
        test_type_id: r.test_type_id,
        result_value: r.result_value,
        unit: r.unit || null,
        reference_range: r.reference_range || null,
        interpretation: r.interpretation,
        notes: r.notes || null,
        entered_by: user?.id ?? null,
      }))
    if (upserts.length > 0) {
      await supabase.from('test_results').upsert(upserts, { onConflict: 'application_id,test_type_id' })
    }
    await supabase.from('applications').update({ status: 'complete' }).eq('id', id!)
    setApp((prev: any) => ({ ...prev, status: 'complete' }))
    setConfirmOpen(false)
    setCompleting(false)
  }

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>

  return (
    <AdminLayout>
      <button
        onClick={() => navigate('/admin/applications')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Applications
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">{app.full_name}</h1>
          <p className="font-mono text-brand-2 text-sm font-semibold mt-0.5">{app.tracking_number}</p>
        </div>
        <Badge variant={app.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Patient Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5 text-sm space-y-3">
            <h3 className="font-semibold text-gray-900 font-heading">Patient Details</h3>
            {[
              ['Email', app.email],
              ['Phone', app.phone],
              ['Date of Birth', app.date_of_birth],
              ['Gender', app.gender],
              ['Location', `${app.city}, ${app.state}`],
              ['Pickup', app.pickup_locations ? `${app.pickup_locations.name}` : '—'],
              ['DNPL', app.wants_dnpl ? 'Yes' : 'No'],
              ['Applied', new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-gray-400 font-medium">{label}</span>
                <span className="text-gray-900 font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Result Entry */}
        <div className="lg:col-span-3">
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 font-heading mb-4">Test Results</h3>

            {results.length === 0 ? (
              <p className="text-gray-400 text-sm">No tests selected for this application.</p>
            ) : (
              <div className="space-y-5">
                {results.map((row, idx) => (
                  <div key={row.test_type_id} className="border border-black/8 rounded-xl p-4">
                    <p className="font-semibold text-gray-900 text-sm mb-3">{row.test_name}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Result Value *"
                        value={row.result_value}
                        onChange={e => updateRow(idx, 'result_value', e.target.value)}
                        placeholder="e.g. 13.5"
                      />
                      <Input
                        label="Unit"
                        value={row.unit}
                        onChange={e => updateRow(idx, 'unit', e.target.value)}
                        placeholder="e.g. g/dL"
                      />
                      <Input
                        label="Reference Range"
                        value={row.reference_range}
                        onChange={e => updateRow(idx, 'reference_range', e.target.value)}
                        placeholder="e.g. 12.0 – 16.0"
                      />
                      <Select
                        label="Interpretation *"
                        value={row.interpretation}
                        onChange={e => updateRow(idx, 'interpretation', e.target.value)}
                        options={INTERP_OPTIONS}
                        placeholder="Select..."
                      />
                    </div>
                    <div className="mt-3">
                      <Input
                        label="Notes"
                        value={row.notes}
                        onChange={e => updateRow(idx, 'notes', e.target.value)}
                        placeholder="Optional clinical notes..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {saveMsg && (
              <p className={`text-sm mt-4 ${saveMsg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</p>
            )}

            <div className="flex gap-3 mt-5 flex-wrap">
              <Button variant="outline" loading={saving} onClick={saveResults}>
                <Save size={16} /> Save Results
              </Button>
              {app.status !== 'complete' && (
                <Button onClick={() => setConfirmOpen(true)} disabled={results.some(r => !r.result_value || !r.interpretation)}>
                  <CheckCircle size={16} /> Mark as Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Mark as Complete?">
        <p className="text-gray-500 text-sm mb-5">
          This will notify all registered webhook partners immediately. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} className="flex-1">Cancel</Button>
          <Button loading={completing} onClick={markComplete} className="flex-1">Confirm</Button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
