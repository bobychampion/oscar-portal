import { useEffect, useRef, useState } from 'react'
import { Upload, Trash2, CheckCircle } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function Profile() {
  const { user, role } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [msg, setMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('user_profiles').select('full_name, role, signature_url').eq('id', user.id).single()
      .then(({ data }) => {
        setProfile(data)
        if (data?.signature_url) loadSignatureUrl(data.signature_url)
        setLoading(false)
      })
  }, [user])

  async function loadSignatureUrl(path: string) {
    const { data } = await supabase.storage.from('signatures').createSignedUrl(path, 60 * 60)
    if (data?.signedUrl) setSignatureUrl(data.signedUrl)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    setMsg('')

    const ext = file.name.split('.').pop()
    const path = `${user.id}/signature.${ext}`

    const { error } = await supabase.storage.from('signatures').upload(path, file, { upsert: true })
    if (error) { setMsg('Upload failed. Please try again.'); setUploading(false); return }

    await supabase.from('user_profiles').update({ signature_url: path }).eq('id', user.id)
    setProfile((p: any) => ({ ...p, signature_url: path }))
    await loadSignatureUrl(path)
    setUploading(false)
    setMsg('Signature uploaded successfully.')
    setTimeout(() => setMsg(''), 3000)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleRemove() {
    if (!user || !profile?.signature_url) return
    setRemoving(true)
    await supabase.storage.from('signatures').remove([profile.signature_url])
    await supabase.from('user_profiles').update({ signature_url: null }).eq('id', user.id)
    setProfile((p: any) => ({ ...p, signature_url: null }))
    setSignatureUrl(null)
    setRemoving(false)
    setMsg('Signature removed.')
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <AdminLayout><div className="flex justify-center py-16"><Spinner /></div></AdminLayout>

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-900 font-heading mb-6">My Profile</h1>

      <div className="max-w-lg space-y-6">
        {/* Info */}
        <div className="bg-white/85 border border-black/8 rounded-2xl p-6 space-y-3 text-sm">
          <h3 className="font-semibold text-gray-900 font-heading">Account Details</h3>
          {[
            ['Name', profile?.full_name ?? '—'],
            ['Email', user?.email ?? '—'],
            ['Role', role ? role.replace('_', ' ') : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <span className="text-gray-400 font-medium">{label}</span>
              <span className="text-gray-900 font-medium capitalize">{value}</span>
            </div>
          ))}
        </div>

        {/* Signature */}
        <div className="bg-white/85 border border-black/8 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 font-heading mb-1">Report Signature</h3>
          <p className="text-xs text-gray-400 mb-5">
            This signature will appear on diagnostic reports you submit. Use a clear image with a white or transparent background (PNG recommended, max 512 KB).
          </p>

          {signatureUrl ? (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Current Signature</p>
              <div className="border border-black/8 rounded-xl p-4 bg-gray-50 flex items-center justify-center min-h-[80px]">
                <img src={signatureUrl} alt="Your signature" className="max-h-16 max-w-full object-contain" />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-black/10 rounded-xl p-6 text-center mb-4">
              <p className="text-sm text-gray-400">No signature uploaded yet</p>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
            <Button variant="outline" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> {signatureUrl ? 'Replace Signature' : 'Upload Signature'}
            </Button>
            {signatureUrl && (
              <Button variant="ghost" loading={removing} onClick={handleRemove} className="text-red-500 hover:text-red-600">
                <Trash2 size={15} /> Remove
              </Button>
            )}
          </div>

          {msg && (
            <p className={`text-sm mt-4 flex items-center gap-1.5 ${msg.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>
              {!msg.includes('failed') && <CheckCircle size={14} />}
              {msg}
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
