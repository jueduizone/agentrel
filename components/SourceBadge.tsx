'use client'
import { useLang } from '@/context/LanguageContext'

const BADGE_KEYS: Record<string, { labelKey: string; className: string }> = {
  official:     { labelKey: 'skills.sourceOfficial',  className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  verified:     { labelKey: 'skills.sourceVerified',  className: 'bg-green-100 text-green-700 border border-green-200' },
  community:    { labelKey: 'skills.sourceCommunity', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  'ai-generated': { labelKey: 'skills.sourceAI',     className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
}

export function SourceBadge({ source }: { source: string }) {
  const { t } = useLang()
  const cfg = BADGE_KEYS[source] ?? { labelKey: 'skills.sourceCommunity', className: 'bg-gray-100 text-gray-600 border border-gray-200' }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {t(cfg.labelKey)}
    </span>
  )
}
