'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowLeft, ExternalLink, Sun, Moon } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { useLang } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'

type SourceStats = {
  total_questions: number
  avg_control: number
  avg_test: number
  delta: number
  ctrl_pass_rate?: number
  test_pass_rate?: number
  test_partial_rate?: number
  test_fail_rate?: number
  pass_uplift?: number
  catStats: Array<{ category: string; avg_control: number; avg_test: number; delta: number; question_count: number }>
  topSkills: Array<{
    skill_id: string
    avg_control: number
    avg_test: number
    delta: number
    question_count: number
    ctrl_pass_rate?: number
    test_pass_rate?: number
    pass_uplift?: number
    test_fail_rate?: number
  }>
} | null

type Props = {
  data: {
    run: { run_at: string; judge_model: string; inject_strategy: string }
    bySource: { official: SourceStats; community: SourceStats; 'ai-generated': SourceStats }
    overall: SourceStats
    byEcosystem?: Record<string, SourceStats>
  } | null
}

const CAT_SHORT: Record<string, string> = {
  'SDK 版本变更题（AI 幻觉重灾区）': 'SDK变更',
  '链配置参数题（有固定正确答案）': '链配置',
  '安全漏洞题（高风险幻觉区）': '安全漏洞',
  'DeFi 核心机制题': 'DeFi',
  'Solana 生态题': 'Solana',
  'Zama fhEVM 题': 'Zama',
  'Grant / Hackathon 策略题': 'Grant',
  '跨链 / 工具选型题': '跨链工具',
}

const SOURCE_TAB_KEYS = ['overall', 'official', 'community', 'ai-generated'] as const
type TabKey = typeof SOURCE_TAB_KEYS[number]

function useSourceTabs() {
  const { t } = useLang()
  return [
    { key: 'overall' as TabKey, label: 'Overall', emoji: '📊', desc: 'All sources combined' },
    { key: 'official' as TabKey, label: t('benchmark.tierOfficial'), emoji: '🏛️', desc: t('benchmark.tierOfficialDesc') },
    { key: 'community' as TabKey, label: t('benchmark.tierCommunity'), emoji: '👥', desc: t('benchmark.tierCommunityDesc') },
    { key: 'ai-generated' as TabKey, label: t('benchmark.tierAI'), emoji: '🤖', desc: t('benchmark.tierAIDesc') },
  ]
}

