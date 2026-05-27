import { useEffect, useState, type ReactNode } from 'react'
import { Users, ClipboardList, AlertTriangle, TrendingUp, Activity, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

interface RecentOrder {
  id: string
  order_number: string
  status: string
  priority: string
  order_type: string
  created_at: string
  patients: { full_name: string }[] | null
}

interface DashboardData {
  totalPatients: number
  newPatientsToday: number
  totalOrders: number
  urgentActive: number
  todayRevenue: number
  pipeline: { label: string; count: number; color: string; bg: string }[]
  recentOrders: RecentOrder[]
  staffByRole: Record<string, number>
  webhookFailures: number
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment:  { label: 'Pending Payment',  color: '#d97706', bg: '#fef3c7' },
  paid:             { label: 'Paid',             color: '#0ea5e9', bg: '#e0f2fe' },
  sample_collected: { label: 'Sample Collected', color: '#9333ea', bg: '#f3e8ff' },
  processing:       { label: 'Processing',       color: '#ea580c', bg: '#ffedd5' },
  complete:         { label: 'Complete',         color: '#16a34a', bg: '#dcfce7' },
  cancelled:        { label: 'Cancelled',        color: '#6b7280', bg: '#f3f4f6' },
}

const PRIORITY_BADGE: Record<string, string> = {
  routine: 'bg-gray-100 text-gray-600',
  urgent:  'bg-amber-100 text-amber-700',
  stat:    'bg-red-100 text-red-700',
}

const ORDER_TYPE_BADGE: Record<string, string> = {
  walk_in:      'bg-sky-100 text-sky-700',
  referral:     'bg-purple-100 text-purple-700',
  corporate:    'bg-teal-100 text-teal-700',
  home_service: 'bg-green-100 text-green-700',
}

const ROLE_LABEL: Record<string, string> = {
  admin:         'Admin',
  finance:       'Finance',
  front_desk:    'Front Desk',
  lab_scientist: 'Lab Scientist',
  doctor:        'Doctor',
}

function MetricCard({
  icon, iconClass, value, label, badge, badgeClass, linkTo, linkLabel,
}: {
  icon: ReactNode
  iconClass: string
  value: string
  label: string
  badge?: string
  badgeClass?: string
  linkTo?: string
  linkLabel?: string
}) {
  return (
    <div className="bg-white/85 border border-black/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
          {icon}
        </div>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
        )}
        {!badge && linkTo && linkLabel && (
          <Link to={linkTo} className="text-xs text-brand-2 hover:underline">{linkLabel}</Link>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 font-heading">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayISO = today.toISOString()

        const [
          patientsTotal, patientsToday, ordersTotal, urgentRes,
          pendingPayment, paid, sampleCollected, processing, complete, cancelled,
          todayPays, recentOrdersRes, staffRes, webhookRes,
        ] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }),
          supabase.from('patients').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
          supabase.from('orders').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('*', { count: 'exact', head: true })
            .in('priority', ['urgent', 'stat'])
            .neq('status', 'complete')
            .neq('status', 'cancelled'),
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment'),
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'sample_collected'),
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'complete'),
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
          supabase.from('payments').select('amount').gte('payment_date', todayISO),
          supabase.from('orders')
            .select('id,order_number,status,priority,order_type,created_at,patients!patient_id(full_name)')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase.from('user_profiles').select('role').eq('is_active', true),
          supabase.from('webhook_deliveries').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
        ])

        if (recentOrdersRes.error) console.error('orders join error:', recentOrdersRes.error)
        if (patientsTotal.error) console.error('patients error:', patientsTotal.error)
        if (staffRes.error) console.error('staff error:', staffRes.error)

        const staffByRole: Record<string, number> = {}
        for (const s of staffRes.data ?? []) {
          staffByRole[s.role] = (staffByRole[s.role] ?? 0) + 1
        }

        setData({
          totalPatients: patientsTotal.count ?? 0,
          newPatientsToday: patientsToday.count ?? 0,
          totalOrders: ordersTotal.count ?? 0,
          urgentActive: urgentRes.count ?? 0,
          todayRevenue: (todayPays.data ?? []).reduce((s, p) => s + Number(p.amount), 0),
          pipeline: [
            { ...STATUS_META.pending_payment,  count: pendingPayment.count ?? 0 },
            { ...STATUS_META.paid,             count: paid.count ?? 0 },
            { ...STATUS_META.sample_collected, count: sampleCollected.count ?? 0 },
            { ...STATUS_META.processing,       count: processing.count ?? 0 },
            { ...STATUS_META.complete,         count: complete.count ?? 0 },
            { ...STATUS_META.cancelled,        count: cancelled.count ?? 0 },
          ],
          recentOrders: (recentOrdersRes.data ?? []) as unknown as RecentOrder[],
          staffByRole,
          webhookFailures: webhookRes.count ?? 0,
        })
      } catch (err) {
        console.error('Dashboard load error:', err)
        setError('Failed to load dashboard data. Please refresh the page.')
      }
    }
    load()
  }, [])

  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center py-16 gap-3">
          <p className="text-red-600 font-semibold">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-brand-2 hover:underline">
            Refresh
          </button>
        </div>
      </AdminLayout>
    )
  }

  if (!data) {
    return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>
  }

  const pipelineMax = Math.max(...data.pipeline.map(p => p.count), 1)

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Oscar Diagnostics — operational overview</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<Users size={20} />}
          iconClass="bg-sky-100 text-sky-600"
          value={data.totalPatients.toLocaleString()}
          label="Total Patients"
          badge={data.newPatientsToday > 0 ? `+${data.newPatientsToday} today` : undefined}
          badgeClass="bg-green-50 text-green-700"
        />
        <MetricCard
          icon={<ClipboardList size={20} />}
          iconClass="bg-teal-100 text-teal-600"
          value={data.totalOrders.toLocaleString()}
          label="Total Orders"
          linkTo="/admin/orders"
          linkLabel="View all"
        />
        <MetricCard
          icon={<AlertTriangle size={20} />}
          iconClass="bg-amber-100 text-amber-600"
          value={data.urgentActive.toString()}
          label="Urgent / STAT Active"
          badge={data.urgentActive > 0 ? 'Needs attention' : undefined}
          badgeClass="bg-red-50 text-red-600 animate-pulse"
        />
        <MetricCard
          icon={<TrendingUp size={20} />}
          iconClass="bg-green-100 text-green-600"
          value={`₦${data.todayRevenue.toLocaleString()}`}
          label="Today's Revenue"
          linkTo="/admin/finance"
          linkLabel="Details"
        />
      </div>

      {/* Order Pipeline */}
      <div className="bg-white/85 border border-black/8 rounded-2xl p-5 mb-6">
        <h2 className="font-semibold text-gray-900 font-heading mb-4">Order Pipeline</h2>
        <div className="space-y-3">
          {data.pipeline.map(stage => (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-36 flex-shrink-0">{stage.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max((stage.count / pipelineMax) * 100, stage.count > 0 ? 2 : 0)}%`,
                    backgroundColor: stage.color,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-900 w-8 text-right tabular-nums">{stage.count}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">Total: {data.totalOrders.toLocaleString()} orders</p>
      </div>

      {/* Bottom grid: Recent Orders + Staff/Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-black/8 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 font-heading">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-brand-2 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/8 bg-gray-50/60">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 whitespace-nowrap">Order</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Patient</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Priority</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">No orders yet</td></tr>
                ) : data.recentOrders.map(order => (
                  <tr key={order.id} className="border-b border-black/5 hover:bg-gray-50/40">
                    <td className="px-5 py-3">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="font-mono text-xs text-brand-2 hover:underline whitespace-nowrap"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-900 whitespace-nowrap">
                      {(Array.isArray(order.patients) ? order.patients[0]?.full_name : null) ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${ORDER_TYPE_BADGE[order.order_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.order_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[order.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor: STATUS_META[order.status]?.bg ?? '#f3f4f6',
                          color: STATUS_META[order.status]?.color ?? '#6b7280',
                        }}
                      >
                        {STATUS_META[order.status]?.label ?? order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* Active Staff */}
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 font-heading">Active Staff</h2>
              <Link to="/admin/users" className="text-xs text-brand-2 hover:underline">Manage</Link>
            </div>
            {Object.keys(data.staffByRole).length === 0 ? (
              <p className="text-sm text-gray-400">No active staff</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(ROLE_LABEL).map(([role, label]) => {
                  const count = data.staffByRole[role] ?? 0
                  if (count === 0) return null
                  return (
                    <div key={role} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-700">{label}</span>
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center">
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* System Health */}
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5">
            <h2 className="font-semibold text-gray-900 font-heading mb-3">System Health</h2>
            <div className="flex items-center gap-3">
              {data.webhookFailures === 0 ? (
                <>
                  <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    <Activity size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Webhooks OK</p>
                    <p className="text-xs text-gray-400">No delivery failures</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                    <WifiOff size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-700">
                      {data.webhookFailures} Webhook Failure{data.webhookFailures !== 1 ? 's' : ''}
                    </p>
                    <Link to="/admin/webhooks" className="text-xs text-brand-2 hover:underline">View details</Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
