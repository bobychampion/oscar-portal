import { useEffect, useState } from 'react'
import { UserPlus, UserX } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

const ROLE_OPTIONS = [
  { value: 'admin',         label: 'Admin' },
  { value: 'finance',       label: 'Finance' },
  { value: 'front_desk',    label: 'Front Desk' },
  { value: 'lab_scientist', label: 'Lab Scientist' },
  { value: 'doctor',        label: 'Doctor' },
]

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'front_desk', phone: '' })
  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleInvite() {
    setErr('')
    if (!form.email || !form.full_name || !form.role) { setErr('All fields required.'); return }
    setInviting(true)
    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email: form.email, full_name: form.full_name, role: form.role, phone: form.phone || undefined }
    })
    setInviting(false)
    if (error) { setErr(error.message ?? 'Failed to invite user.'); return }
    setInviteOpen(false)
    setForm({ email: '', full_name: '', role: 'front_desk', phone: '' })
    setSuccessMsg('User invited successfully. They will receive a setup email.')
    setTimeout(() => setSuccessMsg(''), 4000)
    load()
  }

  async function deactivate(id: string) {
    await supabase.from('user_profiles').update({ is_active: false }).eq('id', id)
    load()
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage staff accounts and roles</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus size={16} /> Invite User
        </Button>
      </div>

      {successMsg && <p className="text-sm text-green-600 bg-green-50 px-4 py-3 rounded-xl mb-4">{successMsg}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 bg-gray-50/60">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Phone</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-black/5 hover:bg-gray-50/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-2 bg-brand-2/10 px-2.5 py-1 rounded-full">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{u.phone ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Badge variant={u.is_active ? 'complete' : 'cancelled'} label={u.is_active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.is_active && (
                      <button onClick={() => deactivate(u.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <UserX size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => { setInviteOpen(false); setErr('') }} title="Invite New User">
        <div className="space-y-3">
          <Input label="Full Name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <Input label="Phone (optional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} options={ROLE_OPTIONS} />
          {err && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="flex-1">Cancel</Button>
            <Button loading={inviting} onClick={handleInvite} className="flex-1">Send Invite</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
