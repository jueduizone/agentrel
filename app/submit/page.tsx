'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import { Navbar } from '@/components/navbar'

type SubmitResult = {
  skill_id?: string
  name?: string
  ecosystem?: string
  tier?: string
  url?: string
  message?: string
  error?: string
}

export default function SubmitSkillPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const { t } = useLang()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ error: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground/50 hover:text-foreground/80 mb-6">
            <ArrowLeft size={16} />
            Back to AgentRel
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('submit.title')}</h1>
          <p className="text-muted-foreground/70 text-base">{t('submit.desc')}</p>
        </div>

        {/* Format guide */}
        <div className="bg-muted/50 border border-border rounded-xl p-5 mb-8">
          <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">Required format</p>
          <pre className="text-xs text-foreground/80 font-mono leading-relaxed">{`---
name: My Web3 Skill
ecosystem: ethereum
type: technical-doc
version: 1.0
---

# Content here...`}</pre>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Skill URL
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/my-skill.md"
              className="w-full border border-border/80 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full bg-black text-white py-3 rounded-lg text-sm font-semibold hover:bg-black/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('submit.submitting')}
              </>
            ) : (
              t('submit.button')
            )}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className={`mt-6 rounded-xl p-5 border ${result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-start gap-3">
              {result.error
                ? <XCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                : <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
              }
              <div>
                {result.error ? (
                  <p className="text-sm text-red-700">{result.error}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-green-800 mb-2">{result.message}</p>
                    <div className="space-y-1 text-xs text-green-700">
                      <p><span className="font-medium">Skill ID:</span> {result.skill_id}</p>
                      <p><span className="font-medium">Ecosystem:</span> {result.ecosystem}</p>
                      <p><span className="font-medium">Tier:</span> {result.tier}</p>
                      {result.url && (
                        <p>
                          <span className="font-medium">Skill URL: </span>
                          <a href={result.url} target="_blank" rel="noopener noreferrer"
                            className="underline hover:no-underline break-all">
                            {result.url}
                          </a>
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
