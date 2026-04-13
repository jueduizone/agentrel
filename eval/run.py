#!/usr/bin/env python3
"""
AgentRel Eval v8 — pass/partial/fail verdicts, dual-model A/B (each model: bare vs with-skill)
Answerer: local claude CLI or Zenmux Anthropic API
Judge: pluggable (claude CLI, GPT-4o-mini via Zenmux, etc.)
"""
import argparse, re, json, os, requests, subprocess, statistics
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

# ── Verdict helpers ───────────────────────────────────────────────────────────
def score_to_verdict(score: int) -> str:
    """Convert 0-5 score to pass/partial/fail."""
    if score >= 4:
        return "pass"
    elif score >= 2:
        return "partial"
    else:
        return "fail"

def verdict_emoji(v: str) -> str:
    return {"pass": "✅", "partial": "🟡", "fail": "❌"}.get(v, "❓")

# ── Arg parse ────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="AgentRel Eval v7")
parser.add_argument("--skill-ids", type=str, default="")
parser.add_argument("--questions-file", type=str, default=MD_PATH)
parser.add_argument("--output", type=str, default="")
parser.add_argument("--judge-model", type=str, default="claude",
                    help="Judge model: 'claude' (CLI) or 'gpt-4o-mini' (Zenmux)")
parser.add_argument("--runs", type=int, default=1,
                    help="Number of eval runs per question (final score = median)")
parser.add_argument("--answerer", choices=["claude-cli", "zenmux"], default="zenmux",
                    help="Primary answerer model")
parser.add_argument("--answerer2", type=str, default="",
                    help="Optional secondary answerer for dual-model comparison: 'zenmux-mini' (gpt-4o-mini via Zenmux)")
parser.add_argument("--faithfulness", action="store_true",
                    help="Add faithfulness scoring (is answer grounded in Skill?)")

