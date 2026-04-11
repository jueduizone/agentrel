'use client'
import Link from 'next/link'
import { useState } from 'react'

interface Props {
  grantId: string
  isOpen: boolean
}

export function ApplyCTA({ grantId, isOpen }: Props) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const handleAgentCopy = async () => {
    const url = `https://agentrel.vercel.app/api/v1/grants/${grantId}/context`
    let success = false
    try {
      await navigator.clipboard.writeText(url)
      success = true
    } catch {
      try {
        const el = document.createElement('textarea')
        el.value = url
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
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 3000)
    }
  }

  if (!isOpen) {
    return <p className="text-center text-sm text-gray-400 py-2">此 Grant 已截止，无法申请</p>
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto pt-2">
      {/* Primary: Apply now */}
      <Link
        href={`/build/${grantId}/apply`}
        className="group inline-flex items-center justify-center gap-2 w-full px-7 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition-all shadow-sm hover:shadow-md active:scale-[0.98] whitespace-nowrap"
      >
        立即申请
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </Link>

      {/* Secondary: Agent apply — copies context API URL */}
      <button
        onClick={handleAgentCopy}
        className={`inline-flex items-center justify-center gap-2 w-full px-7 py-3 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] whitespace-nowrap
          ${copyError ? 'bg-red-50 text-red-600 border border-red-300' : copied ? 'bg-green-50 text-green-700 border border-green-300' : 'border border-transparent text-indigo-700 hover:bg-indigo-50'}`}
        style={copied || copyError ? {} : {
          background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #6366f1, #a855f7) border-box',
          border: '1.5px solid transparent',
        }}
      >
        {copyError ? <><span>❌</span> 复制失败，请手动复制</> : copied ? <><span>✅</span> 已复制</> : <><span>🤖</span> Agent 帮我申请</>}
      </button>

      <p className="text-xs text-gray-400 text-center -mt-1">
        {copyError
          ? `https://agentrel.vercel.app/api/v1/grants/${grantId}/context`
          : copied
          ? '已复制 Grant Context URL，粘贴给你的 AI Agent 即可申请'
          : '立即申请需登录 · Agent 申请复制 Grant Context URL 给 AI'}
      </p>
    </div>
  )
}
