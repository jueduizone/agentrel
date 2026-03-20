#!/usr/bin/env node
/**
 * DB → SKILL.md 导出脚本
 * 把 AgentRel skills 表导出为标准 SKILL.md 格式
 * 
 * 输出目录结构：
 * output/
 *   skills/
 *     hackathon/
 *       insights-ethereum/
 *         SKILL.md
 *       overview-all/
 *         SKILL.md
 *     grants/
 *       insights-solana/
 *         SKILL.md
 *     security/
 *       ...
 *     standards/
 *       eip-20/
 *         SKILL.md
 */
import fs from 'fs/promises'
import path from 'path'

const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'

// 递归创建目录
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

// 清理 id 作为目录名
function slugifyDir(id) {
  return id.replace(/\//g, '-').replace(/[^a-z0-9_-]/g, '').slice(0, 60)
}

// 生成分类目录
function getCategoryDir(id, type) {
  const parts = id.split('/')
  if (parts.length >= 2) return parts[0]
  return type || 'other'
}

// 生成 SKILL.md 内容
function generateSkillMd(skill) {
  const {
    id,
    name,
    description,
    ecosystem,
    type,
    source,
    confidence,
    version = '1.0.0',
    content,
    tags = [],
    updated_at
  } = skill

  // 生成触发描述（如果 DB 里没有）
  const triggerDesc = description || generateFallbackDescription(skill)

  // YAML frontmatter
  const frontmatter = `---
name: ${name}
description: ${triggerDesc}
${ecosystem ? `ecosystem: ${ecosystem}` : ''}
${type ? `type: ${type}` : ''}
${source ? `source: ${source}` : ''}
${confidence ? `confidence: ${confidence}` : ''}
version: ${version}
${tags.length ? `tags:\n${tags.map(t => `  - ${t}`).join('\n')}` : ''}
${updated_at ? `updated_at: ${updated_at}` : ''}
---

`

  return frontmatter + (content || '')
}

// 兜底描述生成
function generateFallbackDescription(skill) {
  const { id, name, type, ecosystem } = skill
  const eco = ecosystem || 'Web3'
  
  if (id.includes('insights') || id.includes('overview')) {
    return `Use when user asks about ${eco} ${type} guidance, best practices, or ecosystem overview.`
  }
  if (type === 'security-vuln') {
    return `Use when user asks about smart contract security vulnerabilities or audit findings.`
  }
  if (type === 'technical-doc' && id.includes('eip-')) {
    return `Use when user asks about ${name} technical specification or implementation.`
  }
  return `Use when user asks about ${name} in the ${eco} ecosystem.`
}

async function main() {
  const outputDir = process.argv[2] || './output/skills'
  
  console.log('Fetching all skills from DB...')
  
  // 分页拉取所有 skills
  let all = []
  let offset = 0
  const limit = 500
  
  while (true) {
    const r = await fetch(`${BASE}/rest/v1/skills?select=*&limit=${limit}&offset=${offset}`, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    })
    const batch = await r.json()
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < limit) break
    offset += limit
    process.stdout.write('.')
  }
  
  console.log(`\nTotal skills: ${all.length}`)
  
  // 统计
  const byType = {}
  for (const s of all) {
    byType[s.type] = (byType[s.type] || 0) + 1
  }
  console.log('By type:', byType)
  
  // 导出
  let exported = 0
  let errors = 0
  
  for (const skill of all) {
    try {
      const category = getCategoryDir(skill.id, skill.type)
      const dirName = slugifyDir(skill.id)
      const dirPath = path.join(outputDir, category, dirName)
      
      await ensureDir(dirPath)
      
      const skillMd = generateSkillMd(skill)
      await fs.writeFile(path.join(dirPath, 'SKILL.md'), skillMd, 'utf-8')
      
      exported++
      if (exported % 50 === 0) process.stdout.write('.')
    } catch (e) {
      errors++
      console.error(`\nError exporting ${skill.id}:`, e.message)
    }
  }
  
  console.log(`\n\nExported: ${exported}, Errors: ${errors}`)
  console.log(`Output directory: ${path.resolve(outputDir)}`)
  
  // 生成索引文件
  const index = {
    exported_at: new Date().toISOString(),
    total: all.length,
    by_type: byType,
    skills: all.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      ecosystem: s.ecosystem,
      path: `${getCategoryDir(s.id, s.type)}/${slugifyDir(s.id)}/SKILL.md`
    }))
  }
  
  await fs.writeFile(
    path.join(outputDir, 'index.json'),
    JSON.stringify(index, null, 2),
    'utf-8'
  )
  
  console.log('Index written to:', path.join(outputDir, 'index.json'))
}

main().catch(console.error)
