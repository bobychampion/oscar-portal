import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle, Receipt, Share2, Mail, Link2, MessageCircle, ExternalLink } from 'lucide-react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Modal from '../../../components/ui/Modal'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

interface ResultRow {
  test_type_id: string
  test_name: string
  result_value: string
  unit: string
  reference_range: string
  interpretation: 'normal' | 'abnormal' | 'critical' | ''
  notes: string
}

const INTERP_OPTIONS = [
  { value: 'normal',   label: 'Normal' },
  { value: 'abnormal', label: 'Abnormal' },
  { value: 'critical', label: 'Critical' },
]

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const [order, setOrder] = useState<any>(null)
  const [invoice, setInvoice] = useState<any>(null)
  const [results, setResults] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: inv }] = await Promise.all([
        supabase.from('orders').select(`
          *,
          patients(full_name,patient_id,date_of_birth,gender,phone,email),
          order_tests(test_types(id,name)),
          order_results(test_type_id,result_value,unit,reference_range,interpretation,notes)
        `).eq('id', id!).single(),
        supabase.from('invoices').select('*').eq('order_id', id!).maybeSingle(),
      ])
      if (!o) { navigate('/admin/orders'); return }
      setOrder(o)
      setInvoice(inv)
      const rows: ResultRow[] = (o.order_tests ?? []).map((at: any) => {
        const existing = (o.order_results ?? []).find((r: any) => r.test_type_id === at.test_types?.id)
        return {
          test_type_id: at.test_types?.id,
          test_name: at.test_types?.name,
          result_value: existing?.result_value ?? '',
          unit: existing?.unit ?? '',
          reference_range: existing?.reference_range ?? '',
          interpretation: (existing?.interpretation ?? '') as any,
          notes: existing?.notes ?? '',
        }
      })
      setResults(rows)
      setLoading(false)
    }
    load()
  }, [id, navigate])

  function updateRow(idx: number, field: keyof ResultRow, value: string) {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function saveResults() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const upserts = results.filter(r => r.result_value && r.interpretation).map(r => ({
      order_id: id, test_type_id: r.test_type_id,
      result_value: r.result_value, unit: r.unit || null,
      reference_range: r.reference_range || null,
      interpretation: r.interpretation, notes: r.notes || null,
      entered_by: user?.id,
    }))
    const { error } = await supabase.from('order_results').upsert(upserts, { onConflict: 'order_id,test_type_id' })
    setSaving(false)
    setSaveMsg(error ? 'Error saving results.' : 'Results saved.')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function markComplete() {
    setCompleting(true)
    await saveResults()
    await supabase.from('orders').update({ status: 'complete' }).eq('id', id!)
    setOrder((prev: any) => ({ ...prev, status: 'complete' }))
    setConfirmOpen(false)
    setCompleting(false)
  }

  const canEdit = role === 'admin' || role === 'lab_scientist'
  const isPaid = order?.status !== 'pending_payment'

  const resultsUrl = `${window.location.origin}/order-results?n=${encodeURIComponent(order?.order_number ?? '')}`

  async function copyLink() {
    await navigator.clipboard.writeText(resultsUrl)
    setShareMsg('Link copied!')
    setTimeout(() => setShareMsg(''), 3000)
  }

  async function sendEmail() {
    setSendingEmail(true)
    setShareMsg('')
    const { data, error } = await supabase.functions.invoke('send-order-results', { body: { order_id: id } })
    setSendingEmail(false)
    if (error || data?.error) {
      setShareMsg(data?.error ?? 'Failed to send email.')
    } else {
      setShareMsg(`Email sent to ${data.to}`)
    }
    setTimeout(() => setShareMsg(''), 5000)
  }

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/orders')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Orders
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">{order.patients?.full_name}</h1>
          <p className="font-mono text-brand-2 text-sm font-semibold mt-0.5">{order.order_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={order.status === 'complete' ? 'complete' : order.status === 'cancelled' ? 'cancelled' : order.status === 'paid' ? 'success' : 'pending'} label={order.status.replace(/_/g, ' ')} />
          {invoice && (
            <button onClick={() => navigate(`/admin/billing/${invoice.id}`)} className="flex items-center gap-1.5 text-xs text-brand-2 border border-brand-2/30 rounded-lg px-2.5 py-1.5 hover:bg-brand-2/5 transition-colors">
              <Receipt size={13} /> {invoice.invoice_number}
            </button>
          )}
        </div>
      </div>

      {/* Payment gate banner */}
      {order.status === 'pending_payment' && canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 mb-6 flex items-center justify-between">
          <span>⏳ Awaiting payment. Results cannot be entered until payment is confirmed.</span>
          {invoice && <button onClick={() => navigate(`/admin/billing/${invoice.id}`)} className="text-amber-800 font-semibold underline text-xs">View Invoice</button>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Patient & Order Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5 text-sm space-y-3">
            <h3 className="font-semibold text-gray-900 font-heading">Patient</h3>
            {[
              ['ID', order.patients?.patient_id],
              ['Phone', order.patients?.phone],
              ['DOB', order.patients?.date_of_birth],
              ['Gender', order.patients?.gender],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5 text-sm space-y-3">
            <h3 className="font-semibold text-gray-900 font-heading">Order Info</h3>
            {[
              ['Type', order.order_type.replace('_', ' ')],
              ['Priority', order.priority],
              ['Created', new Date(order.created_at).toLocaleDateString('en-GB')],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between capitalize"><span className="text-gray-400">{l}</span><span className="font-medium">{v}</span></div>
            ))}
            {order.notes && <div><p className="text-gray-400 mb-1">Notes</p><p className="text-gray-700">{order.notes}</p></div>}
          </div>

          {/* Share Results — only when complete */}
          {order.status === 'complete' && (
            <div className="bg-white/85 border border-black/8 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 font-heading flex items-center gap-2"><Share2 size={15} /> Share Results</h3>

              <button onClick={() => window.open(resultsUrl, '_blank')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-black/8 hover:bg-gray-50 transition-colors text-sm text-left">
                <ExternalLink size={15} className="text-brand-2" />
                <div><p className="font-medium text-gray-900">View Public Results</p><p className="text-xs text-gray-400">Open patient-facing results page</p></div>
              </button>

              <button onClick={copyLink}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-black/8 hover:bg-gray-50 transition-colors text-sm text-left">
                <Link2 size={15} className="text-purple-500" />
                <div><p className="font-medium text-gray-900">Copy Link</p><p className="text-xs text-gray-400 font-mono truncate">{resultsUrl}</p></div>
              </button>

              {order.patients?.email && (
                <button onClick={sendEmail} disabled={sendingEmail}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-black/8 hover:bg-gray-50 transition-colors text-sm text-left disabled:opacity-60">
                  <Mail size={15} className="text-teal-500" />
                  <div><p className="font-medium text-gray-900">{sendingEmail ? 'Sending…' : 'Send via Email'}</p><p className="text-xs text-gray-400">{order.patients.email}</p></div>
                </button>
              )}

              <a href={`https://wa.me/?text=${encodeURIComponent(`Your Oscar Diagnostics results are ready.\nOrder: ${order.order_number}\nView here: ${resultsUrl}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-black/8 hover:bg-gray-50 transition-colors text-sm">
                <MessageCircle size={15} className="text-green-500" />
                <div><p className="font-medium text-gray-900">Share via WhatsApp</p><p className="text-xs text-gray-400">Opens WhatsApp with pre-filled message</p></div>
              </a>

              {shareMsg && (
                <p className={`text-xs px-3 py-2 rounded-lg ${shareMsg.includes('sent') || shareMsg.includes('copied') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {shareMsg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Result Entry */}
        <div className="lg:col-span-3">
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 font-heading mb-4">Test Results</h3>

            {!isPaid && canEdit ? (
              <p className="text-gray-400 text-sm">Results locked until payment is confirmed.</p>
            ) : results.length === 0 ? (
              <p className="text-gray-400 text-sm">No tests on this order.</p>
            ) : (
              <div className="space-y-5">
                {results.map((row, idx) => (
                  <div key={row.test_type_id} className="border border-black/8 rounded-xl p-4">
                    <p className="font-semibold text-gray-900 text-sm mb-3">{row.test_name}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Result Value *" value={row.result_value} onChange={e => updateRow(idx, 'result_value', e.target.value)} disabled={!canEdit || order.status === 'complete'} />
                      <Input label="Unit" value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)} disabled={!canEdit} />
                      <Input label="Reference Range" value={row.reference_range} onChange={e => updateRow(idx, 'reference_range', e.target.value)} disabled={!canEdit} />
                      <Select label="Interpretation *" value={row.interpretation} onChange={e => updateRow(idx, 'interpretation', e.target.value)} options={INTERP_OPTIONS} placeholder="Select…" disabled={!canEdit} />
                    </div>
                    <div className="mt-3">
                      <Input label="Notes" value={row.notes} onChange={e => updateRow(idx, 'notes', e.target.value)} disabled={!canEdit} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {saveMsg && <p className={`text-sm mt-4 ${saveMsg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</p>}

            {canEdit && isPaid && (
              <div className="flex gap-3 mt-5 flex-wrap">
                <Button variant="outline" loading={saving} onClick={saveResults}>
                  <Save size={16} /> Save Results
                </Button>
                {order.status !== 'complete' && (
                  <Button onClick={() => setConfirmOpen(true)} disabled={results.some(r => !r.result_value || !r.interpretation)}>
                    <CheckCircle size={16} /> Mark Complete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Mark as Complete?">
        <p className="text-gray-500 text-sm mb-5">This will finalize the order and trigger webhook notifications. This cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} className="flex-1">Cancel</Button>
          <Button loading={completing} onClick={markComplete} className="flex-1">Confirm</Button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
