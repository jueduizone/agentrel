import assert from 'node:assert/strict'
import test from 'node:test'
import {
  selectSkillsForGrantContext,
  renderApplyBodyExample,
  splitGrantRequirementText,
} from '../lib/grantContextHelpers.js'

test('falls back to healthy community skills when an ecosystem has no official skills', () => {
  const selected = selectSkillsForGrantContext([
    { id: 'zama/fhevm-dev-guide', name: 'fhEVM Dev Guide', ecosystem: 'zama', source: 'community', health_score: 100, install_count: 8, updated_at: '2026-04-01', content: 'fhEVM' },
    { id: 'zama/disabled', name: 'Disabled', ecosystem: 'zama', source: 'community', health_score: -1, install_count: 999, updated_at: '2026-04-02', content: 'bad' },
    { id: 'base/official', name: 'Base Official', ecosystem: 'base', source: 'official', health_score: 80, install_count: 1, updated_at: '2026-04-03', content: 'base' },
  ], ['zama'])

  assert.deepEqual(selected.map((s) => s.id), ['zama/fhevm-dev-guide'])
})

test('prefers official and verified skills over community skills when available', () => {
  const selected = selectSkillsForGrantContext([
    { id: 'zama/community-popular', name: 'Community Popular', ecosystem: 'zama', source: 'community', health_score: 100, install_count: 1000, updated_at: '2026-04-03', content: 'community' },
    { id: 'zama/official-docs', name: 'Official Docs', ecosystem: 'zama', source: 'official-docs', health_score: 90, install_count: 1, updated_at: '2026-04-01', content: 'official' },
  ], ['zama'])

  assert.deepEqual(selected.map((s) => s.id), ['zama/official-docs'])
})

test('renders the documented apply body with pitch and custom_fields', () => {
  assert.equal(renderApplyBodyExample(), `{
  "pitch": "your proposal text",
  "custom_fields": {
    "github_url": "https://github.com/...",
    "demo_url": "https://...",
    "video_url": "https://..."
  }
}`)
})

test('splits dense grant requirement text into readable list items', () => {
  const items = splitGrantRequirementText('Submission requirements:\n- Build with fhEVM\n- Submit a demo\n\nJudging criteria:\n1. Technical depth\n2. UX quality')
  assert.deepEqual(items, [
    'Submission requirements:',
    'Build with fhEVM',
    'Submit a demo',
    'Judging criteria:',
    'Technical depth',
    'UX quality',
  ])
})
