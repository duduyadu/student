'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserMeta } from '@/lib/auth'
import type { UserMeta } from '@/lib/types'

export function useAdminAuth() {
  const router = useRouter()
  const [user, setUser] = useState<UserMeta | null>(null)

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const meta = getUserMeta(session)
      if (meta.role === 'student') { router.push('/portal'); return }
      setUser(meta)
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return { user, handleLogout }
}
