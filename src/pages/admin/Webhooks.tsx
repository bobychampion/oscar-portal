import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

interface Endpoint {
  id: string
  name: string
  url: string
  is_active: boolean
  created_at: string
}

interface Delivery {
  id: string
  status: string
  attempt_count: number
  http_status_code: number | null
  created_at: string
  application_id: string
}

export default function Webhooks() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', url: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [ep, del] = await Promise.all([
      supabase.from('webhook_endpoints').select('id, name, url, is_active, created_at').order('created_at', { ascending: false }),
      supabase.from('webhook_deliveries').select('id, status, attempt_count, http_status_code, created_at, application_id').order('created_at', { ascending: false }).limit(20),
    ])
    setEndpoints(ep.data ?? [])
    setDeliveries(del.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addEndpoint() {
    if (!form.name.trim() || !form.url.trim()) return
    setSaving(true)
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    await supabase.from('webhook_endpoints').insert({ name: form.name.trim(), url: form.url.trim(), secret })
    setSaving(false)
    setModalOpen(false)
    setForm({ name: '', url: '' })
    load()
  }

  async function removeEndpoint(id: string) {
    await supabase.from('webhook_endpoints').update({ is_active: false }).eq('id', id)
    load()
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Webhooks</h1>
          <p className="text-gray-500 text-sm mt-0.5">Partner endpoints that receive result notifications</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add Endpoint</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="space-y-6">
          {/* Endpoints */}
          <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-black/8 bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Registered Endpoints</h3>
            </div>
            {endpoints.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">No endpoints registered.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {endpoints.map(ep => (
                    <tr key={ep.id} className="border-b border-black/5 last:border-0">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{ep.name}</td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono text-xs truncate max-w-[280px]">{ep.url}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ep.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {ep.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {ep.is_active && (
                          <button onClick={() => removeEndpoint(ep.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Deliveries */}
          <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-black/8 bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Deliveries</h3>
            </div>
            {deliveries.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">No deliveries yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left px-5 py-2.5 text-xs font-bold text-gray-400">Application ID</th>
                    <th className="text-left px-5 py-2.5 text-xs font-bold text-gray-400">Status</th>
                    <th className="text-left px-5 py-2.5 text-xs font-bold text-gray-400">HTTP</th>
                    <th className="text-left px-5 py-2.5 text-xs font-bold text-gray-400">Attempts</th>
                    <th className="text-left px-5 py-2.5 text-xs font-bold text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map(d => (
                    <tr key={d.id} className="border-b border-black/5 last:border-0">
                      <td className="px-5 py-3 font-mono text-xs text-gray-400">{d.application_id.slice(0, 8)}…</td>
                      <td className="px-5 py-3"><Badge variant={d.status as any} /></td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{d.http_status_code ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{d.attempt_count}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Webhook Endpoint">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. MedBridge Partner" />
          <Input label="URL" type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://partner.com/webhooks/oscar" />
          <p className="text-xs text-gray-400">A signing secret will be auto-generated for HMAC verification.</p>
          <Button loading={saving} onClick={addEndpoint} className="w-full" disabled={!form.name.trim() || !form.url.trim()}>
            Add Endpoint
          </Button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
