'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Application = {
  id: string
  pitch: string | null
  custom_fields: Record<string, unknown> | null
  reputation_snapshot: Record<string, unknown> | null
  status: string
  created_at: string
  _user: { email: string | null; wallet_address: string | null; human_did: string | null } | null
}

export function ApplicationRow({ app, grantId, apiKey }: { app: Application; grantId: string; apiKey?: string }) {
  const [status, setStatus] = useState(app.status)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function updateStatus(newStatus: 'approved' | 'rejected') {
    setLoading(true)
    const res = await fetch(`/api/admin/grants/${grantId}/applications/${app.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setStatus(newStatus)
      router.refresh()
    }
    setLoading(false)
  }

  const rep = app.reputation_snapshot ?? {}

  return (
    <div className="border border-border rounded-xl p-5 bg-background space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">{app._user?.email ?? 'Unknown'}</p>
          {app._user?.wallet_address && (
            <p className="text-xs text-muted-foreground/50 font-mono">{app._user.wallet_address.slice(0, 12)}...</p>
          )}
          {app._user?.human_did && (
            <p className="text-xs text-indigo-500">DID: {app._user.human_did}</p>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          status === 'approved' ? 'bg-green-100 text-green-700' :
          status === 'rejected' ? 'bg-red-100 text-red-600' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {status}
        </span>
      </div>

      {app.pitch && (
        <div className="text-sm text-foreground/80 bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground/50 mb-1 uppercase tracking-wider">Pitch</p>
          {app.pitch}
        </div>
      )}

      {app.custom_fields && Object.keys(app.custom_fields).length > 0 && (
        <div className="text-sm text-foreground/80 bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground/50 mb-2 uppercase tracking-wider">Application Fields</p>
          {Object.entries(app.custom_fields).map(([k, v]) => (
            <p key={k}><span className="font-medium">{k}:</span> {String(v)}</p>
          ))}
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground/70">
        <span>Grant apps: <strong>{String(rep.grant_applications ?? 0)}</strong></span>
        <span>Approved: <strong>{String(rep.approved_grants ?? 0)}</strong></span>
        {!!rep.wallet_address && <span>Has wallet</span>}
        {!!rep.human_did && <span>DID verified</span>}
        <span className="ml-auto">{new Date(app.created_at).toLocaleDateString()}</span>
      </div>

      {status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => updateStatus('approved')}
            disabled={loading}
            className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            ✅ Approve
          </button>
          <button
            onClick={() => updateStatus('rejected')}
            disabled={loading}
            className="flex-1 bg-muted hover:bg-red-50 text-foreground/80 hover:text-red-600 text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  )
}
