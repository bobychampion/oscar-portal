import { Fragment, useEffect, useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

interface TestCategory {
  id: string
  name: string
  description: string | null
  report_layout: string
  color: string
  icon: string | null
  is_active: boolean
  display_order: number
}

interface TestType {
  id: string
  name: string
  code: string | null
  category_id: string | null
  category: string | null
  result_mode: string
  specimen_type: string | null
  turnaround_hours: number
  instructions: string | null
  is_active: boolean
}

interface TestParameter {
  id: string
  test_type_id: string
  parameter_name: string
  unit: string | null
  reference_range: string | null
  male_min: number | null
  male_max: number | null
  female_min: number | null
  female_max: number | null
  age_min_years: number | null
  age_max_years: number | null
  critical_min: number | null
  critical_max: number | null
  display_order: number
  parameter_type: string
  is_active: boolean
}

const REPORT_LAYOUTS = [
  { value: 'structured_table', label: 'Structured Table' },
  { value: 'compact',          label: 'Compact' },
  { value: 'matrix',           label: 'Matrix / Grid' },
  { value: 'narrative',        label: 'Narrative' },
  { value: 'upload_viewer',    label: 'Upload Viewer' },
]

const RESULT_MODES = [
  { value: 'numeric',           label: 'Numeric' },
  { value: 'panel',             label: 'Panel (multiple parameters)' },
  { value: 'positive_negative', label: 'Positive / Negative' },
  { value: 'reactive',          label: 'Reactive / Non-Reactive' },
  { value: 'observation',       label: 'Observation / Narrative' },
  { value: 'grid',              label: 'Grid (e.g. culture & sensitivity)' },
  { value: 'upload',            label: 'File Upload' },
]

const PARAM_TYPES = [
  { value: 'numeric',     label: 'Numeric' },
  { value: 'qualitative', label: 'Qualitative (Positive/Negative)' },
  { value: 'text',        label: 'Text' },
  { value: 'calculated',  label: 'Calculated' },
]

const PARAM_MODES = ['numeric', 'panel']

const emptyCategory = { name: '', description: '', report_layout: 'structured_table', color: '#0ca694', icon: '', display_order: 0 }
const emptyTestType = { name: '', code: '', category_id: '', result_mode: 'numeric', specimen_type: '', turnaround_hours: 24, instructions: '' }
const emptyParameter = {
  parameter_name: '', unit: '', reference_range: '',
  male_min: '', male_max: '', female_min: '', female_max: '',
  age_min_years: '', age_max_years: '', critical_min: '', critical_max: '',
  display_order: 0, parameter_type: 'numeric',
}

export default function TestTypeManagement() {
  const [tab, setTab] = useState<'categories' | 'types'>('types')
  const [categories, setCategories] = useState<TestCategory[]>([])
  const [testTypes, setTestTypes] = useState<TestType[]>([])
  const [parameters, setParameters] = useState<TestParameter[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Category modal state
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<TestCategory | null>(null)
  const [catForm, setCatForm] = useState(emptyCategory)
  const [catSaving, setCatSaving] = useState(false)
  const [catError, setCatError] = useState('')
  const [catDeleteTarget, setCatDeleteTarget] = useState<TestCategory | null>(null)

  // Test type modal state
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<TestType | null>(null)
  const [typeForm, setTypeForm] = useState(emptyTestType)
  const [typeSaving, setTypeSaving] = useState(false)
  const [typeError, setTypeError] = useState('')
  const [typeDeleteTarget, setTypeDeleteTarget] = useState<TestType | null>(null)

  // Parameter modal state
  const [paramModalOpen, setParamModalOpen] = useState(false)
  const [paramTestTypeId, setParamTestTypeId] = useState<string | null>(null)
  const [editingParam, setEditingParam] = useState<TestParameter | null>(null)
  const [paramForm, setParamForm] = useState(emptyParameter)
  const [paramSaving, setParamSaving] = useState(false)
  const [paramError, setParamError] = useState('')
  const [paramDeleteTarget, setParamDeleteTarget] = useState<TestParameter | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: cats }, { data: types }, { data: params }] = await Promise.all([
      supabase.from('test_categories').select('id,name,description,report_layout,color,icon,is_active,display_order').order('display_order'),
      supabase.from('test_types').select('id,name,code,category_id,category,result_mode,specimen_type,turnaround_hours,instructions,is_active,test_categories(name)').order('name'),
      supabase.from('test_parameters').select('*').order('display_order'),
    ])
    setCategories(cats ?? [])
    setTestTypes((types ?? []).map((t: any) => ({ ...t, category: t.test_categories?.name ?? t.category })))
    setParameters(params ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  // ── Categories ────────────────────────────────────────────────────────────
  function openAddCategory() {
    setEditingCat(null)
    setCatForm(emptyCategory)
    setCatError('')
    setCatModalOpen(true)
  }

  function openEditCategory(c: TestCategory) {
    setEditingCat(c)
    setCatForm({ name: c.name, description: c.description ?? '', report_layout: c.report_layout, color: c.color, icon: c.icon ?? '', display_order: c.display_order })
    setCatError('')
    setCatModalOpen(true)
  }

  async function saveCategory() {
    if (!catForm.name.trim()) { setCatError('Name is required.'); return }
    setCatSaving(true)
    setCatError('')
    const payload = {
      name: catForm.name.trim(),
      description: catForm.description.trim() || null,
      report_layout: catForm.report_layout,
      color: catForm.color || '#0ca694',
      icon: catForm.icon.trim() || null,
      display_order: Number(catForm.display_order) || 0,
    }
    const { error } = editingCat
      ? await supabase.from('test_categories').update(payload).eq('id', editingCat.id)
      : await supabase.from('test_categories').insert(payload)
    setCatSaving(false)
    if (error) { setCatError(error.message.includes('unique') ? 'A category with this name already exists.' : error.message); return }
    setCatModalOpen(false)
    flash(editingCat ? 'Category updated.' : 'Category added.')
    load()
  }

  async function toggleCategoryActive(c: TestCategory) {
    await supabase.from('test_categories').update({ is_active: !c.is_active }).eq('id', c.id)
    setCategories(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x))
  }

  async function deleteCategory() {
    if (!catDeleteTarget) return
    await supabase.from('test_categories').delete().eq('id', catDeleteTarget.id)
    setCatDeleteTarget(null)
    flash('Category deleted.')
    load()
  }

  // ── Test Types ────────────────────────────────────────────────────────────
  function openAddType() {
    setEditingType(null)
    setTypeForm(emptyTestType)
    setTypeError('')
    setTypeModalOpen(true)
  }

  function openEditType(t: TestType) {
    setEditingType(t)
    setTypeForm({
      name: t.name, code: t.code ?? '', category_id: t.category_id ?? '',
      result_mode: t.result_mode, specimen_type: t.specimen_type ?? '',
      turnaround_hours: t.turnaround_hours, instructions: t.instructions ?? '',
    })
    setTypeError('')
    setTypeModalOpen(true)
  }

  async function saveType() {
    if (!typeForm.name.trim()) { setTypeError('Name is required.'); return }
    if (!typeForm.category_id) { setTypeError('Category is required.'); return }
    setTypeSaving(true)
    setTypeError('')
    const category = categories.find(c => c.id === typeForm.category_id)
    const payload = {
      name: typeForm.name.trim(),
      code: typeForm.code.trim() || null,
      category_id: typeForm.category_id,
      category: category?.name ?? null, // kept in sync with legacy free-text column until callers migrate
      result_mode: typeForm.result_mode,
      specimen_type: typeForm.specimen_type.trim() || null,
      turnaround_hours: Number(typeForm.turnaround_hours) || 24,
      instructions: typeForm.instructions.trim() || null,
    }
    const { error } = editingType
      ? await supabase.from('test_types').update(payload).eq('id', editingType.id)
      : await supabase.from('test_types').insert(payload)
    setTypeSaving(false)
    if (error) { setTypeError(error.message.includes('unique') ? 'A test type with this name already exists.' : error.message); return }
    setTypeModalOpen(false)
    flash(editingType ? 'Test type updated.' : 'Test type added.')
    load()
  }

  async function toggleTypeActive(t: TestType) {
    await supabase.from('test_types').update({ is_active: !t.is_active }).eq('id', t.id)
    setTestTypes(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !t.is_active } : x))
  }

  async function deleteType() {
    if (!typeDeleteTarget) return
    await supabase.from('test_types').delete().eq('id', typeDeleteTarget.id)
    setTypeDeleteTarget(null)
    flash('Test type deleted.')
    load()
  }

  // ── Parameters (only ever edited from this page) ─────────────────────────
  function openAddParameter(testTypeId: string) {
    setParamTestTypeId(testTypeId)
    setEditingParam(null)
    setParamForm(emptyParameter)
    setParamError('')
    setParamModalOpen(true)
  }

  function openEditParameter(p: TestParameter) {
    setParamTestTypeId(p.test_type_id)
    setEditingParam(p)
    setParamForm({
      parameter_name: p.parameter_name, unit: p.unit ?? '', reference_range: p.reference_range ?? '',
      male_min: p.male_min?.toString() ?? '', male_max: p.male_max?.toString() ?? '',
      female_min: p.female_min?.toString() ?? '', female_max: p.female_max?.toString() ?? '',
      age_min_years: p.age_min_years?.toString() ?? '', age_max_years: p.age_max_years?.toString() ?? '',
      critical_min: p.critical_min?.toString() ?? '', critical_max: p.critical_max?.toString() ?? '',
      display_order: p.display_order, parameter_type: p.parameter_type,
    })
    setParamError('')
    setParamModalOpen(true)
  }

  async function saveParameter() {
    if (!paramForm.parameter_name.trim()) { setParamError('Parameter name is required.'); return }
    if (!paramTestTypeId) return
    setParamSaving(true)
    setParamError('')
    const num = (v: string) => v.trim() === '' ? null : Number(v)
    const payload = {
      test_type_id: paramTestTypeId,
      parameter_name: paramForm.parameter_name.trim(),
      unit: paramForm.unit.trim() || null,
      reference_range: paramForm.reference_range.trim() || null,
      male_min: num(paramForm.male_min), male_max: num(paramForm.male_max),
      female_min: num(paramForm.female_min), female_max: num(paramForm.female_max),
      age_min_years: num(paramForm.age_min_years), age_max_years: num(paramForm.age_max_years),
      critical_min: num(paramForm.critical_min), critical_max: num(paramForm.critical_max),
      display_order: Number(paramForm.display_order) || 0,
      parameter_type: paramForm.parameter_type,
    }
    const { error } = editingParam
      ? await supabase.from('test_parameters').update(payload).eq('id', editingParam.id)
      : await supabase.from('test_parameters').insert(payload)
    setParamSaving(false)
    if (error) { setParamError(error.message); return }
    setParamModalOpen(false)
    flash(editingParam ? 'Parameter updated.' : 'Parameter added.')
    load()
  }

  async function toggleParamActive(p: TestParameter) {
    await supabase.from('test_parameters').update({ is_active: !p.is_active }).eq('id', p.id)
    setParameters(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
  }

  async function deleteParameter() {
    if (!paramDeleteTarget) return
    await supabase.from('test_parameters').delete().eq('id', paramDeleteTarget.id)
    setParamDeleteTarget(null)
    flash('Parameter deleted.')
    load()
  }

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>

  const byCategory = testTypes.reduce((acc: Record<string, TestType[]>, t) => {
    const key = t.category ?? 'Uncategorized'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Test Type Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage categories, test types, result modes, and panel parameters in one place</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-green-600">{msg}</span>}
          <Button onClick={tab === 'categories' ? openAddCategory : openAddType}>
            <Plus size={16} /> {tab === 'categories' ? 'Add Category' : 'Add Test Type'}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-black/8">
        {(['types', 'categories'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px
              ${tab === t ? 'border-brand-2 text-brand-2' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {t === 'types' ? 'Test Types' : 'Categories'}
          </button>
        ))}
      </div>

      {tab === 'categories' ? (
        <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-black/8">
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-500">Report Layout</th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-500">Order</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <p className={`font-medium ${c.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{c.name}</p>
                    </div>
                    {c.description && <p className="text-xs text-gray-400 mt-0.5 pl-4.5">{c.description}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{REPORT_LAYOUTS.find(l => l.value === c.report_layout)?.label ?? c.report_layout}</td>
                  <td className="px-5 py-3.5 text-gray-400">{c.display_order}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleCategoryActive(c)} title={c.is_active ? 'Deactivate' : 'Activate'}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-black/8 hover:bg-gray-50 transition-colors text-gray-500">
                        {c.is_active ? <><ToggleRight size={15} className="text-green-500" /> Active</> : <><ToggleLeft size={15} className="text-gray-400" /> Inactive</>}
                      </button>
                      <button onClick={() => openEditCategory(c)} className="p-1.5 rounded-lg border border-black/8 hover:bg-gray-50 text-gray-500 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setCatDeleteTarget(c)} className="p-1.5 rounded-lg border border-black/8 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategory).map(([category, types]) => (
            <div key={category} className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-50/60 border-b border-black/8">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{category}</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {types.map(t => {
                    const showParams = PARAM_MODES.includes(t.result_mode)
                    const isExpanded = expanded === t.id
                    const typeParams = parameters.filter(p => p.test_type_id === t.id)
                    return (
                      <Fragment key={t.id}>
                        <tr className="border-b border-black/5 last:border-0">
                          <td className="px-5 py-3.5 w-8">
                            {showParams && (
                              <button onClick={() => setExpanded(isExpanded ? null : t.id)} className="text-gray-400 hover:text-gray-700">
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className={`font-medium ${t.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{t.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {t.code && <span className="font-mono mr-2">{t.code}</span>}
                              {RESULT_MODES.find(m => m.value === t.result_mode)?.label ?? t.result_mode}
                              {t.specimen_type && <span> · {t.specimen_type}</span>}
                              <span> · TAT {t.turnaround_hours}h</span>
                              {showParams && <span> · {typeParams.length} parameter{typeParams.length === 1 ? '' : 's'}</span>}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => toggleTypeActive(t)} title={t.is_active ? 'Deactivate' : 'Activate'}
                                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-black/8 hover:bg-gray-50 transition-colors text-gray-500">
                                {t.is_active ? <><ToggleRight size={15} className="text-green-500" /> Active</> : <><ToggleLeft size={15} className="text-gray-400" /> Inactive</>}
                              </button>
                              <button onClick={() => openEditType(t)} className="p-1.5 rounded-lg border border-black/8 hover:bg-gray-50 text-gray-500 transition-colors"><Pencil size={14} /></button>
                              <button onClick={() => setTypeDeleteTarget(t)} className="p-1.5 rounded-lg border border-black/8 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-400 transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                        {showParams && isExpanded && (
                          <tr key={`${t.id}-params`} className="border-b border-black/5 last:border-0 bg-gray-50/40">
                            <td colSpan={3} className="px-5 py-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Parameters</p>
                                <Button size="sm" variant="outline" onClick={() => openAddParameter(t.id)}><Plus size={14} /> Add Parameter</Button>
                              </div>
                              {typeParams.length === 0 ? (
                                <p className="text-sm text-gray-400">No parameters defined yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {typeParams.map(p => (
                                    <div key={p.id} className="flex items-center justify-between bg-white border border-black/8 rounded-xl px-4 py-2.5 text-sm">
                                      <div>
                                        <span className={`font-medium ${p.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{p.parameter_name}</span>
                                        {p.unit && <span className="text-gray-400 ml-2 text-xs">{p.unit}</span>}
                                        <span className="text-gray-400 ml-2 text-xs">
                                          {p.male_min != null || p.male_max != null ? `M ${p.male_min ?? '–'}–${p.male_max ?? '–'}` : ''}
                                          {p.female_min != null || p.female_max != null ? `  F ${p.female_min ?? '–'}–${p.female_max ?? '–'}` : ''}
                                          {!p.male_min && !p.male_max && !p.female_min && !p.female_max && p.reference_range ? p.reference_range : ''}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => toggleParamActive(p)} className="text-gray-400 hover:text-gray-700">
                                          {p.is_active ? <ToggleRight size={15} className="text-green-500" /> : <ToggleLeft size={15} />}
                                        </button>
                                        <button onClick={() => openEditParameter(p)} className="p-1 rounded-lg hover:bg-gray-50 text-gray-500"><Pencil size={13} /></button>
                                        <button onClick={() => setParamDeleteTarget(p)} className="p-1 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400"><Trash2 size={13} /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Category Add/Edit Modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title={editingCat ? 'Edit Category' : 'Add Category'}>
        <div className="space-y-4">
          <Input label="Name *" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Haematology" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} rows={2}
              className="w-full text-sm rounded-xl border border-black/10 bg-white/85 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2/40 resize-none" />
          </div>
          <Select label="Report Layout" value={catForm.report_layout} onChange={e => setCatForm({ ...catForm, report_layout: e.target.value })} options={REPORT_LAYOUTS} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Color" type="color" value={catForm.color} onChange={e => setCatForm({ ...catForm, color: e.target.value })} className="h-11 p-1" />
            <Input label="Display Order" type="number" value={catForm.display_order} onChange={e => setCatForm({ ...catForm, display_order: Number(e.target.value) })} />
          </div>
          {catError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{catError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setCatModalOpen(false)} className="flex-1">Cancel</Button>
            <Button loading={catSaving} onClick={saveCategory} className="flex-1">{editingCat ? 'Save Changes' : 'Add Category'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!catDeleteTarget} onClose={() => setCatDeleteTarget(null)} title="Delete Category?">
        <p className="text-gray-500 text-sm mb-2">Are you sure you want to delete <span className="font-semibold text-gray-900">{catDeleteTarget?.name}</span>?</p>
        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-5">Test types using this category will keep their reference, but it should be reassigned.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCatDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={deleteCategory} className="flex-1">Delete</Button>
        </div>
      </Modal>

      {/* Test Type Add/Edit Modal */}
      <Modal open={typeModalOpen} onClose={() => setTypeModalOpen(false)} title={editingType ? 'Edit Test Type' : 'Add Test Type'}>
        <div className="space-y-4">
          <Input label="Name *" value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="e.g. Full Blood Count" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Code" value={typeForm.code} onChange={e => setTypeForm({ ...typeForm, code: e.target.value })} placeholder="e.g. FBC-001" />
            <Select label="Category *" value={typeForm.category_id} onChange={e => setTypeForm({ ...typeForm, category_id: e.target.value })}
              options={categories.map(c => ({ value: c.id, label: c.name }))} placeholder="Select…" />
          </div>
          <Select label="Result Mode *" value={typeForm.result_mode} onChange={e => setTypeForm({ ...typeForm, result_mode: e.target.value })} options={RESULT_MODES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Specimen Type" value={typeForm.specimen_type} onChange={e => setTypeForm({ ...typeForm, specimen_type: e.target.value })} placeholder="e.g. Whole Blood" />
            <Input label="Turnaround (hours)" type="number" value={typeForm.turnaround_hours} onChange={e => setTypeForm({ ...typeForm, turnaround_hours: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Instructions</label>
            <textarea value={typeForm.instructions} onChange={e => setTypeForm({ ...typeForm, instructions: e.target.value })} rows={2}
              className="w-full text-sm rounded-xl border border-black/10 bg-white/85 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2/40 resize-none" />
          </div>
          {PARAM_MODES.includes(typeForm.result_mode) && (
            <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              Save this test type first, then expand it in the list to add its parameters (e.g. Haemoglobin, WBC, Platelets).
            </p>
          )}
          {typeError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{typeError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setTypeModalOpen(false)} className="flex-1">Cancel</Button>
            <Button loading={typeSaving} onClick={saveType} className="flex-1">{editingType ? 'Save Changes' : 'Add Test Type'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!typeDeleteTarget} onClose={() => setTypeDeleteTarget(null)} title="Delete Test Type?">
        <p className="text-gray-500 text-sm mb-2">Are you sure you want to delete <span className="font-semibold text-gray-900">{typeDeleteTarget?.name}</span>?</p>
        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-5">This will permanently remove the test type and its parameters. Existing orders/results referencing it will not be affected.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setTypeDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={deleteType} className="flex-1">Delete</Button>
        </div>
      </Modal>

      {/* Parameter Add/Edit Modal */}
      <Modal open={paramModalOpen} onClose={() => setParamModalOpen(false)} title={editingParam ? 'Edit Parameter' : 'Add Parameter'}>
        <div className="space-y-4">
          <Input label="Parameter Name *" value={paramForm.parameter_name} onChange={e => setParamForm({ ...paramForm, parameter_name: e.target.value })} placeholder="e.g. Haemoglobin" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Unit" value={paramForm.unit} onChange={e => setParamForm({ ...paramForm, unit: e.target.value })} placeholder="g/dL" />
            <Select label="Type" value={paramForm.parameter_type} onChange={e => setParamForm({ ...paramForm, parameter_type: e.target.value })} options={PARAM_TYPES} />
          </div>
          <Input label="Reference Range (text fallback)" value={paramForm.reference_range} onChange={e => setParamForm({ ...paramForm, reference_range: e.target.value })} placeholder="e.g. 13.0 – 16.0" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Male Min" type="number" value={paramForm.male_min} onChange={e => setParamForm({ ...paramForm, male_min: e.target.value })} />
            <Input label="Male Max" type="number" value={paramForm.male_max} onChange={e => setParamForm({ ...paramForm, male_max: e.target.value })} />
            <Input label="Female Min" type="number" value={paramForm.female_min} onChange={e => setParamForm({ ...paramForm, female_min: e.target.value })} />
            <Input label="Female Max" type="number" value={paramForm.female_max} onChange={e => setParamForm({ ...paramForm, female_max: e.target.value })} />
            <Input label="Critical Min" type="number" value={paramForm.critical_min} onChange={e => setParamForm({ ...paramForm, critical_min: e.target.value })} />
            <Input label="Critical Max" type="number" value={paramForm.critical_max} onChange={e => setParamForm({ ...paramForm, critical_max: e.target.value })} />
            <Input label="Age Min (yrs)" type="number" value={paramForm.age_min_years} onChange={e => setParamForm({ ...paramForm, age_min_years: e.target.value })} />
            <Input label="Age Max (yrs)" type="number" value={paramForm.age_max_years} onChange={e => setParamForm({ ...paramForm, age_max_years: e.target.value })} />
          </div>
          <Input label="Display Order" type="number" value={paramForm.display_order} onChange={e => setParamForm({ ...paramForm, display_order: Number(e.target.value) })} />
          {paramError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{paramError}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setParamModalOpen(false)} className="flex-1">Cancel</Button>
            <Button loading={paramSaving} onClick={saveParameter} className="flex-1">{editingParam ? 'Save Changes' : 'Add Parameter'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!paramDeleteTarget} onClose={() => setParamDeleteTarget(null)} title="Delete Parameter?">
        <p className="text-gray-500 text-sm mb-5">Are you sure you want to delete <span className="font-semibold text-gray-900">{paramDeleteTarget?.parameter_name}</span>?</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setParamDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={deleteParameter} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </AdminLayout>
  )
}
