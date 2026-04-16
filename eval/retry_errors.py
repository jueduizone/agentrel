#!/usr/bin/env python3
"""
retry_errors.py — 只重跑 raw_answers.jsonl 里失败的 (question_id, provider) 对

逻辑：
  1. 读 questions_flat_new.json 算出 expected 对：576 题 × {claude-sonnet-4-6, gpt-4o-mini} = 1152 对
  2. 扫 raw_answers.jsonl 收集 fully_good_pairs（bare 与 with_skill 都非 [ERROR]）
  3. 用 fully_good 记录重写 raw_answers.jsonl（去重 + 清掉 error 占坑）
  4. 对 missing = expected - fully_good 重跑，追加结果
  5. 并发 4，429 指数退避

复用 provider.py 的 fetch_skill / extract_relevant_section。call_model 另写一版以支持显式传 provider_model。
"""
import os, sys, json, time, fcntl, random, requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# 复用 provider.py
sys.path.insert(0, str(Path(__file__).parent))
import provider as prov

EVAL_DIR = Path(__file__).parent
RAW_PATH = EVAL_DIR / "results" / "raw_answers.jsonl"
QUESTIONS_PATH = EVAL_DIR / "questions_flat_new.json"

PROVIDERS = ["anthropic/claude-sonnet-4-6", "openai/gpt-4o-mini"]
MAX_WORKERS = 4

PROVIDER_API_URL = os.environ.get("PROVIDER_API_URL", "https://api.commonstack.ai/v1/chat/completions")
PROVIDER_API_KEY = os.environ.get("PROVIDER_API_KEY", "ak-9e4757e086036058f5e95f13d89d188d41559e8a39488a232b8d66f8dcb69679")

write_lock = Lock()
progress_lock = Lock()
_progress = {"done": 0, "ok": 0, "err": 0}


def append_record(rec: dict):
    """线程安全地追加一条到 raw_answers.jsonl（进程间用 flock）"""
    with write_lock:
        with open(RAW_PATH, "a", encoding="utf-8") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            fcntl.flock(f, fcntl.LOCK_UN)


def call_model(prompt: str, model: str, system: str = "", max_retries: int = 6) -> str:
    """带 429 指数退避的 API 调用。显式传 model，避免线程间共享 env 竞态。"""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    payload = {"model": model, "messages": messages, "max_tokens": 800, "temperature": 0.3}
    headers = {"Authorization": f"Bearer {PROVIDER_API_KEY}", "Content-Type": "application/json"}

    last_err = None
    for attempt in range(max_retries):
        try:
            r = requests.post(PROVIDER_API_URL, headers=headers, json=payload, timeout=45)
            if r.status_code == 429:
                wait = min(60, (2 ** attempt) + random.uniform(0, 1))
                time.sleep(wait)
                last_err = f"429 retry {attempt+1}"
                continue
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
        except requests.HTTPError as e:
            last_err = f"HTTP {e.response.status_code}"
            if attempt < max_retries - 1:
                time.sleep(min(30, 2 ** attempt))
            else:
                return f"[ERROR] {last_err}"
        except Exception as e:
            last_err = str(e)[:200]
            if attempt < max_retries - 1:
                time.sleep(min(30, 2 ** attempt))
            else:
                return f"[ERROR] {last_err}"
    return f"[ERROR] {last_err or 'max retries'}"


def is_good(ans: str) -> bool:
    return bool(ans) and not str(ans).startswith("[ERROR]")


