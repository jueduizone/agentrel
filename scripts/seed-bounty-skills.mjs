import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGV1dHZ6bXJmaGx6cHNieWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk1MTI0MSwiZXhwIjoyMDg4NTI3MjQxfQ.DtvWVp2SrwNrfR503XjPUiW_H_T4GRrHqCTnjMZb9hI'

const c = createClient(SUPABASE_URL, SUPABASE_KEY)

const read = (filename) => readFileSync(join(__dirname, 'skills', filename), 'utf-8')

const skills = [
  {
    id: 'bounty/immunefi-guide',
    name: 'Immunefi Bug Bounty Program Guide',
    ecosystem: 'multichain',
    type: 'bounty-guide',
    source: 'community',
    confidence: 'high',
    version: '1.0.0',
    time_sensitivity: 'evergreen',
    tags: ['bounty', 'security', 'web3', 'immunefi', 'bug-bounty'],
    content: read('bounty-immunefi-guide.md'),
    updated_at: '2026-03-26T00:00:00.000Z',
  },
  {
    id: 'bounty/ethglobal-hackathon-guide',
    name: 'ETHGlobal Hackathon Complete Guide',
    ecosystem: 'ethereum',
    type: 'hackathon-guide',
    source: 'community',
    confidence: 'high',
    version: '1.0.0',
    time_sensitivity: 'evergreen',
    tags: ['hackathon', 'ethglobal', 'ethereum', 'web3', 'competition'],
    content: read('bounty-ethglobal-hackathon-guide.md'),
    updated_at: '2026-03-26T00:00:00.000Z',
  },
  {
    id: 'bounty/code4rena-audit-guide',
    name: 'Code4rena Competitive Audit Guide',
    ecosystem: 'ethereum',
    type: 'bounty-guide',
    source: 'community',
    confidence: 'high',
    version: '1.0.0',
    time_sensitivity: 'evergreen',
    tags: ['bounty', 'security', 'audit', 'code4rena', 'smart-contracts'],
    content: read('bounty-code4rena-audit-guide.md'),
    updated_at: '2026-03-26T00:00:00.000Z',
  },
]

async function main() {
  console.log('Upserting 3 bounty/grant skills to Supabase...\n')

  for (const skill of skills) {
    const { data, error } = await c
      .from('skills')
      .upsert(skill, { onConflict: 'id' })
      .select('id, name')

    if (error) {
      console.error(`❌ Failed to upsert ${skill.id}:`, error.message)
    } else {
      console.log(`✅ Upserted: ${data?.[0]?.id} — ${data?.[0]?.name}`)
    }
  }

  console.log('\nDone.')
}

main().catch(console.error)
