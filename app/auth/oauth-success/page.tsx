'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function OAuthSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    async function finalize() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth/login'); return }

      // Fetch api_key from our users table
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.api_key) {
          localStorage.setItem('agentrel_api_key', data.api_key)
        }
      }
      router.replace('/')
    }
    finalize()
  }, [router])

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground/70">Completing sign in...</p>
      </div>
    </div>
  )
}
