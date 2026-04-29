import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { applicationSchema } from '../../lib/validations'
import type { ApplicationFormData } from '../../lib/validations'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import TestTypeSelector from './TestTypeSelector'
import DnplToggle from './DnplToggle'
import SuccessScreen from './SuccessScreen'

const STEPS = ['Personal Info', 'Location', 'Tests', 'Financing', 'Review']

interface TestType { id: string; name: string; category: string; description?: string }
interface PickupLocation { id: string; name: string; city: string; state: string }

export default function ApplicationForm() {
  const [step, setStep] = useState(0)
  const [testTypes, setTestTypes] = useState<TestType[]>([])
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { wants_dnpl: false, test_type_ids: [], gender: undefined },
  })

  const watchedTestIds = watch('test_type_ids') ?? []
  const watchedDnpl = watch('wants_dnpl') ?? false
  const allValues = watch()

  useEffect(() => {
    supabase.functions.invoke('test-types').then(({ data }) => { if (data) setTestTypes(data) })
    supabase.functions.invoke('pickup-locations').then(({ data }) => { if (data) setPickupLocations(data) })
  }, [])

  const stepFields: (keyof ApplicationFormData)[][] = [
    ['full_name', 'email', 'phone', 'date_of_birth', 'gender'],
    ['city', 'state', 'pickup_location_id'],
    ['test_type_ids'],
    ['wants_dnpl'],
    [],
  ]

  async function nextStep() {
    const valid = await trigger(stepFields[step] as any)
    if (valid) setStep(s => s + 1)
  }

  async function onSubmit(data: ApplicationFormData) {
    setLoading(true)
    setSubmitError('')
    try {
      const { data: result, error } = await supabase.functions.invoke('apply', { body: data })
      if (error || !result?.tracking_number) throw new Error(error?.message ?? 'Submission failed')
      setTrackingNumber(result.tracking_number)
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (trackingNumber) return <SuccessScreen trackingNumber={trackingNumber} />

  const selectedLocation = pickupLocations.find(l => l.id === allValues.pickup_location_id)
  const selectedTests = testTypes.filter(t => watchedTestIds.includes(t.id))

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
              ${i === step ? 'bg-brand-2 text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white/85 border border-black/8 rounded-2xl p-8 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-gray-900 font-heading mb-6">{STEPS[step]}</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4">
              <Input label="Full Name *" placeholder="Adaeze Okonkwo" error={errors.full_name?.message} {...register('full_name')} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Email Address *" type="email" placeholder="adaeze@email.com" error={errors.email?.message} {...register('email')} />
                <Input label="Phone Number *" type="tel" placeholder="+234 801 234 5678" error={errors.phone?.message} {...register('phone')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Date of Birth *" type="date" error={errors.date_of_birth?.message} {...register('date_of_birth')} />
                <Select
                  label="Gender *"
                  placeholder="Select gender"
                  error={errors.gender?.message}
                  options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'other', label: 'Other' }]}
                  {...register('gender')}
                />
              </div>
            </div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="City *" placeholder="Lagos" error={errors.city?.message} {...register('city')} />
                <Input label="State *" placeholder="Lagos" error={errors.state?.message} {...register('state')} />
              </div>
              <Select
                label="Sample Collection Point *"
                placeholder="Select a partner pharmacy or clinic"
                error={errors.pickup_location_id?.message}
                options={pickupLocations.map(l => ({ value: l.id, label: `${l.name} — ${l.city}, ${l.state}` }))}
                {...register('pickup_location_id')}
              />
            </div>
          )}

          {/* Step 2: Test Selection */}
          {step === 2 && (
            <TestTypeSelector
              testTypes={testTypes}
              selected={watchedTestIds}
              onChange={ids => setValue('test_type_ids', ids, { shouldValidate: true })}
              error={errors.test_type_ids?.message as string}
            />
          )}

          {/* Step 3: DNPL */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm mb-4">Would you like to use CareCova financing to pay for your tests later?</p>
              <DnplToggle value={watchedDnpl} onChange={v => setValue('wants_dnpl', v)} />
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Name', allValues.full_name],
                  ['Email', allValues.email],
                  ['Phone', allValues.phone],
                  ['DOB', allValues.date_of_birth],
                  ['Gender', allValues.gender],
                  ['City / State', `${allValues.city}, ${allValues.state}`],
                  ['Pickup', selectedLocation ? `${selectedLocation.name}` : '—'],
                  ['DNPL', watchedDnpl ? 'Yes' : 'No'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400 font-semibold">{label}</p>
                    <p className="text-gray-900 font-medium">{value || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 font-semibold mb-2">Tests Selected ({selectedTests.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTests.map(t => (
                    <span key={t.id} className="bg-brand-2/10 text-brand-2 text-xs font-semibold px-2.5 py-1 rounded-full">{t.name}</span>
                  ))}
                </div>
              </div>
              {submitError && <p className="text-sm text-red-500 text-center">{submitError}</p>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={16} /> Back
              </Button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Next <ChevronRight size={16} />
              </Button>
            ) : (
              <Button type="submit" loading={loading}>
                Submit Application
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
