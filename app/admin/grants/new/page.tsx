'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GrantForm, type GrantFormData, type SponsorOption } from '../_components/GrantForm'

export default function NewGrantPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [sponsors, setSponsors] = useState<SponsorOption[]>([])
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  // Verify the stored key is an admin on mount; redirect to login if not
  useEffect(() => {
    const key = localStorage.getItem('agentrel_api_key')
    if (!key) { router.replace('/auth/login?redirect=/admin/grants/new'); return }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${key}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.role !== 'admin') {
          router.replace('/auth/login?redirect=/admin/grants/new')
        } else {
          setAuthChecked(true)
        }
      })
      .catch(() => router.replace('/auth/login?redirect=/admin/grants/new'))
  }, [router])

  const handleSubmit = async (data: GrantFormData) => {
    const key = localStorage.getItem('agentrel_api_key')
    if (!key) { router.replace('/auth/login'); return }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(data),
      })
      const ct = res.headers.get('content-type') ?? ''
      const json = ct.includes('application/json') ? await res.json() : { error: `HTTP ${res.status}` }
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      router.push(`/admin/grants/${json.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center">
        <p className="text-sm text-muted-foreground/50">验证身份中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/admin/grants" className="text-sm text-muted-foreground/50 hover:text-muted-foreground mb-6 inline-block">← 所有 Grants</Link>
        <h1 className="text-xl font-bold text-foreground mb-6">新建 Grant</h1>
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <GrantForm onSubmit={handleSubmit} saving={saving} submitLabel="创建 Grant" sponsors={sponsors} />
      </main>
    </div>
  )
}
