'use client'

import { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'
import { sendGAEvent } from '@next/third-parties/google'
import { useLang } from '@/context/LanguageContext'
import { copyToClipboard } from '@/lib/utils'

export function CopyButton({ text, skillId }: { text: string; skillId?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle')
  const { lang } = useLang()

  const copyFailed = lang === 'zh' ? '复制失败，请手动复制' : 'Copy failed, please copy manually'
  const copyCommand = lang === 'zh' ? '复制命令' : 'Copy command'
  const copied = lang === 'zh' ? '已复制' : 'Copied!'

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
