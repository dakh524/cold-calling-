import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Onboarding() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [upiId, setUpiId] = useState('')
  const [identityFile, setIdentityFile] = useState<File | null>(null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || ''
        if ((encoded.length % 4) > 0) {
          encoded += '='.repeat(4 - (encoded.length % 4))
        }
        resolve(encoded)
      }
      reader.onerror = error => reject(error)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identityFile || !profileImageFile || !fullName || !phone || !upiId) {
      setError('Please fill all fields and upload both files.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const identityBase64 = await getBase64(identityFile)
      const profileImageBase64 = await getBase64(profileImageFile)

      const webhookUrl = import.meta.env.VITE_GOOGLE_WEBHOOK_URL
      let identityUrl = 'N/A'
      let profileImageUrl = 'N/A'

      if (webhookUrl) {
        // Send to Google Sheets Webhook which uploads to Drive
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            employeeId: user?.id,
            email: user?.email,
            fullName,
            phone,
            upiId,
            identityFile: {
              name: `Identity_${user?.id}_${identityFile.name}`,
              type: identityFile.type,
              base64: identityBase64
            },
            profileImageFile: {
              name: `Profile_${user?.id}_${profileImageFile.name}`,
              type: profileImageFile.type,
              base64: profileImageBase64
            }
          })
        })

        const data = await response.json()
        if (data.status === 'success') {
          identityUrl = data.identityUrl || 'N/A'
          profileImageUrl = data.profileImageUrl || 'N/A'
        }
      }

      // Update Supabase Database
      const { error: dbError } = await supabase
        .from('employees')
        .upsert({
          id: user?.id,
          email: user?.email,
          name: fullName,
          phone,
          upi_id: upiId,
          identity_proof_url: identityUrl,
          profile_image_url: profileImageUrl,
          onboarding_completed: true,
          status: 'pending',
          role: 'employee'
        })

      if (dbError) throw dbError

      // Force a reload to update context
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message || 'An error occurred during onboarding.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Your Profile</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please provide your details to continue.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Email</label>
            <input
              type="email"
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              value={user?.email || ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Number</label>
            <input
              type="tel"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment UPI ID</label>
            <input
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="example@upi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Identity (Aadhaar or PAN Card)</label>
            <input
              type="file"
              required
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, setIdentityFile)}
              className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-gray-700 dark:file:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Image</label>
            <input
              type="file"
              required
              accept="image/*"
              onChange={(e) => handleFileChange(e, setProfileImageFile)}
              className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-gray-700 dark:file:text-gray-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
