import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, options, placeholder, className = '', id, ...props }, ref) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-gray-800">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`w-full px-4 py-2.5 rounded-xl border bg-white/60 text-gray-900 text-sm
          appearance-none transition-all duration-200 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-brand-2/40 focus:border-brand-2 focus:bg-white
          ${error ? 'border-red-400 ring-2 ring-red-200' : 'border-black/10'}
          ${className}`}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

Select.displayName = 'Select'
export default Select
