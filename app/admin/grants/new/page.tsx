'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GrantForm, type GrantFormData } from '../_components/GrantForm'

export default function NewGrantPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('agentrel_api_key') : null

  const handleSubmit = async (data: GrantFormData) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      router.push(`/admin/grants/${json.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/admin/grants" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← 所有 Grants</Link>
        <h1 className="text-xl font-bold text-gray-900 mb-6">新建 Grant</h1>
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <GrantForm onSubmit={handleSubmit} saving={saving} submitLabel="创建 Grant" />
      </main>
    </div>
  )
}