def rewrite_raw_keeping_good() -> set:
    """扫 raw_answers.jsonl，只保留每对 (qid,provider) 的第一条 fully-good 记录，
    覆盖原文件。返回 fully_good_pairs 集合。"""
    if not RAW_PATH.exists():
        return set()

    kept: dict[tuple, dict] = {}  # (qid, provider) -> record
    total = 0
    with open(RAW_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            total += 1
            try:
                r = json.loads(line)
            except Exception:
                continue
            qid = r.get("question_id", "")
            prov_label = r.get("provider", "")
            if not qid or not prov_label:
                continue
            if not (is_good(r.get("bare_answer", "")) and is_good(r.get("with_skill_answer", ""))):
                continue
            key = (qid, prov_label)
            if key not in kept:
                kept[key] = r

    # 原子重写
    tmp = RAW_PATH.with_suffix(".jsonl.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        for rec in kept.values():
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    tmp.replace(RAW_PATH)

    print(f"  raw_answers.jsonl: {total} 原始条 → {len(kept)} 保留（fully-good, 去重）")
    return set(kept.keys())


def process_one(q_vars: dict, provider_model: str, total: int):
    """处理一对 (question, provider)：跑 bare + with_skill，追加记录。"""
    qid = q_vars.get("question_id", "")
    question = q_vars.get("question", "")
    skill_id = q_vars.get("skill_id", "")
    inject_strategy = q_vars.get("inject_strategy", "slice")

    try:
        skill = prov.fetch_skill(skill_id) if skill_id else ""
        if inject_strategy == "full":
            skill_context = skill[:3000] if skill else ""
        else:
            skill_context = prov.extract_relevant_section(skill, question) if skill else ""

        sys_prompt = (
            f"Use this Web3 documentation as your reference:\n\n{skill_context}\n\n"
            "Answer based on this documentation when relevant."
        ) if skill_context else ""

        ans_bare = call_model(question, provider_model)
        ans_with = call_model(question, provider_model, system=sys_prompt)

        rec = {
            "bare_answer": ans_bare,
            "with_skill_answer": ans_with,
            "skill_found": bool(skill),
            "question_id": qid,
            "category": q_vars.get("category", ""),
            "skill_id": skill_id,
            "ground_truth": q_vars.get("ground_truth", ""),
            "question_text": question,
            "provider": provider_model,
        }
        append_record(rec)
        ok = is_good(ans_bare) and is_good(ans_with)
    except Exception as e:
        rec = {
            "bare_answer": f"[ERROR] {e}",
            "with_skill_answer": f"[ERROR] {e}",
            "skill_found": False,
            "question_id": qid,
            "category": q_vars.get("category", ""),
            "skill_id": skill_id,
            "ground_truth": q_vars.get("ground_truth", ""),
            "question_text": question,
            "provider": provider_model,
        }
        append_record(rec)
        ok = False

    with progress_lock:
        _progress["done"] += 1
        if ok:
            _progress["ok"] += 1
        else:
            _progress["err"] += 1
        if _progress["done"] % 20 == 0 or _progress["done"] == total:
            print(f"  进度 {_progress['done']}/{total}  ok={_progress['ok']}  err={_progress['err']}")


def main():
    # 1) 加载 questions
    with open(QUESTIONS_PATH, encoding="utf-8") as f:
        questions = json.load(f)
    print(f"Questions: {len(questions)}")

    # 2) 重写 raw_answers 保留 fully-good
    print("\n[1/3] 重写 raw_answers.jsonl 保留已成功的记录...")
    good_pairs = rewrite_raw_keeping_good()

    # 3) 计算需要重跑的
    expected = set()
    q_by_id: dict[str, dict] = {}
    for q in questions:
        v = q["vars"]
        qid = v["question_id"]
        q_by_id[qid] = v
        for p in PROVIDERS:
            expected.add((qid, p))

    to_retry = sorted(expected - good_pairs)
    print(f"\n[2/3] 需要重跑：{len(to_retry)} / 期望 {len(expected)} 对")
    by_prov = {}
    for qid, p in to_retry:
        by_prov[p] = by_prov.get(p, 0) + 1
    for p, c in by_prov.items():
        print(f"  {p}: {c}")

    if not to_retry:
        print("\n所有对已完成，无需重跑")
        return

    # 4) 并发跑
    print(f"\n[3/3] 开始重跑（并发 {MAX_WORKERS}）...")
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = []
        for qid, p in to_retry:
            v = q_by_id.get(qid)
            if not v:
                continue
            futures.append(pool.submit(process_one, v, p, len(to_retry)))
        for fut in as_completed(futures):
            try:
                fut.result()
            except Exception as e:
                print(f"  worker exception: {e}")

    dt = time.time() - t0
    print(f"\n  耗时 {dt:.0f}s")

    # 5) 最终统计
    final_good = rewrite_raw_keeping_good()
    still_missing = sorted(expected - final_good)
    print(f"\n最终 fully-good 对数：{len(final_good)} / 期望 {len(expected)}")
    if still_missing:
        print(f"仍失败：{len(still_missing)} 对")
        sample = still_missing[:10]
        for qid, p in sample:
            print(f"  {qid} | {p}")
    else:
        print("✅ 全部成功，可以跑 bash run_eval.sh --commit")


if __name__ == "__main__":
    main()
