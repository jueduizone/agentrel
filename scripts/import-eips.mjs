#!/usr/bin/env node
/**
 * 从 ethereum/EIPs GitHub repo 导入 ERC/EIP 标准
 * 优先导入 Final 状态的核心 ERC
 */
const GH = 'process.env.GITHUB_TOKEN'
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function ghGet(url) {
  const r = await fetch(url, {
    headers: { Authorization: 'token ' + GH, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'AgentRel/1.0' }
  })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

async function upsert(skill) {
  const r = await fetch(BASE + '/rest/v1/skills', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ ...skill, updated_at: new Date().toISOString() }),
  })
  return r.ok
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]+?)\n---/)
  if (!m) return {}
  const fm = {}
  for (const line of m[1].split('\n')) {
    const [k, ...v] = line.split(':')
    if (k && v.length) fm[k.trim()] = v.join(':').trim().replace(/^['"]|['"]$/g, '')
  }
  return fm
}

// 重点 ERC 清单（Final状态，开发者高频使用）
const PRIORITY_EIPS = [
  // Token standards
  20, 721, 1155, 777, 223,
  // Account abstraction
  4337, 6900,
  // NFT extensions
  2981, 4906, 5192, 6551,
  // DeFi
  3156, 4626, // flash loan, vault
  // Signatures
  712, 1271,
  // Upgradeable
  1967, 2535,
  // Meta-tx
  2771,
  // Misc
  165, 1820, 3668,
  // Governance
  6372,
]

async function main() {
  // 1. 拉 EIPS/ERCS 目录
  console.log('Fetching EIP file list...')
  let allFiles = []
  try {
    const ercs = await ghGet('https://api.github.com/repos/ethereum/ERCs/contents/ERCS')
    allFiles = ercs.map(f => ({ ...f, repo: 'ERCs', dir: 'ERCS' }))
    console.log(`ERCs repo: ${ercs.length} files`)
  } catch (e) {
    console.log('ERCs repo failed, trying EIPs...')
  }

  const eips = await ghGet('https://api.github.com/repos/ethereum/EIPs/contents/EIPS')
  allFiles.push(...eips.map(f => ({ ...f, repo: 'EIPs', dir: 'EIPS' })))
  console.log(`EIPs repo: ${eips.length} files`)
  await sleep(500)

  // 2. 过滤出 ERC/EIP markdown
  const ercFiles = allFiles.filter(f => f.name.match(/^(erc|eip)-\d+\.md$/i))
  console.log(`Total ERC/EIP files: ${ercFiles.length}`)

  // 3. 先拉优先 ERC
  const prioritySet = new Set(PRIORITY_EIPS.map(n => n.toString()))
  const priorityFiles = ercFiles.filter(f => {
    const num = f.name.match(/\d+/)?.[0]
    return num && prioritySet.has(num)
  })
  const otherFiles = ercFiles.filter(f => {
    const num = f.name.match(/\d+/)?.[0]
    return num && !prioritySet.has(num)
  })

  const toProcess = [...priorityFiles, ...otherFiles].slice(0, 120) // 最多120条
  console.log(`Processing: ${priorityFiles.length} priority + ${Math.min(otherFiles.length, 120 - priorityFiles.length)} others`)

  let written = 0, skipped = 0, errors = 0

  for (const file of toProcess) {
    const num = file.name.match(/\d+/)?.[0]
    if (!num) continue

    const id = `standards/eip-${num}`

    try {
      const raw = await fetch(file.download_url).then(r => r.text())
      const fm = parseFrontmatter(raw)

      const status = fm.status || ''
      const title = fm.title || `EIP-${num}`
      const category = fm.category || fm.type || ''
      const created = fm.created || ''
      const requires = fm.requires || ''

      // 跳过 Draft/Withdrawn
      if (status === 'Withdrawn' || status === 'Stagnant') { skipped++; continue }

      const isERC = category === 'ERC' || file.name.startsWith('erc-')
      const typeLabel = isERC ? 'ERC' : 'EIP'
      const isPriority = prioritySet.has(num)

      // 截取正文（去掉 frontmatter）
      const body = raw.replace(/^---[\s\S]+?---\n/, '').slice(0, 4000)

      const content = `# ${typeLabel}-${num}: ${title}

## 基本信息
- **编号：** ${typeLabel}-${num}
- **标题：** ${title}
- **状态：** ${status || 'Unknown'}
- **类型：** ${fm.type || 'Standards Track'} / ${category || 'Core'}
- **创建时间：** ${created}
${requires ? `- **依赖：** ${requires}` : ''}
- **原文：** https://eips.ethereum.org/EIPS/eip-${num}

## 标准内容

${body}
`

      const tags = ['ethereum', 'standard', typeLabel.toLowerCase(), status.toLowerCase().replace(/\s+/g, '-')]
      if (isPriority) tags.push('core', 'high-priority')
      if (category) tags.push(category.toLowerCase())
      if (parseInt(num) >= 4000) tags.push('modern')

      const ok = await upsert({
        id,
        name: `${typeLabel}-${num}: ${title}`,
        ecosystem: 'ethereum',
        type: 'technical-doc',
        time_sensitivity: status === 'Final' ? 'evergreen' : 'time-sensitive',
        source: 'official',
        confidence: status === 'Final' ? 'high' : 'medium',
        version: '1.0.0',
        content,
        tags,
      })

      if (ok) { written++; process.stdout.write(isPriority ? '★' : '.') }
      else errors++
    } catch (e) {
      errors++
      process.stdout.write('x')
    }
    await sleep(100)
  }

  console.log(`\nWritten: ${written}, Skipped: ${skipped}, Errors: ${errors}`)

  const fin = await fetch(BASE + '/rest/v1/skills?type=eq.technical-doc&select=id', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  console.log('DB technical-doc total:', (await fin.json()).length)
}

main().catch(console.error)
