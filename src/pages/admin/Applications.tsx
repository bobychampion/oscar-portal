import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

interface Application {
  id: string
  tracking_number: string
  full_name: string
  status: string
  wants_dnpl: boolean
  created_at: string
  pickup_locations: { name: string } | null
  application_tests: { test_types: { name: string } }[]
}

const STATUS_OPTIONS = ['', 'pending', 'processing', 'complete', 'cancelled']

export default function Applications() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const statusFilter = searchParams.get('status') ?? ''

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase
        .from('applications')
        .select(`
          id, tracking_number, full_name, status, wants_dnpl, created_at,
          pickup_locations(name),
          application_tests(test_types(name))
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter) q = q.eq('status', statusFilter)

      const { data } = await q
      setApps((data ?? []) as unknown as Application[])
      setLoading(false)
    }
    load()
  }, [statusFilter])

  function setFilter(status: string) {
    if (status) setSearchParams({ status })
    else setSearchParams({})
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Applications</h1>
          <p className="text-gray-500 text-sm mt-0.5">All patient diagnostic applications</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s || 'all'}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors capitalize
                ${statusFilter === s ? 'bg-brand-2 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No applications found.</div>
      ) : (
        <div className="bg-white/85 border border-black/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Tracking #</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Patient</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Tests</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">DNPL</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr
                  key={app.id}
                  onClick={() => navigate(`/admin/applications/${app.id}`)}
                  className="border-b border-black/5 last:border-0 hover:bg-brand-2/3 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono font-semibold text-brand-2 text-xs">{app.tracking_number}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{app.full_name}</td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-[220px] truncate">
                    {app.application_tests?.map((at: any) => at.test_types?.name).filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={app.status as any} />
                  </td>
                  <td className="px-5 py-3.5">
                    {app.wants_dnpl && <span className="text-xs bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">DNPL</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
