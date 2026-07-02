import { interpretationColor, reportHeaderColor, REPORT_META, type DynamicResult } from '../../lib/reportForms'
import oscarLogo from '../../assets/oscar-logo.png'

interface ReportFormProps {
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

function fmtBinaryValue(value?: string) {
  if (!value) return '—'
  return value.replace('_', '-')
}

export default function ReportForm({ results, patient, onPrint }: ReportFormProps) {
  const headerColor = reportHeaderColor(results)
  const testNames = [...new Set(results.map(r => r.test_name).filter(Boolean))]

  return (
    <div className="bg-white rounded-2xl border border-black/8 overflow-hidden print:shadow-none print:border-none print:rounded-none">
      {/* Header */}
      <div style={{ backgroundColor: headerColor }} className="px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <img src={oscarLogo} alt="Oscar Diagnostics" className="h-8 w-auto mb-2" />
            <h2 className="text-base font-bold font-heading leading-tight">{REPORT_META.title}</h2>
            <p className="text-white/60 text-xs mt-0.5">{testNames.join(' · ') || 'Diagnostic Results'}</p>
          </div>
          <span className="text-white/40 text-[10px] font-mono shrink-0">{REPORT_META.formNo}</span>
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

      {/* Body — one section per test, formatted by its own result_mode */}
      <div className="px-6 py-4 space-y-6">
        {results.map((r, ri) => {
          const data = r.result_data ?? {}
          return (
            <div key={ri} className={ri > 0 ? 'pt-6 border-t border-black/8' : ''}>
              <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                <div>
                  <p className="text-gray-400 font-medium mb-0.5">Test Performed</p>
                  <p className="text-gray-900 font-bold text-sm">{r.test_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium mb-0.5">Category</p>
                  <p className="text-gray-900 font-semibold">{r.category_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium mb-0.5">Specimen</p>
                  <p className="text-gray-900 font-semibold">{r.specimen_type ?? '—'}</p>
                </div>
              </div>

              {(r.result_mode === 'numeric' || r.result_mode === 'panel') && (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: headerColor + '18' }}>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide w-1/2">Parameter</th>
                      <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide w-1/6">Result</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Reference Range</th>
                      <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide w-1/6">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.parameters ?? []).map((p: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        <td className="px-3 py-2.5 font-medium text-gray-900">{p.label}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900 capitalize">
                          {p.value}{p.unit ? <span className="font-normal text-gray-500 text-xs ml-1">{p.unit}</span> : null}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">{p.reference_range ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center">
                          {p.interpretation && (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                              style={{ color: interpretationColor(p.interpretation), backgroundColor: interpretationColor(p.interpretation) + '18' }}
                            >
                              {p.interpretation}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(r.result_mode === 'positive_negative' || r.result_mode === 'reactive') && (
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-1">Result</p>
                  <p className="text-gray-900 font-bold text-base capitalize">{fmtBinaryValue(data.value)}</p>
                  {data.notes && <p className="text-gray-500 text-xs mt-1.5">{data.notes}</p>}
                </div>
              )}

              {r.result_mode === 'observation' && (
                <div>
                  <p className="text-gray-400 text-xs font-medium mb-1">Observation</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{data.narrative || '—'}</p>
                </div>
              )}

              {r.result_mode === 'grid' && (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: headerColor + '18' }}>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Organism</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Drug</th>
                      <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Result</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">Cutoff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.rows ?? []).map((row: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        <td className="px-3 py-2 text-gray-900">{row.organism}</td>
                        <td className="px-3 py-2 text-gray-900">{row.drug}</td>
                        <td className="px-3 py-2 text-center font-bold">{row.result}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{row.cutoff || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {r.result_mode === 'upload' && (
                <div className="border border-black/8 rounded-xl p-4">
                  {r.file_url ? (
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-2 underline">View Attachment</a>
                  ) : (
                    <p className="text-sm text-gray-400">No file attached.</p>
                  )}
                  {data.caption && <p className="text-xs text-gray-500 mt-1.5">{data.caption}</p>}
                </div>
              )}
            </div>
          )
        })}
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
          OSCAR DIAGNOSTICS | {REPORT_META.formNo} | Confidential – For Medical Use Only
        </p>
      </div>

      {/* Print Button */}
      <div className="px-6 pb-5 flex justify-center print:hidden">
        <button
          onClick={onPrint}
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl border-2 transition-colors"
          style={{ borderColor: headerColor, color: headerColor }}
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
