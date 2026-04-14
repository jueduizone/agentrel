#!/usr/bin/env python3
"""
push_results.py — 把 promptfoo eval 结果写入 AgentRel eval_results 表

用法：
    # 追加新结果到本地 checkpoint（不入库）
    python push_results.py results_pf.json

    # 全部跑完后统一入库
    python push_results.py --commit

    # 查看 checkpoint 当前状态
    python push_results.py --status

eval_results 表字段：
    run_at, judge_model, inject_strategy, category,
    question_id, question_label, control_score, test_score,
    faithfulness, skill_id, skill_found, verdict
"""
import sys, os, re, json, requests
from datetime import datetime, timezone
from pathlib import Path

SUPABASE_URL = "https://zkpeutvzmrfhlzpsbyhr.supabase.co"
SUPABASE_KEY = os.environ.get(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGV1dHZ6bXJmaGx6cHNieWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk1MTI0MSwiZXhwIjoyMDg4NTI3MjQxfQ.DtvWVp2SrwNrfR503XjPUiW_H_T4GRrHqCTnjMZb9hI"
)
ZENMUX_OAI_URL = "https://zenmux.ai/api/v1/chat/completions"
ZENMUX_KEY = os.environ.get("ZENMUX_API_KEY", "")

# 本地 checkpoint 文件路径
CHECKPOINT_DIR = Path(__file__).parent / "results"
CHECKPOINT_FILE = CHECKPOINT_DIR / "checkpoint.json"
RAW_ANSWERS_FILE = CHECKPOINT_DIR / "raw_answers.jsonl"  # provider 实时写入的原始答题记录


# ── Checkpoint 读写 ──────────────────────────────────────────

def load_checkpoint() -> dict:
    """读取本地 checkpoint，格式：{ run_at, rows: [...] }"""
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"run_at": None, "rows": []}


def save_checkpoint(data: dict):
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_done_keys(checkpoint: dict) -> set:
    """返回已完成的 question_id|provider 集合"""
    return {f"{r['question_id']}|{r.get('provider', '')}" for r in checkpoint.get("rows", [])}


# ── 评分 ─────────────────────────────────────────────────────

def score_to_verdict(score: int) -> str:
    if score >= 4:
        return "pass"
    elif score >= 2:
        return "partial"
    return "fail"


def judge_answer(question: str, answer: str, ground_truth: str) -> int:
    """用 gpt-4o-mini 评分 0-5"""
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
    try:
        r = requests.post(
            ZENMUX_OAI_URL,
            headers={"Authorization": f"Bearer {ZENMUX_KEY}", "Content-Type": "application/json"},
            json={"model": "openai/gpt-4o-mini", "messages": [{"role": "user", "content": prompt}],
                  "max_tokens": 20, "temperature": 0},
            timeout=30,
        )
        r.raise_for_status()
        txt = r.json()["choices"][0]["message"]["content"].strip()
        nums = re.findall(r'[0-5]', (txt.split('\n')[-1] if txt else ''))
        if not nums:
            nums = re.findall(r'[0-5]', txt)
        return int(nums[-1]) if nums else 3
    except Exception:
        return 3


# ── DB 写入 ──────────────────────────────────────────────────

def push_to_db(rows: list[dict]):
    """批量写入 eval_results"""
    batch_size = 50
    inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        # 去掉 provider 字段（不是 DB 列，只是 checkpoint 内部用）
        clean_batch = [{k: v for k, v in row.items() if k != "provider"} for row in batch]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/eval_results",
            json=clean_batch,
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
            print(f"  ✅ batch {i//batch_size + 1}: {len(batch)} rows inserted")
        else:
            print(f"  ❌ batch {i//batch_size + 1} failed: {resp.status_code} {resp.text[:200]}")
    return inserted


# ── 解析 promptfoo 输出 ───────────────────────────────────────

