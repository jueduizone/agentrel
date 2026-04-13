'use client'

import Link from 'next/link'
import { useLang } from '@/context/LanguageContext'

type EcoItem = { name: string; count: number }

export function HomeContent({ stats }: {
  stats: { skills: number; ecosystems: number; contributors: number; ecosystemList: EcoItem[] }
}) {
  const { t } = useLang()

  return (
    <>
      {/* Stats strip */}
      <section className="border-y border-border bg-muted/25">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-wrap gap-8 sm:gap-0 sm:divide-x divide-border">
            {[
              { value: stats.skills, label: t('home.statsSkills') },
              { value: stats.ecosystems || 27, label: t('home.statsEcosystems') },
              { value: stats.contributors, label: t('home.statsSources') },
            ].map(({ value, label }, i) => (
              <div key={i} className="sm:flex-1 sm:px-10 first:pl-0 last:pr-0">
                <div className="font-display text-[42px] font-semibold text-foreground tracking-tight tabular-nums leading-none">
                  {value}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-12 lg:gap-24">
          {/* Label */}
          <div className="pt-0 lg:pt-1">
            <h2 className="font-display text-2xl font-semibold text-foreground tracking-tight leading-tight">
              {t('home.whyTitle')}
            </h2>
          </div>

          {/* Feature list */}
          <div className="divide-y divide-border">
            {[
              { n: '01', title: t('home.why1Title'), desc: t('home.why1Desc') },
              { n: '02', title: t('home.why2Title'), desc: t('home.why2Desc') },
              { n: '03', title: t('home.why3Title'), desc: t('home.why3Desc') },
            ].map(({ n, title, desc }) => (
              <div key={n} className="py-8 first:pt-0 grid grid-cols-[44px_1fr] gap-4">
                <span
                  className="font-mono text-xs pt-0.5 leading-none"
                  style={{ color: 'var(--primary)' }}
                >
                  {n}
                </span>
                <div>
                  <h3 className="font-medium text-foreground mb-2.5 text-[15px] leading-snug">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[560px]">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystems */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-baseline gap-4 mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground tracking-tight">
              {t('home.ecosystemsTitle')}
            </h2>
            <span className="font-mono text-xs text-muted-foreground">
              {stats.ecosystemList.length} chains
            </span>
          </div>

          {/* Grid of ecosystem entries */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
            style={{ border: '1px solid var(--border)' }}
          >
            {stats.ecosystemList.map((eco) => {
              const slug = eco.name.toLowerCase()
              const href = ['ton', 'monad', 'sui', 'base', 'solana', 'zama', 'ethereum'].includes(slug)
                ? `/ecosystem/${slug}`
                : `/skills?ecosystem=${slug}`
              return (
                <Link
                  key={eco.name}
                  href={href}
                  className="group flex items-center justify-between px-4 py-3.5 bg-background hover:bg-muted/50 transition-colors no-underline"
                  style={{ outline: '1px solid var(--border)' }}
                >
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                    {eco.name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                    {eco.count}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
