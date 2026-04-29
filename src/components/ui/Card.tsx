import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div className={`bg-white/85 border border-black/8 rounded-2xl backdrop-blur-sm
      ${hover ? 'transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl hover:border-sky-200/50 cursor-pointer' : ''}
      ${className}`}>
      {children}
    </div>
  )
}
