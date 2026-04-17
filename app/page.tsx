import { Navbar } from '@/components/navbar'
import { serviceClient as supabase } from '@/lib/supabase'
import { HeroSection } from './HeroSection'
import { HomeContent } from './HomeContent'
import { Footer } from '@/components/footer'

async function getStats() {
  const [
    { count: skillsCount },
    { data: ecosystemRows },
    { data: sourceRows },
    { data: typeRows },
    { count: grantsCount },
  ] = await Promise.all([
    supabase.from('skills').select('*', { count: 'exact', head: true }),
    supabase.from('skills').select('ecosystem'),
    supabase.from('skills').select('source'),
    supabase.from('skills').select('type'),
    supabase.from('grants').select('*', { count: 'exact', head: true }),
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
    .slice(0, 19)
    .map(([name, count]) => ({ name, count }))

  // Build type counts for hero scenario links
  const typeCount: Record<string, number> = {}
  ;(typeRows ?? []).forEach((r) => {
    if (r.type) typeCount[r.type] = (typeCount[r.type] ?? 0) + 1
  })

  return {
    skills: skillsCount ?? 0,
    ecosystems: uniqueEcosystems,
    contributors,
    ecosystemList,
    scenarioCounts: {
      technicalDoc: typeCount['technical-doc'] ?? 0,
      hackathonGuide: typeCount['hackathon-guide'] ?? 0,
      security: typeCount['security'] ?? 0,
      grants: grantsCount ?? 0,
    },
  }
}

export default async function HomePage() {
  const stats = await getStats()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection
        skillsCount={stats.skills}
        scenarioCounts={stats.scenarioCounts}
      />

      <HomeContent stats={stats} />

      {/* Footer */}
      <Footer />
    </div>
  )
}
