'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type GrantField = { name: string; label: string; type: 'text' | 'url' | 'select'; required?: boolean; options?: string[] }
type Grant = {
  id: string; title: string; reward: string | null; deadline: string | null
  status: string; application_schema: GrantField[] | null
}

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [grant, setGrant] = useState<Grant | null>(null)
  const [loading, setLoading] = useState(true)
  const [pitch, setPitch] = useState('')
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const key = localStorage.getItem('agentrel_api_key')
    if (!key) { router.replace('/auth/login'); return }
    setApiKey(key)

    fetch(`/api/v1/grants/${id}`)
      .then(r => r.json())
      .then(d => { setGrant(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey || !grant) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/v1/grants/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ pitch, custom_fields: customFields }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">加载中...</p>
    </div>
  )

  if (!grant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Grant 不存在</p>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-md w-full">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">申请已提交！</h2>
        <p className="text-sm text-gray-500 mb-6">我们会尽快审核你的申请，结果通过邮件通知。</p>
        <Link href="/build" className="text-indigo-600 text-sm font-medium hover:underline">← 返回 Grants 列表</Link>
      </div>
    </div>
  )

  const extraFields: GrantField[] = Array.isArray(grant.application_schema) ? grant.application_schema : []

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-xl mx-auto px-6 py-10">
        <Link href={`/build/${id}`} className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← 返回详情</Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">{grant.title}</h1>
          {grant.reward && <p className="text-indigo-700 font-semibold text-sm mb-6">{grant.reward}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                申请理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={pitch}
                onChange={e => setPitch(e.target.value)}
                required
                rows={5}
                placeholder="描述你的项目背景、技术方案、为何适合本 Grant..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {extraFields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.type === 'select' && field.options ? (
                  <select
                    value={customFields[field.name] ?? ''}
                    onChange={e => setCustomFields(p => ({ ...p, [field.name]: e.target.value }))}
                    required={field.required}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">请选择...</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={customFields[field.name] ?? ''}
                    onChange={e => setCustomFields(p => ({ ...p, [field.name]: e.target.value }))}
                    required={field.required}
                    placeholder={field.type === 'url' ? 'https://' : ''}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            ))}

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !pitch.trim()}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中...' : '提交申请'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
