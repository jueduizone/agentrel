"""
AgentRel Promptfoo Custom Provider
promptfoo Python provider 格式：必须导出 call_api(prompt, options, context) 函数

每道题跑两次：bare（无 skill）+ with_skill（有 skill）
结果放在 metadata 里，供 push_results.py 写入 DB
"""
import os, re, json, requests, time, fcntl
from pathlib import Path

AGENTREL_BASE = "https://agentrel.vercel.app/api/skills"
ZENMUX_OAI_URL = "https://zenmux.ai/api/v1/chat/completions"
ZENMUX_KEY = os.environ.get("ZENMUX_API_KEY", "")
MODEL = os.environ.get("PROVIDER_MODEL", "openai/gpt-4o-mini")

_skill_cache: dict[str, str] = {}

# 实时 checkpoint — provider 每完成一题就追加写入，进程 kill 了也不丢
RAW_CHECKPOINT = Path(__file__).parent / "results" / "raw_answers.jsonl"


def append_raw(record: dict):
    """原子追加一条答题记录到 raw_answers.jsonl（多进程安全）"""
    RAW_CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
    with open(RAW_CHECKPOINT, "a", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
        fcntl.flock(f, fcntl.LOCK_UN)


def load_raw_done() -> set:
    """返回已完成的 question_id|provider 集合"""
    if not RAW_CHECKPOINT.exists():
        return set()
    done = set()
    with open(RAW_CHECKPOINT, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
                done.add(f"{r['question_id']}|{r['provider']}")
            except Exception:
                pass
    return done


def fetch_skill(skill_id: str) -> str:
    if skill_id in _skill_cache:
        return _skill_cache[skill_id]
    try:
        r = requests.get(f"{AGENTREL_BASE}/{skill_id}.md", timeout=15)
        text = r.text[:4000] if r.status_code == 200 else ""
    except Exception:
        text = ""
    _skill_cache[skill_id] = text
    return text


def extract_relevant_section(skill_content: str, question: str, max_chars: int = 2000) -> str:
    if not skill_content:
        return ""
    raw_sections = re.split(r'\n(?=## )', skill_content)
    if len(raw_sections) <= 1:
        return skill_content[:max_chars]
    q_words = set(re.findall(r'\b\w{3,}\b', question.lower()))

    def score_section(s):
        return len(q_words & set(re.findall(r'\b\w{3,}\b', s.lower())))

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


def call_model(prompt: str, system: str = "") -> str:
    model = os.environ.get("PROVIDER_MODEL", MODEL)
    for attempt in range(3):
        try:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            r = requests.post(
                ZENMUX_OAI_URL,
                headers={"Authorization": f"Bearer {ZENMUX_KEY}", "Content-Type": "application/json"},
                json={"model": model, "messages": messages, "max_tokens": 800, "temperature": 0.3},
                timeout=30,
            )
            r.raise_for_status()
            time.sleep(0.3)
            return r.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
            else:
                return f"[ERROR] {e}"
    return "[ERROR] max retries"


def call_api(prompt: str, options: dict, context: dict) -> dict:
    """
    promptfoo Python provider 入口函数
    prompt: 渲染后的 prompt 字符串（即 question）
    context.vars: test vars（question, skill_id, ground_truth 等）
    """
    vars_ = context.get("vars", {})
    question = vars_.get("question", prompt)
    skill_id = vars_.get("skill_id", "")
    inject_strategy = vars_.get("inject_strategy", "slice")
    question_id = vars_.get("question_id", "")

    # 从环境变量拿 provider 标识，供 checkpoint 去重用
    provider_label = os.environ.get("PROVIDER_MODEL", MODEL)

    # ── 断点续跑：已跑过直接跳过 ──────────────────────────────
    done = load_raw_done()
    skip_key = f"{question_id}|{provider_label}"
    if question_id and skip_key in done:
        # 从文件里捞已有结果返回，不重复调用模型
        with open(RAW_CHECKPOINT, encoding="utf-8") as f:
            for line in f:
                try:
                    r = json.loads(line.strip())
                    if r.get("question_id") == question_id and r.get("provider") == provider_label:
                        return {
                            "output": r["with_skill_answer"],
                            "metadata": {k: v for k, v in r.items() if k != "provider"},
                        }
                except Exception:
                    pass

    # 拉 skill
    skill = fetch_skill(skill_id)
    if inject_strategy == "full":
        skill_context = skill[:3000] if skill else ""
    else:
        skill_context = extract_relevant_section(skill, question) if skill else ""

    sys_prompt = (
        f"Use this Web3 documentation as your reference:\n\n{skill_context}\n\n"
        "Answer based on this documentation when relevant."
    ) if skill_context else ""

    # 裸跑
    ans_bare = call_model(question)
    # 有 skill
    ans_with_skill = call_model(question, system=sys_prompt)

    metadata = {
        "bare_answer": ans_bare,
        "with_skill_answer": ans_with_skill,
        "skill_found": bool(skill),
        "question_id": question_id,
        "category": vars_.get("category", ""),
        "skill_id": skill_id,
        "ground_truth": vars_.get("ground_truth", ""),
        "question_text": question,
    }

    # ── 立刻写入实时 checkpoint ───────────────────────────────
    if question_id:
        append_raw({**metadata, "provider": provider_label})

    return {
        "output": ans_with_skill,  # promptfoo 主输出
        "metadata": metadata,
    }
