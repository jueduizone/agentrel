const QUALITY_SOURCES = new Set(['official', 'verified', 'official-docs'])
const SOURCE_RANK = {
  official: 0,
  'official-docs': 1,
  verified: 2,
  community: 3,
}

function healthScore(skill) {
  return typeof skill.health_score === 'number' ? skill.health_score : 0
}

function installCount(skill) {
  return typeof skill.install_count === 'number' ? skill.install_count : 0
}

function updatedTime(skill) {
  return skill.updated_at ? new Date(skill.updated_at).getTime() || 0 : 0
}

function compareSkills(a, b) {
  const sourceDiff = (SOURCE_RANK[a.source] ?? 10) - (SOURCE_RANK[b.source] ?? 10)
  if (sourceDiff !== 0) return sourceDiff
  const healthDiff = healthScore(b) - healthScore(a)
  if (healthDiff !== 0) return healthDiff
  const installDiff = installCount(b) - installCount(a)
  if (installDiff !== 0) return installDiff
  return updatedTime(b) - updatedTime(a)
}

function normalizeEcosystems(requiredSkills) {
  return Array.from(new Set((requiredSkills ?? [])
    .map((skill) => String(skill).toLowerCase().trim())
    .filter((skill) => skill && skill !== 'agent' && skill !== 'web3')))
}

function selectSkillsForGrantContext(skills, ecosystems, limit = 10) {
  const normalizedEcosystems = normalizeEcosystems(ecosystems)
  const selected = []

  for (const ecosystem of normalizedEcosystems) {
    const healthyForEcosystem = (skills ?? [])
      .filter((skill) => String(skill.ecosystem ?? '').toLowerCase() === ecosystem)
      .filter((skill) => healthScore(skill) >= 0)
      .filter((skill) => !['hackathon-case', 'security-vuln'].includes(String(skill.type ?? '')))

    const qualityMatches = healthyForEcosystem
      .filter((skill) => QUALITY_SOURCES.has(String(skill.source ?? '')))
      .sort(compareSkills)

    const fallbackMatches = healthyForEcosystem.sort(compareSkills)
    selected.push(...(qualityMatches.length > 0 ? qualityMatches : fallbackMatches).slice(0, 4))
  }

  return selected.sort(compareSkills).slice(0, limit)
}

function renderApplyBodyExample() {
  return `{
  "pitch": "your proposal text",
  "custom_fields": {
    "github_url": "https://github.com/...",
    "demo_url": "https://...",
    "video_url": "https://..."
  }
}`
}

function splitGrantRequirementText(text) {
  if (!text) return []
  return String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => line.split(/\s+[-•]\s+/).filter(Boolean))
    .map((line) => line.replace(/^[-•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

exports.QUALITY_SOURCES = QUALITY_SOURCES
exports.normalizeEcosystems = normalizeEcosystems
exports.selectSkillsForGrantContext = selectSkillsForGrantContext
exports.renderApplyBodyExample = renderApplyBodyExample
exports.splitGrantRequirementText = splitGrantRequirementText