function StatsPanel({ stats, title }: { stats: SourceStats; title: string }) {
  const { t } = useLang()

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground/50 text-sm">
        {t('benchmark.noData')} ({title})
      </div>
    )
  }

  const chartData = stats.catStats.map(s => ({
    name: CAT_SHORT[s.category] ?? s.category,
    Control: s.avg_control,
    'With Skill': s.avg_test,
    delta: s.delta,
  }))

  const passRatePct = stats.test_pass_rate !== undefined ? Math.round(stats.test_pass_rate * 100) : null
  const passUplift = stats.pass_uplift !== undefined ? stats.pass_uplift : null

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('benchmark.questions'), value: stats.total_questions },
          { label: t('benchmark.controlAvg'), value: stats.avg_control.toFixed(2) },
          { label: t('benchmark.withSkillAvg'), value: stats.avg_test.toFixed(2) },
          { label: t('benchmark.delta'), value: (stats.delta > 0 ? '+' : '') + stats.delta.toFixed(2), highlight: stats.delta > 0 },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground/50 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${highlight ? 'text-green-600' : 'text-foreground'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Verdict breakdown */}
      {passRatePct !== null && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground/50 mb-1">✅ Pass</p>
            <p className="text-xl font-bold text-green-600">{passRatePct}%</p>
            {passUplift !== null && passUplift > 0 && (
              <p className="text-xs text-green-500 mt-0.5">+{Math.round(passUplift * 100)}pp vs ctrl</p>
            )}
          </div>
          {stats.test_partial_rate !== undefined && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground/50 mb-1">🟡 Partial</p>
              <p className="text-xl font-bold text-yellow-600">{Math.round(stats.test_partial_rate * 100)}%</p>
            </div>
          )}
          {stats.test_fail_rate !== undefined && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground/50 mb-1">❌ Fail</p>
              <p className="text-xl font-bold text-red-500">{Math.round(stats.test_fail_rate * 100)}%</p>
            </div>
          )}
        </div>
      )}

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t('benchmark.scoreByCategory')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Control" fill="#d1d5db" radius={[3,3,0,0]} />
              <Bar dataKey="With Skill" fill="#6366f1" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top skills */}
      {stats.topSkills.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground/80 mb-3">{t('benchmark.topSkillsTitle')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground/50">
                  <th className="text-left pb-2 font-medium">{t('benchmark.colSkill')}</th>
                  <th className="text-right pb-2 font-medium">{t('benchmark.colControl')}</th>
                  <th className="text-right pb-2 font-medium">{t('benchmark.colWithSkill')}</th>
                  <th className="text-right pb-2 font-medium">{t('benchmark.colImpact')}</th>
                  <th className="text-right pb-2 font-medium">Pass%</th>
                  <th className="text-right pb-2 font-medium">Pass↑</th>
                  <th className="text-right pb-2 font-medium">{t('benchmark.colQuestions')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.topSkills.map((s) => {
                  const passRate = s.test_pass_rate !== undefined ? Math.round(s.test_pass_rate * 100) : null
                  const passUpliftVal = s.pass_uplift !== undefined ? s.pass_uplift : null
                  const failRate = s.test_fail_rate !== undefined ? Math.round(s.test_fail_rate * 100) : null
                  const badge = passRate !== null
                    ? passRate >= 60 ? '✅' : failRate !== null && failRate >= 60 ? '❌' : '🟡'
                    : null
                  return (
                    <tr key={s.skill_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-2 font-mono text-xs text-indigo-700">
                        <Link href={`/skills/${s.skill_id}`} className="hover:underline">{s.skill_id}</Link>
                        {badge && <span className="ml-1.5">{badge}</span>}
                      </td>
                      <td className="text-right py-2 text-muted-foreground/70">{s.avg_control.toFixed(2)}</td>
                      <td className="text-right py-2 text-foreground/80 font-medium">{s.avg_test.toFixed(2)}</td>
                      <td className={`text-right py-2 font-semibold ${s.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {s.delta > 0 ? '+' : ''}{s.delta.toFixed(2)}
                      </td>
                      <td className="text-right py-2 text-foreground/70">
                        {passRate !== null ? `${passRate}%` : '—'}
                      </td>
                      <td className={`text-right py-2 font-medium ${passUpliftVal !== null && passUpliftVal > 0 ? 'text-green-600' : passUpliftVal !== null && passUpliftVal < 0 ? 'text-red-500' : 'text-muted-foreground/50'}`}>
                        {passUpliftVal !== null ? (passUpliftVal > 0 ? '+' : '') + Math.round(passUpliftVal * 100) + 'pp' : '—'}
                      </td>
                      <td className="text-right py-2 text-muted-foreground/50">{s.question_count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


function useEcoLabels(): Record<string, string> {
  const { t } = useLang()
  return {
    all: 'All', ethereum: 'Ethereum', solana: 'Solana', monad: 'Monad',
    zama: 'Zama', sui: 'Sui', ton: 'TON', base: 'Base', multichain: 'Multichain',
    'cross-chain': t('benchmark.generalTech'), other: 'Other',
  }
}

function EcosystemSection({ byEcosystem }: { byEcosystem: Record<string, SourceStats> }) {
  const ecoKeys = Object.keys(byEcosystem).filter(k => byEcosystem[k] !== null)
  const [activeEco, setActiveEco] = useState<string>('all')
  const { t } = useLang()
  const ECO_LABELS = useEcoLabels()

  // Combine all for "All" tab
  const allStats: SourceStats = (() => {
    const allResults = Object.values(byEcosystem).filter(Boolean)
    if (!allResults.length) return null
    const totalQ = allResults.reduce((s, v) => s + (v?.total_questions ?? 0), 0)
    const avgC = allResults.reduce((s, v) => s + (v?.avg_control ?? 0) * (v?.total_questions ?? 0), 0) / (totalQ || 1)
    const avgT = allResults.reduce((s, v) => s + (v?.avg_test ?? 0) * (v?.total_questions ?? 0), 0) / (totalQ || 1)
    return {
      total_questions: totalQ,
      avg_control: Math.round(avgC * 100) / 100,
      avg_test: Math.round(avgT * 100) / 100,
      delta: Math.round((avgT - avgC) * 100) / 100,
      catStats: [],
      topSkills: allResults.flatMap(v => v?.topSkills ?? []).sort((a, b) => b.delta - a.delta).slice(0, 10),
    }
  })()

  const activeStats = activeEco === 'all' ? allStats : byEcosystem[activeEco]

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 border-t border-border mt-4">
      <h2 className="text-lg font-bold text-foreground mb-4">🌐 {t('benchmark.byEcosystem')}</h2>
      <div className="flex gap-2 border-b border-border mb-8 overflow-x-auto pb-0 -mb-px">
        {['all', ...ecoKeys].map(eco => (
          <button key={eco} onClick={() => setActiveEco(eco)}
            className={`flex items-center gap-1 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeEco === eco ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-muted-foreground/70 hover:text-foreground/80'
            }`}>
            {ECO_LABELS[eco] ?? eco}
          </button>
        ))}
      </div>
      <StatsPanel stats={activeStats} title={ECO_LABELS[activeEco] ?? activeEco} />
    </main>
  )
}

export default function BenchmarkClient({ data }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('overall')
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { t } = useLang()
  const { theme, toggleTheme } = useTheme()
  const SOURCE_TABS = useSourceTabs()

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setMounted(true) // eslint-disable-line
    setIsAdmin(!!localStorage.getItem('agentrel_api_key')) // eslint-disable-line
  }, [])

  const triggerEval = async (skillIds?: string) => {
    setTriggering(true)
    setTriggerMsg('')
    try {
      const res = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'agentrel-eval-2026', skill_ids: skillIds, judge_model: 'gpt-4o-mini' }),
      })
      const d = await res.json()
      setTriggerMsg(d.message || (d.ok ? '已触发' : d.error))
    } catch (e: unknown) {
      setTriggerMsg('触发失败: ' + (e instanceof Error ? e.message : String(e)))
    }
    setTriggering(false)
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground mb-2">Benchmark data not yet available</p>
          <p className="text-muted-foreground/70 text-sm mb-4">Eval runs will appear here after the first automated run.</p>
          {isAdmin && (
            <button
              onClick={() => triggerEval()}
              disabled={triggering}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {triggering ? '触发中...' : '🚀 触发全量 Eval'}
            </button>
          )}
          {triggerMsg && <p className="text-sm text-muted-foreground/70 mt-2">{triggerMsg}</p>}
        </div>
      </div>
    )
  }

  const { run, bySource, overall } = data
  const activeStats = activeTab === 'overall' ? overall : bySource[activeTab as keyof typeof bySource]
  const activeTabInfo = SOURCE_TABS.find(t => t.key === activeTab)!

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground/50 hover:text-foreground/80 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <span className="text-xl font-bold tracking-tight">{t('benchmark.title')}</span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <button
                  onClick={() => triggerEval()}
                  disabled={triggering}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {triggering ? '...' : `🚀 ${t('benchmark.runEval')}`}
                </button>
                <button
                  onClick={() => triggerEval('zama/fhevm-solidity,zama/relayer-sdk,zama/overview,zama/tfhe-rs')}
                  disabled={triggering}
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {triggering ? '...' : t('benchmark.zamaSpecific')}
                </button>
              </>
            )}
            <a href="https://github.com/jueduizone/agentrel/tree/main/eval" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground/70 hover:text-foreground transition-colors">
              <ExternalLink size={14} />
              <span className="hidden sm:inline">{t('benchmark.methodology')}</span>
            </a>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {triggerMsg && (
          <div className="max-w-5xl mx-auto mt-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded">
            {triggerMsg}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Run meta */}
        <div className="mb-6 flex flex-wrap gap-3 text-xs text-muted-foreground/50">
          <span suppressHydrationWarning>Run: {mounted ? new Date(run.run_at).toLocaleString() : run.run_at}</span>
          <span>·</span>
          <span>Judge: {run.judge_model}</span>
          <span>·</span>
          <span>Strategy: {run.inject_strategy}</span>
        </div>

        {/* Source Tabs */}
        <div className="flex gap-2 border-b border-border mb-8 overflow-x-auto pb-0">
          {SOURCE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-muted-foreground/70 hover:text-foreground/80'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p className="text-sm text-muted-foreground/70 mb-6">{activeTabInfo.desc}</p>

        {/* Stats panel */}
        <StatsPanel stats={activeStats} title={activeTabInfo.label} />
      </main>

      {/* Section 2: By Ecosystem */}
      {data.byEcosystem && Object.keys(data.byEcosystem).length > 0 && (
        <EcosystemSection byEcosystem={data.byEcosystem} />
      )}
    </div>
  )
}
