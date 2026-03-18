'use client'

import { useState } from 'react'

type Props = {
  skillId: string
}

export function FeedbackForm({ skillId }: Props) {
  const [open, setOpen] = useState(false)
  const [issue, setIssue] = useState('')
  const [codeSnippet, setCodeSnippet] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [fix, setFix] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!issue.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: skillId,
          issue,
          code_snippet: codeSnippet || undefined,
          error_message: errorMessage || undefined,
          fix: fix || undefined,
        }),
      })

      const data = await res.json() as { message?: string; error?: string }

      if (res.ok) {
        setResult({ success: true, message: data.message ?? 'Feedback submitted!' })
        setIssue('')
        setCodeSnippet('')
        setErrorMessage('')
        setFix('')
      } else {
        setResult({ success: false, message: data.error ?? 'Submission failed.' })
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-black hover:text-foreground"
      >
        Report an issue
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-black">Report an Issue</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {result && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Issue <span className="text-red-500">*</span>
          </label>
          <textarea
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="Describe what's incorrect or outdated..."
            required
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Code Snippet (optional)
          </label>
          <textarea
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            placeholder="Paste relevant code..."
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Error Message (optional)
          </label>
          <textarea
            value={errorMessage}
            onChange={(e) => setErrorMessage(e.target.value)}
            placeholder="Paste the error message..."
            rows={2}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Suggested Fix (optional)
          </label>
          <textarea
            value={fix}
            onChange={(e) => setFix(e.target.value)}
            placeholder="Suggest the correct code or approach..."
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !issue.trim()}
          className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  )
}
