'use client'

import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { useLang } from '@/context/LanguageContext'

export default function NotFound() {
  const { t } = useLang()
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">404</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{t('notFound.title')}</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">{t('notFound.desc')}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80">
            {t('notFound.backHome')}
          </Link>
          <Link href="/skills" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
            {t('notFound.browseSkills')}
          </Link>
        </div>
      </main>
    </div>
  )
}
