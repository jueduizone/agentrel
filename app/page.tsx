import Link from 'next/link'
import { Github, ArrowRight, Zap, RefreshCw, FileText } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { supabase } from '@/lib/supabase'

const ECOSYSTEMS = [
  { name: 'Ethereum', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  { name: 'Solana', color: 'bg-purple-100 text-purple-700 border border-purple-200' },
  { name: 'Aptos', color: 'bg-teal-100 text-teal-700 border border-teal-200' },
  { name: 'Sui', color: 'bg-sky-100 text-sky-700 border border-sky-200' },
  { name: 'TON', color: 'bg-cyan-100 text-cyan-700 border border-cyan-200' },
  { name: 'Cosmos', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
  { name: 'Polkadot', color: 'bg-pink-100 text-pink-700 border border-pink-200' },
]

async function getStats() {
  const [{ count: skillsCount }, { data: ecosystemRows }] = await Promise.all([
    supabase.from('skills').select('*', { count: 'exact', head: true }),
    supabase.from('skills').select('ecosystem'),
  ])

  const uniqueEcosystems = new Set((ecosystemRows ?? []).map((r) => r.ecosystem)).size

  return {
    skills: skillsCount ?? 0,
    ecosystems: uniqueEcosystems,
    contributors: 42,
  }
}

export default async function HomePage() {
  const stats = await getStats()

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Open Source · Free for Developers
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-black md:text-6xl">
          Web3 开发者的
          <br />
          <span className="text-muted-foreground">AI Context 基础设施</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Skills 平台，让你的 AI Agent 真正懂 Web3。修复幻觉，紧跟生态动态，
          获取准确的 Web3 上下文。
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/80"
          >
            Browse Skills
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/jueduizone/agentrel"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-black">{stats.skills}</div>
              <div className="mt-1 text-sm text-muted-foreground">Skills</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black">{stats.ecosystems || 7}</div>
              <div className="mt-1 text-sm text-muted-foreground">生态覆盖</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black">{stats.contributors}</div>
              <div className="mt-1 text-sm text-muted-foreground">社区贡献者</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-black">为什么选择 AgentRel</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <Zap className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="mb-2 font-semibold text-black">AI 幻觉修复</h3>
            <p className="text-sm text-muted-foreground">
              针对最常见的 AI 错误（如 Solana web3.js v1 vs v2，ethers v5 vs v6）提供精准修正，
              让你的 Agent 不再生成过时代码。
            </p>
          </div>
          <div className="rounded-xl border border-border p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="mb-2 font-semibold text-black">实时生态动态</h3>
            <p className="text-sm text-muted-foreground">
              跟踪多链生态的最新变化，SDK 升级、API 变动、最佳实践更新，
              第一时间反映到你的 Agent 上下文中。
            </p>
          </div>
          <div className="rounded-xl border border-border p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="mb-2 font-semibold text-black">Grant 申请指南</h3>
            <p className="text-sm text-muted-foreground">
              涵盖各大生态 Grant 计划的申请要求、评审标准和成功案例，
              帮助你的 Agent 提供精准的融资建议。
            </p>
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="mb-8 text-2xl font-bold text-black">支持的生态</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {ECOSYSTEMS.map((eco) => (
              <Link
                key={eco.name}
                href={`/skills?ecosystem=${eco.name.toLowerCase()}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-80 ${eco.color}`}
              >
                {eco.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="mb-4 text-3xl font-bold text-black">快速开始</h2>
        <p className="mb-6 text-muted-foreground">在你的 Agent 中添加一个 Skill，立即提升准确度</p>
        <div className="mx-auto max-w-xl rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm">
          <span className="text-muted-foreground">$ </span>
          <span>npx skills add agentrel/solana/web3js-v2</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <span>© 2026 AgentRel. Open source under MIT License.</span>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/jueduizone/agentrel"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/agentrel"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
