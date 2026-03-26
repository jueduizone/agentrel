'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { sendGAEvent } from '@next/third-parties/google'

export function CopyButton({ text, skillId }: { text: string; skillId?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    if (skillId) {
      sendGAEvent('event', 'skill_install', { skill_id: skillId })
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-black hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy command'}
    </button>
  )
}
