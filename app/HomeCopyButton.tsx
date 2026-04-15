'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function HomeCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded p-1.5 text-background/50 transition-colors hover:bg-background/10 hover:text-background"
      aria-label="Copy command"
    >
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}