def parse_pf_output(pf_path: str) -> dict:
    """解析 promptfoo output.json，返回 { key: item_dict }"""
    with open(pf_path, encoding="utf-8") as f:
        pf = json.load(f)

    raw_results = pf.get("results", {}).get("results", pf.get("results", []))
    if not raw_results:
        print("❌ 没找到 results，检查 promptfoo 输出格式")
        sys.exit(1)

    by_qid_provider: dict[str, dict] = {}
    for r in raw_results:
        meta = r.get("response", {}).get("metadata", {})
        if not meta:
            try:
                parsed = json.loads(r.get("response", {}).get("output", "{}"))
                meta = parsed.get("metadata", {})
            except Exception:
                pass

        qid = meta.get("question_id") or r.get("vars", {}).get("question_id", "")
        provider_label = r.get("provider", {}).get("label", "") or r.get("providerId", "")
        if not qid:
            continue

        key = f"{qid}|{provider_label}"
        by_qid_provider[key] = {
            "question_id": qid,
            "provider": provider_label,
            "category": meta.get("category", r.get("vars", {}).get("category", "")),
            "skill_id": meta.get("skill_id", r.get("vars", {}).get("skill_id", "")),
            "skill_found": meta.get("skill_found", False),
            "question_label": r.get("vars", {}).get("question", "")[:200],
            "ground_truth": meta.get("ground_truth", r.get("vars", {}).get("ground_truth", "")),
            "bare_answer": meta.get("bare_answer", ""),
            "with_skill_answer": meta.get("with_skill_answer", r.get("response", {}).get("output", "")),
        }
    return by_qid_provider


# ── 主逻辑 ────────────────────────────────────────────────────

def cmd_append(pf_path: str, label: str = None):
    """解析 promptfoo 结果，评分，追加到本地 checkpoint（不入库）"""
    checkpoint = load_checkpoint()
    done_keys = get_done_keys(checkpoint)

    # 初始化 run_at（第一次跑时固定下来）
    if not checkpoint["run_at"]:
        checkpoint["run_at"] = datetime.now(timezone.utc).isoformat()

    by_qid_provider = parse_pf_output(pf_path)
    new_items = {k: v for k, v in by_qid_provider.items() if k not in done_keys}

    print(f"\n📊 promptfoo 结果: {len(by_qid_provider)} 条")
    print(f"   已在 checkpoint: {len(done_keys)} 条")
    print(f"   本次新增评分:    {len(new_items)} 条")

    if not new_items:
        print("✅ 没有新增条目，checkpoint 已是最新")
        return

    new_rows = []
    for idx, (key, item) in enumerate(new_items.items()):
        print(f"  [{idx+1}/{len(new_items)}] 评分 {item['question_id']} ({item['provider']})...")

        q = item["question_label"]
        gt = item["ground_truth"]
        bare = item["bare_answer"]
        with_skill = item["with_skill_answer"]

        ctrl_score = judge_answer(q, bare, gt) if bare else 0
        test_score = judge_answer(q, with_skill, gt) if with_skill else 0
        verdict = score_to_verdict(test_score)

        qid = item["question_id"]
        cat_from_qid = qid.split("-Q")[0] if "-Q" in qid else "General"

        new_rows.append({
            "run_at": checkpoint["run_at"],
            "judge_model": "gpt-4o-mini",
            "inject_strategy": label or "promptfoo",
            "category": item["category"] or cat_from_qid,
            "question_id": qid,
            "question_label": item["question_label"],
            "control_score": ctrl_score,
            "test_score": test_score,
            "skill_id": item["skill_id"],
            "skill_found": item["skill_found"],
            "verdict": verdict,
            # 内部字段，入库前会去掉
            "provider": item["provider"],
        })

    checkpoint["rows"].extend(new_rows)
    save_checkpoint(checkpoint)
    print(f"\n💾 checkpoint 已更新：共 {len(checkpoint['rows'])} 条 (新增 {len(new_rows)} 条)")
    print(f"   文件: {CHECKPOINT_FILE}")
    print(f"\n当全部跑完后，执行：python push_results.py --commit")


def cmd_status():
    """查看 checkpoint 当前状态"""
    checkpoint = load_checkpoint()
    rows = checkpoint.get("rows", [])
    if not rows:
        print("📭 checkpoint 为空，还没有跑过任何结果")
        return

    from collections import Counter
    providers = Counter(r.get("provider", "unknown") for r in rows)
    verdicts = Counter(r.get("verdict", "?") for r in rows)

    print(f"\n📋 Checkpoint 状态")
    print(f"   run_at: {checkpoint.get('run_at', 'N/A')}")
    print(f"   总条数: {len(rows)}")
    print(f"   文件:   {CHECKPOINT_FILE}")
    print(f"\n按 provider:")
    for p, cnt in sorted(providers.items()):
        print(f"   {p}: {cnt} 条")
    print(f"\n按 verdict:")
    for v, cnt in sorted(verdicts.items()):
        print(f"   {v}: {cnt} 条")


