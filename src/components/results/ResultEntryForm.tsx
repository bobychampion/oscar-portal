import { Plus, Trash2, Upload } from 'lucide-react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Badge from '../ui/Badge'
import { supabase } from '../../lib/supabase'

export interface TestParameter {
  id: string
  test_type_id: string
  parameter_name: string
  unit: string | null
  reference_range: string | null
  male_min: number | null
  male_max: number | null
  female_min: number | null
  female_max: number | null
  age_min_years: number | null
  age_max_years: number | null
  critical_min: number | null
  critical_max: number | null
  display_order: number
  parameter_type: string
}

export interface ParameterResult {
  parameter_id: string | null
  label: string
  value: string
  unit?: string | null
  reference_range?: string | null
  interpretation: 'normal' | 'abnormal' | 'critical' | ''
}

export interface GridRow {
  organism: string
  drug: string
  result: 'S' | 'I' | 'R' | ''
  cutoff: string
}

export interface ResultEntryValue {
  result_mode: string
  result_data: {
    parameters?: ParameterResult[]
    value?: string
    notes?: string
    narrative?: string
    rows?: GridRow[]
    caption?: string
  }
  file_url: string | null
}

interface ResultEntryFormProps {
  orderId: string
  testTypeId: string
  testTypeName: string
  resultMode: string
  parameters: TestParameter[]
  patientGender?: string | null
  patientDob?: string | null
  value: ResultEntryValue
  onChange: (next: ResultEntryValue) => void
  disabled?: boolean
}

function ageYears(dob?: string | null): number | null {
  if (!dob) return null
  const diffMs = Date.now() - new Date(dob).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))
}

function rangeFor(param: TestParameter, gender?: string | null, age?: number | null) {
  if (age != null) {
    if (param.age_min_years != null && age < param.age_min_years) return null
    if (param.age_max_years != null && age > param.age_max_years) return null
  }
  const isFemale = gender === 'female'
  const min = isFemale ? (param.female_min ?? param.male_min) : (param.male_min ?? param.female_min)
  const max = isFemale ? (param.female_max ?? param.male_max) : (param.male_max ?? param.female_max)
  return { min, max, critMin: param.critical_min, critMax: param.critical_max }
}

function classify(rawValue: string, range: ReturnType<typeof rangeFor>): ParameterResult['interpretation'] {
  if (!range) return ''
  const value = Number(rawValue)
  if (rawValue.trim() === '' || Number.isNaN(value)) return ''
  if (range.critMin != null && value < range.critMin) return 'critical'
  if (range.critMax != null && value > range.critMax) return 'critical'
  if (range.min != null && value < range.min) return 'abnormal'
  if (range.max != null && value > range.max) return 'abnormal'
  if (range.min != null || range.max != null) return 'normal'
  return ''
}

function looksImplausible(rawValue: string, range: ReturnType<typeof rangeFor>): boolean {
  const value = Number(rawValue)
  if (rawValue.trim() === '' || Number.isNaN(value) || !range) return false
  const refPoint = range.critMax ?? range.max ?? range.critMin ?? range.min
  if (refPoint == null || refPoint === 0) return false
  return Math.abs(value) > Math.abs(refPoint) * 20
}

function interpColor(interp: string) {
  return { normal: 'normal', abnormal: 'abnormal', critical: 'critical' }[interp] as 'normal' | 'abnormal' | 'critical' | undefined
}

const POS_NEG_OPTIONS = [
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
]

const REACTIVE_OPTIONS = [
  { value: 'reactive',     label: 'Reactive' },
  { value: 'non_reactive', label: 'Non-Reactive' },
]

const SIR_OPTIONS = [
  { value: '',  label: 'Select…' },
  { value: 'S', label: 'Sensitive (S)' },
  { value: 'I', label: 'Intermediate (I)' },
  { value: 'R', label: 'Resistant (R)' },
]

