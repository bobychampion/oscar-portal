import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Key, Webhook, LogOut } from 'lucide-react'
import { signOut } from '../../lib/auth'

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/applications', label: 'Applications', icon: ClipboardList },
  { to: '/admin/api-keys', label: 'API Keys', icon: Key },
  { to: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
]

export default function Sidebar() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <aside className="w-64 min-h-screen bg-white/90 border-r border-black/8 flex flex-col backdrop-blur-sm">
      <div className="px-6 py-5 border-b border-black/8">
        <p className="text-xs font-bold text-brand uppercase tracking-widest">Oscar Labs</p>
        <p className="text-sm text-gray-500 mt-0.5">Admin Portal</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-gradient-to-r from-brand/10 to-brand-2/10 text-brand-2 font-semibold'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-black/8">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
