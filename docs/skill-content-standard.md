# Skill Content Standard v1.0

## Purpose

Skills on AgentRel are **Level 2+ content** — not documentation copies, but distilled developer
experience. A skill should answer the question: *"What do I wish I had known before spending 3 hours
debugging this?"*

---

## Content Levels

| Level | Description | Source |
|-------|-------------|--------|
| Level 1 | Official doc copy/paste | ❌ Not acceptable |
| Level 2 | Structured summary + Quick Start | ✅ Minimum acceptable |
| Level 3 | Summary + Pitfalls from real issues | ✅ Target |
| Level 4 | Summary + Pitfalls + Community wisdom + Versioned notes | ⭐ Gold standard |

---

## Required Sections (in order)

### 1. Overview
- 2-3 sentences: what this skill covers and when to use it
- Mention the primary audience (beginner / intermediate / advanced)

### 2. Quick Start
- Minimal working code snippet (< 20 lines) to get a result
- Installation command if relevant

### 3. Core Concepts
- 3-6 bullet points or a short table
- Link concepts to concrete code patterns, not abstract definitions

### 4. Common Pitfalls
**This section is mandatory.** Must contain at least 3 pitfalls sourced from real GitHub issues
or developer reports.

Format:
```
### [Pitfall Number]. [Short Title]
**Problem:** What goes wrong (include error message if applicable)
**Fix:** Exact code or config change to resolve it
**Version:** Which versions are affected (use "all" if unknown)
```

### 5. Version Notes
- Breaking changes between versions
- Migration steps if applicable
- Deprecation warnings

### 6. Resources
- Official docs link
- GitHub repo link
- Discord / community link
- Relevant GitHub issue links (for complex pitfalls)

---

## Quality Rules

### Must Have
- [ ] All code examples are complete and runnable
- [ ] At least 3 pitfalls from real developer issues (GitHub/Discord/forum)
- [ ] Version annotations on all pitfalls
- [ ] Quick Start that works without additional context

### Must NOT Have
- [ ] Verbatim paragraphs copied from official documentation
- [ ] Pitfalls without a concrete fix
- [ ] Code examples that reference undefined variables or imports
- [ ] Version-sensitive content without version labels

---

## Sources Hierarchy

1. **Official documentation** — for accurate API signatures and basic usage
2. **GitHub Issues** — for real-world pitfalls and edge cases (primary Pitfalls source)
3. **Discord community** — for workarounds and undocumented behavior
4. **AI synthesis** — for organizing and summarizing the above (never as primary source)

---

## Skill Types and Their Emphasis

| Type | Key Sections | Pitfall Focus |
|------|-------------|---------------|
| `guide` | Quick Start + Core Concepts + Pitfalls | Setup, config, common errors |
| `technical-doc` | Core Concepts + Version Notes | API changes, type system |
| `use-case` | Full implementation + Pitfalls | Design mistakes, security |
| `resource` | Links + context | Outdated links, process gotchas |

---

## Versioning

- Bump `version` field when content is materially updated (not typo fixes)
- Use semver: `1.0.0` → `1.1.0` for new pitfalls, `2.0.0` for complete rewrites
- Add `updated_at` note at bottom of content for major revisions

---

*Standard maintained by AgentRel. Feedback: github.com/jueduizone/agentrel/issues*
