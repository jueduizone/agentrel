'use client'
import { useState } from 'react'
import { HomeCopyButton } from './HomeCopyButton'
import { clientSiteUrl } from '@/lib/client-site-url'

const EXAMPLES = [
  { label: 'Ethereum', path: '/api/skills?ecosystem=ethereum&limit=5' },
  { label: 'Solana',   path: '/api/skills?ecosystem=solana&limit=5' },
  { label: 'Monad',    path: '/api/skills/monad/network-config.md' },
  { label: 'Security', path: '/api/skills?type=security&limit=5' },
  { label: 'Zama',     path: '/api/skills/zama/fhevm-dev-guide.md' },
]

export function InstallTabs() {
  const [active, setActive] = useState(0)
  const cmd = `curl "${clientSiteUrl(EXAMPLES[active].path)}"`

  return (
    <div className="mt-8 mx-auto max-w-2xl">
      {/* Tabs */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {EXAMPLES.map((e, i) => (
          <button
            key={e.label}
            onClick={() => setActive(i)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              i === active
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {e.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          204+ Skills · 15+ Ecosystems
        </span>
      </div>
      {/* Command */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-foreground px-4 py-3">
        <code className="font-mono text-xs text-background truncate mr-3">{cmd}</code>
        <HomeCopyButton text={cmd} />
      </div>
    </div>
  )
}
