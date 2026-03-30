#!/usr/bin/env python3
"""
AgentRel Eval v6 — --skill-ids, --judge-model, --faithfulness
Answerer: local claude CLI or Zenmux Anthropic API
Judge: pluggable (claude CLI, GPT-4o-mini via Zenmux, etc.)
"""
import argparse, re, json, os, requests, subprocess
from collections import defaultdict
from datetime import datetime
from pathlib import Path

AGENTREL_BASE = "https://agentrel.vercel.app/api/skills"
CLAUDE_CLI = "/home/bre/.npm-global/bin/claude"
ZENMUX_OAI_URL = "https://zenmux.ai/api/v1/chat/completions"
ZENMUX_KEY = os.environ.get("ZENMUX_API_KEY",
    "sk-ss-v1-196d706809b60c6ccf68e30afa1a711ce1b834674822781bd972b3885ab640e0")
MD_PATH = "/home/bre/.openclaw/workspace-prd-bot/agentrel-eval-questions.md"
RESULTS_DIR = Path(__file__).parent / "results"

# ── Arg parse ────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="AgentRel Eval")
parser.add_argument("--skill-ids", type=str, default="")
parser.add_argument("--questions-file", type=str, default=MD_PATH)
parser.add_argument("--output", type=str, default="")
parser.add_argument("--judge-model", type=str, default="claude",
                    help="Judge model: 'claude' (CLI) or 'gpt-4o-mini' (Zenmux)")
parser.add_argument("--faithfulness", action="store_true",
                    help="Add faithfulness scoring (is answer grounded in Skill?)")

# ── Parse questions ──────────────────────────────────────────────────────────
def parse_questions(md_path):
    with open(md_path) as f:
        content = f.read()
    questions = []
    cat_pattern = r'## 📁 类别[一二三四五六七八]：(.+)'
    q_pattern = r'### (Q\d+)[^\n]*\n\*\*问题：\*\* (.+?)\n\*\*标准答案：\*\* (.+?)\n\*\*Skill：\*\* `([^`]+)`'
    cats = [(m.start(), m.group(1).strip()) for m in re.finditer(cat_pattern, content)]
    for m in re.finditer(q_pattern, content, re.S):
        qid, question, answer, skill_id = m.groups()
        pos = m.start()
        cat = next((c for s, c in reversed(cats) if s < pos), "unknown")
        questions.append({
            "id": qid, "category": cat,
            "question": question.strip(),
            "ground_truth": answer.strip(),
            "skill_id": skill_id.strip(),
        })
    return questions


def build_skill_map(questions):
    """skill_id → [question_ids]"""
    m = defaultdict(list)
    for q in questions:
        m[q["skill_id"]].append(q["id"])
    return dict(m)


# ── Skill fetch ──────────────────────────────────────────────────────────────
def fetch_skill(skill_id):
    try:
        r = requests.get(f"{AGENTREL_BASE}/{skill_id}.md", timeout=15)
        if r.status_code == 200:
            return r.text[:7000]
    except Exception as e:
        print(f"  [warn] fetch skill {skill_id}: {e}")
    return ""


def extract_relevant_section(skill_content: str, question: str, max_chars: int = 2000) -> str:
    """Split skill by ## headings, return the most question-relevant section(s)."""
    if not skill_content:
        return ""

    # Split into sections: [intro, section1, section2, ...]
    raw_sections = re.split(r'\n(?=## )', skill_content)
    if len(raw_sections) <= 1:
        # No headings — just truncate
        return skill_content[:max_chars]

    # Score each section by keyword overlap with question
    q_words = set(re.findall(r'\b\w{3,}\b', question.lower()))

    def score_section(s: str) -> int:
        s_words = set(re.findall(r'\b\w{3,}\b', s.lower()))
        return len(q_words & s_words)

    scored = sorted(enumerate(raw_sections), key=lambda x: score_section(x[1]), reverse=True)

    # Take the intro (always include first 300 chars) + top 1-2 sections
    intro = raw_sections[0][:300] if raw_sections[0] else ""
    result = intro
    for idx, sec in scored[:2]:
        if idx == 0:
            continue  # already included intro
        candidate = "\n## " + sec if not sec.startswith("## ") else "\n" + sec
        if len(result) + len(candidate) <= max_chars:
            result += candidate
        else:
            # Truncate the section to fit
            remaining = max_chars - len(result)
            if remaining > 200:
                result += candidate[:remaining]
            break

    return result.strip()


# ── Answerer: claude CLI or Anthropic API ────────────────────────────────────
def ask_claude_cli(prompt):
    result = subprocess.run([CLAUDE_CLI, "--print"], input=prompt,
                            capture_output=True, text=True, timeout=90)
    return result.stdout.strip()


