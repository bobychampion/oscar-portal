import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import AdminLayout from '../../../components/admin/AdminLayout'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const [patient, setPatient] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: o }] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id!).single(),
        supabase.from('orders').select('id,order_number,order_type,priority,status,created_at,order_tests(test_types(name))').eq('patient_id', id!).order('created_at', { ascending: false }),
      ])
      setPatient(p)
      setOrders(o ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>
  if (!patient) return <AdminLayout><p className="text-gray-500">Patient not found.</p></AdminLayout>

  const INFO = [
    ['Patient ID', patient.patient_id],
    ['Date of Birth', patient.date_of_birth],
    ['Gender', patient.gender],
    ['Phone', patient.phone],
    ['Email', patient.email ?? '—'],
    ['Address', [patient.address, patient.city, patient.state].filter(Boolean).join(', ')],
    ['Blood Group', patient.blood_group ?? '—'],
    ['Genotype', patient.genotype ?? '—'],
    ['Next of Kin', patient.next_of_kin_name ? `${patient.next_of_kin_name} (${patient.next_of_kin_phone ?? '—'})` : '—'],
    ['HMO', patient.hmo_provider ? `${patient.hmo_provider} — ${patient.hmo_number ?? '—'}` : '—'],
  ]

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/patients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Patients
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">{patient.full_name}</h1>
          <p className="font-mono text-brand-2 text-sm font-semibold mt-0.5">{patient.patient_id}</p>
        </div>
        {(role === 'admin' || role === 'front_desk') && (
          <Button onClick={() => navigate('/admin/orders/new', { state: { patient_id: id, patient_name: patient.full_name } })}>
            <Plus size={16} /> New Order
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Patient Info */}
        <div className="lg:col-span-2">
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5 space-y-3 text-sm">
            <h3 className="font-semibold text-gray-900 font-heading">Patient Details</h3>
            {INFO.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-gray-400 font-medium shrink-0">{label}</span>
                <span className="text-gray-900 font-medium text-right">{value}</span>
              </div>
            ))}
            {patient.notes && (
              <div className="pt-2 border-t border-black/8">
                <p className="text-gray-400 font-medium mb-1">Notes</p>
                <p className="text-gray-700 text-xs">{patient.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order History */}
        <div className="lg:col-span-3">
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 font-heading mb-4">Order History</h3>
            {orders.length === 0 ? (
              <p className="text-gray-400 text-sm">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {orders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => navigate(`/admin/orders/${o.id}`)}
                    className="border border-black/8 rounded-xl p-4 cursor-pointer hover:border-brand/30 hover:bg-brand/5 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-brand-2 font-semibold">{o.order_number}</span>
                      <Badge variant={o.status === 'complete' ? 'complete' : o.status === 'cancelled' ? 'cancelled' : o.status === 'paid' ? 'success' : 'pending'} label={o.status.replace('_', ' ')} />
                    </div>
                    <p className="text-sm text-gray-700">{o.order_tests?.map((t: any) => t.test_types?.name).join(', ')}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">{o.order_type.replace('_', ' ')} · {o.priority} · {new Date(o.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
