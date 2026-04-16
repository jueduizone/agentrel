"""
trim_facts.py — 用 LLM 把每道题的 expected_facts 精简到 2-3 条核心 fact
保留原始文件备份到 questions_original.json
"""
import json, os, time, requests, copy

SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGV1dHZ6bXJmaGx6cHNieWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk1MTI0MSwiZXhwIjoyMDg4NTI3MjQxfQ.DtvWVp2SrwNrfR503XjPUiW_H_T4GRrHqCTnjMZb9hI"
API_URL  = "https://api.commonstack.ai/v1/chat/completions"
API_KEY  = "ak-9e4757e086036058f5e95f13d89d188d41559e8a39488a232b8d66f8dcb69679"
MODEL    = "openai/gpt-4o-mini"

CHECKPOINT = "/home/bre/agentrel/eval/trim_checkpoint.json"

def load_checkpoint():
    if os.path.exists(CHECKPOINT):
        with open(CHECKPOINT) as f:
            return json.load(f)
    return {}

def save_checkpoint(data):
    with open(CHECKPOINT, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def trim_facts(question: str, facts: list[str]) -> list[str]:
    """让 LLM 从多条 facts 中挑出 2-3 条最核心的"""
    if len(facts) <= 3:
        return facts  # 已经够精简，直接返回

    facts_text = "\n".join(f"{i+1}. {f}" for i, f in enumerate(facts))
    prompt = f"""You are helping optimize an LLM evaluation benchmark.

Question: {question}

Current expected_facts ({len(facts)} items):
{facts_text}

Task: Select the 2-3 MOST ESSENTIAL facts that:
1. Are specific and verifiable (exact values, names, behaviors)
2. Would clearly distinguish a correct answer from an incorrect one
3. Are not redundant with each other

Return ONLY a JSON array of the selected fact strings (exact text from above, no modifications).
Example: ["fact text 1", "fact text 2"]"""

    for attempt in range(3):
        try:
            r = requests.post(
                API_URL,
                headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
                json={"model": MODEL, "messages": [{"role": "user", "content": prompt}],
                      "max_tokens": 500, "temperature": 0},
                timeout=30
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"].strip()
            # 提取 JSON array
            start = content.find("[")
            end = content.rfind("]") + 1
            if start >= 0 and end > start:
                selected = json.loads(content[start:end])
                # 验证：必须是原 facts 的子集，且 2-3 条
                selected = [f for f in selected if f in facts]
                if 1 <= len(selected) <= 3:
                    return selected
        except Exception as e:
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    # fallback: 取前 2 条
    return facts[:2]

def main():
    with open("/home/bre/agentrel/eval/questions.json") as f:
        questions = json.load(f)

    # 备份原始文件
    backup_path = "/home/bre/agentrel/eval/questions_original.json"
    if not os.path.exists(backup_path):
        with open(backup_path, "w") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
        print(f"已备份原始文件到 {backup_path}")

    checkpoint = load_checkpoint()
    updated = copy.deepcopy(questions)
    
    # 只处理 facts >= 4 条的题
    to_trim = [(i, q) for i, q in enumerate(questions) if len(q.get("expected_facts", [])) >= 4]
    print(f"需要精简的题目: {len(to_trim)} 道 (facts >= 4条)")
    print(f"已完成: {len(checkpoint)} 道")

    for idx, (i, q) in enumerate(to_trim):
        qid = q.get("question_id", str(i))
        if qid in checkpoint:
            updated[i]["expected_facts"] = checkpoint[qid]
            continue

        facts = q["expected_facts"]
        trimmed = trim_facts(q["question"], facts)
        updated[i]["expected_facts"] = trimmed
        checkpoint[qid] = trimmed

        if (idx + 1) % 10 == 0:
            save_checkpoint(checkpoint)
            print(f"  [{idx+1}/{len(to_trim)}] {qid}: {len(facts)}条 → {len(trimmed)}条")
        
        time.sleep(0.3)

    save_checkpoint(checkpoint)

    # 写回 questions.json
    with open("/home/bre/agentrel/eval/questions.json", "w") as f:
        json.dump(updated, f, ensure_ascii=False, indent=2)

    # 统计
    from collections import Counter
    new_counts = Counter(len(q.get("expected_facts", [])) for q in updated)
    print(f"\n完成！新 facts 数量分布: {dict(sorted(new_counts.items()))}")
    avg = sum(len(q.get("expected_facts",[])) for q in updated) / len(updated)
    print(f"平均 facts 数: {avg:.2f} 条/题 (原来约 5.7)")

if __name__ == "__main__":
    main()
