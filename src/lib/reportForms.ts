export interface DynamicResult {
  test_name: string
  category_name: string
  specimen_type: string | null
  color: string
  result_mode: string
  result_data: any
  file_url: string | null
  status: string
  reported_at?: string
}

export const REPORT_META = { title: 'LABORATORY TEST RESULT REPORT', formNo: 'OD/LR/001' }

export function reportHeaderColor(results: DynamicResult[]) {
  return results[0]?.color ?? '#1a2e4a'
}

export function interpretationColor(interp: string) {
  return { normal: '#16a34a', abnormal: '#d97706', critical: '#dc2626' }[interp] ?? '#374151'
}
