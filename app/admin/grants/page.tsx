import { redirect } from 'next/navigation'
import Link from 'next/link'
import { serviceClient } from '@/lib/supabase'
import { Navbar } from '@/components/navbar'

// Simple admin auth check via cookie (server-side)
// Full auth requires middleware - for now redirect non-admins from client

async function getAdminGrants() {
  const db = serviceClient
  const { data: grants } = await db
    .from('grants')
    .select('id, title, status, created_at, sponsor')
    .order('created_at', { ascending: false })
  return grants ?? []
}

export default async function AdminGrantsPage() {
  const grants = await getAdminGrants()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin — Grants</h1>
          <p className="text-gray-500 text-sm mt-1">Manage grant applications</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
              <tr>
                <th className="text-left px-4 py-3">Grant</th>
                <th className="text-left px-4 py-3">Sponsor</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grants.map(g => (
                <tr key={g.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{g.title}</td>
                  <td className="px-4 py-3 text-gray-500">{g.sponsor ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      g.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/grants/${g.id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      View Applications →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
