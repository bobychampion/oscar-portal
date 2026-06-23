export type ReportLayout = 'structured_table' | 'compact' | 'matrix' | 'narrative' | 'upload_viewer'

export interface DynamicResult {
  test_name: string
  category_name: string
  report_layout: ReportLayout
  color: string
  result_mode: string
  result_data: any
  file_url: string | null
  status: string
  reported_at?: string
}

const LAYOUT_META: Record<ReportLayout, { title: string; formNo: string }> = {
  structured_table: { title: 'DIAGNOSTIC TEST REPORT',          formNo: 'OD/ST/001' },
  compact:          { title: 'SCREENING TEST REPORT',           formNo: 'OD/CP/002' },
  matrix:           { title: 'CULTURE & SENSITIVITY REPORT',    formNo: 'OD/MX/003' },
  narrative:        { title: 'NARRATIVE / OBSERVATION REPORT',  formNo: 'OD/NR/004' },
  upload_viewer:    { title: 'IMAGING / ATTACHMENT REPORT',     formNo: 'OD/UP/005' },
}

export const LAYOUT_ORDER: ReportLayout[] = ['structured_table', 'compact', 'matrix', 'narrative', 'upload_viewer']

export function groupResultsByLayout(results: DynamicResult[]): Partial<Record<ReportLayout, DynamicResult[]>> {
  const groups: Partial<Record<ReportLayout, DynamicResult[]>> = {}
  for (const r of results) {
    const layout = r.report_layout ?? 'structured_table'
    if (!groups[layout]) groups[layout] = []
    groups[layout]!.push(r)
  }
  return groups
}

export function layoutMeta(layout: ReportLayout, results: DynamicResult[]) {
  const categories = [...new Set(results.map(r => r.category_name).filter(Boolean))]
  const headerBg = results[0]?.color ?? '#374151'
  return { ...LAYOUT_META[layout], subtitle: categories.join(' · ') || 'Diagnostic Results', headerBg }
}

export function interpretationColor(interp: string) {
  return { normal: '#16a34a', abnormal: '#d97706', critical: '#dc2626' }[interp] ?? '#374151'
}
