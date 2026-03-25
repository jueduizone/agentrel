'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopySkillUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Extract a short display label from the URL
  const displayUrl = url.replace('https://raw.githubusercontent.com/', 'github:').replace(/\/main\/.*/, '').replace('https://monskills.vercel.app/', 'monskills/')

  return (
    <button
      onClick={handleCopy}
      title={url}
      className="flex w-full items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-black hover:text-foreground overflow-hidden"
    >
      {copied ? <Check className="h-3 w-3 shrink-0 text-green-600" /> : <Copy className="h-3 w-3 shrink-0" />}
      <span className="truncate font-mono">{copied ? 'Copied!' : url}</span>
    </button>
  )
}
