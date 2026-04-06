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

# ── Source tier mapping ───────────────────────────────────────────────────────
TIER_MAP: dict[str, str] = {
    'official': 'official',
    'official-docs': 'official',
    'verified': 'community',
    'third-party': 'community',
    'community': 'community',
    'ai-generated': 'openbuild',
    'npm': 'community',
    'defillama': 'community',
    'generated': 'openbuild',  # legacy alias
}

SUPABASE_URL = "https://zkpeutvzmrfhlzpsbyhr.supabase.co"
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGV1dHZ6bXJmaGx6cHNieWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk1MTI0MSwiZXhwIjoyMDg4NTI3MjQxfQ.DtvWVp2SrwNrfR503XjPUiW_H_T4GRrHqCTnjMZb9hI"
)

def fetch_skill_meta(skill_ids: list[str]) -> dict[str, str]:
    """Fetch source field for skill ids from Supabase."""
    if not skill_ids:
        return {}
    try:
        ids_param = ",".join(f'"{sid}"' for sid in skill_ids)
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/skills?id=in.({ids_param})&select=id,source",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            timeout=10,
        )
        return {row["id"]: TIER_MAP.get(row.get("source"), "unknown") for row in r.json()} if r.ok else {}
    except Exception:
        return {}

CLAUDE_CLI = "/home/bre/.npm-global/bin/claude"
ZENMUX_OAI_URL = "https://zenmux.ai/api/v1/chat/completions"
ZENMUX_KEY = os.environ.get("ZENMUX_API_KEY", "")
MD_PATH = "/home/bre/.openclaw/workspace-prd-bot/agentrel-eval-questions.md"
RESULTS_DIR = Path(__file__).parent / "results"

# ── Arg parse ────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="AgentRel Eval")
parser.add_argument("--skill-ids", type=str, default="")
parser.add_argument("--questions-file", type=str, default=MD_PATH)
parser.add_argument("--output", type=str, default="")
parser.add_argument("--judge-model", type=str, default="claude",
                    help="Judge model: 'claude' (CLI) or 'gpt-4o-mini' (Zenmux)")
parser.add_argument("--runs", type=int, default=1,
                    help="Number of eval runs per question (final score = median)")
parser.add_argument("--answerer", choices=["claude-cli", "zenmux"], default="zenmux",
                    help="Answerer model: zenmux (default) or claude-cli")
parser.add_argument("--faithfulness", action="store_true",
                    help="Add faithfulness scoring (is answer grounded in Skill?)")

