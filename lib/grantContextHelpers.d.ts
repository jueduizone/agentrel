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

export type GrantRequirementSections = {
  submissionRequirements: string[]
  judgingCriteria: string[]
  exampleIdeas: string[]
  other: string[]
}

export function normalizeEcosystems(requiredSkills: string[]): string[]
export function selectSkillsForGrantContext<T extends GrantContextSkill>(skills: T[], ecosystems: string[], limit?: number): T[]
export function renderApplyBodyExample(): string
export function splitGrantRequirementText(text: string | null | undefined): string[]
export function extractGrantRequirementSections(text: string | null | undefined): GrantRequirementSections
