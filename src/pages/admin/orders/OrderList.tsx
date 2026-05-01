import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

const STATUSES = ['all','pending_payment','paid','sample_collected','processing','complete','cancelled']

export default function OrderList() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const navigate = useNavigate()
  const { role } = useAuth()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase
        .from('orders')
        .select('id,order_number,order_type,priority,status,created_at,patients(full_name,patient_id),order_tests(test_types(name))')
        .order('created_at', { ascending: false })
        .limit(100)
      if (status !== 'all') q = q.eq('status', status)
      const { data } = await q
      setOrders(data ?? [])
      setLoading(false)
    }
    load()
  }, [status])

  const PRIORITY_COLOR: Record<string, string> = {
    routine: 'text-gray-500',
    urgent: 'text-amber-600 font-semibold',
    stat: 'text-red-600 font-bold',
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">All diagnostic test orders</p>
        </div>
        {(role === 'admin' || role === 'front_desk') && (
          <Button onClick={() => navigate('/admin/orders/new')}>
            <Plus size={16} /> New Order
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setSearchParams(s === 'all' ? {} : { status: s })}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${
              status === s
                ? 'bg-brand text-white'
                : 'bg-white/85 border border-black/8 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 bg-gray-50/60">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Order #</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Patient</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Tests</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Priority</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No orders found</td></tr>
              ) : orders.map(o => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                  className="border-b border-black/5 hover:bg-brand/5 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-mono text-xs text-brand-2 font-semibold">{o.order_number}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{o.patients?.full_name}</p>
                    <p className="text-xs text-gray-400">{o.patients?.patient_id}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs truncate">
                    {o.order_tests?.map((t: any) => t.test_types?.name).join(', ')}
                  </td>
                  <td className="px-5 py-3 text-gray-500 capitalize">{o.order_type.replace('_', ' ')}</td>
                  <td className={`px-5 py-3 capitalize text-xs ${PRIORITY_COLOR[o.priority]}`}>{o.priority}</td>
                  <td className="px-5 py-3">
                    <Badge
                      variant={o.status === 'complete' ? 'complete' : o.status === 'cancelled' ? 'cancelled' : o.status === 'paid' ? 'success' : 'pending'}
                      label={o.status.replace(/_/g, ' ')}
                    />
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
