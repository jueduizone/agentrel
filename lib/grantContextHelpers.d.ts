export type GrantContextSkill = {
  id: string
  name?: string
  ecosystem?: string
  source?: string
  type?: string
  health_score?: number | null
  install_count?: number | null
  updated_at?: string | null
  content?: string | null
}

export function normalizeEcosystems(requiredSkills: string[]): string[]
export function selectSkillsForGrantContext<T extends GrantContextSkill>(skills: T[], ecosystems: string[], limit?: number): T[]
export function renderApplyBodyExample(): string
export function splitGrantRequirementText(text: string | null | undefined): string[]
