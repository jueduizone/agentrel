import { NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase'

export const revalidate = 3600

export async function GET() {
  const { data: skills } = await serviceClient
    .from('skills')
    .select('id, name, ecosystem, type, access, description, source, source_repo')
    .order('ecosystem', { ascending: true })
    .order('name', { ascending: true })

  const total = skills?.length ?? 0
  const ecosystems = [...new Set((skills ?? []).map(s => s.ecosystem))].sort()

  // Group by ecosystem
  const grouped: Record<string, typeof skills> = {}
  for (const skill of skills ?? []) {
    const eco = skill.ecosystem || 'general'
    if (!grouped[eco]) grouped[eco] = []
    grouped[eco].push(skill)
  }

  const BASE = 'https://agentrel.vercel.app'

  const lines: string[] = [
    '# AgentRel — Web3 AI Skills Index',
    '',
    `> ${total} Skills across ${ecosystems.length} ecosystems · ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## What is AgentRel?',
    '',
    'AgentRel is the Web3 AI context infrastructure. Add this URL to your agent\'s system prompt',
    `and it will have access to ${total}+ accurate, up-to-date Web3 Skills.`,
    '',
    '## For AI Agents — How to Use This Index',
    '',
    `Add this URL to your agent's system prompt:`,
    `${BASE}/api/v1/skill.md`,
    '',
    'Fetch a specific skill:',
    `${BASE}/api/skills/monad/network-config.md`,
    '',
    'Search by ecosystem:',
    `${BASE}/api/skills?ecosystem=ethereum&limit=10`,
    '',
    '---',
    '',
    '## Quick Links by Use Case',
    '',
    `- 🔨 **Building a dApp** → [Technical Docs](${BASE}/api/skills?type=technical-doc&limit=20)`,
    `- 🏆 **Joining a Hackathon** → [Hackathon Guides](${BASE}/api/skills?type=hackathon-guide)`,
    `- 💰 **Applying for a Grant** → [Grant Guides](${BASE}/api/skills?type=grant)`,
    `- 🔒 **Security Audit** → [Security Skills](${BASE}/api/skills?type=security)`,
    `- 📋 **Submit a Skill** → [Submit Your Skill](${BASE}/submit)`,
    '',
    '## Quick Links by Ecosystem',
    '',
  ]

  // Full ecosystem quick links — sort by skill count desc so biggest ecosystems surface first
  const quickLinkEcos = Object.entries(grouped)
    .map(([eco, list]) => ({ eco, count: list?.length ?? 0 }))
    .sort((a, b) => b.count - a.count)
  for (const { eco, count } of quickLinkEcos) {
    lines.push(`- **${eco.charAt(0).toUpperCase() + eco.slice(1)}** (${count} skills) → \`${BASE}/api/skills?ecosystem=${eco}\``)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  // Full skill index by ecosystem
  lines.push('## Full Skill Index')
  lines.push('')

  const ECO_LABELS: Record<string, string> = {
    ethereum: 'Ethereum / EVM', solana: 'Solana', monad: 'Monad', zama: 'Zama / fhEVM',
    near: 'NEAR', cosmos: 'Cosmos', polkadot: 'Polkadot', hyperliquid: 'Hyperliquid',
    kite: 'Kite AI', '0g': '0G Network', bittensor: 'Bittensor', virtuals: 'Virtuals',
    sentient: 'Sentient', aptos: 'Aptos', standards: 'EVM Standards', security: 'Security',
    'dev-tooling': 'Dev Tooling', grants: 'Grants', bounty: 'Bounties', hackathon: 'Hackathons',
    cryptoskills: 'Cross-chain Protocols', general: 'General',
  }

  const ECO_ORDER = ['ethereum', 'solana', 'monad', 'zama', 'standards', 'security', 'bittensor',
    'hyperliquid', 'kite', '0g', 'virtuals', 'sentient', 'aptos', 'near', 'cosmos', 'polkadot',
    'dev-tooling', 'grants', 'bounty', 'hackathon', 'cryptoskills', 'general']

  const sortedEcos = [
    ...ECO_ORDER.filter(e => grouped[e]),
    ...Object.keys(grouped).filter(e => !ECO_ORDER.includes(e)).sort(),
  ]

  for (const eco of sortedEcos) {
    const ecoSkills = grouped[eco]
    const label = ECO_LABELS[eco] ?? (eco.charAt(0).toUpperCase() + eco.slice(1))
    lines.push(`### ${label}`)
    lines.push('')
    for (const skill of (ecoSkills ?? [])) {
      const isOfficialMd = skill.source === 'official' && skill.source_repo &&
        (skill.source_repo.endsWith('.md') || skill.source_repo.includes('raw.githubusercontent'))
      const url = isOfficialMd ? skill.source_repo : `${BASE}/api/skills/${skill.id}.md`
      const accessTag = skill.access && skill.access !== 'free' ? ` *(${skill.access})*` : ''
      const desc = skill.description ? ` — ${skill.description.slice(0, 60)}${skill.description.length > 60 ? '…' : ''}` : ''
      lines.push(`- [${skill.name}](${url})${accessTag}${desc}`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push(`*AgentRel · ${BASE} · Updated ${new Date().toISOString().slice(0, 10)}*`)

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
