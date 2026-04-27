'use client'

import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { useLang } from '@/context/LanguageContext'

export default function NotFound() {
  const { t } = useLang()
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto flex min-h-[72vh] max-w-5xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          AgentRel / 404
        </div>
        <div className="relative w-full overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 shadow-sm sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.14),transparent_42%)]" />
          <div className="relative mx-auto max-w-2xl">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.35em] text-primary">Context missing</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              {t('notFound.title')}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {t('notFound.desc')} Try the skill index, or return home and pick a supported ecosystem.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/skills" className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80">
                <Search className="h-4 w-4" />
                {t('notFound.browseSkills')}
              </Link>
              <Link href="/" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
                {t('notFound.backHome')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
