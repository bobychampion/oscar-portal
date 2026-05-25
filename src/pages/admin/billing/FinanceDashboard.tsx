import { useEffect, useState } from 'react'
import {
  TrendingUp, AlertCircle, CheckCircle2, CreditCard,
  Calendar, AlertTriangle, Percent,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import AdminLayout from '../../../components/admin/AdminLayout'
import StatCard from '../../../components/admin/StatCard'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'

const METHOD_COLORS: Record<string, string> = {
  cash:      'bg-green-100 text-green-700',
  pos:       'bg-blue-100 text-blue-700',
  transfer:  'bg-purple-100 text-purple-700',
  paystack:  'bg-teal-100 text-teal-700',
  insurance: 'bg-amber-100 text-amber-700',
  corporate: 'bg-gray-100 text-gray-700',
}

const METHOD_BAR_COLOR: Record<string, string> = {
  cash:      '#16a34a',
  pos:       '#0ea5e9',
  transfer:  '#9333ea',
  paystack:  '#0ca694',
  insurance: '#d97706',
  corporate: '#6b7280',
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-black/8 rounded-xl px-3 py-2 shadow-sm text-sm">
      <p className="text-gray-500 mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900">₦{Number(payload[0].value).toLocaleString()}</p>
    </div>
  )
}

