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
    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
      <Link href={`/build/${grantId}/apply`}
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
        立即申请
      </Link>
      <button
        onClick={handleAgentCopy}
        className="inline-flex items-center gap-2 px-6 py-3 border border-indigo-300 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
      >
        {copied ? '✅ 已复制' : '🤖 Agent 帮我申请'}
      </button>
      <p className="text-xs text-gray-400 w-full text-center -mt-1">
        立即申请需要登录 · Agent 申请复制 Skill URL 到剪贴板
      </p>
    </div>
  )
}
