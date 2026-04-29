import Badge from '../ui/Badge'

interface ResultCardProps {
  test_name: string
  result_value: string
  unit?: string
  reference_range?: string
  interpretation: 'normal' | 'abnormal' | 'critical'
  notes?: string
  reported_at?: string
}

export default function ResultCard({ test_name, result_value, unit, reference_range, interpretation, notes, reported_at }: ResultCardProps) {
  const borderColor = {
    normal: 'border-l-green-400',
    abnormal: 'border-l-amber-400',
    critical: 'border-l-red-500',
  }[interpretation]

  return (
    <div className={`bg-white/85 border border-black/8 border-l-4 rounded-2xl p-5 ${borderColor}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900 font-heading text-sm">{test_name}</h3>
        <Badge variant={interpretation} />
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-gray-900 font-heading">{result_value}</span>
        {unit && <span className="text-gray-500 text-sm">{unit}</span>}
      </div>

      {reference_range && (
        <p className="text-xs text-gray-400 mb-2">Reference range: {reference_range}</p>
      )}

      {notes && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 mt-2">{notes}</p>
      )}

      {reported_at && (
        <p className="text-xs text-gray-300 mt-3">
          Reported {new Date(reported_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}
