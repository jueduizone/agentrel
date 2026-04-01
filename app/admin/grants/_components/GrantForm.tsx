'use client'
import { useState } from 'react'

export type GrantFormData = {
  title: string; description: string; sponsor: string; reward: string
  deadline: string; status: string; source_type: string; external_url: string
  application_schema: string; max_applications: string
  track: string; tech_requirements: string
}

const EMPTY: GrantFormData = {
  title: '', description: '', sponsor: '', reward: '', deadline: '',
  status: 'open', source_type: 'native', external_url: '',
  application_schema: '', max_applications: '', track: '', tech_requirements: '',
}

export function GrantForm({
  initial, onSubmit, saving, submitLabel,
}: {
  initial?: Partial<GrantFormData>
  onSubmit: (data: GrantFormData) => void
  saving: boolean
  submitLabel: string
}) {
  const [form, setForm] = useState<GrantFormData>({ ...EMPTY, ...initial })
  const set = (key: keyof GrantFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validate JSON if provided
    if (form.application_schema.trim()) {
      try { JSON.parse(form.application_schema) } catch {
        alert('application_schema 不是合法 JSON，请检查')
        return
      }
    }
    const data = { ...form }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 space-y-5">
      {/* source_type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">类型</label>
        <div className="flex gap-6">
          {['native', 'external'].map(t => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="source_type" value={t} checked={form.source_type === t} onChange={set('source_type')} />
              <span className="text-sm text-gray-700 capitalize">{t === 'native' ? 'Native（平台原生）' : 'External（外部链接）'}</span>
            </label>
          ))}
        </div>
      </div>

      <Field label="标题" required><input required name="title" value={form.title} onChange={set('title')} placeholder="Grant 标题" className={inputCls} /></Field>
      <Field label="描述"><textarea value={form.description} onChange={set('description')} rows={4} placeholder="Grant 详细描述..." className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Sponsor"><input value={form.sponsor} onChange={set('sponsor')} placeholder="如 OpenBuild" className={inputCls} /></Field>
        <Field label="奖励金额"><input value={form.reward} onChange={set('reward')} placeholder="如 $500 USDC" className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="截止日期"><input type="datetime-local" value={form.deadline} onChange={set('deadline')} className={inputCls} /></Field>
        <Field label="状态">
          <select value={form.status} onChange={set('status')} className={inputCls}>
            <option value="open">开放中</option>
            <option value="closed">已截止</option>
          </select>
        </Field>
      </div>
      {form.source_type === 'external' && (
        <Field label="原网站链接（External URL）"><input type="url" name="external_url" value={form.external_url} onChange={set('external_url')} placeholder="https://" className={inputCls} /></Field>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="赛道 / 方向（可选）"><input value={form.track} onChange={set('track')} placeholder="如 DeFi" className={inputCls} /></Field>
        <Field label="名额上限（可选）"><input type="number" value={form.max_applications} onChange={set('max_applications')} placeholder="不填=不限" className={inputCls} /></Field>
      </div>
      <Field label="技术要求（可选）"><textarea value={form.tech_requirements} onChange={set('tech_requirements')} rows={2} placeholder="如 Solidity, Rust..." className={inputCls} /></Field>
      <Field label="自定义报名字段 JSON（可选）" hint='格式：[{"name":"github_url","label":"GitHub URL","type":"url","required":true}]'>
        <textarea value={form.application_schema} onChange={set('application_schema')} rows={3} placeholder='[{"name":"github_url","label":"GitHub URL","type":"url","required":true}]' className={`${inputCls} font-mono text-xs`} />
      </Field>

      <button type="submit" disabled={saving} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
        {saving ? '保存中...' : submitLabel}
      </button>
    </form>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

