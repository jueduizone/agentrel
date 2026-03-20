import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zkpeutvzmrfhlzpsbyhr.supabase.co',
  'process.env.SUPABASE_SERVICE_KEY'
)

const SOURCES = [
  // Solana .md format
  { id: 'solana/docs-accounts', url: 'https://solana.com/docs/core/accounts.md', eco: 'solana', maintainer: 'Solana Foundation', tags: ['solana','accounts','core'] },
  { id: 'solana/docs-transactions', url: 'https://solana.com/docs/core/transactions.md', eco: 'solana', maintainer: 'Solana Foundation', tags: ['solana','transactions','core'] },
  { id: 'solana/docs-programs', url: 'https://solana.com/docs/core/programs.md', eco: 'solana', maintainer: 'Solana Foundation', tags: ['solana','programs','smart-contracts'] },
  { id: 'solana/docs-pda', url: 'https://solana.com/docs/core/pda.md', eco: 'solana', maintainer: 'Solana Foundation', tags: ['solana','pda','addresses'] },
  { id: 'solana/docs-cpi', url: 'https://solana.com/docs/core/cpi.md', eco: 'solana', maintainer: 'Solana Foundation', tags: ['solana','cpi','composability'] },
  { id: 'solana/docs-tokens', url: 'https://solana.com/docs/tokens/basics.md', eco: 'solana', maintainer: 'Solana Foundation', tags: ['solana','tokens','spl'] },
  { id: 'solana/docs-quickstart', url: 'https://solana.com/docs/intro/quick-start.md', eco: 'solana', maintainer: 'Solana Foundation', tags: ['solana','quickstart','beginner'] },
  // Uniswap - use llms.txt links directly (already markdown)
  { id: 'ethereum/uniswap-v4-intro', url: 'https://docs.uniswap.org/contracts/v4/overview', eco: 'ethereum', maintainer: 'Uniswap Labs', tags: ['uniswap','defi','amm','v4'], useText: true },
  { id: 'ethereum/uniswap-hooks', url: 'https://docs.uniswap.org/contracts/v4/concepts/hooks', eco: 'ethereum', maintainer: 'Uniswap Labs', tags: ['uniswap','hooks','v4','defi'], useText: true },
]

async function fetchContent(url, useText) {
  // try url, url.md, url/index.md
  const urls = useText ? [url] : [url, url + '.md']
  for (const u of urls) {
    try {
      const r = await fetch(u, {
        headers: { 'User-Agent': 'AgentRel/1.0', 'Accept': 'text/plain,text/markdown,*/*' },
        signal: AbortSignal.timeout(12000)
      })
      if (!r.ok) continue
      const text = await r.text()
      const clean = text.includes('<html') 
        ? text.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s{3,}/g,'\n\n').trim()
        : text
      return clean.slice(0, 40000)
    } catch(e) { continue }
  }
  return null
}

let ok = 0, fail = 0
for (const src of SOURCES) {
  const content = await fetchContent(src.url, src.useText)
  if (!content) { console.log(`❌ ${src.id} — fetch failed`); fail++; continue }
  
  const titleMatch = content.match(/^title:\s*(.+)/m) || content.match(/(?:^|\n)#+\s+(.+)/)
  const name = titleMatch ? titleMatch[1].trim() : src.id.split('/').pop()

  const { error } = await supabase.from('skills').upsert({
    id: src.id, name, ecosystem: src.eco, type: 'docs',
    source: 'official', confidence: 'high', version: '1.0.0',
    source_repo: src.url, maintainer: src.maintainer,
    content, tags: src.tags,
  }, { onConflict: 'id' })

  if (error) { console.log(`❌ ${src.id}: ${error.message}`); fail++ }
  else { console.log(`✅ ${src.id} — ${name}`); ok++ }
}
console.log(`\n✅ ${ok} 成功 / ❌ ${fail} 失败`)
