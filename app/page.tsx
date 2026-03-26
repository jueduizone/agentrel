import Link from 'next/link'
import { Github, ArrowRight, Zap, RefreshCw, FileText } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { serviceClient as supabase } from '@/lib/supabase'
import { HomeCopyButton } from './HomeCopyButton'

const ECOSYSTEMS = [
  { name: 'Ethereum', color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  { name: 'Solana', color: 'bg-purple-100 text-purple-700 border border-purple-200' },
  { name: 'Aptos', color: 'bg-teal-100 text-teal-700 border border-teal-200' },
  { name: 'Sui', color: 'bg-sky-100 text-sky-700 border border-sky-200' },
  { name: 'TON', color: 'bg-cyan-100 text-cyan-700 border border-cyan-200' },
  { name: 'Cosmos', color: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
  { name: 'Polkadot', color: 'bg-pink-100 text-pink-700 border border-pink-200' },
]

const SCENARIOS = [
  {
    icon: '💻',
    title: 'Build a dApp',
    desc: 'Pick skills by chain for development',
    href: '/skills?type=technical-doc',
  },
  {
    icon: '🏆',
    title: 'Join a Hackathon',
    desc: 'Hackathon tracks + chain bundles',
    href: '/bundles?type=hackathon',
  },
  {
    icon: '💰',
    title: 'Apply for a Grant',
    desc: 'Grant guides + success stories',
    href: '/skills?type=grant-guide',
  },
  {
    icon: '🔒',
    title: 'Security Audit',
    desc: 'Contract vulnerabilities + checklists',
    href: '/skills?type=security',
  },
]

const INSTALL_CMD = 'npx skills add agentrel/monad-dev'

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
          Web3 AI Skills
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Give your AI agent real Web3 context
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

      {/* Scenario cards */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="mb-6 text-center text-xl font-semibold text-black">
          What are you building?
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {SCENARIOS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex flex-col rounded-xl border border-border p-4 transition-all hover:border-black hover:shadow-sm no-underline cursor-pointer"
            >
              <span className="mb-2 text-2xl">{s.icon}</span>
              <span className="mb-1 font-medium text-black text-sm">{s.title}</span>
              <span className="text-xs text-muted-foreground">{s.desc}</span>
            </Link>
          ))}
        </div>

        {/* Quick install */}
        <div className="mt-8 mx-auto max-w-xl">
          <div className="flex items-center justify-between rounded-lg border border-border bg-gray-900 px-4 py-3">
            <code className="font-mono text-sm text-gray-100">{INSTALL_CMD}</code>
            <HomeCopyButton text={INSTALL_CMD} />
          </div>
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
              <div className="mt-1 text-sm text-muted-foreground">Ecosystems</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black">{stats.contributors}</div>
              <div className="mt-1 text-sm text-muted-foreground">Contributors</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-black">Why AgentRel</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-border p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <Zap className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="mb-2 font-semibold text-black">Fix AI Hallucinations</h3>
            <p className="text-sm text-muted-foreground">
              Targeted corrections for the most common AI mistakes (Solana web3.js v1 vs v2,
              ethers v5 vs v6). Stop your agent from generating outdated code.
            </p>
          </div>
          <div className="rounded-xl border border-border p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="mb-2 font-semibold text-black">Real-time Ecosystem Updates</h3>
            <p className="text-sm text-muted-foreground">
              Track changes across multi-chain ecosystems — SDK upgrades, API changes, and
              best-practice updates reflected in your agent context immediately.
            </p>
          </div>
          <div className="rounded-xl border border-border p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="mb-2 font-semibold text-black">Grant Application Guides</h3>
            <p className="text-sm text-muted-foreground">
              Covers grant program requirements, review criteria, and success stories across
              major ecosystems to help your agent give accurate funding advice.
            </p>
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="mb-8 text-2xl font-bold text-black">Supported Ecosystems</h2>
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
