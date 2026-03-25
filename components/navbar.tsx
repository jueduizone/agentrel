'use client'

import Link from 'next/link'
import { Github } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'

export function Navbar() {
  const { lang, setLang } = useLang()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-black">
            AgentRel
          </Link>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/skills" className="hover:text-foreground transition-colors">
              Skills
            </Link>
            <Link href="/bundles" className="hover:text-foreground transition-colors">
              Bundles
            </Link>
            <a
              href="https://github.com/jueduizone/agentrel"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Docs
            </a>
            <Link href="/api/skills" className="hover:text-foreground transition-colors">
              API
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs">
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 transition-colors ${
                lang === 'en' ? 'bg-black text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('zh')}
              className={`px-2.5 py-1 transition-colors ${
                lang === 'zh' ? 'bg-black text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              中文
            </button>
          </div>

          {/* GitHub */}
          <a
            href="https://github.com/jueduizone/agentrel"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </nav>
  )
}
