'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, User, Shield, LogOut, Sun, Moon } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'

const ECOSYSTEMS = [
  { name: 'Ethereum', slug: 'ethereum' },
  { name: 'Solana', slug: 'solana' },
  { name: 'Base', slug: 'base' },
  { name: 'Monad', slug: 'monad' },
  { name: 'Sui', slug: 'sui' },
  { name: 'TON', slug: 'ton' },
  { name: 'Zama', slug: 'zama' },
  { name: 'Starknet', slug: 'starknet' },
  { name: 'Aptos', slug: 'aptos' },
  { name: 'Polygon', slug: 'polygon' },
  { name: 'Mantle', slug: 'mantle' },
  { name: 'Arbitrum', slug: 'arbitrum' },
  { name: 'Optimism', slug: 'optimism' },
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

  // Only respond to real mouse hover — touch devices synthesize mouseenter
  // before click, which would race with the click toggle and reopen/close
  // the dropdown unexpectedly on tap.
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
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
    <div
      ref={ref}
      className="relative"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 text-sm transition-colors ${
          isActive
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 pt-1.5 min-w-[180px] z-[60]">
          <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1">
            {items.map(item => (
              <div key={item.href}>
                {item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : item.sub ? (
                  <div>
                    <p className="px-3 py-1.5 text-[10px] font-mono font-medium text-muted-foreground/60 uppercase tracking-widest">
                      {item.label}
                    </p>
                    {item.sub.map(eco => (
                      <Link
                        key={eco.slug}
                        href={`/ecosystem/${eco.slug}`}
                        className="flex items-center px-5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        {eco.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={() => setOpen(false)}
                  >
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
  const { theme, toggleTheme } = useTheme()

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

  const exploreActive = ['/skills', '/bundles', '/benchmark'].some(p => pathname.startsWith(p))
  const buildActive = pathname.startsWith('/build')

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Left: Logo + nav */}
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-1.5 no-underline">
            <span className="font-display text-base font-semibold tracking-tight text-foreground">
              AgentRel
            </span>
          </Link>

          <div className="hidden items-center gap-5 md:flex">
            <Dropdown label={t('nav.explore')} items={exploreItems} isActive={exploreActive} />
            <Dropdown
              label={t('nav.ecosystems')}
              items={ECOSYSTEMS.map(e => ({ label: e.name, href: `/ecosystem/${e.slug}` }))}
              isActive={pathname.startsWith('/ecosystem')}
            />
            <Link
              href="/build"
              className={`text-sm transition-colors no-underline ${
                buildActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('nav.build')}
            </Link>
            <Dropdown label={t('nav.resources')} items={resourceItems} isActive={false} />
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5">
          {/* Language toggle */}
          <div
            className="flex items-center rounded-md border border-border bg-muted/30 p-0.5"
            aria-label="Language switcher"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`rounded px-1.5 py-1 text-[10px] font-mono font-medium transition-colors ${
                lang === 'en'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('zh')}
              aria-pressed={lang === 'zh'}
              className={`rounded px-1.5 py-1 text-[10px] font-mono font-medium transition-colors ${
                lang === 'zh'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ZH
            </button>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4" />
              : <Moon className="h-4 w-4" />
            }
          </button>

          <Link
            href="/submit"
            className="hidden sm:inline-flex items-center px-3.5 py-1.5 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-80 transition-opacity no-underline"
          >
            {t('nav.submitSkill')}
          </Link>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-3 py-1.5"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-[120px] truncate text-xs">
                  {user.email.split('@')[0]}
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-1.5 w-48 bg-popover rounded-lg border border-border shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin/grants"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-muted transition-colors no-underline"
                      onClick={() => setShowDropdown(false)}
                    >
                      <Shield className="h-3.5 w-3.5" />Admin Panel
                    </Link>
                  )}
                  <div className="px-3 py-2 border-t border-border mt-1">
                    <p className="text-xs text-muted-foreground font-mono truncate">{user.api_key}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />{t('nav.signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                href="/auth/login"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 no-underline"
              >
                {t('nav.signIn')}
              </Link>
              <Link
                href="/auth/register"
                className="text-xs border border-border text-muted-foreground rounded-md px-3 py-1.5 hover:bg-muted hover:text-foreground transition-colors no-underline"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
