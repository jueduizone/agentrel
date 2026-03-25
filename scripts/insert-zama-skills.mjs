import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const __dirname = dirname(fileURLToPath(import.meta.url))
const raw = JSON.parse(readFileSync(join(__dirname, 'zama-skills.json'), 'utf-8'))

const sourceMap = ['official', 'community']

const skills = raw.map((skill, i) => ({
  id: skill.id,
  name: skill.name,
  ecosystem: 'Zama',
  type: skill.type,
  time_sensitivity: skill.time_sensitivity,
  expires_at: null,
  source: sourceMap[i] ?? skill.source,
  confidence: skill.confidence,
  version: skill.version,
  source_repo: null,
  maintainer: null,
  tags: skill.tags,
  content: skill.content,
}))

async function insertSkills() {
  console.log('Inserting Zama skills into Supabase...')

  for (const skill of skills) {
    const { error } = await client
      .from('skills')
      .upsert(skill, { onConflict: 'id' })

    if (error) {
      console.error(`Failed to insert ${skill.id}:`, error.message)
    } else {
      console.log(`✓ Inserted: ${skill.id}`)
    }
  }

  console.log('Done!')
}

insertSkills()
