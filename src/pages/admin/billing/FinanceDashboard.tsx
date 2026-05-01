import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react'
import AdminLayout from '../../../components/admin/AdminLayout'
import StatCard from '../../../components/admin/StatCard'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'

const METHOD_COLORS: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  pos: 'bg-blue-100 text-blue-700',
  transfer: 'bg-purple-100 text-purple-700',
  paystack: 'bg-teal-100 text-teal-700',
  insurance: 'bg-amber-100 text-amber-700',
  corporate: 'bg-gray-100 text-gray-700',
}

export default function FinanceDashboard() {
  const [stats, setStats] = useState({ todayRevenue: 0, outstanding: 0, totalPaid: 0, pendingVerification: 0 })
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date(); today.setHours(0, 0, 0, 0)

      const [{ data: todayPays }, { data: allPaid }, { data: unpaid }, { data: pending }, { data: recentPays }] = await Promise.all([
        supabase.from('payments').select('amount').gte('payment_date', today.toISOString()),
        supabase.from('invoices').select('total').eq('payment_status', 'paid'),
        supabase.from('invoices').select('total').eq('payment_status', 'unpaid'),
        supabase.from('invoices').select('id').eq('payment_status', 'pending_verification'),
        supabase.from('payments').select('id,amount,payment_method,payment_date,invoice_id,invoices(patient_name,invoice_number)').order('payment_date', { ascending: false }).limit(20),
      ])

      setStats({
        todayRevenue: (todayPays ?? []).reduce((s, p) => s + Number(p.amount), 0),
        totalPaid: (allPaid ?? []).reduce((s, i) => s + Number(i.total), 0),
        outstanding: (unpaid ?? []).reduce((s, i) => s + Number(i.total), 0),
        pendingVerification: pending?.length ?? 0,
      })
      setPayments(recentPays ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Finance Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Revenue, payments, and billing overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Today's Revenue" value={`₦${stats.todayRevenue.toLocaleString()}`} icon={TrendingUp} color="teal" />
        <StatCard label="Total Collected" value={`₦${stats.totalPaid.toLocaleString()}`} icon={CheckCircle2} color="green" />
        <StatCard label="Outstanding" value={`₦${stats.outstanding.toLocaleString()}`} icon={AlertCircle} color="amber" />
        <StatCard label="Pending Verification" value={stats.pendingVerification} icon={CreditCard} color="blue" />
      </div>

      <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-black/8">
          <h3 className="font-semibold text-gray-900 font-heading">Recent Payments</h3>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-black/8 bg-gray-50/60">
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Invoice</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Patient</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Method</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
          </tr></thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">No payments yet</td></tr>
            ) : payments.map(p => (
              <tr key={p.id} className="border-b border-black/5">
                <td className="px-5 py-3 font-mono text-xs text-brand-2">{(p.invoices as any)?.invoice_number}</td>
                <td className="px-5 py-3 text-gray-900">{(p.invoices as any)?.patient_name}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${METHOD_COLORS[p.payment_method] ?? 'bg-gray-100 text-gray-700'}`}>
                    {p.payment_method}
                  </span>
                </td>
                <td className="px-5 py-3 font-semibold">₦{Number(p.amount).toLocaleString()}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{new Date(p.payment_date).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}
