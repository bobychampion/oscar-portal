import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Search } from 'lucide-react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

export default function PatientList() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { role } = useAuth()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase.from('patients').select('id,patient_id,full_name,phone,gender,city,state,created_at').order('created_at', { ascending: false }).limit(200)
      if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,patient_id.ilike.%${search}%`)
      const { data } = await q
      setPatients(data ?? [])
      setLoading(false)
    }
    load()
  }, [search])

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Patients</h1>
          <p className="text-gray-500 text-sm mt-0.5">All registered patient records</p>
        </div>
        {(role === 'admin' || role === 'front_desk') && (
          <Button onClick={() => navigate('/admin/patients/new')}>
            <UserPlus size={16} /> Register Patient
          </Button>
        )}
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or patient ID…"
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-black/10 bg-white/85 focus:outline-none focus:ring-2 focus:ring-brand-2/40"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 bg-gray-50/60">
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Patient ID</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Phone</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Gender</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Location</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Registered</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No patients found</td></tr>
              ) : patients.map(p => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/admin/patients/${p.id}`)}
                  className="border-b border-black/5 hover:bg-brand/5 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-mono text-xs text-brand-2 font-semibold">{p.patient_id}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{p.full_name}</td>
                  <td className="px-5 py-3 text-gray-600">{p.phone}</td>
                  <td className="px-5 py-3 text-gray-500 capitalize">{p.gender}</td>
                  <td className="px-5 py-3 text-gray-500">{p.city}, {p.state}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
