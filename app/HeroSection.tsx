'use client'

import { useLang } from '@/context/LanguageContext'
import { HomeCopyButton } from './HomeCopyButton'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const SCENARIOS_EN = [
  { num: '01', title: 'Build a dApp', desc: 'Dev skills by chain', href: '/skills?type=technical-doc', count: 63 },
  { num: '02', title: 'Join a Hackathon', desc: 'Tracks + chain bundles', href: '/skills?type=hackathon-guide', count: 7 },
  { num: '03', title: 'Apply for a Grant', desc: 'Guides + success stories', href: '/build', count: 19 },
  { num: '04', title: 'Security Audit', desc: 'Vulnerabilities + checklists', href: '/skills?type=security', count: 4 },
]

const SCENARIOS_ZH = [
  { num: '01', title: '构建 dApp', desc: '按链选择开发 Skill', href: '/skills?type=technical-doc', count: 63 },
  { num: '02', title: '参加黑客松', desc: '赛道 + 链 Bundle', href: '/skills?type=hackathon-guide', count: 7 },
  { num: '03', title: '申请 Grant', desc: '资助指南 + 成功案例', href: '/build', count: 19 },
  { num: '04', title: '安全审计', desc: '漏洞 + 审计清单', href: '/skills?type=security', count: 4 },
]

const INDEX_CMD = 'https://agentrel.vercel.app/api/v1/skill.md'

export function HeroSection() {
  const { lang, t } = useLang()
  const scenarios = lang === 'zh' ? SCENARIOS_ZH : SCENARIOS_EN

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-12 lg:gap-16 items-start">

          {/* Left: copy */}
          <div>
            {/* Live status */}
            <div className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              LIVE&nbsp;·&nbsp;230+ skills&nbsp;·&nbsp;open source
            </div>

            {/* Headline */}
            <h1 className="font-display text-[clamp(44px,6.5vw,78px)] font-semibold leading-[1.04] tracking-[-0.03em] text-foreground mb-6">
              {t('hero.title')}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-muted-foreground leading-relaxed max-w-[420px] mb-2">
              {t('hero.subtitle')}
            </p>
            <p className="text-sm text-muted-foreground/60 mb-10">
              Curated by OpenBuild&nbsp;·&nbsp;Updated weekly
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/skills"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-80 transition-opacity no-underline"
              >
                Browse Skills <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="https://ian-docs.vercel.app/docs/agentforum"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-foreground/30 transition-colors no-underline"
              >
                API Docs
              </a>
            </div>
          </div>

          {/* Right: terminal */}
          <div
            className="rounded-lg overflow-hidden shadow-2xl shadow-black/30"
            style={{ background: 'oklch(10% 0.015 265)', border: '1px solid oklch(22% 0.012 265)' }}
          >
            {/* Terminal chrome */}
            <div
              className="flex items-center gap-1.5 px-4 py-3"
              style={{ borderBottom: '1px solid oklch(20% 0.010 265)' }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: 'oklch(55% 0.18 25)' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: 'oklch(70% 0.16 85)' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: 'oklch(65% 0.18 145)' }} />
              <span className="ml-auto font-mono text-[10px] tracking-widest" style={{ color: 'oklch(40% 0.008 265)' }}>
                SKILL INDEX
              </span>
            </div>

            {/* Terminal body */}
            <div className="px-5 py-5 font-mono">
              <p
                className="text-[10px] uppercase tracking-widest mb-4"
                style={{ color: 'oklch(38% 0.008 265)' }}
              >
                {t('hero.oneUrl')}
              </p>

              <div className="flex items-start gap-2.5 mb-5">
                <span
                  className="text-xs shrink-0 mt-0.5"
                  style={{ color: 'oklch(68% 0.16 265)' }}
                >
                  GET
                </span>
                <code
                  className="text-xs break-all flex-1 leading-relaxed"
                  style={{ color: 'oklch(84% 0.08 265)' }}
                >
                  {INDEX_CMD}
                </code>
                <HomeCopyButton text={INDEX_CMD} />
              </div>

              <div
                className="pt-4 space-y-2"
                style={{ borderTop: '1px solid oklch(20% 0.010 265)' }}
              >
                <p className="text-[11px] leading-relaxed" style={{ color: 'oklch(42% 0.008 265)' }}>
                  <span style={{ color: 'oklch(30% 0.006 265)' }}>#&nbsp;</span>
                  {t('hero.unlockSkills')}
                </p>
                <p className="text-[11px]" style={{ color: 'oklch(42% 0.008 265)' }}>
                  <span style={{ color: 'oklch(30% 0.006 265)' }}>#&nbsp;</span>
                  Content-Type: text/markdown
                </p>
                <p className="text-[11px]" style={{ color: 'oklch(42% 0.008 265)' }}>
                  <span style={{ color: 'oklch(30% 0.006 265)' }}>#&nbsp;</span>
                  Structured YAML frontmatter · drop into system prompt
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scenarios — catalog list */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-6">
            {t('hero.whatBuilding')}
          </p>
          <div className="divide-y divide-border">
            {scenarios.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group flex items-center gap-6 py-4 -mx-4 px-4 hover:bg-muted/40 transition-colors no-underline"
              >
                <span className="font-mono text-xs w-5 shrink-0" style={{ color: 'var(--primary)' }}>
                  {s.num}
                </span>
                <span className="font-medium text-foreground text-sm flex-1 leading-none">
                  {s.title}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block" style={{ minWidth: '180px' }}>
                  {s.desc}
                </span>
                <span className="font-mono text-xs text-muted-foreground shrink-0 w-[72px] text-right">
                  {s.count} skills
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
