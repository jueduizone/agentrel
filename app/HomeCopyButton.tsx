'use client'

import { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'
import { copyToClipboard } from '@/lib/utils'

export function HomeCopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle')

  async function handleCopy() {
    const ok = await copyToClipboard(text)
    setState(ok ? 'ok' : 'err')
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded p-1.5 text-background/50 transition-colors hover:bg-background/10 hover:text-background"
      aria-label={state === 'err' ? 'Copy failed, please copy manually' : 'Copy command'}
      title={state === 'err' ? 'Copy failed, please copy manually' : state === 'ok' ? 'Copied!' : 'Copy'}
    >
      {state === 'ok' ? <Check className="h-4 w-4 text-green-400" /> : state === 'err' ? <X className="h-4 w-4 text-red-400" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}