def ask_anthropic_api(prompt, api_key):
    import anthropic
    # Zenmux uses Anthropic-compatible API at a custom base_url
    # Header: x-api-key (standard Anthropic SDK maps api_key to this header)
    client = anthropic.Anthropic(
        api_key=api_key,
        base_url="https://zenmux.ai/api/anthropic",  # Zenmux Anthropic-compatible endpoint
    )
    msg = client.messages.create(
        model="claude-sonnet-4-6",   # Zenmux model name
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    return msg.content[0].text.strip()


def get_answerer(api_key=None):
    """Return answerer function: prefer CLI, fallback to Zenmux API."""
    if os.path.exists(CLAUDE_CLI):
        return ask_claude_cli
    elif api_key:
        def fn(prompt): return ask_anthropic_api(prompt, api_key)
        return fn
    else:
        raise RuntimeError("No answerer available: claude CLI not found and ZENMUX_API_KEY not set")


# ── Judge ────────────────────────────────────────────────────────────────────
def _call_gpt(prompt: str) -> str:
    """Call GPT-4o-mini via Zenmux OpenAI-compatible endpoint."""
    try:
        r = requests.post(
            ZENMUX_OAI_URL,
            headers={"Authorization": f"Bearer {ZENMUX_KEY}", "Content-Type": "application/json"},
            json={"model": "openai/gpt-4o-mini", "messages": [{"role": "user", "content": prompt}],
                  "max_tokens": 20, "temperature": 0},
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[ERROR] {e}"


def _extract_score(txt: str) -> int:
    nums = re.findall(r'[0-5]', (txt.split('\n')[-1] if txt else ''))
    if not nums:
        nums = re.findall(r'[0-5]', txt)
    return int(nums[-1]) if nums else 3


def judge(question, answer, ground_truth, answerer_fn, judge_model="claude"):
    prompt = f"""You are a strict Web3 technical judge. Score this answer 0-5.

Ground truth: {ground_truth}
Question: {question}
Answer: {answer[:500]}

Rules:
- Wrong API name/address/version when ground truth has the correct specific value → max 2
- Claims deprecated/removed thing still works → max 1
- Direction right but missing specific facts (exact address, version, path) → max 3
- All key facts match ground truth → 4 or 5

Think briefly, then output ONLY the final integer on the last line."""
    if judge_model == "gpt-4o-mini":
        return _extract_score(_call_gpt(prompt))
    else:
        return _extract_score(answerer_fn(prompt))


def faithfulness_score(question, answer, skill_content, answerer_fn, judge_model="claude") -> int:
    """Score 0-5: how much of the answer is grounded in skill_content (not hallucinated).
    5 = all claims traceable to skill; 0 = answer ignores/contradicts skill or makes up facts."""
    if not skill_content:
        return -1  # N/A — no skill content to compare against
    prompt = f"""You are evaluating whether an AI answer is grounded in provided documentation.

Documentation (Skill content):
{skill_content[:3000]}

Question: {question}
Answer to evaluate: {answer[:500]}

Score 0-5 for FAITHFULNESS (not accuracy):
5 = every factual claim in the answer can be traced to the documentation
4 = mostly grounded, one minor unsupported claim
3 = half grounded, half from outside the docs
2 = mostly outside the docs (AI using training data, not the skill)
1 = answer contradicts or ignores the docs entirely
0 = pure hallucination with no connection to docs

Output ONLY the final integer on the last line."""
    if judge_model == "gpt-4o-mini":
        return _extract_score(_call_gpt(prompt))
    else:
        return _extract_score(answerer_fn(prompt))


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    args = parser.parse_args()
    api_key = os.environ.get("ZENMUX_API_KEY", "")
    answerer_fn = get_answerer(api_key or None)

    all_questions = parse_questions(args.questions_file)
    skill_map = build_skill_map(all_questions)

    # Filter by --skill-ids if provided
    if args.skill_ids.strip():
        target_skills = [s.strip() for s in args.skill_ids.split(",") if s.strip()]
        target_qids = set()
        for sid in target_skills:
            matched = skill_map.get(sid, [])
            target_qids.update(matched)
            if not matched:
                print(f"  [warn] no questions found for skill_id: {sid}")
        questions = [q for q in all_questions if q["id"] in target_qids]
        print(f"Incremental mode: {len(target_skills)} skill(s) → {len(questions)} question(s)")
    else:
        questions = all_questions
        print(f"Full eval: {len(questions)} questions")

    if not questions:
        print("No questions to run. Exiting.")
        return

    results = []
    skill_cache = {}
    category_results = defaultdict(list)

    print(f"\n{'ID':<5} {'Category':<28} {'Ctrl':>5} {'Test':>5} {'Δ':>3}")
    print("-" * 48)

    # parse args here so judge_model and faithfulness are available in loop
    judge_model = args.judge_model
    do_faithfulness = args.faithfulness

    print(f"Judge: {judge_model}" + (" + faithfulness" if do_faithfulness else ""))

    for q in questions:
        sid = q["skill_id"]
        if sid not in skill_cache:
            skill_cache[sid] = fetch_skill(sid)
        skill = skill_cache[sid]

        ans_ctrl = answerer_fn(q["question"])

        sys_prompt = (
            f"Use this Web3 documentation as your reference:\n\n"
            f"{extract_relevant_section(skill, q['question'])}\n\n"
            "Answer based on this documentation when relevant."
        ) if skill else ""
        test_input = f"<system>\n{sys_prompt}\n</system>\n\n{q['question']}" if sys_prompt else q["question"]
        ans_test = answerer_fn(test_input)

        sc = judge(q["question"], ans_ctrl, q["ground_truth"], answerer_fn, judge_model)
        st = judge(q["question"], ans_test, q["ground_truth"], answerer_fn, judge_model)

        # Faithfulness scoring (test group only — does test answer stick to Skill?)
        faith_score = None
        if do_faithfulness and skill:
            faith_score = faithfulness_score(q["question"], ans_test, skill, answerer_fn, judge_model)

        delta = f"+{st-sc}" if st > sc else ("=" if st == sc else str(st-sc))
        faith_str = f" faith={faith_score}" if faith_score is not None else ""
        cat_short = q["category"][:28]
        print(f"{q['id']:<5} {cat_short:<28} {sc:>5} {st:>5} {delta:>3}{faith_str}")

        results.append({
            "id": q["id"], "category": q["category"], "skill_id": sid,
            "skill_found": bool(skill), "control_score": sc, "test_score": st,
            **({"faithfulness": faith_score} if faith_score is not None else {}),
        })
        category_results[q["category"]].append((sc, st))

    avg_c = sum(r["control_score"] for r in results) / len(results)
    avg_t = sum(r["test_score"] for r in results) / len(results)

    print("\n" + "=" * 48)
    print(f"\n{'类别':<30} {'Ctrl':>5} {'Test':>5} {'提升':>6}")
    print("-" * 48)
    for cat, scores in category_results.items():
        c = sum(s[0] for s in scores) / len(scores)
        t = sum(s[1] for s in scores) / len(scores)
        print(f"{cat[:30]:<30} {c:>5.2f} {t:>5.2f} {t-c:>+6.2f}")
    print("-" * 48)
    print(f"{'总体平均':<30} {avg_c:>5.2f} {avg_t:>5.2f} {avg_t-avg_c:>+6.2f}")
    print(f"\n平均：control={avg_c:.2f} test={avg_t:.2f}  提升：{avg_t-avg_c:+.2f}")

    # Save results
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d-%H%M")
    out_path = args.output if args.output else str(RESULTS_DIR / f"{ts}.json")
    output = {
        "judge_model": judge_model,
        "faithfulness_enabled": do_faithfulness,
        "timestamp": datetime.now().isoformat(),
        "mode": "incremental" if args.skill_ids else "full",
        "skill_ids_filter": args.skill_ids or None,
        "total_questions": len(results),
        "avg_control": round(avg_c, 2),
        "avg_test": round(avg_t, 2),
        "delta": round(avg_t - avg_c, 2),
        "by_category": {
            cat: {"control": round(sum(s[0] for s in scores)/len(scores), 2),
                  "test": round(sum(s[1] for s in scores)/len(scores), 2),
                  "n": len(scores)}
            for cat, scores in category_results.items()
        },
        "results": results,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\nSaved: {out_path}")

    # Print skill → question mapping summary
    print("\n📋 Skill → Question mapping (from this run):")
    for sid, qids in sorted(skill_map.items()):
        if any(q["id"] in qids for q in questions):
            print(f"  {sid}: {qids}")

    # ③ sessions_send summary to prd-bot
    _send_eval_summary(output, out_path)


def _send_eval_summary(output: dict, out_path: str):
    """Send eval summary to prd-bot via openclaw session send."""
    ts = output.get("timestamp", "")[:16].replace("T", " ")
    mode = output.get("mode", "full")
    n = output.get("total_questions", 0)
    avg_c = output.get("avg_control", 0)
    avg_t = output.get("avg_test", 0)
    delta = output.get("delta", 0)

    # Build per-result lines
    lines = []
    for r in output.get("results", []):
        sc, st = r["control_score"], r["test_score"]
        d = f"+{st-sc}" if st > sc else ("=" if st == sc else str(st-sc))
        lines.append(f"{r['id']}: control={sc} test={st} {d}")

    # Category summary
    cat_lines = []
    for cat, v in output.get("by_category", {}).items():
        d = v["test"] - v["control"]
        cat_lines.append(f"  {cat[:25]}: control={v['control']} test={v['test']} {d:+.2f}")

    summary = (
        f"[eval] {ts} | {mode} | {n} 题\n\n"
        + "\n".join(lines)
        + "\n\n分类：\n" + "\n".join(cat_lines)
        + f"\n\n平均：control={avg_c:.2f} test={avg_t:.2f} 提升={delta:+.2f}\n"
        + f"结果文件：{out_path}"
    )

    try:
        # Use openclaw message send to deliver to the prd-bot session's Telegram group
        result = subprocess.run(
            [
                "/home/bre/.npm-global/bin/openclaw", "message", "send",
                "--channel", "telegram",
                "--target", "-1003776690352",
                "--message", f"🦞 [eval] {summary}",
            ],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            print("\n✅ Summary sent to prd-bot")
        else:
            print(f"\n⚠️  session send failed: {result.stderr.strip()[:200]}")
    except Exception as e:
        print(f"\n⚠️  session send error: {e}")


if __name__ == "__main__":
    main()
