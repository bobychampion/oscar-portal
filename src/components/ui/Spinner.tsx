export default function Spinner({ size = 8 }: { size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} border-4 border-brand-2 border-t-transparent rounded-full animate-spin`}
      aria-label="Loading"
    />
  )
}