# ── Parse questions ──────────────────────────────────────────────────────────
def parse_questions(md_path):
    with open(md_path) as f:
        content = f.read()
    questions = []
    cat_pattern = r'## (?:📁\s*)(?:类别[一二三四五六七八九]?[：:]\s*)?(.+)'
    # q_pattern: capture optional 注入策略 field after Skill line
    q_pattern = (
        r'### ([A-Z]{1,5}(?:-Q)?\d+)[^\n]*\n'
        r'\*\*问题：\*\* (.+?)\n'
        r'\*\*标准答案：\*\* (.+?)\n'
        r'\*\*Skill：\*\* `([^`]+)`'
        r'(?:\n\*\*注入策略：\*\* (\w+))?'  # optional inject_strategy field
    )
    cats = [(m.start(), m.group(1).strip()) for m in re.finditer(cat_pattern, content)]
    for m in re.finditer(q_pattern, content, re.S):
        qid, question, answer, skill_id, inject_strategy = m.groups()
        pos = m.start()
        cat = next((c for s, c in reversed(cats) if s < pos), "unknown")
        questions.append({
            "id": qid, "category": cat,
            "question": question.strip(),
            "ground_truth": answer.strip(),
            "skill_id": skill_id.strip(),
            "inject_strategy": (inject_strategy or "slice").lower(),  # default: slice
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
    result = subprocess.run([CLAUDE_CLI, "--print", "--dangerously-skip-permissions"], input=prompt,
                            capture_output=True, text=True, timeout=180)
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



def ask_zenmux(prompt, system=""):
    """Use Zenmux Anthropic-compatible API as answerer (no rate limit issues)."""
    import anthropic, time as _time
    key = os.environ.get("ZENMUX_API_KEY", "")
    client = anthropic.Anthropic(api_key=key, base_url="https://zenmux.ai/api/anthropic")
    full_prompt = f"<system>\n{system}\n</system>\n\n{prompt}" if system else prompt
    for attempt in range(3):
        try:
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=800,
                messages=[{"role": "user", "content": full_prompt}],
            )
            _time.sleep(0.5)  # small delay to avoid rate limits
            return resp.content[0].text.strip()
        except Exception as e:
            if attempt < 2:
                _time.sleep(3 * (attempt + 1))
            else:
                return f"[ERROR] {e}"
    return "[ERROR] max retries"


def get_answerer(api_key=None, answerer_type="claude-cli"):
    """Return answerer function based on --answerer arg."""
    if answerer_type == "zenmux":
        return ask_zenmux
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
    answerer_fn = get_answerer(api_key or None, answerer_type=args.answerer)

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

    num_runs = args.runs

    for q in questions:
        sid = q["skill_id"]
        if sid not in skill_cache:
            skill_cache[sid] = fetch_skill(sid)
        skill = skill_cache[sid]

        # Choose inject strategy per question
        strategy = q.get("inject_strategy", "slice")
        if strategy == "full":
            skill_context = skill[:3000] if skill else ""
        else:
            skill_context = extract_relevant_section(skill, q["question"]) if skill else ""

        sys_prompt = (
            f"Use this Web3 documentation as your reference:\n\n"
            f"{skill_context}\n\n"
            "Answer based on this documentation when relevant."
        ) if skill_context else ""
        test_input = f"<system>\n{sys_prompt}\n</system>\n\n{q['question']}" if sys_prompt else q["question"]

        # Run multiple times and take median to reduce Judge noise
        sc_runs, st_runs = [], []
        for run_i in range(num_runs):
            ans_ctrl = answerer_fn(q["question"])
            ans_test = answerer_fn(test_input)
            _sc = judge(q["question"], ans_ctrl, q["ground_truth"], answerer_fn, judge_model)
            _st = judge(q["question"], ans_test, q["ground_truth"], answerer_fn, judge_model)
            sc_runs.append(_sc)
            st_runs.append(_st)

        import statistics
        sc = round(statistics.median(sc_runs))
        st = round(statistics.median(st_runs))

        # Faithfulness scoring (test group only — does test answer stick to Skill?)
        faith_score = None
        if do_faithfulness and skill:
            ans_test_last = answerer_fn(test_input)
            faith_score = faithfulness_score(q["question"], ans_test_last, skill, answerer_fn, judge_model)

        runs_str = f" ({sc_runs}→{st_runs})" if num_runs > 1 else ""
        delta = f"+{st-sc}" if st > sc else ("=" if st == sc else str(st-sc))
        faith_str = f" faith={faith_score}" if faith_score is not None else ""
        strat_str = f" [{q.get('inject_strategy','slice')}]"
        cat_short = q["category"][:28]
        print(f"{q['id']:<5} {cat_short:<28} {sc:>5} {st:>5} {delta:>3}{faith_str}{strat_str}{runs_str}")

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
    # Source tier breakdown
    unique_skills = list(set(r["skill_id"] for r in results))
    tier_meta = fetch_skill_meta(unique_skills)
    tier_results: dict[str, list] = {}
    for r in results:
        tier = tier_meta.get(r["skill_id"], "unknown")
        tier_results.setdefault(tier, []).append((r["control_score"], r["test_score"]))
    if tier_results:
        print("\n📊 By Source Tier:")
        for tier, scores in sorted(tier_results.items()):
            tc = sum(s[0] for s in scores) / len(scores)
            tt = sum(s[1] for s in scores) / len(scores)
            print(f"  {tier:<12}: ctrl={tc:.2f} test={tt:.2f} δ={tt-tc:+.2f}  (n={len(scores)})")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\nSaved: {out_path}")

    # Print skill → question mapping summary
    print("\n📋 Skill → Question mapping (from this run):")
    for sid, qids in sorted(skill_map.items()):
        if any(q["id"] in qids for q in questions):
            print(f"  {sid}: {qids}")

    # ③ Save results to Supabase eval_results table (for Benchmark page)
    _save_results_to_db(output)

    # ④ Auto-flag skills with negative delta in DB
    _auto_flag_skills(output)

    # ④ sessions_send summary to prd-bot
    _send_eval_summary(output, out_path)


def _save_results_to_db(output: dict):
    """Save eval results to Supabase eval_results table for the Benchmark page."""
    try:
        results = output.get("results", [])
        if not results:
            return

        # Use ISO timestamp as run_at
        run_at = output.get("timestamp", datetime.utcnow().isoformat() + "+00:00")
        if not run_at.endswith("+00:00") and not run_at.endswith("Z"):
            run_at = run_at + "+00:00"
        judge_model = output.get("judge_model", "gpt-4o-mini")
        inject_strategy = output.get("mode", "full")

        rows = []
        for r in results:
            qid = r.get("id", "")
            cat = qid.split("-Q")[0] if "-Q" in qid else "General"
            rows.append({
                "run_at": run_at,
                "judge_model": judge_model,
                "inject_strategy": inject_strategy,
                "category": cat,
                "question_id": qid,
                "question_label": r.get("question", "")[:200],
                "control_score": r.get("control_score", 0),
                "test_score": r.get("test_score", 0),
                "faithfulness": None,
                "skill_id": r.get("skill_id", ""),
                "skill_found": bool(r.get("skill_id")),
            })

        # Insert in batches of 50
        batch_size = 50
        inserted = 0
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/eval_results",
                json=batch,
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                timeout=15,
            )
            if resp.status_code in (200, 201):
                inserted += len(batch)
            else:
                print(f"  ⚠️  DB insert batch {i // batch_size} failed: {resp.status_code}")

        print(f"\n📊 Saved {inserted}/{len(rows)} eval results to DB (run_at={run_at})")
    except Exception as e:
        print(f"\n⚠️  _save_results_to_db error: {e}")


