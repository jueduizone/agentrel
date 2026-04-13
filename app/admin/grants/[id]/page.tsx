import { notFound } from 'next/navigation'
import Link from 'next/link'
import { serviceClient } from '@/lib/supabase'
import { Navbar } from '@/components/navbar'
import { ApplicationRow } from './ApplicationRow'

async function getGrantWithApps(grantId: string) {
  const db = serviceClient

  const [{ data: grant }, { data: applications }] = await Promise.all([
    db.from('grants').select('*').eq('id', grantId).single(),
    db.from('grant_applications')
      .select('id, user_id, pitch, custom_fields, reputation_snapshot, status, created_at')
      .eq('grant_id', grantId)
      .order('created_at', { ascending: false }),
  ])

  if (!grant) return null

  // Enrich with user info
  const userIds = (applications ?? []).map(a => a.user_id)
  const { data: users } = await db
    .from('users')
    .select('id, email, wallet_address, human_did')
    .in('id', userIds)

  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))
  const enriched = (applications ?? []).map(a => ({ ...a, _user: userMap[a.user_id] ?? null }))

  return { grant, applications: enriched }
}

export default async function AdminGrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getGrantWithApps(id)
  if (!result) notFound()

  const { grant, applications } = result
  const pending = applications.filter(a => a.status === 'pending').length
  const approved = applications.filter(a => a.status === 'approved').length

  return (
    <div className="min-h-screen bg-muted/50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Link href="/admin/grants" className="text-sm text-muted-foreground/50 hover:text-muted-foreground mb-3 inline-block">
            ← All Grants
          </Link>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground">{grant.title}</h1>
            <Link href={`/admin/grants/${id}/edit`} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/80 text-sm font-medium text-foreground/80 rounded-lg hover:bg-muted/50 transition-colors">
              ✏️ 编辑
            </Link>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground/70">
            <span>{applications.length} total</span>
            <span className="text-yellow-600">{pending} pending</span>
            <span className="text-green-600">{approved} approved</span>
          </div>
        </div>

        {applications.length === 0 ? (
          <p className="text-muted-foreground/50 text-center py-12">No applications yet.</p>
        ) : (
          <div className="space-y-4">
            {applications.map(app => (
              <ApplicationRow
                key={app.id}
                app={{ ...app, _user: app._user }}
                grantId={id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
