#!/usr/bin/env python3
"""
AgentRel Eval v5 — 支持 --skill-ids 增量参数
Answerer + Judge: local claude CLI（本地）或 Anthropic API（CI 环境）
"""
import argparse, re, json, os, requests, subprocess
from collections import defaultdict
from datetime import datetime
from pathlib import Path

AGENTREL_BASE = "https://agentrel.vercel.app/api/skills"
CLAUDE_CLI = "/home/bre/.npm-global/bin/claude"
MD_PATH = "/home/bre/.openclaw/workspace-prd-bot/agentrel-eval-questions.md"
RESULTS_DIR = Path(__file__).parent / "results"

# ── Arg parse ────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="AgentRel Eval")
parser.add_argument("--skill-ids", type=str, default="",
                    help="Comma-separated skill IDs to filter (e.g. monad/network-config,monad/dev-guide)")
parser.add_argument("--questions-file", type=str, default=MD_PATH)
parser.add_argument("--output", type=str, default="",
                    help="Output JSON path (default: eval/results/YYYY-MM-DD-HHMM.json)")

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


# ── Answerer: claude CLI or Anthropic API ────────────────────────────────────
def ask_claude_cli(prompt):
    result = subprocess.run([CLAUDE_CLI, "--print"], input=prompt,
                            capture_output=True, text=True, timeout=90)
    return result.stdout.strip()


def ask_anthropic_api(prompt, api_key):
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    return msg.content[0].text.strip()


def get_answerer(api_key=None):
    """Return answerer function: prefer CLI, fallback to API."""
    if os.path.exists(CLAUDE_CLI):
        return ask_claude_cli
    elif api_key:
        def fn(prompt): return ask_anthropic_api(prompt, api_key)
        return fn
    else:
        raise RuntimeError("No answerer available: claude CLI not found and ANTHROPIC_API_KEY not set")


# ── Judge ────────────────────────────────────────────────────────────────────
def judge(question, answer, ground_truth, answerer_fn):
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
    txt = answerer_fn(prompt)
    nums = re.findall(r'[0-5]', (txt.split('\n')[-1] if txt else ''))
    if not nums:
        nums = re.findall(r'[0-5]', txt)
    return int(nums[-1]) if nums else 3


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    args = parser.parse_args()
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
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

    for q in questions:
        sid = q["skill_id"]
        if sid not in skill_cache:
            skill_cache[sid] = fetch_skill(sid)
        skill = skill_cache[sid]

        ans_ctrl = answerer_fn(q["question"])

        sys_prompt = (
            f"Use this Web3 documentation as your primary reference:\n\n{skill}\n\n"
            "Answer based on this documentation when relevant."
        ) if skill else ""
        test_input = f"<system>\n{sys_prompt}\n</system>\n\n{q['question']}" if sys_prompt else q["question"]
        ans_test = answerer_fn(test_input)

        sc = judge(q["question"], ans_ctrl, q["ground_truth"], answerer_fn)
        st = judge(q["question"], ans_test, q["ground_truth"], answerer_fn)

        delta = f"+{st-sc}" if st > sc else ("=" if st == sc else str(st-sc))
        cat_short = q["category"][:28]
        print(f"{q['id']:<5} {cat_short:<28} {sc:>5} {st:>5} {delta:>3}")

        results.append({
            "id": q["id"], "category": q["category"], "skill_id": sid,
            "skill_found": bool(skill), "control_score": sc, "test_score": st,
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
