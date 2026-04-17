'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'

type Tab = 'open' | 'closed' | 'all'

interface Props {
  total: number
  openCount: number
  closedCount: number
  current: Tab
}

export function BuildTabs({ total, openCount, closedCount, current }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLang()

  const navigate = (status: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('status', status)
    router.push(`/build?${params.toString()}`)
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'open', label: t('grants.tabOpen'), count: openCount },
    { key: 'closed', label: t('grants.tabClosed'), count: closedCount },
    { key: 'all', label: t('grants.tabAll'), count: total },
  ]

  return (
    <div className="flex gap-1 border border-border bg-background rounded-xl p-1 w-fit mb-6">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => navigate(tab.key)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            current === tab.key
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/50'
          }`}
        >
          {tab.label}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            current === tab.key ? 'bg-indigo-500 text-indigo-100' : 'bg-muted text-muted-foreground/70'
          }`}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  )
}
