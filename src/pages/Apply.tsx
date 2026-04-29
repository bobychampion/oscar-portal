import PublicLayout from '../components/public/PublicLayout'
import ApplicationForm from '../components/public/ApplicationForm'

export default function Apply() {
  return (
    <PublicLayout>
      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand mb-2">Book a Diagnostic Test</p>
        <h1 className="text-3xl font-bold text-gray-900 font-heading mb-3">Apply for a Test</h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Fill in the form below and a sample collection agent will coordinate with your chosen pharmacy or clinic.
        </p>
      </div>
      <ApplicationForm />
    </PublicLayout>
  )
}
