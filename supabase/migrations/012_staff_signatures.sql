-- Add signature_url to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS signature_url text;

-- Create signatures storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signatures', 'signatures', false, 524288, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: staff can upload/update their own signature
DROP POLICY IF EXISTS "Staff manage own signature" ON storage.objects;
CREATE POLICY "Staff manage own signature"
  ON storage.objects FOR ALL
  USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role (edge functions) can read any signature for signed URLs
DROP POLICY IF EXISTS "Service role read signatures" ON storage.objects;
CREATE POLICY "Service role read signatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'signatures');
