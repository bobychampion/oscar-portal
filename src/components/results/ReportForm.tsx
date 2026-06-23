import { interpretationColor, layoutMeta, type DynamicResult, type ReportLayout } from '../../lib/reportForms'

interface ReportFormProps {
  layout: ReportLayout
  results: DynamicResult[]
  patient: {
    name: string
    tracking_number: string
    date_of_birth?: string
    gender?: string
    pickup_location?: string
    collected_at?: string
  }
  onPrint: () => void
}

function calcAge(dob?: string) {
  if (!dob) return '—'
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' yrs'
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface TableRow {
  label: string
  value: string
  unit?: string | null
  reference_range?: string | null
  interpretation: string
}

function flattenForTable(results: DynamicResult[]): TableRow[] {
  const rows: TableRow[] = []
  for (const r of results) {
    const data = r.result_data ?? {}
    if (r.result_mode === 'numeric' || r.result_mode === 'panel') {
      for (const p of data.parameters ?? []) {
        rows.push({ label: p.label, value: p.value, unit: p.unit, reference_range: p.reference_range, interpretation: p.interpretation })
      }
    } else if (r.result_mode === 'positive_negative' || r.result_mode === 'reactive') {
      rows.push({ label: r.test_name, value: data.value === 'positive' || data.value === 'reactive' ? data.value.replace('_', '-') : (data.value ?? '').replace('_', '-'), interpretation: '' })
    } else if (r.result_mode === 'observation') {
      rows.push({ label: r.test_name, value: data.narrative ?? '', interpretation: '' })
    }
  }
  return rows
}

export default function ReportForm({ layout, results, patient, onPrint }: ReportFormProps) {
  const meta = layoutMeta(layout, results)
  const tableRows = layout === 'structured_table' || layout === 'compact' ? flattenForTable(results) : []

  return (
    <div className="bg-white rounded-2xl border border-black/8 overflow-hidden print:shadow-none print:border-none">
      {/* Header */}
      <div style={{ backgroundColor: meta.headerBg }} className="px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">Oscar Diagnostics</p>
            <h2 className="text-base font-bold font-heading leading-tight">{meta.title}</h2>
            <p className="text-white/60 text-xs mt-0.5">{meta.subtitle}</p>
          </div>
          <span className="text-white/40 text-[10px] font-mono">{meta.formNo}</span>
        </div>
      </div>

      {/* Patient Info Grid */}
      <div className="border-b border-black/8 px-6 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        {[
          ['Patient Name', patient.name],
          ['Tracking No.', patient.tracking_number],
          ['Age', calcAge(patient.date_of_birth)],
          ['Sex', patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '—'],
          ['Date', fmtDate(patient.collected_at)],
          ['Pickup / Clinic', patient.pickup_location ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <span className="text-gray-400 font-medium w-24 shrink-0">{label}:</span>
            <span className="text-gray-900 font-semibold">{value}</span>
          </div>
        ))}
      </div>

      {/* Body — rendering depends on report layout */}
      <div className="px-6 py-4">
        {(layout === 'structured_table' || layout === 'compact') && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: meta.headerBg + '18' }}>
                <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide w-1/2">Test / Parameter</th>
                <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide w-1/6">Result</th>
                <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Reference Range</th>
                <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide w-1/6">Flag</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{r.label}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-gray-900 capitalize">
                    {r.value}{r.unit ? <span className="font-normal text-gray-500 text-xs ml-1">{r.unit}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{r.reference_range ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    {r.interpretation && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                        style={{ color: interpretationColor(r.interpretation), backgroundColor: interpretationColor(r.interpretation) + '18' }}
                      >
                        {r.interpretation}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {layout === 'matrix' && (
          <div className="space-y-5">
            {results.map((r, ri) => (
              <div key={ri}>
                <p className="font-semibold text-gray-900 text-sm mb-2">{r.test_name}</p>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: meta.headerBg + '18' }}>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Organism</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Drug</th>
                      <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Result</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Cutoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.result_data?.rows ?? []).map((row: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        <td className="px-3 py-2 text-gray-900">{row.organism}</td>
                        <td className="px-3 py-2 text-gray-900">{row.drug}</td>
                        <td className="px-3 py-2 text-center font-bold">{row.result}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{row.cutoff || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {layout === 'narrative' && (
          <div className="space-y-5">
            {results.map((r, ri) => (
              <div key={ri}>
                <p className="font-semibold text-gray-900 text-sm mb-1.5">{r.test_name}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{r.result_data?.narrative || '—'}</p>
              </div>
            ))}
          </div>
        )}

        {layout === 'upload_viewer' && (
          <div className="space-y-3">
            {results.map((r, ri) => (
              <div key={ri} className="border border-black/8 rounded-xl p-4">
                <p className="font-semibold text-gray-900 text-sm mb-1.5">{r.test_name}</p>
                {r.file_url ? (
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-2 underline">View Attachment</a>
                ) : (
                  <p className="text-sm text-gray-400">No file attached.</p>
                )}
                {r.result_data?.caption && <p className="text-xs text-gray-500 mt-1.5">{r.result_data.caption}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-black/8 px-6 py-4">
        <div className="grid grid-cols-2 gap-6 text-xs text-gray-500 mb-4">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Reported By</p>
            <p className="border-b border-gray-300 pb-0.5 h-5" />
            <p className="mt-1">Signature: <span className="border-b border-gray-300 inline-block w-32" /></p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Reviewed By</p>
            <p className="border-b border-gray-300 pb-0.5 h-5" />
            <p className="mt-1">Signature: <span className="border-b border-gray-300 inline-block w-32" /></p>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-400">
          OSCAR DIAGNOSTICS | {meta.formNo} | Confidential – For Medical Use Only
        </p>
      </div>

      {/* Print Button */}
      <div className="px-6 pb-5 flex justify-center print:hidden">
        <button
          onClick={onPrint}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl border-2 transition-colors"
          style={{ borderColor: meta.headerBg, color: meta.headerBg }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Download / Print Report
        </button>
      </div>
    </div>
  )
}
