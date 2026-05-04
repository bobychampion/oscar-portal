import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Select from '../../../components/ui/Select'
import Input from '../../../components/ui/Input'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

const METHOD_OPTIONS = [
  { value: 'cash',        label: 'Cash' },
  { value: 'pos',         label: 'POS' },
  { value: 'transfer',    label: 'Bank Transfer' },
  { value: 'insurance',   label: 'Insurance / HMO' },
  { value: 'corporate',   label: 'Corporate Billing' },
]

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const [invoice, setInvoice] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [recordOpen, setRecordOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [initiating, setInitiating] = useState(false)
  const [form, setForm] = useState({ method: 'cash', amount: '', reference: '', notes: '' })
  const [err, setErr] = useState('')

  async function load() {
    const [{ data: inv }, { data: pays }] = await Promise.all([
      supabase.from('invoices').select('*').eq('id', id!).single(),
      supabase.from('payments').select('*').eq('invoice_id', id!).order('created_at', { ascending: false }),
    ])
    setInvoice(inv)
    setPayments(pays ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function recordPayment() {
    if (!form.amount) { setErr('Amount required.'); return }
    setRecording(true)
    await supabase.from('payments').insert({
      invoice_id: id,
      amount: Number(form.amount),
      payment_method: form.method,
      paystack_reference: form.reference || null,
      notes: form.notes || null,
    })
    // Mark pending verification for Finance to confirm
    await supabase.from('invoices').update({ payment_status: 'pending_verification' }).eq('id', id)
    setRecording(false)
    setRecordOpen(false)
    setForm({ method: 'cash', amount: '', reference: '', notes: '' })
    load()
  }

  async function confirmPayment() {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('invoices').update({ payment_status: 'paid' }).eq('id', id!)
    // Mark order as paid
    if (invoice?.order_id) await supabase.from('orders').update({ status: 'paid' }).eq('id', invoice.order_id).eq('status', 'pending_payment')
    // Update latest payment as verified
    const latest = payments[0]
    if (latest) await supabase.from('payments').update({ verified_by: user?.id, verified_at: new Date().toISOString() }).eq('id', latest.id)
    load()
  }

  async function initiatePaystack() {
    setInitiating(true)
    const { data, error } = await supabase.functions.invoke('initiate-payment', { body: { invoice_id: id } })
    setInitiating(false)
    if (error || !data?.authorization_url) { alert('Could not initiate Paystack payment.'); return }
    window.open(data.authorization_url, '_blank')
  }

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>
  if (!invoice) return <AdminLayout><p className="text-gray-500">Invoice not found.</p></AdminLayout>

  const lineItems: any[] = invoice.line_items ?? []
  const isPaid = invoice.payment_status === 'paid'
  const canConfirm = (role === 'admin' || role === 'finance') && invoice.payment_status === 'pending_verification'

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/billing')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Invoices
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">{invoice.invoice_number}</h1>
          <p className="text-gray-500 text-sm">{invoice.patient_name}</p>
        </div>
        <Badge variant={isPaid ? 'complete' : invoice.payment_status === 'pending_verification' ? 'processing' : 'pending'} label={invoice.payment_status.replace(/_/g, ' ')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-black/8">
              <h3 className="font-semibold text-gray-900 font-heading">Line Items</h3>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/60 border-b border-black/8">
                <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Test</th>
                <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Type</th>
                <th className="text-right px-5 py-2 text-xs font-semibold text-gray-500">Amount</th>
              </tr></thead>
              <tbody>
                {lineItems.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-black/5">
                    <td className="px-5 py-3">{item.test_name}</td>
                    <td className="px-5 py-3 capitalize text-gray-500">{item.price_type?.replace('_', ' ')}</td>
                    <td className="px-5 py-3 text-right font-semibold">₦{Number(item.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/60 border-t border-black/8">
                  <td colSpan={2} className="px-5 py-3 font-bold text-gray-900">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900 text-base">₦{Number(invoice.total).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-white/85 border border-black/8 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 font-heading mb-3">Payment History</h3>
              {payments.map(p => (
                <div key={p.id} className="flex justify-between items-center py-2 border-b border-black/5 last:border-0 text-sm">
                  <div>
                    <span className="font-medium capitalize">{p.payment_method.replace('_', ' ')}</span>
                    {p.paystack_reference && <span className="text-xs text-gray-400 ml-2">{p.paystack_reference}</span>}
                    <p className="text-xs text-gray-400">{new Date(p.payment_date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <span className="font-semibold">₦{Number(p.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="lg:col-span-2 space-y-4">
          {!isPaid && (
            <div className="bg-white/85 border border-black/8 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 font-heading">Record Payment</h3>
              <Button variant="outline" className="w-full" onClick={() => setRecordOpen(true)}>
                Record Cash / POS / Transfer
              </Button>
              <Button className="w-full" loading={initiating} onClick={initiatePaystack}>
                <CreditCard size={16} /> Pay via Paystack
              </Button>
            </div>
          )}

          {canConfirm && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-sm text-amber-700 mb-3">Payment is pending verification. Confirm to unlock results.</p>
              <Button className="w-full" onClick={confirmPayment}>
                <CheckCircle size={16} /> Confirm Payment
              </Button>
            </div>
          )}

          {isPaid && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <CheckCircle size={24} className="text-green-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-700">Payment Confirmed</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="Record Payment">
        <div className="space-y-3">
          <Select label="Payment Method" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} options={METHOD_OPTIONS} />
          <Input label="Amount (₦)" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label="Reference / Receipt No." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
          <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setRecordOpen(false)} className="flex-1">Cancel</Button>
            <Button loading={recording} onClick={recordPayment} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
