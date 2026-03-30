import { serviceClient } from '@/lib/supabase'
import BenchmarkClient from './BenchmarkClient'

export const revalidate = 3600

async function getBenchmarkData() {
  // Latest run timestamp
  const { data: latestRow } = await serviceClient
    .from('eval_results')
    .select('run_at, judge_model, inject_strategy')
    .order('run_at', { ascending: false })
    .limit(1)

  if (!latestRow || latestRow.length === 0) return null
  const { run_at, judge_model, inject_strategy } = latestRow[0]

  // All results for latest run
  const { data: results } = await serviceClient
    .from('eval_results')
    .select('*')
    .eq('run_at', run_at)
    .order('question_id')

  if (!results || results.length === 0) return null

  // Category aggregates
  const catMap: Record<string, { control: number[]; test: number[] }> = {}
  for (const r of results) {
    const cat = r.category || 'Other'
    if (!catMap[cat]) catMap[cat] = { control: [], test: [] }
    catMap[cat].control.push(r.control_score)
    catMap[cat].test.push(r.test_score)
  }
  const catStats = Object.entries(catMap).map(([cat, { control, test }]) => {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
    const c = Math.round(avg(control) * 100) / 100
    const t = Math.round(avg(test) * 100) / 100
    return { category: cat, avg_control: c, avg_test: t, delta: Math.round((t - c) * 100) / 100, question_count: control.length }
  }).sort((a, b) => b.delta - a.delta)

  const totalC = Math.round(results.reduce((s, r) => s + r.control_score, 0) / results.length * 100) / 100
  const totalT = Math.round(results.reduce((s, r) => s + r.test_score, 0) / results.length * 100) / 100

  return {
    run: { run_at, judge_model, inject_strategy, total_questions: results.length, avg_control: totalC, avg_test: totalT, delta: Math.round((totalT - totalC) * 100) / 100 },
    results,
    catStats,
  }
}

export default async function BenchmarkPage() {
  const data = await getBenchmarkData()
  return <BenchmarkClient data={data} />
}
