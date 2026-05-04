import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Key, Webhook, LogOut,
  Users, UserPlus, ShoppingBag, Receipt,
  BarChart3, BadgeDollarSign, Plus
} from 'lucide-react'
import { signOut } from '../../lib/auth'
import { useAuth } from '../../contexts/AuthContext'

type Role = 'admin' | 'finance' | 'front_desk' | 'lab_scientist' | 'doctor'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  roles: Role[]
}

const NAV: NavItem[] = [
  // All roles
  { to: '/admin/dashboard',    label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','finance','front_desk','lab_scientist','doctor'] },

  // Patient & Orders — internal staff
  { to: '/admin/patients',     label: 'Patients',      icon: Users,           roles: ['admin','front_desk','lab_scientist'] },
  { to: '/admin/patients/new', label: 'Register Patient', icon: UserPlus,     roles: ['admin','front_desk'] },
  { to: '/admin/orders',       label: 'Orders',        icon: ShoppingBag,     roles: ['admin','finance','front_desk','lab_scientist','doctor'] },
  { to: '/admin/orders/new',   label: 'New Order',     icon: Plus,            roles: ['admin','front_desk'] },

  // Lab
  { to: '/admin/applications', label: 'Applications',  icon: ClipboardList,   roles: ['admin','finance','front_desk','lab_scientist'] },

  // Finance / Billing
  { to: '/admin/finance',      label: 'Finance',       icon: BarChart3,       roles: ['admin','finance'] },
  { to: '/admin/billing',      label: 'Invoices',      icon: Receipt,         roles: ['admin','finance','front_desk'] },
  { to: '/admin/billing/pricing', label: 'Test Pricing', icon: BadgeDollarSign, roles: ['admin'] },

  // Admin only
  { to: '/admin/users',        label: 'Users',         icon: Users,           roles: ['admin'] },
  { to: '/admin/api-keys',     label: 'API Keys',      icon: Key,             roles: ['admin'] },
  { to: '/admin/webhooks',     label: 'Webhooks',      icon: Webhook,         roles: ['admin'] },
]

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  finance: 'Finance',
  front_desk: 'Front Desk',
  lab_scientist: 'Lab Scientist',
  doctor: 'Doctor',
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { role } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  const visibleLinks = NAV.filter(item => role && item.roles.includes(role as Role))

  return (
    <aside className="w-64 min-h-screen bg-white/90 border-r border-black/8 flex flex-col backdrop-blur-sm">
      <div className="px-6 py-5 border-b border-black/8">
        <p className="text-xs font-bold text-brand uppercase tracking-widest">Oscar Labs</p>
        <p className="text-sm text-gray-500 mt-0.5">{role ? ROLE_LABELS[role as Role] : 'Portal'}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin/orders' || to === '/admin/patients' || to === '/admin/billing'}
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
        {role && (
          <p className="px-3 py-1 text-xs text-gray-400 mb-1 uppercase tracking-wide font-semibold">
            {ROLE_LABELS[role as Role]}
          </p>
        )}
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
