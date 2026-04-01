'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '注册失败'); return }
      localStorage.setItem('agentrel_api_key', data.api_key)
      router.push('/')
      router.refresh()
    } catch { setError('网络错误，请重试') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-black">AgentRel</Link>
          <p className="text-gray-500 mt-2 text-sm">Create your account</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-gray-400">(min 8 chars)</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-black/80 transition-colors disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-indigo-600 hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
      </div>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <span>© 2026 AgentRel. Open source under MIT License.</span>
          <div className="flex items-center gap-6">
            <a href="https://github.com/jueduizone/agentrel" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="https://discord.gg/agentrel" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
