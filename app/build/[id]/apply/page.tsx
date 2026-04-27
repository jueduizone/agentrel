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
      setError(err instanceof Error ? err.message : 'Submission failed, please try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center">
      <p className="text-muted-foreground/50 text-sm">Loading...</p>
    </div>
  )

  if (!grant) return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center">
      <p className="text-muted-foreground/50 text-sm">Grant not found</p>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center px-4">
      <div className="bg-background rounded-2xl border border-border p-10 text-center max-w-md w-full">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-foreground mb-2">Application submitted</h2>
        <p className="text-sm text-muted-foreground/70 mb-6">We will review your application and notify you by email.</p>
        <Link href="/build" className="text-indigo-600 text-sm font-medium hover:underline">← Back to Build</Link>
      </div>
    </div>
  )

  const extraFields: GrantField[] = Array.isArray(grant.application_schema) ? grant.application_schema : []

  return (
    <div className="min-h-screen bg-muted/50">
      <main className="max-w-xl mx-auto px-6 py-10">
        <Link href={`/build/${id}`} className="text-sm text-muted-foreground/50 hover:text-muted-foreground mb-6 inline-block">← Back to details</Link>

        <div className="bg-background rounded-2xl border border-border p-8">
          <h1 className="text-xl font-bold text-foreground mb-1">{grant.title}</h1>
          {grant.reward && <p className="text-indigo-700 font-semibold text-sm mb-6">{grant.reward}</p>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                Application pitch <span className="text-red-500">*</span>
              </label>
              <textarea
                value={pitch}
                onChange={e => setPitch(e.target.value)}
                required
                rows={5}
                placeholder="Describe your project background, technical approach, and why it fits this grant..."
                className="w-full border border-border/80 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {extraFields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">
                  {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.type === 'select' && field.options ? (
                  <select
                    value={customFields[field.name] ?? ''}
                    onChange={e => setCustomFields(p => ({ ...p, [field.name]: e.target.value }))}
                    required={field.required}
                    className="w-full border border-border/80 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={customFields[field.name] ?? ''}
                    onChange={e => setCustomFields(p => ({ ...p, [field.name]: e.target.value }))}
                    required={field.required}
                    placeholder={field.type === 'url' ? 'https://' : ''}
                    className="w-full border border-border/80 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              {submitting ? 'Submitting...' : 'Submit application'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
