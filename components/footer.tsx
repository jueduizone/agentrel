'use client'

import Link from 'next/link'
import { useLang } from '@/context/LanguageContext'

export function Footer() {
  const { t } = useLang()

  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="font-display text-sm font-semibold text-foreground">AgentRel</span>
              <span className="text-xs text-muted-foreground">
                by{' '}
                <a
                  href="https://openbuild.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  OpenBuild
                </a>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('footer.infra')}</p>
            <p className="text-xs text-muted-foreground/60 mt-3">{t('footer.openSource')}</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-mono text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-4">
              {t('footer.product')}
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/skills" className="hover:text-foreground transition-colors">{t('footer.skills')}</Link></li>
              <li><Link href="/build" className="hover:text-foreground transition-colors">{t('footer.build')}</Link></li>
              <li><Link href="/benchmark" className="hover:text-foreground transition-colors">{t('footer.benchmark')}</Link></li>
              <li><Link href="/bundles" className="hover:text-foreground transition-colors">{t('footer.bundles')}</Link></li>
              <li>
                <a
                  href="https://ian-docs.vercel.app/docs/agentforum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  {t('footer.docs')}
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-mono text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-4">
              {t('footer.community')}
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href="https://github.com/jueduizone/agentrel" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://t.me/OpenBuildxyz/17430" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  Telegram
                </a>
              </li>
              <li>
                <Link href="/submit" className="hover:text-foreground transition-colors">
                  {t('footer.submitSkill')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div>
            <h4 className="font-mono text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-4">
              {t('footer.ecosystem')}
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href="https://openbuild.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  openbuild.xyz
                </a>
              </li>
              <li>
                <a href="https://github.com/openbuildxyz" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://twitter.com/openbuildxyz" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  Twitter / X
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="font-mono text-xs text-muted-foreground/50">© 2026 AgentRel · MIT License</span>
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/jueduizone/agentrel/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              MIT License
            </a>
            <a
              href="https://openbuild.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              OpenBuild
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
