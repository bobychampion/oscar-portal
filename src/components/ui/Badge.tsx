type BadgeVariant = 'pending' | 'processing' | 'complete' | 'cancelled' | 'normal' | 'abnormal' | 'critical' | 'success' | 'failed'

const styles: Record<BadgeVariant, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  complete: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  normal: 'bg-green-100 text-green-800',
  abnormal: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-700 animate-pulse',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-700',
}

interface BadgeProps {
  variant: BadgeVariant
  label?: string
}

export default function Badge({ variant, label }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[variant]}`}>
      {label ?? variant}
    </span>
  )
}
