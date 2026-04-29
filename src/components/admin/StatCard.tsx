import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  color?: 'teal' | 'blue' | 'amber' | 'green'
}

const colors = {
  teal: 'text-brand bg-brand/10',
  blue: 'text-brand-2 bg-brand-2/10',
  amber: 'text-amber-600 bg-amber-100',
  green: 'text-green-600 bg-green-100',
}

export default function StatCard({ label, value, icon: Icon, color = 'blue' }: StatCardProps) {
  return (
    <div className="bg-white/85 border border-black/8 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 font-heading">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}
