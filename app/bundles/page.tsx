import type { Metadata } from 'next'
import { serviceClient } from '@/lib/supabase'
import type { Bundle } from '@/lib/types'
import { BundlesClient } from './BundlesClient'

export const metadata: Metadata = {
  title: 'Bundles — AgentRel',
  description: 'Pre-packaged Skill collections for common Web3 development scenarios.',
}

export default async function BundlesPage() {
  const { data: bundles, error } = await serviceClient
    .from('bundles')
    .select('*')
    .order('created_at', { ascending: false })

  return <BundlesClient bundles={(bundles as Bundle[] | null) ?? null} errorMessage={error?.message} />
}
