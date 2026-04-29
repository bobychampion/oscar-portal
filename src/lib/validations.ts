import { z } from 'zod'

export const applicationSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Phone number is required'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], { message: 'Please select a gender' }),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pickup_location_id: z.string().uuid('Please select a pickup location'),
  test_type_ids: z.array(z.string().uuid()).min(1, 'Select at least one test'),
  wants_dnpl: z.boolean(),
})

export type ApplicationFormData = z.infer<typeof applicationSchema>

export const resultsLookupSchema = z.object({
  tracking_number: z.string().regex(/^OSC-\d{4}-\d{4,6}$/, 'Enter a valid tracking number (e.g. OSC-2026-1234)'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth is required'),
})

export type ResultsLookupData = z.infer<typeof resultsLookupSchema>

export const resultEntrySchema = z.object({
  result_value: z.string().min(1, 'Result value is required'),
  unit: z.string().optional(),
  reference_range: z.string().optional(),
  interpretation: z.enum(['normal', 'abnormal', 'critical'], { message: 'Select an interpretation' }),
  notes: z.string().optional(),
})

export type ResultEntry = z.infer<typeof resultEntrySchema> & {
  test_type_id: string
  test_name: string
}
