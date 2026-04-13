'use client'

import Link from 'next/link'
import { Zap, RefreshCw, FileText } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'

type EcoItem = { name: string; count: number }

export function HomeContent({ stats }: {
  stats: { skills: number; ecosystems: number; contributors: number; ecosystemList: EcoItem[] }
}) {
  const { t } = useLang()

  return (
    <>
      {/* Stats */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-black">{stats.skills}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t('home.statsSkills')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black">{stats.ecosystems || 27}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t('home.statsEcosystems')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black">{stats.contributors}</div>
              <div className="mt-1 text-sm text-muted-foreground">{t('home.statsSources')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-black">{t('home.whyTitle')}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-black/5">
              <Zap className="h-5 w-5 text-black/60" />
            </div>
            <h3 className="mb-2 font-semibold text-black">{t('home.why1Title')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.why1Desc')}</p>
          </div>
          <div className="rounded-xl border border-border p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-black/5">
              <RefreshCw className="h-5 w-5 text-black/60" />
            </div>
            <h3 className="mb-2 font-semibold text-black">{t('home.why2Title')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.why2Desc')}</p>
          </div>
          <div className="rounded-xl border border-border p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-black/5">
              <FileText className="h-5 w-5 text-black/60" />
            </div>
            <h3 className="mb-2 font-semibold text-black">{t('home.why3Title')}</h3>
            <p className="text-sm text-muted-foreground">{t('home.why3Desc')}</p>
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="mb-2 text-2xl font-bold text-black">{t('home.ecosystemsTitle')}</h2>
          <p className="mb-8 text-sm text-muted-foreground">{t('home.ecosystemsDesc')}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {stats.ecosystemList.map((eco) => (
              <Link
                key={eco.name}
                href={(() => {
                  const slug = eco.name.toLowerCase()
                  return ['ton', 'monad', 'sui', 'base', 'solana', 'zama', 'ethereum'].includes(slug)
                    ? `/ecosystem/${slug}`
                    : `/skills?ecosystem=${slug}`
                })()}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-foreground transition-all hover:border-black hover:shadow-sm"
              >
                {eco.name}
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{eco.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