def _auto_flag_skills(output: dict):
    """After a full eval run, flag skills with Δ<0 in Supabase (health_score=-2).
    health_score=-1: manually disabled
    health_score=-2: auto-flagged by eval (Δ<0), pending review
    """
    try:
        results = output.get("results", [])
        # Aggregate delta per skill_id
        from collections import defaultdict
        skill_deltas: dict[str, list[int]] = defaultdict(list)
        for r in results:
            sid = r.get("skill_id", "")
            if sid:
                skill_deltas[sid].append(r.get("test_score", 0) - r.get("control_score", 0))

        flagged = []
        for sid, deltas in skill_deltas.items():
            total = sum(deltas)
            if total < 0:
                flagged.append(sid)

        if not flagged:
            print("\n✅ No skills to auto-flag (all Δ >= 0)")
            return

        print(f"\n🚩 Auto-flagging {len(flagged)} skills with negative delta: {flagged}")

        for sid in flagged:
            r = requests.patch(
                f"{SUPABASE_URL}/rest/v1/skills?id=eq.{sid}",
                json={"health_score": -2},
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                timeout=10,
            )
            status = "✅" if r.status_code in (200, 204) else f"❌ {r.status_code}"
            print(f"  {status} {sid} → health_score=-2 (flagged)")

        # Notify Telegram
        flag_msg = f"🚩 Eval 自动标记 {len(flagged)} 个降分 skill（health_score=-2）:\n" + "\n".join(f"  • {s}" for s in flagged) + "\n\n7天内无人处理将自动下架（health_score=-1）。"
        subprocess.run(
            ["/home/bre/.npm-global/bin/openclaw", "message", "send",
             "--channel", "telegram", "--target", "-1003776690352", "--message", flag_msg],
            capture_output=True, text=True, timeout=15,
        )
    except Exception as e:
        print(f"\n⚠️  auto_flag_skills error: {e}")


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
