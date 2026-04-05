'use client'
import { useLang } from '@/context/LanguageContext'

export function PageHeader({ titleKey, descKey }: { titleKey: string; descKey: string }) {
  const { t } = useLang()
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-black">{t(titleKey)}</h1>
      <p className="mt-2 text-muted-foreground">{t(descKey)}</p>
    </div>
  )
}
