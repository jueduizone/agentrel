import { serviceClient } from '@/lib/supabase'
import BenchmarkClient from './BenchmarkClient'

export const revalidate = 3600  // revalidate every hour

async function getLatestRun() {
  const { data: runs } = await serviceClient
    .from('eval_runs')
    .select('*')
    .order('run_date', { ascending: false })
    .limit(5)

  if (!runs || runs.length === 0) return null

  const latestRun = runs[0]

  const { data: results } = await serviceClient
    .from('eval_results')
    .select('*')
    .eq('run_id', latestRun.id)
    .order('question_id')

  const { data: catStats } = await serviceClient
    .from('eval_category_stats')
    .select('*')
    .eq('run_id', latestRun.id)
    .order('delta', { ascending: false })

  return { run: latestRun, results: results ?? [], catStats: catStats ?? [], allRuns: runs }
}

export default async function BenchmarkPage() {
  const data = await getLatestRun()
  return <BenchmarkClient data={data} />
}
