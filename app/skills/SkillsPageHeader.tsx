'use client'

import { useLang } from '@/context/LanguageContext'

export function SkillsPageHeader() {
  const { t } = useLang()
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-foreground">{t('skills.heading')}</h1>
      <p className="mt-2 text-muted-foreground">{t('skills.subheading')}</p>
    </div>
  )
}
