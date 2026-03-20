#!/usr/bin/env node
import { readFileSync } from 'fs'
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const skills = JSON.parse(readFileSync('./scripts/core-dev-skills.json', 'utf-8'))

async function upsert(s) {
  const r = await fetch(BASE+'/rest/v1/skills', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer '+KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ ...s, version: '1.0.0', time_sensitivity: 'stable', updated_at: new Date().toISOString() })
  })
  if (!r.ok) console.error('ERR', s.id, await r.text())
  return r.ok
}

let ok = 0
for (const s of skills) {
  const res = await upsert(s)
  console.log((res ? '✅' : '❌') + ' ' + s.id)
  if (res) ok++
  await sleep(100)
}

const r = await fetch(BASE+'/rest/v1/skills?select=type&limit=2000', { headers: { apikey: KEY, Authorization: 'Bearer '+KEY } })
const all = await r.json()
const c = {}; for (const s of all) c[s.type] = (c[s.type]||0)+1
console.log(`\nDone: ${ok}/${skills.length} | Total: ${all.length}`)
for (const [t,n] of Object.entries(c).sort((a,b)=>b[1]-a[1])) console.log(` ${t}: ${n}`)
