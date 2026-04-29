import PublicLayout from '../components/public/PublicLayout'
import LookupForm from '../components/results/LookupForm'

export default function Results() {
  return (
    <PublicLayout>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-brand mb-2">Diagnostic Results</p>
          <h1 className="text-3xl font-bold text-gray-900 font-heading mb-3">My Results</h1>
          <p className="text-gray-500">
            Enter your tracking number and date of birth to view your diagnostic report.
          </p>
        </div>

        <div className="bg-white/85 border border-black/8 rounded-2xl p-8 backdrop-blur-sm">
          <LookupForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your tracking number was emailed to you when you submitted your application.
        </p>
      </div>
    </PublicLayout>
  )
}
