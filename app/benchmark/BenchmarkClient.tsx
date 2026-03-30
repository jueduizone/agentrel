'use client'

import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell
} from 'recharts'

type Run = {
  id: string
  run_date: string
  judge_model: string
  inject_mode: string
  total_questions: number
  avg_control: number
  avg_test: number
  delta: number
  label: string | null
}

type Result = {
  question_id: string
  category: string
  skill_id: string
  control_score: number
  test_score: number
}

type CatStat = {
  category: string
  avg_control: number
  avg_test: number
  delta: number
  question_count: number
}

type Props = {
  data: {
    run: Run
    results: Result[]
    catStats: CatStat[]
    allRuns: Run[]
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

export default function BenchmarkClient({ data }: Props) {
  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-2">Benchmark data not yet available</p>
          <p className="text-gray-500 text-sm">Eval runs will appear here after the first automated run.</p>
        </div>
      </div>
    )
  }

  const { run, results, catStats } = data

  // Highlight top improvers
  const topImprovers = [...results]
    .filter(r => r.test_score - r.control_score >= 2)
    .sort((a, b) => (b.test_score - b.control_score) - (a.test_score - a.control_score))
    .slice(0, 6)

  // Chart data
  const chartData = catStats.map(s => ({
    name: CAT_SHORT[s.category] ?? s.category.slice(0, 8),
    Control: s.avg_control,
    'With Skill': s.avg_test,
    delta: s.delta,
  }))

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <span className="text-xl font-bold tracking-tight">AgentRel Benchmark</span>
          </div>
          <a
            href="https://github.com/jueduizone/agentrel/tree/main/eval"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ExternalLink size={14} />
            Reproducible methodology
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* Hero stats */}
        <section className="mb-12">
          <div className="mb-2 text-xs font-semibold text-gray-400 tracking-widest uppercase">
            Latest run · {run.run_date} · {run.total_questions} questions · Judge: {run.judge_model}
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            With AgentRel Skills, AI accuracy improves
          </h1>
          <p className="text-gray-500 text-base mb-8">
            Control = no context. With Skill = AgentRel Skill injected as context.
          </p>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Without Skill</div>
              <div className="text-4xl font-black text-gray-700">{run.avg_control.toFixed(2)}<span className="text-xl text-gray-400">/5</span></div>
            </div>
            <div className="bg-indigo-50 rounded-2xl p-6 border-2 border-indigo-200">
              <div className="text-xs text-indigo-400 mb-1 uppercase tracking-wider">With AgentRel Skill</div>
              <div className="text-4xl font-black text-indigo-700">{run.avg_test.toFixed(2)}<span className="text-xl text-indigo-400">/5</span></div>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-6">
              <div className="text-xs text-emerald-500 mb-1 uppercase tracking-wider">Improvement</div>
              <div className="text-4xl font-black text-emerald-600">+{run.delta.toFixed(2)}</div>
              <div className="text-sm text-emerald-500 mt-1">
                ({((run.avg_test / run.avg_control - 1) * 100).toFixed(0)}% lift)
              </div>
            </div>
          </div>
        </section>

        {/* Category chart */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Score by Category</h2>
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Control" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="With Skill" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.delta > 0.5 ? '#6366f1' : entry.delta > 0 ? '#818cf8' : '#c7d2fe'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category table */}
          <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-center px-4 py-3">n</th>
                  <th className="text-center px-4 py-3">Control</th>
                  <th className="text-center px-4 py-3">With Skill</th>
                  <th className="text-center px-4 py-3">Δ</th>
                </tr>
              </thead>
              <tbody>
                {catStats.map((s, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700">{s.category}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{s.question_count}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{s.avg_control}</td>
                    <td className="px-4 py-3 text-center font-semibold text-indigo-600">{s.avg_test}</td>
                    <td className={`px-4 py-3 text-center font-bold ${s.delta > 0 ? 'text-emerald-600' : s.delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {s.delta > 0 ? '+' : ''}{s.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top improvers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Biggest Improvements</h2>
          <p className="text-gray-500 text-sm mb-6">Questions where Skill context made the most difference</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {topImprovers.map((r) => (
              <div key={r.question_id} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r.question_id}</span>
                  <span className="text-xs text-indigo-500 font-semibold">+{r.test_score - r.control_score} pts</span>
                </div>
                <div className="text-xs text-gray-400 mb-2 truncate">{r.skill_id}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-gray-400 h-1.5 rounded-full" style={{ width: `${r.control_score * 20}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-4">{r.control_score}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-indigo-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${r.test_score * 20}%` }} />
                  </div>
                  <span className="text-xs text-indigo-600 font-semibold w-4">{r.test_score}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section className="bg-gray-900 rounded-2xl p-8 text-white">
          <h2 className="text-xl font-bold mb-3">Reproducible Methodology</h2>
          <p className="text-gray-400 text-sm mb-4">
            Control group receives no context. Test group has the relevant AgentRel Skill injected as system prompt (slice mode, top relevant section ≤2000 chars).
            Judge: GPT-4o-mini (cross-model, avoids self-consistency bias).
          </p>
          <div className="bg-black/30 rounded-xl p-4 font-mono text-xs text-gray-300 mb-4">
            <div className="text-gray-500 mb-1"># Run eval yourself</div>
            <div>git clone https://github.com/jueduizone/agentrel</div>
            <div>pip install requests anthropic</div>
            <div>python3 eval/run.py --judge-model gpt-4o-mini</div>
          </div>
          <a
            href="https://github.com/jueduizone/agentrel/tree/main/eval"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-300 hover:text-white transition-colors"
          >
            <ExternalLink size={14} />
            View eval scripts on GitHub
          </a>
        </section>
      </main>
    </div>
  )
}