# ── Parse questions ──────────────────────────────────────────────────────────
def parse_questions(md_path):
    with open(md_path) as f:
        content = f.read()
    questions = []
    cat_pattern = r'## (?:📁\s*)(?:类别[一二三四五六七八九]?[：:]\s*)?(.+)'
    q_pattern = (
        r'### ([A-Z]{1,5}(?:-Q)?\d+)[^\n]*\n'
        r'\*\*问题：\*\* (.+?)\n'
        r'\*\*标准答案：\*\* (.+?)\n'
        r'\*\*Skill：\*\* `([^`]+)`'
        r'(?:\n\*\*注入策略：\*\* (\w+))?'
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
            "inject_strategy": (inject_strategy or "slice").lower(),
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
    raw_sections = re.split(r'\n(?=## )', skill_content)
    if len(raw_sections) <= 1:
        return skill_content[:max_chars]
    q_words = set(re.findall(r'\b\w{3,}\b', question.lower()))

    def score_section(s: str) -> int:
        s_words = set(re.findall(r'\b\w{3,}\b', s.lower()))
        return len(q_words & s_words)

    scored = sorted(enumerate(raw_sections), key=lambda x: score_section(x[1]), reverse=True)
    intro = raw_sections[0][:300] if raw_sections[0] else ""
    result = intro
    for idx, sec in scored[:2]:
        if idx == 0:
            continue
        candidate = "\n## " + sec if not sec.startswith("## ") else "\n" + sec
        if len(result) + len(candidate) <= max_chars:
            result += candidate
        else:
            remaining = max_chars - len(result)
            if remaining > 200:
                result += candidate[:remaining]
            break
    return result.strip()


# ── Answerer: claude CLI or Zenmux API ───────────────────────────────────────
def ask_claude_cli(prompt, system=""):
    full = f"<system>\n{system}\n</system>\n\n{prompt}" if system else prompt
    result = subprocess.run([CLAUDE_CLI, "--print", "--dangerously-skip-permissions"], input=full,
                            capture_output=True, text=True, timeout=600)
    return result.stdout.strip()


def ask_anthropic_api(prompt, api_key):
    import anthropic
    client = anthropic.Anthropic(
        api_key=api_key,
        base_url="https://zenmux.ai/api/anthropic",
    )
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    return msg.content[0].text.strip()


def ask_zenmux(prompt, system=""):
    """Use Zenmux claude-sonnet as answerer."""
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
            _time.sleep(0.5)
            return resp.content[0].text.strip()
        except Exception as e:
            if attempt < 2:
                _time.sleep(3 * (attempt + 1))
            else:
                return f"[ERROR] {e}"
    return "[ERROR] max retries"


def ask_zenmux_mini(prompt, system=""):
    """Use Zenmux gpt-4o-mini as answerer (weak model for dual comparison)."""
    import time as _time
    full = f"{system}\n\n{prompt}" if system else prompt
    for attempt in range(3):
        try:
            r = requests.post(
                ZENMUX_OAI_URL,
                headers={"Authorization": f"Bearer {ZENMUX_KEY}", "Content-Type": "application/json"},
                json={"model": "openai/gpt-4o-mini", "messages": [{"role": "user", "content": full}],
                      "max_tokens": 800, "temperature": 0.3},
                timeout=30,
            )
            r.raise_for_status()
            _time.sleep(0.3)
            return r.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            if attempt < 2:
                _time.sleep(3 * (attempt + 1))
            else:
                return f"[ERROR] {e}"
    return "[ERROR] max retries"


def get_answerer_fn(answerer_type: str):
    """Return answerer function (signature: fn(prompt, system='') -> str)."""
    if answerer_type == "zenmux":
        return ask_zenmux
    elif answerer_type == "zenmux-mini":
        return ask_zenmux_mini
    elif answerer_type == "claude-cli":
        if os.path.exists(CLAUDE_CLI):
            return ask_claude_cli
        raise RuntimeError("claude CLI not found")
    else:
        raise RuntimeError(f"Unknown answerer: {answerer_type}")


# ── Judge ─────────────────────────────────────────────────────────────────────
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


def judge(question, answer, ground_truth, answerer_fn, judge_model="claude") -> tuple[int, str]:
    """Returns (score 0-5, verdict pass/partial/fail)."""
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
        raw = _call_gpt(prompt)
    else:
        raw = answerer_fn(prompt)
    score = _extract_score(raw)
    return score, score_to_verdict(score)


def faithfulness_score(question, answer, skill_content, answerer_fn, judge_model="claude") -> int:
    """Score 0-5: how much of the answer is grounded in skill_content."""
    if not skill_content:
        return -1
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


# ── Per-skill aggregation ─────────────────────────────────────────────────────
def aggregate_skill_stats(results: list[dict], model_key: str = "") -> dict:
    """
    Build per-skill stats dict.
    model_key: "" for primary model, "2" for secondary model suffix in result fields.
    Returns {skill_id: {pass_rate, partial_rate, fail_rate, ctrl_pass_rate, uplift, n, ...}}
    """
    ctrl_score_key = f"control_score{model_key}"
    test_score_key = f"test_score{model_key}"
    verdict_ctrl_key = f"verdict_ctrl{model_key}"
    verdict_test_key = f"verdict_test{model_key}"

    by_skill = defaultdict(list)
    for r in results:
        sid = r.get("skill_id", "unknown")
        by_skill[sid].append(r)

    stats = {}
    for sid, rows in by_skill.items():
        n = len(rows)
        ctrl_scores = [r.get(ctrl_score_key, r.get("control_score", 0)) for r in rows]
        test_scores = [r.get(test_score_key, r.get("test_score", 0)) for r in rows]

        # verdict counts
        ctrl_verdicts = [r.get(verdict_ctrl_key, score_to_verdict(r.get(ctrl_score_key, r.get("control_score", 0)))) for r in rows]
        test_verdicts = [r.get(verdict_test_key, score_to_verdict(r.get(test_score_key, r.get("test_score", 0)))) for r in rows]

        ctrl_pass = ctrl_verdicts.count("pass") / n
        ctrl_partial = ctrl_verdicts.count("partial") / n
        ctrl_fail = ctrl_verdicts.count("fail") / n

        test_pass = test_verdicts.count("pass") / n
        test_partial = test_verdicts.count("partial") / n
        test_fail = test_verdicts.count("fail") / n

        avg_ctrl = sum(ctrl_scores) / n
        avg_test = sum(test_scores) / n
        uplift = avg_test - avg_ctrl
        pass_uplift = test_pass - ctrl_pass

        stats[sid] = {
            "n": n,
            "ctrl_avg": round(avg_ctrl, 2),
            "test_avg": round(avg_test, 2),
            "uplift": round(uplift, 2),
            "ctrl_pass_rate": round(ctrl_pass, 3),
            "ctrl_partial_rate": round(ctrl_partial, 3),
            "ctrl_fail_rate": round(ctrl_fail, 3),
            "test_pass_rate": round(test_pass, 3),
            "test_partial_rate": round(test_partial, 3),
            "test_fail_rate": round(test_fail, 3),
            "pass_uplift": round(pass_uplift, 3),
        }
    return stats


# ── RESULT.md generator ───────────────────────────────────────────────────────
def generate_result_md(output: dict, out_path: str) -> str:
    """Generate a mantle-style RESULT.md and write it. Returns path."""
    ts = output.get("timestamp", "")[:16].replace("T", " ")
    mode = output.get("mode", "full")
    judge_model = output.get("judge_model", "")
    answerer = output.get("answerer", "")
    answerer2 = output.get("answerer2", "")
    n = output.get("total_questions", 0)
    avg_c = output.get("avg_control", 0)
    avg_t = output.get("avg_test", 0)
    delta = output.get("delta", 0)

    lines = [
        "# AgentRel Eval Results",
        "",
        f"**Run:** {ts}  |  **Mode:** {mode}  |  **Questions:** {n}",
        f"**Judge:** {judge_model}  |  **Answerer:** {answerer}" + (f"  |  **Answerer2:** {answerer2}" if answerer2 else ""),
        "",
        "## Overall",
        "",
        f"| Metric | Control | With Skill | Uplift |",
        f"|--------|---------|------------|--------|",
        f"| Avg Score | {avg_c:.2f} | {avg_t:.2f} | {delta:+.2f} |",
    ]

    # Overall verdict counts
    results = output.get("results", [])
    if results:
        n_r = len(results)
        ctrl_pass = sum(1 for r in results if r.get("verdict_ctrl") == "pass") / n_r
        ctrl_partial = sum(1 for r in results if r.get("verdict_ctrl") == "partial") / n_r
        ctrl_fail = sum(1 for r in results if r.get("verdict_ctrl") == "fail") / n_r
        test_pass = sum(1 for r in results if r.get("verdict_test") == "pass") / n_r
        test_partial = sum(1 for r in results if r.get("verdict_test") == "partial") / n_r
        test_fail = sum(1 for r in results if r.get("verdict_test") == "fail") / n_r
        lines += [
            f"| Pass Rate | {ctrl_pass:.0%} | {test_pass:.0%} | {test_pass-ctrl_pass:+.0%} |",
            f"| Partial Rate | {ctrl_partial:.0%} | {test_partial:.0%} | {test_partial-ctrl_partial:+.0%} |",
            f"| Fail Rate | {ctrl_fail:.0%} | {test_fail:.0%} | {test_fail-ctrl_fail:+.0%} |",
        ]

    # Per-skill table
    skill_stats = output.get("skill_stats", {})
    if skill_stats:
        lines += [
            "",
            "## Per-Skill Breakdown",
            "",
            "| Skill | n | Ctrl Pass | Test Pass | Pass Uplift | Ctrl Avg | Test Avg | Score Uplift |",
            "|-------|---|-----------|-----------|-------------|----------|----------|--------------|",
        ]
        for sid, s in sorted(skill_stats.items(), key=lambda x: -x[1]["pass_uplift"]):
            emoji = "✅" if s["pass_uplift"] > 0 else ("🟡" if s["pass_uplift"] == 0 else "❌")
            lines.append(
                f"| `{sid}` | {s['n']} "
                f"| {s['ctrl_pass_rate']:.0%} | {s['test_pass_rate']:.0%} | {s['pass_uplift']:+.0%} "
                f"| {s['ctrl_avg']:.2f} | {s['test_avg']:.2f} | {s['uplift']:+.2f} {emoji} |"
            )

    # Dual-model comparison table (if answerer2 used) — Mantle-style: both models show bare vs with-skill
    if answerer2 and results and any("test_score2" in r for r in results):
        skill_stats2 = output.get("skill_stats2", {})
        lines += [
            "",
            f"## Dual-Model A/B: {answerer} vs {answerer2}",
            "",
            "| Skill | n | Strong Bare | Strong+Skill | Strong↑ | Weak Bare | Weak+Skill | Weak↑ |",
            "|-------|---|-------------|--------------|---------|-----------|------------|-------|",
        ]
        all_skills = sorted(set(list(skill_stats.keys()) + list(skill_stats2.keys())))
        for sid in all_skills:
            s1 = skill_stats.get(sid, {})
            s2 = skill_stats2.get(sid, {})
            lines.append(
                f"| `{sid}` | {s1.get('n', s2.get('n', 0))} "
                f"| {s1.get('ctrl_pass_rate', 0):.0%} | {s1.get('test_pass_rate', 0):.0%} | {s1.get('pass_uplift', 0):+.0%} "
                f"| {s2.get('ctrl_pass_rate', 0):.0%} | {s2.get('test_pass_rate', 0):.0%} | {s2.get('pass_uplift', 0):+.0%} |"
            )

    # Per-category
    by_cat = output.get("by_category", {})
    if by_cat:
        lines += [
            "",
            "## By Category",
            "",
            "| Category | n | Ctrl | Test | Uplift |",
            "|----------|---|------|------|--------|",
        ]
        for cat, v in sorted(by_cat.items(), key=lambda x: -(x[1].get("test", 0) - x[1].get("control", 0))):
            d = v["test"] - v["control"]
            lines.append(f"| {cat} | {v['n']} | {v['control']:.2f} | {v['test']:.2f} | {d:+.2f} |")

    # Per-question detail
    if results:
        lines += [
            "",
            "## Question Detail",
            "",
            "| ID | Skill | Ctrl | Test | Δ | Ctrl Verdict | Test Verdict |",
            "|----|-------|------|------|---|-------------|-------------|",
        ]
        for r in results:
            sc = r["control_score"]
            st = r["test_score"]
            vc = verdict_emoji(r.get("verdict_ctrl", score_to_verdict(sc)))
            vt = verdict_emoji(r.get("verdict_test", score_to_verdict(st)))
            lines.append(
                f"| {r['id']} | `{r['skill_id']}` | {sc} | {st} | {st-sc:+d} | {vc} | {vt} |"
            )

    md_content = "\n".join(lines) + "\n"
    md_path = str(RESULTS_DIR / "RESULT.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"\n📄 RESULT.md → {md_path}")
    return md_path


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    args = parser.parse_args()
    answerer_fn = get_answerer_fn(args.answerer)
    answerer2_fn = get_answerer_fn(args.answerer2) if args.answerer2 else None

    all_questions = parse_questions(args.questions_file)
    skill_map = build_skill_map(all_questions)

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

    judge_model = args.judge_model
    do_faithfulness = args.faithfulness
    num_runs = args.runs
    dual = answerer2_fn is not None

    header = f"{'ID':<8} {'Category':<25} {'Ctrl':>5} {'Test':>5} {'Δ':>3} {'V_ctrl':<8} {'V_test':<8}"
    if dual:
        header += " {:>6} {:>6} {:>3} {:<8} {:<8}".format("Ctrl2", "Test2", "Δ2", "Vc2", "Vt2")
    print(f"\n{header}")
    print("-" * (len(header) + 4))
    print(f"Judge: {judge_model}  Answerer: {args.answerer}" + (f"  Answerer2: {args.answerer2}" if dual else ""))

    for q in questions:
        sid = q["skill_id"]
        if sid not in skill_cache:
            skill_cache[sid] = fetch_skill(sid)
        skill = skill_cache[sid]

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

        # ── Primary model runs ────────────────────────────────────────────────
        sc_runs, st_runs = [], []
        vc_runs, vt_runs = [], []
        for _ in range(num_runs):
            ans_ctrl = answerer_fn(q["question"])
            ans_test = answerer_fn(q["question"], system=sys_prompt) if sys_prompt else answerer_fn(q["question"])
            _sc, _vc = judge(q["question"], ans_ctrl, q["ground_truth"], answerer_fn, judge_model)
            _st, _vt = judge(q["question"], ans_test, q["ground_truth"], answerer_fn, judge_model)
            sc_runs.append(_sc); vc_runs.append(_vc)
            st_runs.append(_st); vt_runs.append(_vt)

        sc = round(statistics.median(sc_runs))
        st = round(statistics.median(st_runs))
        vc = score_to_verdict(sc)
        vt = score_to_verdict(st)

        # ── Secondary model runs (dual) — Mantle-style A/B: bare vs with-skill ──
        sc2, vc2, st2, vt2 = None, None, None, None
        if dual:
            sc2_runs, vc2_runs, st2_runs, vt2_runs = [], [], [], []
            for _ in range(num_runs):
                ans_ctrl2 = answerer2_fn(q["question"])
                ans_test2 = answerer2_fn(q["question"], system=sys_prompt) if sys_prompt else answerer2_fn(q["question"])
                _sc2, _vc2 = judge(q["question"], ans_ctrl2, q["ground_truth"], answerer_fn, judge_model)
                _st2, _vt2 = judge(q["question"], ans_test2, q["ground_truth"], answerer_fn, judge_model)
                sc2_runs.append(_sc2); vc2_runs.append(_vc2)
                st2_runs.append(_st2); vt2_runs.append(_vt2)
            sc2 = round(statistics.median(sc2_runs))
            vc2 = score_to_verdict(sc2)
            st2 = round(statistics.median(st2_runs))
            vt2 = score_to_verdict(st2)

        # ── Faithfulness ──────────────────────────────────────────────────────
        faith_score = None
        if do_faithfulness and skill:
            ans_test_last = answerer_fn(q["question"], system=sys_prompt) if sys_prompt else answerer_fn(q["question"])
            faith_score = faithfulness_score(q["question"], ans_test_last, skill, answerer_fn, judge_model)

        delta_str = f"{st-sc:+d}"
        row = (f"{q['id']:<8} {q['category'][:25]:<25} {sc:>5} {st:>5} {delta_str:>3} "
               f"{verdict_emoji(vc)+vc:<8} {verdict_emoji(vt)+vt:<8}")
        if dual and st2 is not None:
            delta2_str = f"{st2-sc2:+d}"
            row += f" {sc2:>6} {st2:>6} {delta2_str:>3} {verdict_emoji(vc2)+vc2:<8} {verdict_emoji(vt2)+vt2:<8}"
        if faith_score is not None:
            row += f" faith={faith_score}"
        print(row)

        entry = {
            "id": q["id"], "category": q["category"], "skill_id": sid,
            "question": q["question"],
            "skill_found": bool(skill),
            "control_score": sc, "test_score": st,
            "verdict_ctrl": vc, "verdict_test": vt,
            **({
                "control_score2": sc2, "test_score2": st2,
                "verdict_ctrl2": vc2, "verdict_test2": vt2,
            } if dual and st2 is not None else {}),
            **({f"faithfulness": faith_score} if faith_score is not None else {}),
        }
        results.append(entry)
        category_results[q["category"]].append((sc, st))

    avg_c = sum(r["control_score"] for r in results) / len(results)
    avg_t = sum(r["test_score"] for r in results) / len(results)

    # ── Category summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print(f"\n{'类别':<30} {'n':>3} {'Ctrl':>5} {'Test':>5} {'提升':>6}")
    print("-" * 55)
    for cat, scores in category_results.items():
        c = sum(s[0] for s in scores) / len(scores)
        t = sum(s[1] for s in scores) / len(scores)
        print(f"{cat[:30]:<30} {len(scores):>3} {c:>5.2f} {t:>5.2f} {t-c:>+6.2f}")
    print("-" * 55)
    print(f"{'总体平均':<30} {len(results):>3} {avg_c:>5.2f} {avg_t:>5.2f} {avg_t-avg_c:>+6.2f}")

    # ── Per-skill stats ───────────────────────────────────────────────────────
    skill_stats = aggregate_skill_stats(results)
    skill_stats2 = aggregate_skill_stats(results, model_key="2") if dual else {}

    print("\n📊 Per-Skill Summary:")
    print(f"  {'Skill':<35} {'n':>3} {'Ctrl%':>6} {'Test%':>6} {'Pass↑':>7} {'δavg':>6}")
    print("  " + "-" * 65)
    for sid, s in sorted(skill_stats.items(), key=lambda x: -x[1]["pass_uplift"]):
        emoji = "✅" if s["pass_uplift"] > 0 else ("🟡" if s["pass_uplift"] == 0 else "❌")
        print(f"  {sid[:35]:<35} {s['n']:>3} {s['ctrl_pass_rate']:>5.0%} {s['test_pass_rate']:>6.0%} "
              f"{s['pass_uplift']:>+6.0%} {s['uplift']:>+6.2f} {emoji}")

    if dual and skill_stats2:
        print(f"\n📊 Dual-Model A/B ({args.answerer} vs {args.answerer2}):")
        print(f"  {'Skill':<35} {'StrongBare':>10} {'Strong+':>8} {'S↑':>5} {'WeakBare':>9} {'Weak+':>7} {'W↑':>5}")
        print("  " + "-" * 75)
        for sid in sorted(set(list(skill_stats.keys()) + list(skill_stats2.keys()))):
            s1 = skill_stats.get(sid, {})
            s2 = skill_stats2.get(sid, {})
            print(f"  {sid[:35]:<35} {s1.get('ctrl_pass_rate',0):>9.0%} {s1.get('test_pass_rate',0):>8.0%} {s1.get('pass_uplift',0):>+5.0%} "
                  f"{s2.get('ctrl_pass_rate',0):>9.0%} {s2.get('test_pass_rate',0):>7.0%} {s2.get('pass_uplift',0):>+5.0%}")

    # ── Source tier breakdown ─────────────────────────────────────────────────
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

    # ── Save JSON ─────────────────────────────────────────────────────────────
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    ts_str = datetime.now().strftime("%Y-%m-%d-%H%M")
    out_path = args.output if args.output else str(RESULTS_DIR / f"{ts_str}.json")
    output = {
        "version": "v8",
        "judge_model": judge_model,
        "answerer": args.answerer,
        "answerer2": args.answerer2 or None,
        "faithfulness_enabled": do_faithfulness,
        "timestamp": datetime.now().isoformat(),
        "mode": "incremental" if args.skill_ids else "full",
        "skill_ids_filter": args.skill_ids or None,
        "total_questions": len(results),
        "avg_control": round(avg_c, 2),
        "avg_test": round(avg_t, 2),
        "delta": round(avg_t - avg_c, 2),
        "by_category": {
            cat: {
                "control": round(sum(s[0] for s in scores) / len(scores), 2),
                "test": round(sum(s[1] for s in scores) / len(scores), 2),
                "n": len(scores),
            }
            for cat, scores in category_results.items()
        },
        "skill_stats": skill_stats,
        **({"skill_stats2": skill_stats2} if dual else {}),
        "results": results,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\nSaved: {out_path}")

    # ── Print skill → question mapping ────────────────────────────────────────
    print("\n📋 Skill → Question mapping:")
    for sid, qids in sorted(skill_map.items()):
        if any(q["id"] in qids for q in questions):
            print(f"  {sid}: {qids}")

    # ── Generate RESULT.md ────────────────────────────────────────────────────
    generate_result_md(output, out_path)

    # ── Save to Supabase ──────────────────────────────────────────────────────
    _save_results_to_db(output)

    # ── Auto-flag skills ──────────────────────────────────────────────────────
    _auto_flag_skills(output)

    # ── Send summary to prd-bot ───────────────────────────────────────────────
    _send_eval_summary(output, out_path)


def _save_results_to_db(output: dict):
    """Save eval results to Supabase eval_results table.
    NOTE: To enable verdict column, run in Supabase SQL editor:
      ALTER TABLE eval_results ADD COLUMN IF NOT EXISTS verdict text;
    Until then, verdict field is silently dropped on insert failure.
    """
    try:
        results = output.get("results", [])
        if not results:
            return

        run_at = output.get("timestamp", datetime.utcnow().isoformat() + "+00:00")
        if not run_at.endswith("+00:00") and not run_at.endswith("Z"):
            run_at = run_at + "+00:00"
        judge_model = output.get("judge_model", "gpt-4o-mini")
        inject_strategy = output.get("mode", "full")

        def make_rows(include_verdict: bool) -> list[dict]:
            rows = []
            for r in results:
                qid = r.get("id", "")
                cat = qid.split("-Q")[0] if "-Q" in qid else "General"
                row = {
                    "run_at": run_at,
                    "judge_model": judge_model,
                    "inject_strategy": inject_strategy,
                    "category": cat,
                    "question_id": qid,
                    "question_label": r.get("question", "")[:200],
                    "control_score": r.get("control_score", 0),
                    "test_score": r.get("test_score", 0),
                    "faithfulness": r.get("faithfulness"),
                    "skill_id": r.get("skill_id", ""),
                    "skill_found": bool(r.get("skill_id")),
                }
                if include_verdict:
                    row["verdict"] = r.get("verdict_test", "")
                rows.append(row)
            return rows

        def _insert_batch(batch: list[dict]) -> int:
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
            return resp.status_code, resp.text

        # Try with verdict first; fall back to without if column missing
        rows = make_rows(include_verdict=True)
        batch_size = 50
        inserted = 0
        verdict_supported = True

        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            status, text = _insert_batch(batch)
            if status in (200, 201):
                inserted += len(batch)
            elif "verdict" in text and "PGRST204" in text:
                # verdict column doesn't exist yet — retry without it
                if verdict_supported:
                    print("  ⚠️  verdict column missing — retrying without it")
                    print("  💡 Run in Supabase SQL editor: ALTER TABLE eval_results ADD COLUMN IF NOT EXISTS verdict text;")
                    verdict_supported = False
                    rows = make_rows(include_verdict=False)
                batch2 = rows[i:i + batch_size]
                status2, text2 = _insert_batch(batch2)
                if status2 in (200, 201):
                    inserted += len(batch2)
                else:
                    print(f"  ❌ DB insert batch {i // batch_size} failed: {status2} {text2[:100]}")
            else:
                print(f"  ⚠️  DB insert batch {i // batch_size} failed: {status} {text[:100]}")

        print(f"\n📊 Saved {inserted}/{len(rows)} eval results to DB" +
              ("" if verdict_supported else " (verdict column not yet added)"))
    except Exception as e:
        print(f"\n⚠️  _save_results_to_db error: {e}")


def _auto_flag_skills(output: dict):
    """Flag skills with negative score delta in Supabase (health_score=-2)."""
    try:
        results = output.get("results", [])
        skill_deltas: dict[str, list[int]] = defaultdict(list)
        for r in results:
            sid = r.get("skill_id", "")
            if sid:
                skill_deltas[sid].append(r.get("test_score", 0) - r.get("control_score", 0))

        flagged = [sid for sid, deltas in skill_deltas.items() if sum(deltas) < 0]

        if not flagged:
            print("\n✅ No skills to auto-flag (all Δ >= 0)")
            return

        print(f"\n🚩 Auto-flagging {len(flagged)} skills: {flagged}")
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
            print(f"  {status} {sid} → health_score=-2")

        flag_msg = (
            f"🚩 Eval 自动标记 {len(flagged)} 个降分 skill（health_score=-2）:\n"
            + "\n".join(f"  • {s}" for s in flagged)
            + "\n\n7天内无人处理将自动下架（health_score=-1）。"
        )
        subprocess.run(
            ["/home/bre/.npm-global/bin/openclaw", "message", "send",
             "--channel", "telegram", "--target", "-1003776690352", "--message", flag_msg],
            capture_output=True, text=True, timeout=15,
        )
    except Exception as e:
        print(f"\n⚠️  auto_flag_skills error: {e}")


def _send_eval_summary(output: dict, out_path: str):
    """Send eval summary to group via openclaw."""
    ts = output.get("timestamp", "")[:16].replace("T", " ")
    mode = output.get("mode", "full")
    n = output.get("total_questions", 0)
    avg_c = output.get("avg_control", 0)
    avg_t = output.get("avg_test", 0)
    delta = output.get("delta", 0)

    # Per-skill verdict summary
    skill_lines = []
    for sid, s in sorted(output.get("skill_stats", {}).items(), key=lambda x: -x[1]["pass_uplift"]):
        emoji = "✅" if s["pass_uplift"] > 0 else ("🟡" if s["pass_uplift"] == 0 else "❌")
        skill_lines.append(
            f"{emoji} {sid}: ctrl={s['ctrl_pass_rate']:.0%} test={s['test_pass_rate']:.0%} "
            f"pass_uplift={s['pass_uplift']:+.0%} δ={s['uplift']:+.2f}"
        )

    cat_lines = []
    for cat, v in output.get("by_category", {}).items():
        d = v["test"] - v["control"]
        cat_lines.append(f"  {cat[:25]}: ctrl={v['control']} test={v['test']} {d:+.2f}")

    summary = (
        f"[eval v7] {ts} | {mode} | {n} 题\n\n"
        + "Skill 维度:\n" + "\n".join(skill_lines)
        + "\n\n分类:\n" + "\n".join(cat_lines)
        + f"\n\n总体: ctrl={avg_c:.2f} test={avg_t:.2f} 提升={delta:+.2f}\n"
        + f"结果: {out_path}"
    )

    try:
        result = subprocess.run(
            [
                "/home/bre/.npm-global/bin/openclaw", "message", "send",
                "--channel", "telegram",
                "--target", "-1003776690352",
                "--message", f"🦞 {summary}",
            ],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0:
            print("\n✅ Summary sent to group")
        else:
            print(f"\n⚠️  send failed: {result.stderr.strip()[:200]}")
    except Exception as e:
        print(f"\n⚠️  send error: {e}")


if __name__ == "__main__":
    main()
