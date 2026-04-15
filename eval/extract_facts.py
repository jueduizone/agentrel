#!/usr/bin/env python3
"""
extract_facts.py — 批量把 questions.json 里的 ground_truth 拆成 expected_facts

支持断点增量：已有 expected_facts 的题跳过，只处理新题。
进度实时写入，中途 kill 也不丢。

用法：
    python3 extract_facts.py              # 增量跑，跳过已处理的
    python3 extract_facts.py --reset      # 清空所有 expected_facts，从头跑
    python3 extract_facts.py --status     # 查看当前进度
"""
import sys, os, json, re, time, requests
from pathlib import Path

QUESTIONS_FILE = Path(__file__).parent / "questions.json"
ZENMUX_OAI_URL = "https://zenmux.ai/api/v1/chat/completions"
ZENMUX_KEY = os.environ.get("ZENMUX_API_KEY", "")
JUDGE_MODEL = "anthropic/claude-sonnet-4-6"


def extract_facts_for_question(question: str, ground_truth: str) -> list[str]:
    """用 Claude 把 ground_truth 拆成 expected_facts 列表"""
    prompt = f"""You are preparing a factual evaluation dataset for Web3 technical QA.

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

    for attempt in range(3):
        try:
            r = requests.post(
                ZENMUX_OAI_URL,
                headers={"Authorization": f"Bearer {ZENMUX_KEY}", "Content-Type": "application/json"},
                json={
                    "model": JUDGE_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 400,
                    "temperature": 0,
                },
                timeout=30,
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"].strip()

            # 提取 JSON 数组
            match = re.search(r'\[.*?\]', content, re.DOTALL)
            if match:
                facts = json.loads(match.group())
                if isinstance(facts, list) and all(isinstance(f, str) for f in facts):
                    return [f.strip() for f in facts if f.strip()]
        except Exception as e:
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
            else:
                print(f"    ⚠️  失败: {e}")
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
    print(f"✅ 已清空所有 expected_facts")
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

    # 增量模式：只处理没有 expected_facts 的题
    todo = [q for q in questions if not q.get("expected_facts")]
    done_count = len(questions) - len(todo)

    print(f"\n🚀 开始批量拆解 expected_facts")
    print(f"   总题数: {len(questions)}")
    print(f"   已完成: {done_count}")
    print(f"   待处理: {len(todo)}")
    print(f"   模型: {JUDGE_MODEL}\n")

    if not todo:
        print("✅ 全部已完成！")
        return

    if not ZENMUX_KEY:
        print("❌ 缺少 ZENMUX_API_KEY")
        sys.exit(1)

    # 建立 question_id → index 的映射，方便原地更新
    idx_map = {q["question_id"]: i for i, q in enumerate(questions)}

    for i, q in enumerate(todo):
        qid = q["question_id"]
        print(f"  [{i+1}/{len(todo)}] {qid} ({q.get('category', '')})...")

        facts = extract_facts_for_question(q["question"], q["ground_truth"])

        if facts:
            questions[idx_map[qid]]["expected_facts"] = facts
            print(f"    ✅ {len(facts)} 条 facts")
        else:
            # 拆解失败，用 ground_truth 整句作为单条 fact 兜底
            questions[idx_map[qid]]["expected_facts"] = [q["ground_truth"]]
            print(f"    ⚠️  拆解失败，用 ground_truth 兜底")

        # 每题完成立刻写回文件（断点保护）
        with open(QUESTIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)

        time.sleep(0.3)  # 避免限流

    print(f"\n🎉 全部完成！{len(questions)} 题已有 expected_facts")
    print(f"   文件已更新：{QUESTIONS_FILE}")


if __name__ == "__main__":
    main()
