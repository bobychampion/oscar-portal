import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, FlaskConical } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { role } = useAuth()
  const [app, setApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('applications')
        .select(`
          *, pickup_locations(name, city, state),
          application_tests(test_types(id, name))
        `)
        .eq('id', id!)
        .single()

      if (!data) { navigate('/admin/applications'); return }
      setApp(data)
      setLoading(false)
    }
    load()
  }, [id, navigate])

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>

  const requestedTests = (app.application_tests ?? []).map((at: any) => at.test_types).filter(Boolean)

  return (
    <AdminLayout>
      <button
        onClick={() => navigate('/admin/applications')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Applications
      </button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">{app.full_name}</h1>
          <p className="font-mono text-brand-2 text-sm font-semibold mt-0.5">{app.tracking_number}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={app.status} />
          {(role === 'admin' || role === 'front_desk') && (
            <Button
              variant="outline"
              onClick={() => navigate('/admin/orders/new', {
                state: {
                  patient_id: app.patient_id,
                  patient_name: app.full_name,
                  preSelectedTestIds: requestedTests.map((t: any) => t.id),
                }
              })}
            >
              <ShoppingBag size={15} /> Create Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Patient Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5 text-sm space-y-3">
            <h3 className="font-semibold text-gray-900 font-heading">Patient Details</h3>
            {[
              ['Email', app.email],
              ['Phone', app.phone],
              ['Date of Birth', app.date_of_birth],
              ['Gender', app.gender],
              ['Location', `${app.city}, ${app.state}`],
              ['Pickup', app.pickup_locations ? `${app.pickup_locations.name}` : '—'],
              ['DNPL', app.wants_dnpl ? 'Yes' : 'No'],
              ['Applied', new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-gray-400 font-medium">{label}</span>
                <span className="text-gray-900 font-medium text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Tests Requested */}
        <div className="lg:col-span-3">
          <div className="bg-white/85 border border-black/8 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-900 font-heading mb-4">Tests Requested</h3>

            {requestedTests.length === 0 ? (
              <p className="text-gray-400 text-sm">No tests selected in this application.</p>
            ) : (
              <div className="space-y-2">
                {requestedTests.map((test: any) => (
                  <div key={test.id} className="flex items-center gap-3 border border-black/8 rounded-xl px-4 py-3">
                    <FlaskConical size={15} className="text-brand-2 shrink-0" />
                    <span className="text-sm font-medium text-gray-900">{test.name}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4">
              To enter results, create an order for this patient and complete it through the Orders workflow.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
