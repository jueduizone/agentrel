'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, User, Shield, LogOut } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/context/LanguageContext'

const ECOSYSTEMS = [
  { name: 'Ethereum', slug: 'ethereum' },
  { name: 'Solana', slug: 'solana' },
  { name: 'Base', slug: 'base' },
  { name: 'Monad', slug: 'monad' },
  { name: 'Sui', slug: 'sui' },
  { name: 'TON', slug: 'ton' },
  { name: 'Zama', slug: 'zama' },
]

function Dropdown({
  label,
  items,
  isActive,
}: {
  label: string
  items: { label: string; href: string; external?: boolean; sub?: { name: string; slug: string }[] }[]
  isActive: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 text-sm transition-colors ${
          isActive ? 'text-black font-semibold' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 pt-1 min-w-[180px] z-50">
        <div className="bg-white border border-border rounded-xl shadow-lg py-1.5">
          {items.map(item => (
            <div key={item.href}>
              {item.external ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              ) : item.sub ? (
                <div>
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                  {item.sub.map(eco => (
                    <Link key={eco.slug} href={`/ecosystem/${eco.slug}`}
                      className="flex items-center px-5 py-1 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      onClick={() => setOpen(false)}>
                      {eco.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link href={item.href}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ email: string; role: string; api_key: string } | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { lang, setLang, t } = useLang()

  useEffect(() => {
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function signOut() {
    localStorage.removeItem('agentrel_api_key')
    setUser(null)
    setShowDropdown(false)
  }

  const exploreItems = [
    { label: 'Skills', href: '/skills' },
    { label: 'Bundles', href: '/bundles' },
    { label: 'Benchmark', href: '/benchmark' },
  ]

  const resourceItems = [
    { label: 'Docs', href: 'https://ian-docs.vercel.app/docs/agentforum', external: true },
    { label: 'GitHub', href: 'https://github.com/jueduizone/agentrel', external: true },
  ]

  const exploreActive = ['/skills', '/bundles', '/benchmark', '/ecosystem'].some(p => pathname.startsWith(p))
  const buildActive = pathname.startsWith('/build')

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Left: Logo + nav */}
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-black">AgentRel</span>
          </Link>

          <div className="hidden items-center gap-5 md:flex">
            <Dropdown label={t('nav.explore')} items={exploreItems} isActive={exploreActive} />
            <Dropdown label={t('nav.ecosystems')} items={ECOSYSTEMS.map(e => ({ label: e.name, href: `/ecosystem/${e.slug}` }))} isActive={pathname.startsWith('/ecosystem')} />
            <Link href="/build"
              className={`text-sm transition-colors ${buildActive ? 'text-black font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
              {t('nav.build')}
            </Link>
            <Dropdown label={t('nav.resources')} items={resourceItems} isActive={false} />
          </div>
        </div>

        {/* Right: lang toggle + Submit Skill + auth */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-black transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50"
            title={lang === 'en' ? '切换到中文' : 'Switch to English'}
          >
            🌐 <span className="hidden sm:inline font-medium">{lang === 'en' ? 'EN' : 'ZH'}</span>
          </button>

          <Link href="/submit"
            className="hidden sm:inline-flex items-center px-3 py-1.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-black/80 transition-colors">
            {t('nav.submitSkill')}
          </Link>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-black transition-colors border border-border rounded-lg px-3 py-1.5">
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
                    <LogOut className="h-3.5 w-3.5" />{t('nav.signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href="/auth/login" className="text-sm text-gray-600 hover:text-black transition-colors px-2 py-1.5">
                {t('nav.signIn')}
              </Link>
              <Link href="/auth/register"
                className="text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
