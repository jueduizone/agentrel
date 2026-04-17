#!/usr/bin/env python3
"""
基于 solana-foundation/solana-dev-skill 官方文档，
为 solana/solana-dev skill 生成50道 eval 题目。
输出写入 /tmp/sol_new_questions.json
"""
import json, os, re, time
import requests

BASE_URL = "https://api.commonstack.ai/v1"
API_KEY = os.environ.get("COMMONSTACK_API_KEY", "")

def call_llm(prompt: str, model="openai/gpt-4o-mini") -> str:
    r = requests.post(
        f"{BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.3},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

def fetch_url(url: str) -> str:
    try:
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        text = r.text
        # strip HTML tags roughly
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        return text[:6000]
    except Exception as e:
        return f"[fetch error: {e}]"

# 官方文档来源
SKILL_CONFIGS = [
    {
        "skill_id": "solana/solana-dev",
        "category": "SOL",
        "label": "common-errors",
        "urls": [
            "https://raw.githubusercontent.com/solana-foundation/solana-dev-skill/main/skill/references/common-errors.md",
        ],
        "focus": "Common Solana build errors: GLIBC version mismatch, Anchor version conflicts, RPC errors (429, connection refused), BPFLoader issues, program deployment failures, simulation errors",
        "target_count": 8,
    },
    {
        "skill_id": "solana/solana-dev",
        "category": "SOL",
        "label": "compatibility-matrix",
        "urls": [
            "https://raw.githubusercontent.com/solana-foundation/solana-dev-skill/main/skill/references/compatibility-matrix.md",
        ],
        "focus": "Anchor/Solana CLI/Rust/Node.js version compatibility table, which Anchor version works with which Solana CLI, how to pin versions, toolchain conflict resolution",
        "target_count": 6,
    },
    {
        "skill_id": "solana/solana-dev",
        "category": "SOL",
        "label": "testing",
        "urls": [
            "https://raw.githubusercontent.com/solana-foundation/solana-dev-skill/main/skill/references/testing.md",
        ],
        "focus": "Solana test pyramid: LiteSVM for fast unit tests, Mollusk for isolated instruction testing, Surfpool for mainnet-fork integration tests, when to use each, test setup patterns",
        "target_count": 8,
    },
    {
        "skill_id": "solana/solana-dev",
        "category": "SOL",
        "label": "security",
        "urls": [
            "https://raw.githubusercontent.com/solana-foundation/solana-dev-skill/main/skill/references/security.md",
        ],
        "focus": "Solana program security checklist: account validation, signer checks, ownership checks, PDA validation, integer overflow, reentrancy patterns, common attack vectors specific to Solana",
        "target_count": 8,
    },
    {
        "skill_id": "solana/solana-dev",
        "category": "SOL",
        "label": "anchor-program",
        "urls": [
            "https://raw.githubusercontent.com/solana-foundation/solana-dev-skill/main/skill/references/programs/anchor.md",
        ],
        "focus": "Anchor framework modern patterns: account constraints (#[account(...)]), PDA seeds/bumps, CPI with CpiContext, error handling with #[error_code], workspace setup, migrate to v0.31+",
        "target_count": 8,
    },
    {
        "skill_id": "solana/solana-dev",
        "category": "SOL",
        "label": "kit-overview",
        "urls": [
            "https://raw.githubusercontent.com/solana-foundation/solana-dev-skill/main/skill/references/kit/overview.md",
        ],
        "focus": "@solana/kit: RPC client setup, createSolanaRpc vs legacy web3.js, transaction building with pipe(), sendAndConfirmTransaction, address vs PublicKey migration, zero-dependency approach",
        "target_count": 6,
    },
    {
        "skill_id": "solana/solana-dev",
        "category": "SOL",
        "label": "frontend",
        "urls": [
            "https://raw.githubusercontent.com/solana-foundation/solana-dev-skill/main/skill/references/frontend-framework-kit.md",
        ],
        "focus": "React/Next.js Solana frontend: framework-kit (@solana/client + @solana/react-hooks), Wallet Standard connection, ConnectorKit, SolanaSignAndSendTransaction, wallet adapter migration",
        "target_count": 6,
    },
]

QUESTION_PROMPT = """你是 AgentRel eval 题目生成器，负责为 Solana 官方开发 skill 生成高质量评测题。

**Skill ID**: {skill_id}
**Category**: SOL
**Focus area**: {focus}

**参考文档内容**（摘录）:
{doc_content}

---

请生成 {count} 道评测题，要求：
1. 题目必须基于上面的文档内容，答案在文档中明确可查
2. 题目考察 agent 的实操能力，而不是常识（不要问"Solana 是什么"这类问题）
3. 每道题提供：question（英文）、ground_truth（简洁的1-3句参考答案）
4. 避免和以下已有题目重复：{existing_questions}

输出 JSON 数组（无其他内容）：
[
  {{"question": "...", "ground_truth": "..."}},
  ...
]
"""

def generate_batch(config: dict, existing_qs: list, start_idx: int) -> list:
    # 抓文档
    doc_parts = []
    for url in config["urls"]:
        content = fetch_url(url)
        doc_parts.append(f"--- {url} ---\n{content}")
    doc_content = "\n\n".join(doc_parts)[:5000]

    existing_summary = "; ".join(q['vars']['question'][:60] for q in existing_qs[-10:]) or "无"

    prompt = QUESTION_PROMPT.format(
        skill_id=config["skill_id"],
        focus=config["focus"],
        doc_content=doc_content,
        count=config["target_count"],
        existing_questions=existing_summary,
    )

    raw = call_llm(prompt, model="anthropic/claude-sonnet-4-6")
    
    # 提取 JSON（处理 ```json ... ``` 包裹和裸 [] 两种格式）
    raw_clean = re.sub(r'```json\s*', '', raw)
    raw_clean = re.sub(r'```\s*', '', raw_clean)
    match = re.search(r'\[[\s\S]*\]', raw_clean)
    if not match:
        print(f"  ⚠️ 无法解析 JSON，raw: {raw[:300]}")
        return []
    
    items = json.loads(match.group(0))
    
    # 标准化字段名（处理中文 key 或其他变体）
    normalized = []
    for item in items:
        q = item.get('question') or item.get('问题') or item.get('题目') or ''
        gt = item.get('ground_truth') or item.get('参考答案') or item.get('答案') or item.get('answer') or ''
        if q and gt:
            normalized.append({'question': q, 'ground_truth': gt})
        else:
            print(f"  ⚠️ 字段缺失，keys={list(item.keys())}, sample={str(item)[:100]}")
    items = normalized

    results = []
    for i, item in enumerate(items):
        q_id = f"SOL-Q{start_idx + i + 1:02d}"
        results.append({
            "vars": {
                "question_id": q_id,
                "question": item["question"],
                "skill_id": config["skill_id"],
                "category": "SOL",
                "expected_facts": json.dumps([item["ground_truth"]], ensure_ascii=False),
            }
        })
    return results

def main():
    all_questions = []
    idx = 0
    
    for config in SKILL_CONFIGS:
        print(f"生成 {config['label']} ({config['target_count']} 题)...")
        try:
            qs = generate_batch(config, all_questions, idx)
            all_questions.extend(qs)
            idx += len(qs)
            print(f"  ✓ 生成 {len(qs)} 题，累计 {len(all_questions)} 题")
            time.sleep(1)
        except Exception as e:
            print(f"  ✗ 失败: {e}")
    
    # 输出
    with open("/tmp/sol_new_questions.json", "w") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 完成，共 {len(all_questions)} 道题 → /tmp/sol_new_questions.json")

if __name__ == "__main__":
    for line in open("/home/bre/agentrel/.env.local"):
        if 'COMMONSTACK_API_KEY' in line:
            API_KEY = line.split('=', 1)[1].strip()
            break
    main()
