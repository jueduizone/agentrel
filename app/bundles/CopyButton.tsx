'use client'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    let success = false
    try {
      await navigator.clipboard.writeText(text)
      success = true
    } catch {
      try {
        const el = document.createElement('textarea')
        el.value = text
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        success = document.execCommand('copy')
        document.body.removeChild(el)
      } catch {
        success = false
      }
    }
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="复制命令"
      className="ml-2 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  )
}
