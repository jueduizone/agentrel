'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GrantForm, type GrantFormData } from '../_components/GrantForm'

export default function NewGrantPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [keySet, setKeySet] = useState(false)

  // Load api key from localStorage on mount
  typeof window !== 'undefined' && !keySet && (() => {
    const k = localStorage.getItem('agentrel_api_key')
    if (k) { setApiKey(k); setKeySet(true) }
    else setKeySet(true)
  })()

  const handleSaveKey = () => {
    if (!keyInput.trim()) return
    localStorage.setItem('agentrel_api_key', keyInput.trim())
    setApiKey(keyInput.trim())
    setError('')
  }

  const handleSubmit = async (data: GrantFormData) => {
    if (!apiKey) { setError('请先输入 Admin API Key'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/admin/grants" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← 所有 Grants</Link>
        <h1 className="text-xl font-bold text-gray-900 mb-6">新建 Grant</h1>

        {/* API Key setup */}
        {!apiKey ? (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-yellow-800">需要 Admin API Key 才能创建 Grant</p>
            <div className="flex gap-2">
              <input
                type="password"
                name="admin_api_key"
                placeholder="输入 Admin API Key（agentrel_xxx）"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button onClick={handleSaveKey} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                确认
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between text-xs text-gray-400">
            <span>已设置 API Key: {apiKey.slice(0, 12)}…</span>
            <button onClick={() => { localStorage.removeItem('agentrel_api_key'); setApiKey(null); setKeyInput('') }} className="text-red-400 hover:text-red-600">清除</button>
          </div>
        )}

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <GrantForm onSubmit={handleSubmit} saving={saving || !apiKey} submitLabel="创建 Grant" />
      </main>
    </div>
  )
}
