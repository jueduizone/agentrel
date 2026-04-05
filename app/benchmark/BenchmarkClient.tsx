'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { useLang } from '@/context/LanguageContext'

type SourceStats = {
  total_questions: number
  avg_control: number
  avg_test: number
  delta: number
  catStats: Array<{ category: string; avg_control: number; avg_test: number; delta: number; question_count: number }>
  topSkills: Array<{ skill_id: string; avg_control: number; avg_test: number; delta: number; question_count: number }>
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

const SOURCE_TABS = [
  { key: 'overall', label: 'Overall', emoji: '📊', desc: 'All sources combined' },
  { key: 'official', label: 'Official Skill', emoji: '🏛️', desc: 'AgentRel curated, quality baseline' },
  { key: 'community', label: 'Community Skill', emoji: '👥', desc: 'Community submitted, variable quality' },
  { key: 'ai-generated', label: 'AI Generated', emoji: '🤖', desc: 'Grant auto-generated, standard format' },
] as const

type TabKey = typeof SOURCE_TABS[number]['key']

function StatsPanel({ stats, title }: { stats: SourceStats; title: string }) {
  const { t } = useLang()

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No eval data for {title} yet.
      </div>
    )
  }

  const chartData = stats.catStats.map(s => ({
    name: CAT_SHORT[s.category] ?? s.category.slice(0, 8),
    Control: s.avg_control,
    'With Skill': s.avg_test,
    delta: s.delta,
  }))

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
          <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${highlight ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('benchmark.scoreByCategory')}</h3>
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
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('benchmark.topSkillsTitle')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="text-left pb-2 font-medium">{t('benchmark.colSkill')}</th>
                  <th className="text-right pb-2 font-medium">{t('benchmark.colControl')}</th>
                  <th className="text-right pb-2 font-medium">{t('benchmark.colWithSkill')}</th>
                  <th className="text-right pb-2 font-medium">{t('benchmark.colImpact')}</th>
                  <th className="text-right pb-2 font-medium">{t('benchmark.colQuestions')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.topSkills.map((s, i) => (
                  <tr key={s.skill_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 font-mono text-xs text-indigo-700">
                      <Link href={`/skills/${s.skill_id}`} className="hover:underline">{s.skill_id}</Link>
                    </td>
                    <td className="text-right py-2 text-gray-500">{s.avg_control.toFixed(2)}</td>
                    <td className="text-right py-2 text-gray-700 font-medium">{s.avg_test.toFixed(2)}</td>
                    <td className={`text-right py-2 font-semibold ${s.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {s.delta > 0 ? '+' : ''}{s.delta.toFixed(2)}
                    </td>
                    <td className="text-right py-2 text-gray-400">{s.question_count}</td>
                  </tr>
                ))}
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
    <main className="max-w-5xl mx-auto px-6 py-8 border-t border-gray-100 mt-4">
      <h2 className="text-lg font-bold text-gray-800 mb-4">🌐 {t('benchmark.byEcosystem')}</h2>
      <div className="flex gap-2 border-b border-gray-100 mb-8 overflow-x-auto pb-0 -mb-px">
        {['all', ...ecoKeys].map(eco => (
          <button key={eco} onClick={() => setActiveEco(eco)}
            className={`flex items-center gap-1 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeEco === eco ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
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
  const { t } = useLang()

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-2">Benchmark data not yet available</p>
          <p className="text-gray-500 text-sm mb-4">Eval runs will appear here after the first automated run.</p>
          <button
            onClick={() => triggerEval()}
            disabled={triggering}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {triggering ? '触发中...' : '🚀 触发全量 Eval'}
          </button>
          {triggerMsg && <p className="text-sm text-gray-500 mt-2">{triggerMsg}</p>}
        </div>
      </div>
    )
  }

  const { run, bySource, overall } = data
  const activeStats = activeTab === 'overall' ? overall : bySource[activeTab as keyof typeof bySource]
  const activeTabInfo = SOURCE_TABS.find(t => t.key === activeTab)!

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <span className="text-xl font-bold tracking-tight">{t('benchmark.title')}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => triggerEval()}
              disabled={triggering}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {triggering ? '触发中...' : '🚀 重新跑 Eval'}
            </button>
            <button
              onClick={() => triggerEval('zama/fhevm-solidity,zama/relayer-sdk,zama/overview,zama/tfhe-rs')}
              disabled={triggering}
              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {triggering ? '...' : 'Zama 专项'}
            </button>
            <a href="https://github.com/jueduizone/agentrel/tree/main/eval" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ExternalLink size={14} />
              <span className="hidden sm:inline">{t('benchmark.methodology')}</span>
            </a>
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
        <div className="mb-6 flex flex-wrap gap-3 text-xs text-gray-400">
          <span>Run: {new Date(run.run_at).toLocaleString()}</span>
          <span>·</span>
          <span>Judge: {run.judge_model}</span>
          <span>·</span>
          <span>Strategy: {run.inject_strategy}</span>
        </div>

        {/* Source Tabs */}
        <div className="flex gap-2 border-b border-gray-100 mb-8 overflow-x-auto pb-0">
          {SOURCE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <p className="text-sm text-gray-500 mb-6">{activeTabInfo.desc}</p>

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
