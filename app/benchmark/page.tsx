import { serviceClient } from '@/lib/supabase'
import BenchmarkClient from './BenchmarkClient'

export const revalidate = 3600

function normalizeSource(src: string | null): 'official' | 'community' | 'ai-generated' {
  if (!src) return 'community'
  const s = src.toLowerCase()
  if (s === 'official' || s === 'official-docs') return 'official'
  if (s === 'ai-generated' || s === 'auto') return 'ai-generated'
  return 'community'
}

async function getBenchmarkData() {
  const { data: latestRow } = await serviceClient
    .from('eval_results')
    .select('run_at, judge_model, inject_strategy')
    .order('run_at', { ascending: false })
    .limit(1)

  if (!latestRow || latestRow.length === 0) return null
  const { run_at, judge_model, inject_strategy } = latestRow[0]

  const { data: results } = await serviceClient
    .from('eval_results')
    .select('*')
    .eq('run_at', run_at)
    .order('question_id')

  if (!results || results.length === 0) return null

  // Fetch skill metadata (source + ecosystem)
  const skillIds = [...new Set(results.map(r => r.skill_id).filter(Boolean))]
  const skillMetaMap: Record<string, { source: string; ecosystem: string }> = {}
  for (let i = 0; i < skillIds.length; i += 50) {
    const batch = skillIds.slice(i, i + 50)
    const { data: skills } = await serviceClient.from('skills').select('id, source, ecosystem').in('id', batch)
    for (const s of skills ?? []) skillMetaMap[s.id] = { source: s.source, ecosystem: s.ecosystem }
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

    const skillMap: Record<string, { control: number[]; test: number[] }> = {}
    for (const r of subset) {
      if (!r.skill_id) continue
      if (!skillMap[r.skill_id]) skillMap[r.skill_id] = { control: [], test: [] }
      skillMap[r.skill_id].control.push(r.control_score)
      skillMap[r.skill_id].test.push(r.test_score)
    }
    const topSkills = Object.entries(skillMap).map(([id, { control, test }]) => ({
      skill_id: id, avg_control: avg(control), avg_test: avg(test),
      delta: Math.round((avg(test) - avg(control)) * 100) / 100,
      question_count: control.length,
    })).sort((a, b) => b.delta - a.delta).slice(0, 10)

    const totalC = avg(subset.map(r => r.control_score))
    const totalT = avg(subset.map(r => r.test_score))
    return {
      total_questions: subset.length, avg_control: totalC, avg_test: totalT,
      delta: Math.round((totalT - totalC) * 100) / 100, catStats, topSkills,
    }
  }

  // Group by source
  const grouped: Record<string, typeof results> = { official: [], community: [], 'ai-generated': [] }
  for (const r of results) {
    const src = r.skill_id ? normalizeSource(skillMetaMap[r.skill_id]?.source ?? null) : 'community'
    grouped[src].push(r)
  }

  // Group by ecosystem
  const ECOSYSTEMS = ['ethereum', 'solana', 'monad', 'zama', 'sui', 'ton', 'base', 'multichain']
  const byEco: Record<string, typeof results> = {}
  for (const eco of ECOSYSTEMS) byEco[eco] = []
  byEco['other'] = []

  for (const r of results) {
    if (!r.skill_id) { byEco['other'].push(r); continue }
    const eco = skillMetaMap[r.skill_id]?.ecosystem?.toLowerCase() ?? ''
    if (ECOSYSTEMS.includes(eco)) byEco[eco].push(r)
    else byEco['other'].push(r)
  }

  return {
    run: { run_at, judge_model, inject_strategy },
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
