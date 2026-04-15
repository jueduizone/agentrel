#!/usr/bin/env python3
"""
extract_facts_cc.py — 用本地 claude CLI (Claude Code) 把 ground_truth 拆成 expected_facts

原版 extract_facts.py 需要 ZENMUX_API_KEY，这个版本改成直接调用 `claude -p` CLI，
无需任何 API key，走本地 Claude Max 账号。

支持断点增量：已有 expected_facts 的题跳过。

用法：
    python3 extract_facts_cc.py              # 增量跑，跳过已处理的
    python3 extract_facts_cc.py --reset      # 清空所有 expected_facts，从头跑
    python3 extract_facts_cc.py --status     # 查看当前进度
    python3 extract_facts_cc.py --dry-run 3  # 只跑前 3 题验证效果
"""
import sys, os, json, re, time, subprocess
from pathlib import Path

QUESTIONS_FILE = Path(__file__).parent / "questions.json"

PROMPT_TEMPLATE = """You are preparing a factual evaluation dataset for Web3 technical QA.

Given a question and its ground truth answer, extract a list of atomic, verifiable facts that a correct answer MUST contain.

Rules:
- Each fact should be a single, specific, checkable statement
- Include concrete values: addresses, version numbers, function names, URLs, chain IDs, etc.
- 3-8 facts per question is ideal
- Write facts in English, concise and precise
- Do NOT include vague or subjective statements

Question: {question}
Ground Truth: {ground_truth}

Output ONLY a JSON array of strings, no explanation:
["fact 1", "fact 2", "fact 3"]"""


def extract_facts_via_cc(question: str, ground_truth: str) -> list[str]:
    """调用 claude -p CLI 拆解 facts"""
    prompt = PROMPT_TEMPLATE.format(
        question=question.replace('"', '\\"'),
        ground_truth=ground_truth.replace('"', '\\"'),
    )

    for attempt in range(3):
        try:
            result = subprocess.run(
                ["claude", "-p", prompt, "--max-turns", "1"],
                capture_output=True,
                text=True,
                timeout=60,
            )
            content = result.stdout.strip()
            if not content and result.stderr:
                print(f"    ⚠️  stderr: {result.stderr[:200]}")
                continue

            # 提取 JSON 数组
            match = re.search(r'\[.*?\]', content, re.DOTALL)
            if match:
                facts = json.loads(match.group())
                if isinstance(facts, list) and all(isinstance(f, str) for f in facts):
                    return [f.strip() for f in facts if f.strip()]
            else:
                print(f"    ⚠️  无法解析 JSON，原始输出: {content[:200]}")

        except subprocess.TimeoutExpired:
            print(f"    ⚠️  超时 (attempt {attempt+1})")
        except Exception as e:
            print(f"    ⚠️  异常: {e}")

        if attempt < 2:
            time.sleep(3 * (attempt + 1))

    return []


def cmd_status(questions: list):
    done = sum(1 for q in questions if q.get("expected_facts"))
    print(f"\n📊 进度: {done} / {len(questions)} 题已处理")
    print(f"   剩余: {len(questions) - done} 题")

    from collections import Counter
    cats = Counter(q["category"] for q in questions if not q.get("expected_facts"))
    if cats:
        print("\n未处理的生态分布：")
        for cat, cnt in sorted(cats.items()):
            print(f"  {cat}: {cnt} 题")


def cmd_reset(questions: list) -> list:
    for q in questions:
        q.pop("expected_facts", None)
    print("✅ 已清空所有 expected_facts")
    return questions


def main():
    with open(QUESTIONS_FILE, encoding="utf-8") as f:
        questions = json.load(f)

    if "--status" in sys.argv:
        cmd_status(questions)
        return

    if "--reset" in sys.argv:
        questions = cmd_reset(questions)
        with open(QUESTIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
        return

    # dry-run 模式：只跑前 N 题
    dry_run = None
    for i, arg in enumerate(sys.argv):
        if arg == "--dry-run" and i + 1 < len(sys.argv):
            dry_run = int(sys.argv[i + 1])

    # 增量模式：只处理没有 expected_facts 的题
    todo = [q for q in questions if not q.get("expected_facts")]
    done_count = len(questions) - len(todo)

    if dry_run:
        todo = todo[:dry_run]
        print(f"\n🧪 Dry-run 模式：只处理前 {dry_run} 题")

    print(f"\n🚀 开始批量拆解 expected_facts（via claude CLI）")
    print(f"   总题数: {len(questions)}")
    print(f"   已完成: {done_count}")
    print(f"   待处理: {len(todo)}")
    print(f"   模型:   Claude Max (本地 CC)")
    print()

    if not todo:
        print("✅ 全部已完成！")
        return

    # 验证 claude CLI 可用
    check = subprocess.run(["claude", "--version"], capture_output=True, text=True, timeout=10)
    if check.returncode != 0:
        print("❌ claude CLI 不可用，请先安装 Claude Code")
        sys.exit(1)
    print(f"   CC 版本: {check.stdout.strip()}")
    print()

    idx_map = {q["question_id"]: i for i, q in enumerate(questions)}

    for i, q in enumerate(todo):
        qid = q["question_id"]
        print(f"  [{i+1}/{len(todo)}] {qid} ({q.get('category', '')})...")

        facts = extract_facts_via_cc(q["question"], q["ground_truth"])

        if facts:
            questions[idx_map[qid]]["expected_facts"] = facts
            print(f"    ✅ {len(facts)} 条 facts: {facts[:2]}...")
        else:
            # 拆解失败，用 ground_truth 整句作为单条 fact 兜底
            questions[idx_map[qid]]["expected_facts"] = [q["ground_truth"]]
            print(f"    ⚠️  拆解失败，用 ground_truth 兜底")

        # 每题完成立刻写回文件（断点保护）
        with open(QUESTIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)

        # 短暂间隔，避免 claude CLI 调用过快
        time.sleep(0.5)

    print(f"\n🎉 全部完成！{len(questions)} 题已有 expected_facts")
    print(f"   文件已更新：{QUESTIONS_FILE}")


if __name__ == "__main__":
    main()