export default function ResultEntryForm({
  orderId, testTypeId, testTypeName, resultMode, parameters,
  patientGender, patientDob, value, onChange, disabled,
}: ResultEntryFormProps) {
  const age = ageYears(patientDob)
  const data = value.result_data ?? {}

  // ── numeric / panel ─────────────────────────────────────────────────────
  if (resultMode === 'numeric' || resultMode === 'panel') {
    const rows: ParameterResult[] = parameters.length > 0
      ? parameters.map(p => {
          const existing = data.parameters?.find(r => r.parameter_id === p.id)
          return existing ?? { parameter_id: p.id, label: p.parameter_name, value: '', unit: p.unit, reference_range: p.reference_range, interpretation: '' }
        })
      : [data.parameters?.[0] ?? { parameter_id: null, label: testTypeName, value: '', unit: null, reference_range: null, interpretation: '' }]

    function updateRow(idx: number, newValue: string) {
      const param = parameters.find(p => p.id === rows[idx].parameter_id)
      const isQualitative = param?.parameter_type === 'qualitative'
      const range = param && !isQualitative ? rangeFor(param, patientGender, age) : null
      const interpretation = range ? classify(newValue, range) : rows[idx].interpretation
      const next = rows.map((r, i) => i === idx ? { ...r, value: newValue, interpretation: isQualitative ? '' : interpretation } : r)
      onChange({ ...value, result_data: { ...data, parameters: next } })
    }

    return (
      <div className="space-y-3">
        {rows.map((row, idx) => {
          const param = parameters.find(p => p.id === row.parameter_id)
          const isQualitative = param?.parameter_type === 'qualitative'
          const range = param && !isQualitative ? rangeFor(param, patientGender, age) : null
          const warn = range ? looksImplausible(row.value, range) : false
          const rangeText = param?.reference_range
            ?? (range && (range.min != null || range.max != null) ? `${range.min ?? '–'} – ${range.max ?? '–'}` : '—')
          return (
            <div key={row.parameter_id ?? idx} className={parameters.length > 0 ? 'grid grid-cols-12 gap-3 items-end' : 'grid grid-cols-2 gap-3'}>
              {parameters.length > 0 ? (
                <>
                  <div className="col-span-4 text-sm text-gray-700 font-medium pb-2.5">{row.label}</div>
                  <div className="col-span-3">
                    {isQualitative
                      ? <Select value={row.value} onChange={e => updateRow(idx, e.target.value)} options={POS_NEG_OPTIONS} placeholder="Select…" disabled={disabled} />
                      : <Input value={row.value} onChange={e => updateRow(idx, e.target.value)} disabled={disabled} placeholder={row.unit ?? ''} />}
                  </div>
                  <div className="col-span-3 text-xs text-gray-400 pb-2.5">{isQualitative ? '—' : `${rangeText}${row.unit ? ` ${row.unit}` : ''}`}</div>
                  <div className="col-span-2 pb-1.5">
                    {row.interpretation
                      ? <Badge variant={interpColor(row.interpretation) ?? 'normal'} label={row.interpretation} />
                      : <span className="text-xs text-gray-400">—</span>}
                  </div>
                </>
              ) : (
                <>
                  <Input label="Result Value *" value={row.value} onChange={e => updateRow(idx, e.target.value)} disabled={disabled} />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-gray-800">Status</span>
                    {row.interpretation
                      ? <Badge variant={interpColor(row.interpretation) ?? 'normal'} label={row.interpretation} />
                      : <span className="text-xs text-gray-400 py-2.5">No reference range defined for this test — set one in Test Type Management.</span>}
                  </div>
                </>
              )}
              {warn && (
                <div className="col-span-12 -mt-1">
                  <p className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg">Value far outside expected range — confirm entry.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── positive_negative / reactive ────────────────────────────────────────
  if (resultMode === 'positive_negative' || resultMode === 'reactive') {
    const options = resultMode === 'positive_negative' ? POS_NEG_OPTIONS : REACTIVE_OPTIONS
    return (
      <div className="grid grid-cols-2 gap-3">
        <Select label="Result *" value={data.value ?? ''} onChange={e => onChange({ ...value, result_data: { ...data, value: e.target.value } })} options={options} placeholder="Select…" disabled={disabled} />
        <Input label="Notes" value={data.notes ?? ''} onChange={e => onChange({ ...value, result_data: { ...data, notes: e.target.value } })} disabled={disabled} />
      </div>
    )
  }

  // ── observation / narrative ──────────────────────────────────────────────
  if (resultMode === 'observation') {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">Observation *</label>
        <textarea
          value={data.narrative ?? ''}
          onChange={e => onChange({ ...value, result_data: { ...data, narrative: e.target.value } })}
          disabled={disabled}
          rows={5}
          className="w-full text-sm rounded-xl border border-black/10 bg-white/60 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2/40 resize-none disabled:opacity-60"
          placeholder="Describe findings…"
        />
      </div>
    )
  }

  // ── grid (culture & sensitivity) ─────────────────────────────────────────
  if (resultMode === 'grid') {
    const rows = data.rows ?? []
    function updateGridRow(idx: number, field: keyof GridRow, val: string) {
      const next = rows.map((r, i) => i === idx ? { ...r, [field]: val } : r)
      onChange({ ...value, result_data: { ...data, rows: next } })
    }
    function addRow() {
      onChange({ ...value, result_data: { ...data, rows: [...rows, { organism: '', drug: '', result: '', cutoff: '' }] } })
    }
    function removeRow(idx: number) {
      onChange({ ...value, result_data: { ...data, rows: rows.filter((_, i) => i !== idx) } })
    }
    return (
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3"><Input label={idx === 0 ? 'Organism' : undefined} value={row.organism} onChange={e => updateGridRow(idx, 'organism', e.target.value)} disabled={disabled} /></div>
            <div className="col-span-3"><Input label={idx === 0 ? 'Drug' : undefined} value={row.drug} onChange={e => updateGridRow(idx, 'drug', e.target.value)} disabled={disabled} /></div>
            <div className="col-span-3"><Select label={idx === 0 ? 'Result' : undefined} value={row.result} onChange={e => updateGridRow(idx, 'result', e.target.value)} options={SIR_OPTIONS} disabled={disabled} /></div>
            <div className="col-span-2"><Input label={idx === 0 ? 'Cutoff' : undefined} value={row.cutoff} onChange={e => updateGridRow(idx, 'cutoff', e.target.value)} disabled={disabled} /></div>
            <div className="col-span-1 pb-2.5">
              {!disabled && <button onClick={() => removeRow(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>}
            </div>
          </div>
        ))}
        {!disabled && (
          <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-brand-2 font-semibold mt-1">
            <Plus size={14} /> Add Row
          </button>
        )}
        {rows.length === 0 && disabled && <p className="text-sm text-gray-400">No rows entered.</p>}
      </div>
    )
  }

  // ── upload (radiology / imaging) ────────────────────────────────────────
  if (resultMode === 'upload') {
    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      const path = `orders/${orderId}/${testTypeId}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('lab-results').upload(path, file, { upsert: true })
      if (!error) onChange({ ...value, file_url: path })
    }
    return (
      <div className="space-y-3">
        {value.file_url ? (
          <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg truncate">{value.file_url.split('/').pop()}</p>
        ) : (
          <p className="text-sm text-gray-400">No file uploaded yet.</p>
        )}
        {!disabled && (
          <label className="flex items-center gap-2 text-sm text-brand-2 font-semibold cursor-pointer">
            <Upload size={15} /> {value.file_url ? 'Replace File' : 'Upload File'}
            <input type="file" className="hidden" onChange={handleFile} />
          </label>
        )}
        <Input label="Caption / Notes" value={data.caption ?? ''} onChange={e => onChange({ ...value, result_data: { ...data, caption: e.target.value } })} disabled={disabled} />
      </div>
    )
  }

  return <p className="text-sm text-gray-400">Unsupported result mode: {resultMode}</p>
}
