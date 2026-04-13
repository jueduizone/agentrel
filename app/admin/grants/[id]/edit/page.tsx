'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { GrantForm, type GrantFormData, type SponsorOption } from '../../_components/GrantForm'

export default function EditGrantPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [initial, setInitial] = useState<Partial<GrantFormData> | null>(null)
  const [saving, setSaving] = useState(false)
  const [sponsors, setSponsors] = useState<SponsorOption[]>([])
  const [error, setError] = useState('')

  const [apiKey, setApiKey] = useState<string | null>(null)

  useEffect(() => {
    setApiKey(localStorage.getItem('agentrel_api_key'))
  }, [])

  useEffect(() => {
    fetch(`/api/v1/grants/${id}`)
      .then(r => r.json())
      .then(g => setInitial({
        title: g.title ?? '',
        description: g.description ?? '',
        sponsor: g.sponsor ?? '',
        reward: g.reward ?? '',
        deadline: g.deadline ? g.deadline.slice(0, 16) : '',
        status: g.status ?? 'open',
        source_type: g.source_type ?? 'native',
        external_url: g.external_url ?? '',
        application_schema: g.application_schema ? JSON.stringify(g.application_schema, null, 2) : '',
        max_applications: g.max_applications != null ? String(g.max_applications) : '',
        track: g.track ?? '',
        tech_requirements: g.tech_requirements ?? '',
      }))
  }, [id])

  const handleSubmit = async (data: GrantFormData) => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...data,
        deadline: data.deadline || null,
        max_applications: data.max_applications ? Number(data.max_applications) : null,
        application_schema: data.application_schema.trim() ? JSON.parse(data.application_schema) : null,
      }
      const res = await fetch(`/api/admin/grants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      router.push(`/admin/grants/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (!initial) return <div className="min-h-screen bg-muted/50 flex items-center justify-center"><p className="text-muted-foreground/50 text-sm">加载中...</p></div>

  return (
    <div className="min-h-screen bg-muted/50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href={`/admin/grants/${id}`} className="text-sm text-muted-foreground/50 hover:text-muted-foreground mb-6 inline-block">← 返回详情</Link>
        <h1 className="text-xl font-bold text-foreground mb-6">编辑 Grant</h1>
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <GrantForm initial={initial} onSubmit={handleSubmit} saving={saving} submitLabel="保存修改" sponsors={sponsors} />
      </main>
    </div>
  )
}
