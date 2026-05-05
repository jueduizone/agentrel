import { NextRequest, NextResponse } from 'next/server'
import { serviceClient as db } from '@/lib/supabase'
import { siteUrl } from '@/lib/site-url'

// Known official domains per ecosystem
const OFFICIAL_DOMAINS: Record<string, string[]> = {
  ethereum: ['ethereum.org', 'ethglobal.com', 'ethskills.dev', 'openzeppelin.com', 'uniswap.org'],
  solana: ['solana.org', 'solana.com', 'soldev.app', 'anchor-lang.com', 'metaplex.com'],
  monad: ['monad.xyz', 'docs.monad.xyz', 'monskills.vercel.app'],
  zama: ['zama.ai', 'docs.zama.ai'],
  near: ['near.org', 'docs.near.org'],
  cosmos: ['cosmos.network', 'docs.cosmos.network'],
  polkadot: ['polkadot.network', 'docs.substrate.io'],
  hyperliquid: ['hyperliquid.xyz'],
  bittensor: ['bittensor.com', 'docs.bittensor.com', 'opentensor.ai'],
  virtuals: ['virtuals.io', 'whitepaper.virtuals.io'],
  sentient: ['sentient.foundation', 'sentient.xyz'],
}

function isOfficialDomain(hostname: string, ecosystem: string): boolean {
  const official = OFFICIAL_DOMAINS[ecosystem.toLowerCase()] ?? []
  return official.some(d => hostname === d || hostname.endsWith('.' + d))
}

function parseSkillFrontmatter(content: string): Record<string, string> | null {
  // YAML frontmatter between --- delimiters
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!match) return null
  const result: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx < 1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && val) result[key] = val
  }
  return result
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(request: NextRequest) {
  const { url } = await request.json().catch(() => ({}))

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Validate URL format
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Fetch Skill content
  let content: string
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AgentRel-Discover/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Unable to read the Skill file. Please make sure the URL is publicly accessible and returns markdown.' }, { status: 400 })
    }
    content = await res.text()
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch URL: ${err}` }, { status: 400 })
  }

  // Validate Skill format (must have YAML frontmatter with name + ecosystem)
  const fm = parseSkillFrontmatter(content)
  if (!fm || !fm.name || !fm.ecosystem) {
    return NextResponse.json(
      { error: 'Invalid Skill format: must have YAML frontmatter with name and ecosystem fields' },
      { status: 400 }
    )
  }

  // Determine source tier based on domain
  const tier = isOfficialDomain(parsedUrl.hostname, fm.ecosystem) ? 'official' : 'community'

  // Build skill ID
  const skillId = `submitted/${fm.ecosystem.toLowerCase()}/${slugify(fm.name)}`

  // Upsert into DB
  const { data, error } = await db
    .from('skills')
    .upsert({
      id: skillId,
      name: fm.name,
      ecosystem: fm.ecosystem.toLowerCase(),
      type: fm.type || 'technical-doc',
      source: tier,
      source_repo: url,
      content,
      version: fm.version || '1.0',
      confidence: tier === 'official' ? 'high' : 'medium',
      time_sensitivity: fm.time_sensitivity || 'none',
      tags: fm.tags ? fm.tags.split(',').map((t: string) => t.trim()) : [],
    }, { onConflict: 'id', ignoreDuplicates: false })
    .select('id, name, ecosystem, source')
    .single()

  if (error) {
    return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({
    skill_id: data.id,
    name: data.name,
    ecosystem: data.ecosystem,
    tier,
    url: siteUrl(`/api/skills/${data.id}.md`),
    message: tier === 'official'
      ? '✅ Skill submitted as Official (verified domain)'
      : '✅ Skill submitted as Community (pending review)',
  })
}
