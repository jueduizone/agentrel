'use client'

import Link from 'next/link'
import { Package } from 'lucide-react'
import type { Bundle } from '@/lib/types'
import { Navbar } from '@/components/navbar'
import { PageHeader } from '@/components/PageHeader'
import { useLang } from '@/context/LanguageContext'
import { formatBundleText } from '@/lib/utils'
import { clientSiteUrl } from '@/lib/client-site-url'
import { CopyButton } from './CopyButton'

type Props = {
  bundles: Bundle[] | null
  errorMessage?: string
}

const BUNDLE_COPY: Record<string, { nameKey: string; descriptionKey: string }> = {
  'multi-chain-dev': {
    nameKey: 'bundles.copy.multiChain.name',
    descriptionKey: 'bundles.copy.multiChain.description',
  },
  'web3-starter': {
    nameKey: 'bundles.copy.web3Starter.name',
    descriptionKey: 'bundles.copy.web3Starter.description',
  },
  'defi-builder': {
    nameKey: 'bundles.copy.defiBuilder.name',
    descriptionKey: 'bundles.copy.defiBuilder.description',
  },
  'hackathon-starter': {
    nameKey: 'bundles.copy.hackathonStarter.name',
    descriptionKey: 'bundles.copy.hackathonStarter.description',
  },
  'grant-navigator': {
    nameKey: 'bundles.copy.grantNavigator.name',
    descriptionKey: 'bundles.copy.grantNavigator.description',
  },
}

const NAME_TO_KEY: Record<string, keyof typeof BUNDLE_COPY> = {
  'defi builder bundle': 'defi-builder',
  'hackathon starter pack': 'hackathon-starter',
  'grant navigator bundle': 'grant-navigator',
  'multi-chain developer bundle': 'multi-chain-dev',
  'web3 starter bundle': 'web3-starter',
}

function normalized(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function copyConfig(bundle: Bundle) {
  const key = bundle.id in BUNDLE_COPY ? bundle.id : NAME_TO_KEY[normalized(formatBundleText(bundle.name) || bundle.name)]
  return key ? BUNDLE_COPY[key] : undefined
}

function bundleName(bundle: Bundle, t: (key: string) => string) {
  const copy = copyConfig(bundle)
  return copy ? t(copy.nameKey) : (formatBundleText(bundle.name) || bundle.name)
}

function bundleDescription(bundle: Bundle, t: (key: string) => string) {
  const copy = copyConfig(bundle)
  return copy ? t(copy.descriptionKey) : (formatBundleText(bundle.description) || bundle.description)
}

function scenarioLabel(scenario: string, t: (key: string) => string) {
  const key = `bundles.scenario.${normalized(scenario).replace(/[^a-z0-9]+/g, '-')}`
  const translated = t(key)
  return translated === key ? scenario : translated
}

export function BundlesClient({ bundles, errorMessage }: Props) {
  const { t } = useLang()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader titleKey="bundles.title" descKey="bundles.desc" />
        {errorMessage && (
          <p className="mt-2 text-sm text-red-500">{t('bundles.loadFailed')}: {errorMessage}</p>
        )}

        {!bundles || bundles.length === 0 ? (
          <div className="rounded-xl border border-border p-12 text-center text-muted-foreground">
            {t('bundles.empty')}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {bundles.map((bundle) => {
              const installCmd = `curl ${clientSiteUrl(`/api/bundles/${bundle.id}/markdown`)}`
              return (
                <div
                  key={bundle.id}
                  className="rounded-xl border border-border p-6 transition-colors hover:border-foreground"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {bundle.scenario && (
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                        {scenarioLabel(bundle.scenario, t)}
                      </span>
                    )}
                  </div>

                  <h2 className="mb-2 text-lg font-semibold text-foreground">{bundleName(bundle, t)}</h2>
                  <p className="mb-4 text-sm text-muted-foreground">{bundleDescription(bundle, t)}</p>

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t('bundles.skillCount').replace('{count}', String(bundle.skills.length))}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {bundle.skills.map((skillId) => (
                        <Link
                          key={skillId}
                          href={`/skills/${skillId}`}
                          className="rounded-full border border-border bg-muted/30 px-2 py-0.5 font-mono text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          {skillId}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center rounded-lg border border-border bg-muted/30 p-3">
                    <code className="block flex-1 font-mono text-xs text-foreground break-all">
                      {installCmd}
                    </code>
                    <CopyButton text={installCmd} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
