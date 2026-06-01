import { useEffect, useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

interface TestType {
  id: string
  name: string
  category: string
  description: string | null
  is_active: boolean
  created_at: string
}

export default function TestTypeManagement() {
  const [testTypes, setTestTypes] = useState<TestType[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TestType | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [formError, setFormError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('test_types')
      .select('id,name,category,description,is_active,created_at')
      .order('category')
      .order('name')
    setTestTypes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!newName.trim()) { setFormError('Name is required.'); return }
    if (!newCategory.trim()) { setFormError('Category is required.'); return }
    setSaving(true)
    setFormError('')
    const { error } = await supabase.from('test_types').insert({
      name: newName.trim(),
      category: newCategory.trim(),
      description: newDescription.trim() || null,
    })
    setSaving(false)
    if (error) {
      setFormError(error.message.includes('unique') ? 'A test type with this name already exists.' : error.message)
      return
    }
    setAddOpen(false)
    setNewName('')
    setNewCategory('')
    setNewDescription('')
    flash('Test type added.')
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('test_types').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    flash('Test type deleted.')
    load()
  }

  async function toggleActive(t: TestType) {
    await supabase.from('test_types').update({ is_active: !t.is_active }).eq('id', t.id)
    setTestTypes(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !t.is_active } : x))
  }

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  const byCategory = testTypes.reduce((acc: Record<string, TestType[]>, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Test Type Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Add, remove, or toggle test categories available in the system</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-green-600">{msg}</span>}
          <Button onClick={() => { setFormError(''); setAddOpen(true) }}>
            <Plus size={16} /> Add Test Type
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, types]) => (
          <div key={category} className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-50/60 border-b border-black/8">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{category}</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {types.map(t => (
                  <tr key={t.id} className="border-b border-black/5 last:border-0">
                    <td className="px-5 py-3.5">
                      <p className={`font-medium ${t.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{t.name}</p>
                      {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(t)}
                          title={t.is_active ? 'Deactivate' : 'Activate'}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-black/8 hover:bg-gray-50 transition-colors text-gray-500"
                        >
                          {t.is_active
                            ? <><ToggleRight size={15} className="text-green-500" /> Active</>
                            : <><ToggleLeft size={15} className="text-gray-400" /> Inactive</>
                          }
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          title="Delete"
                          className="p-1.5 rounded-lg border border-black/8 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Test Type">
        <div className="space-y-4">
          <Input
            label="Test Name *"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Full Blood Count"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
            <input
              list="category-suggestions"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="e.g. Haematology"
              className="w-full text-sm rounded-xl border border-black/10 bg-white/85 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-2/40"
            />
            <datalist id="category-suggestions">
              {[...new Set(testTypes.map(t => t.category))].map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              rows={2}
              placeholder="Optional description…"
              className="w-full text-sm rounded-xl border border-black/10 bg-white/85 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2/40 resize-none"
            />
          </div>
          {formError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
            <Button loading={saving} onClick={handleAdd} className="flex-1">Add Test Type</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Test Type?">
        <p className="text-gray-500 text-sm mb-2">
          Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
        </p>
        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-5">
          This will permanently remove the test type. Existing orders and results referencing it will not be affected.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
