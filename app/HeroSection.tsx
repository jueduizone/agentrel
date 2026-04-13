'use client'

import { useLang } from '@/context/LanguageContext'
import { HomeCopyButton } from './HomeCopyButton'
import Link from 'next/link'

const SCENARIOS_EN = [
  { icon: '💻', title: 'Build a dApp', desc: 'Pick skills by chain for development', href: '/skills?type=technical-doc', count: 63 },
  { icon: '🏆', title: 'Join a Hackathon', desc: 'Hackathon tracks + chain bundles', href: '/skills?type=hackathon-guide', count: 7 },
  { icon: '💰', title: 'Apply for a Grant', desc: 'Grant guides + success stories', href: '/build', count: 19 },
  { icon: '🔒', title: 'Security Audit', desc: 'Contract vulnerabilities + checklists', href: '/skills?type=security', count: 4 },
]

const SCENARIOS_ZH = [
  { icon: '💻', title: '构建 dApp', desc: '按链选择开发 Skill', href: '/skills?type=technical-doc', count: 63 },
  { icon: '🏆', title: '参加黑客松', desc: '黑客松赛道 + 链 Bundle', href: '/skills?type=hackathon-guide', count: 7 },
  { icon: '💰', title: '申请 Grant', desc: '资助指南 + 成功案例', href: '/build', count: 19 },
  { icon: '🔒', title: '安全审计', desc: '合约漏洞 + 审计清单', href: '/skills?type=security', count: 4 },
]

const INDEX_CMD = 'https://agentrel.vercel.app/api/v1/skill.md'

export function HeroSection() {
  const { lang, t } = useLang()
  const scenarios = lang === 'zh' ? SCENARIOS_ZH : SCENARIOS_EN

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          212+ Web3 Skills · Open Source · Live Updates
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-black md:text-6xl">
          {t('hero.title')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          {t('hero.subtitle')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Curated by the OpenBuild ecosystem. Updated weekly.
        </p>
        {/* One URL for everything */}
        <div className="mt-10 mx-auto max-w-xl">
          <p className="text-xs text-center text-muted-foreground mb-3 font-medium uppercase tracking-wider">
            {t('hero.oneUrl')}
          </p>
          <div className="flex items-center justify-between rounded-lg border border-border bg-gray-900 px-4 py-3">
            <code className="font-mono text-sm text-gray-100 truncate mr-3">{INDEX_CMD}</code>
            <HomeCopyButton text={INDEX_CMD} />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            {t('hero.unlockSkills')}
          </p>
        </div>
      </section>

      {/* Scenario cards */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="mb-6 text-center text-xl font-semibold text-black">
          {t('hero.whatBuilding')}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {scenarios.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="relative flex flex-col rounded-xl border border-border p-4 transition-all hover:border-black hover:shadow-md active:scale-95 active:bg-gray-50 no-underline cursor-pointer group"
            >
              <span className="absolute top-2 right-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s.count}</span>
              <span className="mb-2 text-2xl">{s.icon}</span>
              <span className="mb-1 font-medium text-black text-sm">{s.title}</span>
              <span className="text-xs text-muted-foreground">{s.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
