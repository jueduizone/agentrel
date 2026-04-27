import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'
import { exec } from 'child_process'

// 简单 token 保护（防止公开触发）
const EVAL_TOKEN = process.env.EVAL_TRIGGER_TOKEN || 'agentrel-eval-2026'

export async function POST(req: NextRequest) {
  const { token, skill_ids, judge_model = 'gpt-4o-mini' } = await req.json()
  if (token !== EVAL_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 检查是否已有 eval 在跑（最近 5 分钟内）
  const { data: recent } = await serviceClient
    .from('eval_results')
    .select('run_at')
    .order('run_at', { ascending: false })
    .limit(1)
  
  if (recent?.[0]) {
    const lastRun = new Date(recent[0].run_at).getTime()
    if (Date.now() - lastRun < 5 * 60 * 1000) {
      return NextResponse.json({ ok: false, message: '5分钟内已有eval运行，请稍后再试' })
    }
  }

  // 异步触发 eval 脚本（不等待完成）
  const skillArg = skill_ids ? `--skill-ids "${skill_ids}"` : ''
  const cmd = `cd /home/bre/agentrel && ZENMUX_API_KEY=${process.env.ZENMUX_API_KEY || 'sk-ss-v1-196d706809b60c6ccf68e30afa1a711ce1b834674822781bd972b3885ab640e0'} python3 eval/run.py ${skillArg} --judge-model ${judge_model} --answerer zenmux >> /tmp/agentrel-eval.log 2>&1 &`
  
  exec(cmd, (error) => {
    if (error) console.error('Eval trigger error:', error.message)
  })

  return NextResponse.json({ ok: true, message: 'Eval 已触发，约 5-10 分钟后结果写入数据库' })
}

export async function GET() {
  // 返回最近的 eval 运行状态
  const { data } = await serviceClient
    .from('eval_results')
    .select('run_at, judge_model')
    .order('run_at', { ascending: false })
    .limit(1)
  
  const latest = data?.[0]
  return NextResponse.json({
    last_run: latest?.run_at || null,
    judge_model: latest?.judge_model || null,
  })
}
