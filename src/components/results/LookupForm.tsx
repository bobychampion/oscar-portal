import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Input from '../ui/Input'
import Button from '../ui/Button'

export default function LookupForm() {
  const [tracking, setTracking] = useState('')
  const [dob, setDob] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: fnError } = await supabase.functions.invoke('results-lookup', {
      body: { tracking_number: tracking.trim().toUpperCase(), date_of_birth: dob }
    })

    setLoading(false)

    if (fnError) {
      setError('Something went wrong. Please try again.')
      return
    }

    if (data?.error) {
      setError(data.error)
      return
    }

    if (data?.status !== 'complete') {
      setError(data?.message ?? 'Results are not yet available. Please check back later.')
      return
    }

    navigate(`/results/${encodeURIComponent(tracking.trim().toUpperCase())}`, { state: { data } })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Tracking Number"
        value={tracking}
        onChange={e => setTracking(e.target.value)}
        placeholder="OSC-2026-1234"
        required
      />
      <Input
        label="Date of Birth"
        type="date"
        value={dob}
        onChange={e => setDob(e.target.value)}
        required
      />
      {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
      <Button type="submit" loading={loading} className="w-full gap-2">
        <Search size={16} /> Find My Results
      </Button>
    </form>
  )
}
