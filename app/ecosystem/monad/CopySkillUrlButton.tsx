'use client'

import { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'
import { copyToClipboard } from '@/lib/utils'

export function CopySkillUrlButton({ url }: { url: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle')

  async function handleCopy() {
    const ok = await copyToClipboard(url)
    setState(ok ? 'ok' : 'err')
    setTimeout(() => setState('idle'), 2000)
  }

  // Extract a short display label from the URL
  const displayUrl = url.replace('https://raw.githubusercontent.com/', 'github:').replace(/\/main\/.*/, '').replace('https://monskills.vercel.app/', 'monskills/')

  return (
    <button
      onClick={handleCopy}
      title={url}
      className="flex w-full items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/60 hover:text-foreground overflow-hidden"
    >
      {state === 'ok' ? <Check className="h-3 w-3 shrink-0 text-green-600" /> : state === 'err' ? <X className="h-3 w-3 shrink-0 text-red-600" /> : <Copy className="h-3 w-3 shrink-0" />}
      <span className="truncate font-mono">{state === 'ok' ? 'Copied!' : state === 'err' ? 'Copy failed, please copy manually' : url}</span>
    </button>
  )
}
