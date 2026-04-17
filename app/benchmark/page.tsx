import { serviceClient } from '@/lib/supabase'
import BenchmarkClient from './BenchmarkClient'

export const revalidate = 0

function normalizeSource(src: string | null): 'official' | 'community' | 'ai-generated' {
  if (!src) return 'community'
  const s = src.toLowerCase()
  if (s === 'official' || s === 'official-docs') return 'official'
  if (s === 'ai-generated' || s === 'auto') return 'ai-generated'
  return 'community'
}

async function getBenchmarkData() {
  // 取最新的 run_at（按时间最晚）
  const { data: latestRow } = await serviceClient
    .from('eval_results')
    .select('run_at, judge_model, inject_strategy')
    .order('run_at', { ascending: false })
    .limit(1)

  if (!latestRow || latestRow.length === 0) return null
  const { run_at, judge_model, inject_strategy } = latestRow[0]

  // 分批拉取（Supabase 默认最多返回1000条）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: any[] = []
  let page = 0
  const PAGE_SIZE = 1000
  while (true) {
    const { data: batch } = await serviceClient
      .from('eval_results')
      .select('*')
      .eq('run_at', run_at)
      .order('question_id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (!batch || batch.length === 0) break
    results = results.concat(batch)
    if (batch.length < PAGE_SIZE) break
    page++
  }

  if (results.length === 0) return null

  // Fetch skill metadata (source + ecosystem)
  const skillIds = [...new Set(results.map(r => r.skill_id).filter(Boolean))]
  const skillMetaMap: Record<string, { source: string; ecosystem: string }> = {}
  for (let i = 0; i < skillIds.length; i += 50) {
    const batch = skillIds.slice(i, i + 50)
    const { data: skills } = await serviceClient.from('skills').select('id, source, ecosystem').in('id', batch)
    for (const s of skills ?? []) skillMetaMap[s.id] = { source: s.source, ecosystem: s.ecosystem }
  }

  function toVerdict(score: number): 'pass' | 'partial' | 'fail' {
    if (score >= 4) return 'pass'
    if (score >= 2) return 'partial'
    return 'fail'
  }

  function computeStats(subset: typeof results | null) {
    if (!subset || subset.length === 0) return null
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100 : 0
    const catMap: Record<string, { control: number[]; test: number[] }> = {}
    for (const r of subset) {
      const cat = r.category || 'Other'
      if (!catMap[cat]) catMap[cat] = { control: [], test: [] }
      catMap[cat].control.push(r.control_score)
      catMap[cat].test.push(r.test_score)
    }
    const catStats = Object.entries(catMap).map(([cat, { control, test }]) => ({
      category: cat, avg_control: avg(control), avg_test: avg(test),
      delta: Math.round((avg(test) - avg(control)) * 100) / 100,
      question_count: control.length,
    })).sort((a, b) => b.delta - a.delta)

    const skillMap: Record<string, { control: number[]; test: number[]; ctrl_verdicts: string[]; test_verdicts: string[] }> = {}
    for (const r of subset) {
      if (!r.skill_id) continue
      if (!skillMap[r.skill_id]) skillMap[r.skill_id] = { control: [], test: [], ctrl_verdicts: [], test_verdicts: [] }
      skillMap[r.skill_id].control.push(r.control_score)
      skillMap[r.skill_id].test.push(r.test_score)
      // Use verdict column if available, otherwise derive from score
      skillMap[r.skill_id].ctrl_verdicts.push(toVerdict(r.control_score))
      skillMap[r.skill_id].test_verdicts.push((r as { verdict?: string }).verdict ?? toVerdict(r.test_score))
    }
    const topSkills = Object.entries(skillMap).map(([id, { control, test, ctrl_verdicts, test_verdicts }]) => {
      const n = control.length
      const ctrl_pass_rate = Math.round(ctrl_verdicts.filter(v => v === 'pass').length / n * 100) / 100
      const test_pass_rate = Math.round(test_verdicts.filter(v => v === 'pass').length / n * 100) / 100
      const test_fail_rate = Math.round(test_verdicts.filter(v => v === 'fail').length / n * 100) / 100
      return {
        skill_id: id, avg_control: avg(control), avg_test: avg(test),
        delta: Math.round((avg(test) - avg(control)) * 100) / 100,
        question_count: n,
        ctrl_pass_rate, test_pass_rate,
        pass_uplift: Math.round((test_pass_rate - ctrl_pass_rate) * 100) / 100,
        test_fail_rate,
      }
    }).sort((a, b) => b.pass_uplift - a.pass_uplift || b.delta - a.delta).slice(0, 10)

    const totalC = avg(subset.map(r => r.control_score))
    const totalT = avg(subset.map(r => r.test_score))

    // Overall verdict rates
    const n = subset.length
    const ctrl_pass_rate = Math.round(subset.filter(r => toVerdict(r.control_score) === 'pass').length / n * 100) / 100
    const test_verdicts = subset.map(r => (r as { verdict?: string }).verdict ?? toVerdict(r.test_score))
    const test_pass_rate = Math.round(test_verdicts.filter(v => v === 'pass').length / n * 100) / 100
    const test_partial_rate = Math.round(test_verdicts.filter(v => v === 'partial').length / n * 100) / 100
    const test_fail_rate = Math.round(test_verdicts.filter(v => v === 'fail').length / n * 100) / 100

    return {
      total_questions: n, avg_control: totalC, avg_test: totalT,
      delta: Math.round((totalT - totalC) * 100) / 100,
      ctrl_pass_rate, test_pass_rate, test_partial_rate, test_fail_rate,
      pass_uplift: Math.round((test_pass_rate - ctrl_pass_rate) * 100) / 100,
      catStats, topSkills,
    }
  }

  // Collect test models (provider field)
  const testModels = [...new Set(results.map(r => (r as { provider?: string }).provider).filter((v): v is string => Boolean(v)))]

  // Group by source
  const grouped: Record<string, typeof results> = { official: [], community: [], 'ai-generated': [] }
  for (const r of results) {
    const src = r.skill_id ? normalizeSource(skillMetaMap[r.skill_id]?.source ?? null) : 'community'
    grouped[src].push(r)
  }

  // Group by ecosystem
  const ECOSYSTEMS = ['ethereum', 'solana', 'monad', 'zama', 'sui', 'ton', 'base', 'multichain']
  // 技术/通用类 skill 前缀 → 归入 'cross-chain'（多链/通用）
  const TECH_PREFIXES = ['standards', 'security', 'dev-tooling', 'cryptoskills', 'hackathon', 'grants', 'bounty', 'protocols', 'defi']
  const ID_PREFIX_ECO: Record<string, string> = {
    'zama/': 'zama', 'solana/': 'solana', 'monad/': 'monad', 'ethereum/': 'ethereum',
    'sui/': 'sui', 'ton/': 'ton', 'base/': 'base',
    ...Object.fromEntries(TECH_PREFIXES.map(p => [`${p}/`, 'cross-chain'])),
  }
  const ALL_ECOSYSTEMS = [...ECOSYSTEMS, 'cross-chain']
  const byEco: Record<string, typeof results> = {}
  for (const eco of ALL_ECOSYSTEMS) byEco[eco] = []
  byEco['other'] = []

  for (const r of results) {
    if (!r.skill_id) { byEco['other'].push(r); continue }
    let eco = skillMetaMap[r.skill_id]?.ecosystem?.toLowerCase() ?? ''
    // fallback: 从 skill_id 前缀推断
    if (!ALL_ECOSYSTEMS.includes(eco)) {
      for (const [prefix, mapped] of Object.entries(ID_PREFIX_ECO)) {
        if (r.skill_id.startsWith(prefix)) { eco = mapped; break }
      }
    }
    if (ALL_ECOSYSTEMS.includes(eco)) byEco[eco].push(r)
    else byEco['other'].push(r)
  }

  return {
    run: { run_at, judge_model, inject_strategy, test_models: testModels },
    bySource: {
      official: computeStats(grouped.official),
      community: computeStats(grouped.community),
      'ai-generated': computeStats(grouped['ai-generated']),
    },
    overall: computeStats(results),
    byEcosystem: Object.fromEntries(
      Object.entries(byEco)
        .filter(([, v]) => v.length > 0)
        .map(([k, v]) => [k, computeStats(v)])
    ) as Record<string, ReturnType<typeof computeStats>>,
  }
}

export default async function BenchmarkPage() {
  const data = await getBenchmarkData()
  return <BenchmarkClient data={data} />
}
