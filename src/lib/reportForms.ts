export type FormType = 'chemistry' | 'haematology' | 'microbiology' | 'other'

export const CATEGORY_TO_FORM: Record<string, FormType> = {
  Biochemistry:  'chemistry',
  Endocrinology: 'chemistry',
  Haematology:   'haematology',
  Serology:      'haematology',
  Parasitology:  'haematology',
  Reproductive:  'haematology',
  Microbiology:  'microbiology',
  Virology:      'microbiology',
}

export const FORM_META: Record<FormType, { title: string; subtitle: string; formNo: string; headerBg: string; headerText: string; accentBg: string }> = {
  chemistry: {
    title: 'CLINICAL CHEMISTRY REPORT',
    subtitle: 'Biochemistry & Endocrinology',
    formNo: 'OD/CC/001',
    headerBg: '#1a2e4a',
    headerText: '#ffffff',
    accentBg: '#1a2e4a',
  },
  haematology: {
    title: 'HAEMATOLOGY & SEROLOGY REPORT',
    subtitle: 'Full Blood Count · Serology · Parasitology',
    formNo: 'OD/HS/002',
    headerBg: '#7b1d1d',
    headerText: '#ffffff',
    accentBg: '#7b1d1d',
  },
  microbiology: {
    title: 'MICROBIOLOGY REPORT',
    subtitle: 'Culture · Sensitivity · Microscopy',
    formNo: 'OD/MB/003',
    headerBg: '#14532d',
    headerText: '#ffffff',
    accentBg: '#14532d',
  },
  other: {
    title: 'DIAGNOSTIC REPORT',
    subtitle: 'Additional Tests',
    formNo: 'OD/GEN/000',
    headerBg: '#374151',
    headerText: '#ffffff',
    accentBg: '#374151',
  },
}

export function groupResultsByForm(results: any[]) {
  const groups: Partial<Record<FormType, any[]>> = {}
  for (const r of results) {
    const form: FormType = CATEGORY_TO_FORM[r.category] ?? 'other'
    if (!groups[form]) groups[form] = []
    groups[form]!.push(r)
  }
  return groups
}

export function interpretationColor(interp: string) {
  return { normal: '#16a34a', abnormal: '#d97706', critical: '#dc2626' }[interp] ?? '#374151'
}
