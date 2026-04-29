import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed font-heading'

const variants = {
  primary: 'bg-gradient-to-r from-brand to-brand-2 text-white shadow-lg shadow-brand-2/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-2/40 active:translate-y-0',
  outline: 'border-2 border-brand-2/40 text-brand-2 bg-white/90 hover:bg-brand-2/10 hover:shadow-md',
  ghost: 'text-muted hover:text-brand-2 hover:bg-brand-2/10',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
}

export default function Button({ variant = 'primary', size = 'md', loading, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}
