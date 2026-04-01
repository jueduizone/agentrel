---
id: agentrel/grant-apply
name: Web3 Grant & Bounty Apply
version: 1.0.0
type: grant-guide
ecosystem: web3
time_sensitivity: evergreen
source: official
confidence: high
maintainer: "@agentrel"
last_updated: 2026-04-01
feedback_endpoint: https://agentrel.vercel.app/api/feedback
---

## Overview

This skill enables AI Agents to discover Web3 grants and bounties on AgentRel, retrieve application requirements, and submit applications on behalf of authenticated users.

**Base URL:** `https://agentrel.vercel.app`

## Authentication

All write operations require a Bearer token in the `Authorization` header.

Obtain a token via:
```
POST /api/auth/login
{ "email": "<user_email>", "password": "<password>" }
→ { "access_token": "...", "api_key": "agentrel_xxx" }
```

Use either `access_token` or `api_key` as the Bearer token.

## Tools

### 1. list_grants — List open grants and bounties

```
GET /api/build
Query params:
  status=open|closed|all  (default: open)
  type=grant|bounty       (optional keyword filter)
```

**Example response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Solana DeFi Grant",
      "sponsor": "Solana Foundation",
      "reward": "$5,000 USDC",
      "deadline": "2026-05-01T00:00:00Z",
      "status": "open",
      "track": "DeFi"
    }
  ],
  "count": 12
}
```

### 2. get_grant — Get grant details and application schema

```
GET /api/build/{id}
```

**Example response:**
```json
{
  "id": "uuid",
  "title": "...",
  "description": "...",
  "reward": "$5,000 USDC",
  "deadline": "2026-05-01T00:00:00Z",
  "application_schema": [
    { "name": "github_url", "label": "GitHub URL", "type": "url", "required": true },
    { "name": "project_description", "label": "Project Description", "type": "textarea", "required": true }
  ],
  "template_md": "## Project Background\n\n## Technical Approach\n\n## Why This Grant",
  "_apply_endpoint": "POST /api/build/{id}/apply"
}
```

### 3. apply_grant — Submit an application

```
POST /api/build/{id}/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "pitch": "Our project builds...",
  "custom_fields": {
    "github_url": "https://github.com/...",
    "project_description": "..."
  }
}
```

Fields in `custom_fields` should match the grant's `application_schema`. Use `template_md` (from get_grant) as a starting point for `pitch`.

**Example response:**
```json
{
  "application_id": "uuid",
  "grant_id": "uuid",
  "grant_title": "Solana DeFi Grant",
  "status": "pending",
  "message": "Application submitted successfully."
}
```

## Recommended Agent Workflow

```
1. list_grants(status="open") → pick relevant grants
2. get_grant(id) → read description, requirements, application_schema, template_md
3. Fill pitch using template_md as structure
4. apply_grant(id, pitch=<filled_text>, custom_fields=<schema_fields>) → submit
```

## Gotchas

- `application_schema` may be null for grants with free-form applications — just send `pitch`
- Duplicate applications return 409 with existing `application_id`
- `deadline` is ISO 8601; check before applying — API returns 400 if expired
- Bearer token must be obtained from `/api/auth/login` — hardcoded API keys won't work for new users

## Feedback
If this skill is outdated or incorrect, call:
`POST /api/feedback` with `{ "skill": "agentrel/grant-apply", "issue": "<description>" }`