export default function FinanceDashboard() {
  const [stats, setStats] = useState({
    todayRevenue: 0, weekRevenue: 0, outstanding: 0,
    totalPaid: 0, pendingVerification: 0,
    collectionRate: 0, avgInvoice: 0,
  })
  const [overdue, setOverdue] = useState({ count: 0, total: 0 })
  const [trend, setTrend] = useState<{ day: string; revenue: number }[]>([])
  const [methodBreakdown, setMethodBreakdown] = useState<{ method: string; amount: number; pct: number }[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const [
        { data: todayPays },
        { data: allPaid },
        { data: unpaid },
        { data: pending },
        { data: recentPays },
        { data: weekPays },
        { data: overdueInv },
        { data: allInv },
      ] = await Promise.all([
        supabase.from('payments').select('amount').gte('payment_date', today.toISOString()),
        supabase.from('invoices').select('total').eq('payment_status', 'paid'),
        supabase.from('invoices').select('total').eq('payment_status', 'unpaid'),
        supabase.from('invoices').select('id').eq('payment_status', 'pending_verification'),
        supabase.from('payments')
          .select('id,amount,payment_method,payment_date,invoice_id,invoices(patient_name,invoice_number)')
          .order('payment_date', { ascending: false })
          .limit(20),
        supabase.from('payments')
          .select('amount,payment_method,payment_date')
          .gte('payment_date', sevenDaysAgo.toISOString()),
        supabase.from('invoices')
          .select('total')
          .eq('payment_status', 'unpaid')
          .lt('due_date', today.toISOString()),
        supabase.from('invoices').select('total,payment_status'),
      ])

      // Totals
      const totalPaidAmt  = (allPaid  ?? []).reduce((s, i) => s + Number(i.total), 0)
      const totalUnpaid   = (unpaid   ?? []).reduce((s, i) => s + Number(i.total), 0)
      const paidCount     = (allPaid  ?? []).length
      const weekRevenue   = (weekPays ?? []).reduce((s, p) => s + Number(p.amount), 0)
      const pendingTotal  = (allInv   ?? [])
        .filter(i => i.payment_status === 'pending_verification')
        .reduce((s, i) => s + Number(i.total), 0)
      const totalInvoiced = totalPaidAmt + totalUnpaid + pendingTotal
      const collectionRate = totalInvoiced > 0 ? Math.round((totalPaidAmt / totalInvoiced) * 100) : 0

      setStats({
        todayRevenue: (todayPays ?? []).reduce((s, p) => s + Number(p.amount), 0),
        weekRevenue,
        totalPaid: totalPaidAmt,
        outstanding: totalUnpaid,
        pendingVerification: pending?.length ?? 0,
        collectionRate,
        avgInvoice: paidCount > 0 ? Math.round(totalPaidAmt / paidCount) : 0,
      })

      setOverdue({
        count: overdueInv?.length ?? 0,
        total: (overdueInv ?? []).reduce((s, i) => s + Number(i.total), 0),
      })

      // 7-day revenue trend
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        return {
          day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
          iso: d.toISOString().split('T')[0],
          revenue: 0,
        }
      })
      for (const p of weekPays ?? []) {
        const dayISO = new Date(p.payment_date).toISOString().split('T')[0]
        const slot = last7.find(d => d.iso === dayISO)
        if (slot) slot.revenue += Number(p.amount)
      }
      setTrend(last7.map(({ day, revenue }) => ({ day, revenue })))

      // Revenue by payment method (last 7 days)
      const methodTotals: Record<string, number> = {}
      for (const p of weekPays ?? []) {
        methodTotals[p.payment_method] = (methodTotals[p.payment_method] ?? 0) + Number(p.amount)
      }
      const methodSum = Object.values(methodTotals).reduce((s, v) => s + v, 0)
      setMethodBreakdown(
        Object.entries(methodTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([method, amount]) => ({
            method,
            amount,
            pct: methodSum > 0 ? Math.round((amount / methodSum) * 100) : 0,
          }))
      )

      setPayments(recentPays ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Finance Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Revenue, payments, and billing overview</p>
      </div>

      {/* Stat cards — 3 per row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard label="Today's Revenue"      value={`₦${stats.todayRevenue.toLocaleString()}`}  icon={TrendingUp}    color="teal" />
        <StatCard label="This Week's Revenue"  value={`₦${stats.weekRevenue.toLocaleString()}`}   icon={Calendar}      color="blue" />
        <StatCard label="Total Collected"      value={`₦${stats.totalPaid.toLocaleString()}`}     icon={CheckCircle2}  color="green" />
        <StatCard label="Outstanding"          value={`₦${stats.outstanding.toLocaleString()}`}   icon={AlertCircle}   color="amber" />
        <StatCard label="Overdue"              value={overdue.count > 0 ? `${overdue.count} (₦${overdue.total.toLocaleString()})` : '0'} icon={AlertTriangle} color="red" />
        <StatCard label="Pending Verification" value={stats.pendingVerification}                  icon={CreditCard}    color="purple" />
      </div>

      {/* Extra KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white/85 border border-black/8 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
            <Percent size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 font-heading">{stats.collectionRate}%</p>
            <p className="text-sm text-gray-500 mt-0.5">Collection Rate</p>
          </div>
          <div className="ml-auto flex-1 max-w-32">
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all duration-700"
                style={{ width: `${stats.collectionRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{stats.collectionRate}% of invoiced</p>
          </div>
        </div>
        <div className="bg-white/85 border border-black/8 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 font-heading">₦{stats.avgInvoice.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-0.5">Avg. Invoice Value</p>
          </div>
        </div>
      </div>

      {/* Chart + Method breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* 7-day trend chart */}
        <div className="lg:col-span-2 bg-white/85 border border-black/8 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 font-heading mb-4">7-Day Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="revenue" fill="#0ca694" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by payment method */}
        <div className="bg-white/85 border border-black/8 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 font-heading mb-4">By Payment Method</h3>
          <p className="text-xs text-gray-400 mb-3">Last 7 days</p>
          {methodBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400">No payments in period</p>
          ) : (
            <div className="space-y-3">
              {methodBreakdown.map(({ method, amount, pct }) => (
                <div key={method}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${METHOD_COLORS[method] ?? 'bg-gray-100 text-gray-700'}`}>
                      {method}
                    </span>
                    <span className="text-xs text-gray-500 tabular-nums">
                      ₦{amount.toLocaleString()} · {pct}%
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: METHOD_BAR_COLOR[method] ?? '#9ca3af' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-black/8">
          <h3 className="font-semibold text-gray-900 font-heading">Recent Payments</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/8 bg-gray-50/60">
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Invoice</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Patient</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Method</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
            </tr>
          </thead>
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
