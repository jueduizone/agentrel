import Link from 'next/link'
import { Zap, RefreshCw, FileText } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { serviceClient as supabase } from '@/lib/supabase'
import { HeroSection } from './HeroSection'
import { Footer } from '@/components/footer'

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

      <HeroSection />

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
                href={(() => { const slug = eco.name.toLowerCase(); return ['ton', 'monad', 'sui', 'base', 'solana', 'zama', 'ethereum'].includes(slug) ? `/ecosystem/${slug}` : `/skills?ecosystem=${slug}`; })()}
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
