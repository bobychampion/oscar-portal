import { useEffect, useState } from 'react'
import { Plus, Trash2, Copy, Check } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false })
    setKeys(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function generateKey() {
    if (!newName.trim()) return
    setGenerating(true)

    const raw = 'osc_live_' + Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24)

    const { data, error } = await supabase.functions.invoke('generate-api-key', {
      body: { name: newName.trim(), raw_key: raw }
    })

    setGenerating(false)
    if (!error && data) {
      setNewKey(raw)
      load()
    }
  }

  async function deactivate(id: string) {
    await supabase.from('api_keys').update({ is_active: false }).eq('id', id)
    load()
  }

  function copy() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function closeModal() {
    setModalOpen(false)
    setNewName('')
    setNewKey(null)
    setCopied(false)
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">API Keys</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage third-party partner access</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Key
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No API keys yet.</div>
      ) : (
        <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Prefix</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Last Used</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{k.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{k.key_prefix}…</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {k.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {k.is_active && (
                      <button onClick={() => deactivate(k.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={newKey ? 'Copy Your API Key' : 'Generate New API Key'}>
        {newKey ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">This key will only be shown once. Copy it now and store it securely.</p>
            <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs break-all text-gray-800">{newKey}</div>
            <Button onClick={copy} className="w-full gap-2">
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Key</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input label="Client / Partner Name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. MedBridge Integration" />
            <Button loading={generating} onClick={generateKey} className="w-full" disabled={!newName.trim()}>
              Generate Key
            </Button>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
