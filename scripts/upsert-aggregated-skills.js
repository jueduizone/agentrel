#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")
const path = require("path")

const supabase = createClient(
  "https://zkpeutvzmrfhlzpsbyhr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGV1dHZ6bXJmaGx6cHNieWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk1MTI0MSwiZXhwIjoyMDg4NTI3MjQxfQ.DtvWVp2SrwNrfR503XjPUiW_H_T4GRrHqCTnjMZb9hI"
)

// Map of skill ID -> file path
const skills = [
  {
    id: "security/reentrancy-access-control",
    file: "output/skills/security/security-reentrancy-access-control/SKILL.md",
  },
  {
    id: "security/arithmetic-precision",
    file: "output/skills/security/security-arithmetic-precision/SKILL.md",
  },
  {
    id: "security/oracle-price-manipulation",
    file: "output/skills/security/security-oracle-price-manipulation/SKILL.md",
  },
  {
    id: "security/initialization-proxy",
    file: "output/skills/security/security-initialization-proxy/SKILL.md",
  },
  {
    id: "fundraising/depin-funding-landscape",
    file: "output/skills/fundraising/fundraising-depin-landscape/SKILL.md",
  },
  {
    id: "fundraising/l2-infrastructure-funding",
    file: "output/skills/fundraising/fundraising-l2-infrastructure/SKILL.md",
  },
  {
    id: "fundraising/ai-web3-funding",
    file: "output/skills/fundraising/fundraising-ai-web3/SKILL.md",
  },
  {
    id: "fundraising/defi-protocol-funding",
    file: "output/skills/fundraising/fundraising-defi-protocols/SKILL.md",
  },
  {
    id: "defi/amm-lending-patterns",
    file: "output/skills/defi/defi-amm-lending-patterns/SKILL.md",
  },
  {
    id: "defi/derivatives-stablecoin-patterns",
    file: "output/skills/defi/defi-derivatives-stablecoin-patterns/SKILL.md",
  },
]

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) throw new Error("No frontmatter found")
  const fm = {}
  const lines = match[1].split("\n")
  let inTags = false
  let tags = []
  for (const line of lines) {
    if (line.startsWith("tags:")) {
      inTags = true
      continue
    }
    if (inTags) {
      const tagMatch = line.match(/^\s+-\s+(.+)$/)
      if (tagMatch) {
        tags.push(tagMatch[1].trim())
        continue
      } else {
        inTags = false
      }
    }
    const kv = line.match(/^(\w[\w_-]*):\s*(.+)$/)
    if (kv) {
      fm[kv[1]] = kv[2].trim().replace(/^#.*$/, "").trim()
    }
  }
  fm.tags = tags
  return fm
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..")
  let successCount = 0
  let errorCount = 0

  for (const { id, file } of skills) {
    const filePath = path.join(projectRoot, file)
    let content
    try {
      content = fs.readFileSync(filePath, "utf8")
    } catch (e) {
      console.error(`ERROR reading ${id}: ${e.message}`)
      errorCount++
      continue
    }

    let fm
    try {
      fm = parseFrontmatter(content)
    } catch (e) {
      console.error(`ERROR parsing frontmatter for ${id}: ${e.message}`)
      errorCount++
      continue
    }

    const record = {
      id,
      name: fm.name,
      ecosystem: fm.ecosystem,
      type: fm.type,
      time_sensitivity: fm.time_sensitivity,
      source: fm.source,
      confidence: fm.confidence,
      version: fm.version,
      content,
      tags: fm.tags,
      updated_at: fm.updated_at || new Date().toISOString(),
    }

    const { error } = await supabase
      .from("skills")
      .upsert(record, { onConflict: "id" })

    if (error) {
      console.error(`ERROR upserting ${id}: ${error.message}`)
      errorCount++
    } else {
      console.log(`OK  ${id}`)
      successCount++
    }
  }

  console.log(`\nDone: ${successCount} OK, ${errorCount} ERROR`)
}

main().catch(console.error)
