'use client'

import Link from 'next/link'
import { Github, ChevronDown, User, KeyRound, Shield, LogOut } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export function Navbar() {
  const [user, setUser] = useState<{ email: string; role: string; api_key: string } | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check stored api_key
    const key = localStorage.getItem('agentrel_api_key')
    if (key) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${key}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.email) setUser({ email: data.email, role: data.role, api_key: key }) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function signOut() {
    localStorage.removeItem('agentrel_api_key')
    setUser(null)
    setShowDropdown(false)
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-black">
            AgentRel
          </Link>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/skills" className="hover:text-foreground transition-colors">Skills</Link>
            <Link href="/bundles" className="hover:text-foreground transition-colors">Bundles</Link>
            <Link href="/benchmark" className="hover:text-foreground transition-colors">Benchmark</Link>
            <Link href="/grants" className="hover:text-foreground transition-colors">Grants</Link>
            <Link href="/submit" className="hover:text-foreground transition-colors text-indigo-500 font-medium">
              Submit Skill
            </Link>
            <a href="https://ian-docs.vercel.app/docs/agentforum" target="_blank" rel="noopener noreferrer"
              className="hover:text-foreground transition-colors">Docs</a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* GitHub */}
          <a href="https://github.com/jueduizone/agentrel" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>

          {/* Auth */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-black transition-colors border border-border rounded-lg px-3 py-1.5"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-[120px] truncate">{user.email.split('@')[0]}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl border border-border shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  {user.role === 'admin' && (
                    <Link href="/admin/grants"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                      onClick={() => setShowDropdown(false)}>
                      <Shield className="h-3.5 w-3.5" />Admin Panel
                    </Link>
                  )}
                  <div className="px-3 py-2 border-t border-border mt-1">
                    <p className="text-xs text-gray-400 font-mono truncate">{user.api_key}</p>
                  </div>
                  <button onClick={signOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <LogOut className="h-3.5 w-3.5" />Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login"
                className="text-sm text-gray-600 hover:text-black transition-colors px-3 py-1.5">
                Sign In
              </Link>
              <Link href="/auth/register"
                className="text-sm bg-black text-white rounded-lg px-3 py-1.5 hover:bg-black/80 transition-colors">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
