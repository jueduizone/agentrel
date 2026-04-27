'use client'

import { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'
import { sendGAEvent } from '@next/third-parties/google'
import { copyToClipboard } from '@/lib/utils'

export function CopyButton({ text, skillId }: { text: string; skillId?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle')

  const copyFailed = 'Copy failed, please copy manually'
  const copyCommand = 'Copy command'
  const copied = 'Copied!'

  async function handleCopy() {
    const ok = await copyToClipboard(text)
    setState(ok ? 'ok' : 'err')
    setTimeout(() => setState('idle'), 2000)
    if (ok && skillId) {
      sendGAEvent('event', 'skill_install', { skill_id: skillId })
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
    >
      {state === 'ok' ? <Check className="h-3.5 w-3.5 text-green-600" /> : state === 'err' ? <X className="h-3.5 w-3.5 text-red-600" /> : <Copy className="h-3.5 w-3.5" />}
      {state === 'ok' ? copied : state === 'err' ? copyFailed : copyCommand}
    </button>
  )
}
