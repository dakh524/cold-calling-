import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  user: User | null
  role: 'admin' | 'employee' | null
  status: 'pending' | 'active' | 'suspended' | null
  onboardingCompleted: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, status: null, onboardingCompleted: false, loading: true })

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'employee' | null>(null)
  const [status, setStatus] = useState<'pending' | 'active' | 'suspended' | null>(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchRole = async (userId: string, email: string | undefined) => {
    // If this is the hardcoded admin, force their role to admin in the database so RLS works
    if (email === 'mrdhivakarofficial@gmail.com') {
      await supabase.from('employees').upsert({
        id: userId,
        email: email,
        name: 'Admin',
        role: 'admin',
        status: 'active',
        onboarding_completed: true
      })
    }

    const { data } = await supabase.from('employees').select('role, status, onboarding_completed').eq('id', userId).single()
    if (data) {
      setRole(data.role)
      setStatus(data.status)
      setOnboardingCompleted(data.onboarding_completed || false)
    } else {
      // New user not in DB yet (and not admin)
      setRole('employee')
      setStatus('pending')
      setOnboardingCompleted(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchRole(currentUser.id, currentUser.email).finally(() => setLoading(false))
      } else {
        setRole(null)
        setStatus(null)
        setOnboardingCompleted(false)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetchRole(currentUser.id, currentUser.email)
      } else {
        setRole(null)
        setStatus(null)
        setOnboardingCompleted(false)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, status, onboardingCompleted, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
