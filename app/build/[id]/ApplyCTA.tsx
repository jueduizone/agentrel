'use client'
import Link from 'next/link'
import { useState } from 'react'

export function ApplyCTA({ grantId, isOpen }: { grantId: string; isOpen: boolean }) {
  const [copied, setCopied] = useState(false)
  const skillUrl = `https://agentrel.vercel.app/skills/grant-${grantId}`

  const handleAgentCopy = async () => {
    try {
      await navigator.clipboard.writeText(skillUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = skillUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
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

      {/* Secondary: Agent apply — gradient border */}
      <button
        onClick={handleAgentCopy}
        className={`inline-flex items-center justify-center gap-2 w-full px-7 py-3 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] whitespace-nowrap
          ${copied ? 'bg-green-50 text-green-700 border border-green-300' : 'border border-transparent text-indigo-700 hover:bg-indigo-50'}`}
        style={copied ? {} : {
          background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #6366f1, #a855f7) border-box',
          border: '1.5px solid transparent',
        }}
      >
        {copied ? <><span>✅</span> 已复制</> : <><span>🤖</span> Agent 帮我申请</>}
      </button>

      <p className="text-xs text-gray-400 text-center -mt-1">
        立即申请需登录 · Agent 申请将 Skill URL 复制到剪贴板
      </p>
    </div>
  )
}
