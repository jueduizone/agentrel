'use client'

import { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import { copyToClipboard } from '@/lib/utils'

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle')
  const { lang } = useLang()

  const copyFailed = lang === 'zh' ? '复制失败，请手动复制' : 'Copy failed, please copy manually'
  const copied = lang === 'zh' ? '已复制' : 'Copied!'
  const copy = lang === 'zh' ? '复制' : 'Copy'

  const handleCopy = async () => {
    const ok = await copyToClipboard(text)
    setState(ok ? 'ok' : 'err')
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title={state === 'err' ? copyFailed : state === 'ok' ? copied : copy}
      className="ml-2 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {state === 'ok' ? <Check size={14} className="text-green-600" /> : state === 'err' ? <X size={14} className="text-red-600" /> : <Copy size={14} />}
    </button>
  )
}
