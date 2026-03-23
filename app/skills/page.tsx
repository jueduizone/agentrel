import { serviceClient } from '@/lib/supabase'
import type { Skill } from '@/lib/types'
import { Navbar } from '@/components/navbar'
import { SkillsClient } from './SkillsClient'

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ ecosystem?: string; q?: string }>
}) {
  const { ecosystem, q } = await searchParams

  const { data: skills, error } = await serviceClient
    .from('skills')
    .select('*')
    .order('created_at', { ascending: false })

  const initialSkills: Skill[] = skills ?? []

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Skills</h1>
          <p className="mt-2 text-muted-foreground">
            Browse AI context skills for Web3 development
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-500">Failed to load skills: {error.message}</p>
          )}
        </div>
        <SkillsClient
          skills={initialSkills}
          initialEcosystem={ecosystem}
          initialQ={q}
        />
      </div>
    </div>
  )
}
