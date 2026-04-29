import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-white/80 border-b border-black/8 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-brand font-bold font-heading text-lg tracking-tight">
            Oscar Labs
          </Link>
          <nav className="flex items-center gap-4">
            <NavLink to="/apply" className={({ isActive }) =>
              `text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${isActive ? 'text-brand-2 bg-brand-2/10' : 'text-gray-500 hover:text-brand-2'}`
            }>
              Apply
            </NavLink>
            <NavLink to="/results" className={({ isActive }) =>
              `text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${isActive ? 'text-brand-2 bg-brand-2/10' : 'text-gray-500 hover:text-brand-2'}`
            }>
              My Results
            </NavLink>
          </nav>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {children}
      </div>
    </div>
  )
}
