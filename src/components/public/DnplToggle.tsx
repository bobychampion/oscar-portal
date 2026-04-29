interface DnplToggleProps {
  value: boolean
  onChange: (v: boolean) => void
}

export default function DnplToggle({ value, onChange }: DnplToggleProps) {
  return (
    <div
      className={`border-2 rounded-2xl p-5 cursor-pointer transition-all duration-200 select-none
        ${value ? 'border-brand-2 bg-brand-2/5' : 'border-black/10 bg-white/60 hover:border-brand-2/30'}`}
      onClick={() => onChange(!value)}
    >
      <div className="flex items-start gap-4">
        <div className={`mt-0.5 w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0 relative
          ${value ? 'bg-brand-2' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200
            ${value ? 'left-7' : 'left-1'}`}
          />
        </div>
        <div>
          <p className="font-semibold text-gray-900">CareCova DNPL — Diagnose Now, Pay Later</p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Get your diagnostics today and repay in flexible instalments at your partner pharmacy or clinic.
            Quick approval, no upfront payment required.
          </p>
          {value && (
            <p className="text-xs text-brand-2 font-semibold mt-2">
              ✓ Our team will contact you about financing options at your pickup location.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
