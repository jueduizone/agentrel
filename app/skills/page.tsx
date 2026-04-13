import { serviceClient } from '@/lib/supabase'
import type { Skill } from '@/lib/types'
import { Navbar } from '@/components/navbar'
import { SkillsClient } from './SkillsClient'
import { SkillsPageHeader } from './SkillsPageHeader'

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ ecosystem?: string; q?: string; type?: string }>
}) {
  const { ecosystem, q, type } = await searchParams

  const { data: skills, error } = await serviceClient
    .from('skills')
    .select('*')
    .order('health_score', { ascending: false, nullsFirst: false })
    .order('install_count', { ascending: false, nullsFirst: false })

  const initialSkills: Skill[] = skills ?? []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SkillsPageHeader />
        {error && (
          <p className="mb-4 text-sm text-red-500">Failed to load skills: {error.message}</p>
        )}
        <SkillsClient
          skills={initialSkills}
          initialEcosystem={ecosystem}
          initialQ={q}
          initialType={type}
        />
      </div>
    </div>
  )
}
