import Link from 'next/link'
import { Github, ArrowRight, Zap, RefreshCw, FileText } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { serviceClient as supabase } from '@/lib/supabase'
import { HomeCopyButton } from './HomeCopyButton'
import { Footer } from '@/components/footer'

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
    href: '/skills?type=hackathon-guide',
  },
  {
    icon: '💰',
    title: 'Apply for a Grant',
    desc: 'Grant guides + success stories',
    href: '/skills?type=grant',
  },
  {
    icon: '🔒',
    title: 'Security Audit',
    desc: 'Contract vulnerabilities + checklists',
    href: '/skills?type=security',
  },
]

const INSTALL_EXAMPLES = [
  { label: 'Ethereum', cmd: 'curl "https://agentrel.vercel.app/api/skills?ecosystem=ethereum&limit=5"' },
  { label: 'Solana', cmd: 'curl "https://agentrel.vercel.app/api/skills?ecosystem=solana&limit=5"' },
  { label: 'Monad', cmd: 'curl "https://agentrel.vercel.app/api/skills/monad/network-config.md"' },
  { label: 'Security', cmd: 'curl "https://agentrel.vercel.app/api/skills?type=security&limit=5"' },
  { label: 'Zama', cmd: 'curl "https://agentrel.vercel.app/api/skills/zama/fhevm-dev-guide.md"' },
]
const INSTALL_CMD = INSTALL_EXAMPLES[0].cmd
const INDEX_CMD = 'https://agentrel.vercel.app/api/v1/skill.md'

async function getStats() {
  const [{ count: skillsCount }, { data: ecosystemRows }, { data: sourceRows }] = await Promise.all([
    supabase.from('skills').select('*', { count: 'exact', head: true }),
    supabase.from('skills').select('ecosystem'),
    supabase.from('skills').select('source'),
  ])

  const uniqueEcosystems = new Set((ecosystemRows ?? []).map((r) => r.ecosystem)).size

  // Contributors = distinct source organizations (official/verified/community)
  const contributors = new Set(
    (sourceRows ?? [])
      .map(r => r.source)
      .filter((s): s is string => !!s && s !== 'ai-generated' && s !== 'openbuild')
  ).size

  // Build ecosystem list with counts, sorted by count desc
  const countMap: Record<string, number> = {}
  ;(ecosystemRows ?? []).forEach((r) => {
    countMap[r.ecosystem] = (countMap[r.ecosystem] ?? 0) + 1
  })
  const ecosystemList = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }))

  return {
    skills: skillsCount ?? 0,
    ecosystems: uniqueEcosystems,
    contributors,
    ecosystemList,
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
        {/* One URL for everything */}
        <div className="mt-10 mx-auto max-w-xl">
          <p className="text-xs text-center text-muted-foreground mb-3 font-medium uppercase tracking-wider">
            One URL for everything
          </p>
          <div className="flex items-center justify-between rounded-lg border border-border bg-gray-900 px-4 py-3">
            <code className="font-mono text-sm text-gray-100 truncate mr-3">{INDEX_CMD}</code>
            <HomeCopyButton text={INDEX_CMD} />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Add to your agent&apos;s system prompt to unlock 212+ Web3 Skills
          </p>
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
              className="flex flex-col rounded-xl border border-border p-4 transition-all hover:border-black hover:shadow-md active:scale-95 active:bg-gray-50 no-underline cursor-pointer group"
            >
              <span className="mb-2 text-2xl">{s.icon}</span>
              <span className="mb-1 font-medium text-black text-sm">{s.title}</span>
              <span className="text-xs text-muted-foreground">{s.desc}</span>
            </Link>
          ))}
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
              <div className="mt-1 text-sm text-muted-foreground">Sources</div>
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
          <h2 className="mb-2 text-2xl font-bold text-black">Supported Ecosystems</h2>
          <p className="mb-8 text-sm text-muted-foreground">Click to browse skills by ecosystem</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {stats.ecosystemList.map((eco) => (
              <Link
                key={eco.name}
                href={`/skills?ecosystem=${eco.name.toLowerCase()}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-foreground transition-all hover:border-black hover:shadow-sm"
              >
                {eco.name}
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{eco.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