def cmd_commit():
    """把 checkpoint 全量写入 DB"""
    checkpoint = load_checkpoint()
    rows = checkpoint.get("rows", [])
    if not rows:
        print("❌ checkpoint 为空，没有数据可入库")
        sys.exit(1)

    print(f"\n🚀 准备入库 {len(rows)} 条 (run_at: {checkpoint.get('run_at')})")
    inserted = push_to_db(rows)
    print(f"\n🎉 完成！写入 {inserted}/{len(rows)} 条到 eval_results")
    print(f"benchmark 页面应该可以看到最新数据了：https://agentrel.vercel.app/benchmark")

    if inserted == len(rows):
        # 入库成功，备份并清空 checkpoint
        backup = CHECKPOINT_DIR / f"checkpoint_committed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        CHECKPOINT_FILE.rename(backup)
        print(f"\n💾 checkpoint 已备份至 {backup}，原文件已清除")


def cmd_recover():
    """从 raw_answers.jsonl 重建 checkpoint（进程被 kill 后恢复用）"""
    if not RAW_ANSWERS_FILE.exists():
        print("❌ raw_answers.jsonl 不存在，没有可恢复的数据")
        sys.exit(1)

    checkpoint = load_checkpoint()
    done_keys = get_done_keys(checkpoint)

    new_rows = []
    skipped = 0
    errors = 0

    with open(RAW_ANSWERS_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except Exception:
                errors += 1
                continue

            qid = item.get("question_id", "")
            provider = item.get("provider", "")
            key = f"{qid}|{provider}"

            if key in done_keys:
                skipped += 1
                continue

            # 补充评分（raw 里存的是原始答题，还没评分）
            q = item.get("question_text", "")
            gt = item.get("ground_truth", "")
            bare = item.get("bare_answer", "")
            with_skill = item.get("with_skill_answer", "")

            print(f"  评分 {qid} ({provider})...")
            ctrl_score = judge_answer(q, bare, gt) if bare else 0
            test_score = judge_answer(q, with_skill, gt) if with_skill else 0
            verdict = score_to_verdict(test_score)

            cat_from_qid = qid.split("-Q")[0] if "-Q" in qid else "General"

            new_rows.append({
                "run_at": checkpoint["run_at"] or datetime.now(timezone.utc).isoformat(),
                "judge_model": "gpt-4o-mini",
                "inject_strategy": "promptfoo",
                "category": item.get("category") or cat_from_qid,
                "question_id": qid,
                "question_label": item.get("question_text", "")[:200],
                "control_score": ctrl_score,
                "test_score": test_score,
                "skill_id": item.get("skill_id", ""),
                "skill_found": item.get("skill_found", False),
                "verdict": verdict,
                "provider": provider,
            })
            done_keys.add(key)

    if not new_rows:
        print(f"✅ 没有新记录需要恢复（已跳过 {skipped} 条，解析错误 {errors} 条）")
        return

    if not checkpoint["run_at"]:
        checkpoint["run_at"] = datetime.now(timezone.utc).isoformat()

    checkpoint["rows"].extend(new_rows)
    save_checkpoint(checkpoint)
    print(f"\n💾 恢复完成：新增 {len(new_rows)} 条，跳过 {skipped} 条，错误 {errors} 条")
    print(f"   checkpoint 总计：{len(checkpoint['rows'])} 条")
    print(f"   执行 bash run_eval.sh --commit 入库")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python push_results.py <promptfoo_output.json>  # 评分并追加到 checkpoint")
        print("  python push_results.py --recover                 # 从 raw_answers.jsonl 恢复")
        print("  python push_results.py --commit                  # 全量写入 DB")
        print("  python push_results.py --status                  # 查看 checkpoint 状态")
        sys.exit(1)

    arg = sys.argv[1]

    if arg == "--commit":
        cmd_commit()
    elif arg == "--status":
        cmd_status()
    elif arg == "--recover":
        cmd_recover()
    else:
        label = sys.argv[3] if len(sys.argv) > 3 and sys.argv[2] == "--label" else None
        cmd_append(arg, label)


if __name__ == "__main__":
    main()
