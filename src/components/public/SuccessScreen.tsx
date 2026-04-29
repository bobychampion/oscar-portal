import { useState } from 'react'
import { Copy, Check, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'

export default function SuccessScreen({ trackingNumber }: { trackingNumber: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(trackingNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto text-center py-8">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <Check size={32} className="text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 font-heading mb-2">Application Submitted!</h2>
      <p className="text-gray-500 mb-8">A confirmation email is on its way. Save your tracking number below.</p>

      <div className="bg-gradient-to-r from-brand to-brand-2 rounded-2xl p-6 mb-6">
        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-2">Your Tracking Number</p>
        <p className="text-white text-3xl font-bold font-heading tracking-widest mb-4">{trackingNumber}</p>
        <button
          onClick={copy}
          className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-6">
        When your results are ready, visit <strong>My Results</strong> and enter this number along with your date of birth to view them.
      </p>

      <Link to="/results">
        <Button variant="outline" className="gap-2">
          Check results later <ArrowRight size={16} />
        </Button>
      </Link>
    </div>
  )
}
