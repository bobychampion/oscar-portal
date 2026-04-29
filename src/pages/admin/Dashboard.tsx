import { useEffect, useState } from 'react'
import { ClipboardList, Clock, CheckCircle, CreditCard } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import StatCard from '../../components/admin/StatCard'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'

interface Stats { total: number; pending: number; complete: number; dnpl: number }

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function load() {
      const [total, pending, complete, dnpl] = await Promise.all([
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'complete'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('wants_dnpl', true),
      ])
      setStats({
        total: total.count ?? 0,
        pending: pending.count ?? 0,
        complete: complete.count ?? 0,
        dnpl: dnpl.count ?? 0,
      })
    }
    load()
  }, [])

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 font-heading mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Overview of Oscar Labs diagnostic operations.</p>

      {!stats ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total Applications" value={stats.total} icon={ClipboardList} color="blue" />
          <StatCard label="Pending Results" value={stats.pending} icon={Clock} color="amber" />
          <StatCard label="Completed" value={stats.complete} icon={CheckCircle} color="green" />
          <StatCard label="DNPL Requests" value={stats.dnpl} icon={CreditCard} color="teal" />
        </div>
      )}
    </AdminLayout>
  )
}
