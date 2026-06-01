interface TestType {
  id: string
  name: string
  category: string
  description?: string
  walk_in_price?: number | null
}

interface TestTypeSelectorProps {
  testTypes: TestType[]
  selected: string[]
  onChange: (ids: string[]) => void
  error?: string
}

const categoryColors: Record<string, string> = {
  Haematology: 'bg-red-50 border-red-200 text-red-700',
  Serology: 'bg-purple-50 border-purple-200 text-purple-700',
  Biochemistry: 'bg-blue-50 border-blue-200 text-blue-700',
  Microbiology: 'bg-green-50 border-green-200 text-green-700',
  Parasitology: 'bg-orange-50 border-orange-200 text-orange-700',
  Endocrinology: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  Virology: 'bg-pink-50 border-pink-200 text-pink-700',
  Reproductive: 'bg-rose-50 border-rose-200 text-rose-700',
}

export default function TestTypeSelector({ testTypes, selected, onChange, error }: TestTypeSelectorProps) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const byCategory = testTypes.reduce<Record<string, TestType[]>>((acc, t) => {
    acc[t.category] = [...(acc[t.category] ?? []), t]
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {Object.entries(byCategory).map(([category, tests]) => (
        <div key={category}>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{category}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tests.map(test => {
              const isSelected = selected.includes(test.id)
              const colorClass = categoryColors[category] ?? 'bg-gray-50 border-gray-200 text-gray-700'
              return (
                <button
                  key={test.id}
                  type="button"
                  onClick={() => toggle(test.id)}
                  className={`text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 text-sm
                    ${isSelected
                      ? 'border-brand-2 bg-brand-2/8 shadow-sm shadow-brand-2/20'
                      : 'border-black/8 bg-white/60 hover:border-brand-2/40 hover:bg-white/80'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">{test.name}</span>
                    {isSelected && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${colorClass}`}>✓</span>
                    )}
                  </div>
                  {test.description && (
                    <p className="text-gray-400 text-xs mt-0.5 leading-snug">{test.description}</p>
                  )}
                  {test.walk_in_price != null && (
                    <p className="text-brand-2 text-xs font-semibold mt-1">₦{Number(test.walk_in_price).toLocaleString()}</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
