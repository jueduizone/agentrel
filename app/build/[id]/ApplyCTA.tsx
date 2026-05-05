'use client'
import Link from 'next/link'
import { useState } from 'react'
import { copyToClipboard } from '@/lib/utils'
import { clientSiteUrl } from '@/lib/client-site-url'

interface Props {
  grantId: string
  isOpen: boolean
}

export function ApplyCTA({ grantId, isOpen }: Props) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const contextUrl = clientSiteUrl(`/api/v1/grants/${grantId}/context.md`)

  const handleAgentCopy = async () => {
    const ok = await copyToClipboard(contextUrl)
    if (ok) {
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 3000)
    }
  }

  if (!isOpen) {
    return <p className="text-center text-sm text-muted-foreground/50 py-2">此 Grant 已截止，无法申请</p>
  }

  const secondaryClass = copyError
    ? 'bg-red-500/10 text-red-600 border border-red-500/30'
    : copied
    ? 'bg-green-500/10 text-green-600 border border-green-500/30'
    : 'border border-border text-foreground hover:bg-muted'

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto pt-2">
      {/* Primary: Apply now */}
      <Link
        href={`/build/${grantId}/apply`}
        className="group inline-flex items-center justify-center gap-2 w-full px-7 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-[0.98] whitespace-nowrap"
      >
        立即申请
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </Link>

      {/* Secondary: Agent apply — copies context API URL */}
      <button
        onClick={handleAgentCopy}
        className={`inline-flex items-center justify-center gap-2 w-full px-7 py-3 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] whitespace-nowrap ${secondaryClass}`}
      >
        {copyError ? <><span>❌</span> 复制失败，请手动复制</> : copied ? <><span>✅</span> 已复制</> : <><span>🤖</span> Agent 帮我申请</>}
      </button>

      <p className="text-xs text-muted-foreground/50 text-center -mt-1">
        {copyError
          ? contextUrl
          : copied
          ? '已复制 Grant Context URL，粘贴给你的 AI Agent 即可申请'
          : '立即申请需登录 · Agent 申请复制 Grant Context (.md) 给 AI'}
      </p>
    </div>
  )
}
