export type Skill = {
  id: string
  name: string
  name_zh?: string | null
  ecosystem: string
  type: string
  time_sensitivity: string
  expires_at: string | null
  source: string
  confidence: string
  version: string
  source_repo: string | null
  maintainer: string | null
  content: string
  tags: string[]
  description_zh?: string | null
  created_at: string
  updated_at: string
}

export type Bundle = {
  id: string
  name: string
  description: string
  scenario: string
  skills: string[]
  expires_at: string | null
  created_at: string
}

export type SkillFeedback = {
  id: string
  skill_id: string
  agent: string | null
  issue: string
  code_snippet: string | null
  error_message: string | null
  fix: string | null
  github_issue_id: number | null
  confidence: string | null
  status: string
  created_at: string
}

export type ApiResponse<T> = {
  data: T
  error?: string
}

export type SkillsListResponse = {
  data: Skill[]
  total: number
  limit: number
  offset: number
}
