'use client'
import Link from 'next/link'
import { useState } from 'react'

interface GrantInfo {
  id: string
  title: string
  sponsor?: string | null
  reward?: string | null
  deadline?: string | null
  description?: string | null
  source_type?: string
  required_skills?: string[] | null
}

interface Props {
  grantId: string
  isOpen: boolean
  grant?: GrantInfo
}

function buildMarkdown(grant: GrantInfo): string {
  const deadline = grant.deadline
    ? new Date(grant.deadline).toLocaleDateString('zh-CN')
    : '未设置'
  const type = grant.source_type === 'external' ? 'External Grant' : 'Native Grant'
  const skills = Array.isArray(grant.required_skills) && grant.required_skills.length > 0
    ? grant.required_skills.join(', ')
    : '无特殊要求'

  return `# ${grant.title}

**Sponsor:** ${grant.sponsor ?? '未知'}
**奖励:** ${grant.reward ?? '待定'}
**截止日期:** ${deadline}
**类型:** ${type}

## 描述
${grant.description ?? '请查看详情页了解更多。'}

## 申请要求
${skills}

## 如何申请
POST https://agentrel.vercel.app/api/build/${grant.id}/apply
需要登录，Authorization: Bearer <your_api_key>

请求体：
\`\`\`json
{
  "pitch": "你的申请理由",
  "custom_fields": {}
}
\`\`\`

## 示例 Prompt
帮我申请这个 Grant，我的 GitHub 是 [你的 GitHub]，项目描述是 [你的项目描述]`
}

export function ApplyCTA({ grantId, isOpen, grant }: Props) {
  const [copied, setCopied] = useState(false)

  const handleAgentCopy = async () => {
    const md = grant ? buildMarkdown(grant) : `Grant ID: ${grantId}\nPOST https://agentrel.vercel.app/api/build/${grantId}/apply`
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      const el = document.createElement('textarea')
      el.value = md
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

      {/* Secondary: Agent apply — copies Markdown */}
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
        {copied
          ? '已复制 Grant 信息，粘贴给你的 AI Agent 即可申请'
          : '立即申请需登录 · Agent 申请复制 Grant 信息给 AI'}
      </p>
    </div>
  )
}
