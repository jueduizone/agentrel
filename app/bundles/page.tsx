import Link from 'next/link'
import { Package } from 'lucide-react'
import { serviceClient } from '@/lib/supabase'
import type { Bundle } from '@/lib/types'
import { Navbar } from '@/components/navbar'

export default async function BundlesPage() {
  const { data: bundles, error } = await serviceClient
    .from('bundles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Bundles</h1>
          <p className="mt-2 text-muted-foreground">
            Pre-packaged skill collections for common Web3 development scenarios
          </p>
          {error && (
            <p className="mt-2 text-sm text-red-500">Failed to load bundles: {error.message}</p>
          )}
        </div>

        {!bundles || bundles.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center text-muted-foreground">
            No bundles available yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {(bundles as Bundle[]).map((bundle) => {
              const installCmd = `npx skills add agentrel/bundle/${bundle.id}`
              return (
                <div
                  key={bundle.id}
                  className="rounded-xl border border-border p-6 transition-colors hover:border-black"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {bundle.scenario && (
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                        {bundle.scenario}
                      </span>
                    )}
                  </div>

                  <h2 className="mb-2 text-lg font-semibold text-black">{bundle.name}</h2>
                  <p className="mb-4 text-sm text-muted-foreground">{bundle.description}</p>

                  {/* Skills list */}
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Includes {bundle.skills.length} skill{bundle.skills.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {bundle.skills.map((skillId) => (
                        <Link
                          key={skillId}
                          href={`/skills/${skillId}`}
                          className="rounded-full border border-border bg-muted/30 px-2 py-0.5 font-mono text-xs text-foreground hover:bg-muted transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {skillId}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Install command */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <code className="block font-mono text-xs text-foreground break-all">
                      {installCmd}
                    </code>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
