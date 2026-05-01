import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import { supabase } from '../../../lib/supabase'

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const BLOOD_OPTIONS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v }))
const GENOTYPE_OPTIONS = ['AA','AS','SS','AC','SC'].map(v => ({ value: v, label: v }))

export default function RegisterPatient() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '', date_of_birth: '', gender: 'male', phone: '', email: '',
    address: '', city: '', state: '',
    next_of_kin_name: '', next_of_kin_phone: '',
    hmo_provider: '', hmo_number: '',
    blood_group: '', genotype: '', notes: '',
  })

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.full_name || !form.date_of_birth || !form.phone || !form.city || !form.state) {
      setError('Please fill all required fields.')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase.from('patients').insert({
      ...form,
      blood_group: form.blood_group || null,
      genotype: form.genotype || null,
      email: form.email || null,
      address: form.address || null,
      next_of_kin_name: form.next_of_kin_name || null,
      next_of_kin_phone: form.next_of_kin_phone || null,
      hmo_provider: form.hmo_provider || null,
      hmo_number: form.hmo_number || null,
      notes: form.notes || null,
      created_by: user?.id,
    }).select('id').single()
    setSaving(false)
    if (err) { setError(err.message); return }
    navigate(`/admin/patients/${data.id}`)
  }

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/patients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Patients
      </button>
      <h1 className="text-2xl font-bold text-gray-900 font-heading mb-6">Register New Patient</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Personal Info */}
        <section className="bg-white/85 border border-black/8 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 font-heading mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Input label="Full Name *" value={form.full_name} onChange={set('full_name')} required /></div>
            <Input label="Date of Birth *" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} required />
            <Select label="Gender *" value={form.gender} onChange={set('gender')} options={GENDER_OPTIONS} />
            <Input label="Phone *" type="tel" value={form.phone} onChange={set('phone')} required />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} />
            <Select label="Blood Group" value={form.blood_group} onChange={set('blood_group')} options={BLOOD_OPTIONS} placeholder="Select…" />
            <Select label="Genotype" value={form.genotype} onChange={set('genotype')} options={GENOTYPE_OPTIONS} placeholder="Select…" />
          </div>
        </section>

        {/* Address */}
        <section className="bg-white/85 border border-black/8 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 font-heading mb-4">Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Input label="Street Address" value={form.address} onChange={set('address')} /></div>
            <Input label="City *" value={form.city} onChange={set('city')} required />
            <Input label="State *" value={form.state} onChange={set('state')} required />
          </div>
        </section>

        {/* Next of Kin */}
        <section className="bg-white/85 border border-black/8 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 font-heading mb-4">Next of Kin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Name" value={form.next_of_kin_name} onChange={set('next_of_kin_name')} />
            <Input label="Phone" type="tel" value={form.next_of_kin_phone} onChange={set('next_of_kin_phone')} />
          </div>
        </section>

        {/* HMO */}
        <section className="bg-white/85 border border-black/8 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 font-heading mb-4">Insurance / HMO</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="HMO Provider" value={form.hmo_provider} onChange={set('hmo_provider')} />
            <Input label="HMO Number" value={form.hmo_number} onChange={set('hmo_number')} />
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white/85 border border-black/8 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 font-heading mb-4">Clinical Notes</h2>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="Optional notes about the patient…"
            className="w-full text-sm rounded-xl border border-black/10 bg-white/85 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-2/40 resize-none"
          />
        </section>

        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={() => navigate('/admin/patients')}>Cancel</Button>
          <Button type="submit" loading={saving}>Register Patient</Button>
        </div>
      </form>
    </AdminLayout>
  )
}
