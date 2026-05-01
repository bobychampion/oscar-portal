import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../../components/admin/AdminLayout'
import Badge from '../../../components/ui/Badge'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'

const STATUSES = ['all','unpaid','pending_verification','paid']

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [outstanding, setOutstanding] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase.from('invoices').select('id,invoice_number,patient_name,total,payment_status,created_at,order_id').order('created_at', { ascending: false }).limit(100)
      if (status !== 'all') q = q.eq('payment_status', status)
      const { data } = await q
      setInvoices(data ?? [])

      const { data: unpaid } = await supabase.from('invoices').select('total').neq('payment_status', 'paid')
      setOutstanding((unpaid ?? []).reduce((s, i) => s + Number(i.total), 0))
      setLoading(false)
    }
    load()
  }, [status])

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Invoices</h1>
          <p className="text-gray-500 text-sm mt-0.5">Total outstanding: <span className="font-semibold text-amber-600">₦{outstanding.toLocaleString()}</span></p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setSearchParams(s === 'all' ? {} : { status: s })}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${status === s ? 'bg-brand text-white' : 'bg-white/85 border border-black/8 text-gray-600 hover:bg-gray-100'}`}>
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
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Invoice #</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Patient</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No invoices found</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} onClick={() => navigate(`/admin/billing/${inv.id}`)}
                  className="border-b border-black/5 hover:bg-brand/5 cursor-pointer transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-brand-2 font-semibold">{inv.invoice_number}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{inv.patient_name}</td>
                  <td className="px-5 py-3 font-semibold text-gray-900">₦{Number(inv.total).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <Badge
                      variant={inv.payment_status === 'paid' ? 'complete' : inv.payment_status === 'pending_verification' ? 'processing' : 'pending'}
                      label={inv.payment_status.replace(/_/g, ' ')}
                    />
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(inv.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
