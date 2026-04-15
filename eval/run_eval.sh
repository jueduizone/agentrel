#!/bin/bash
# AgentRel Eval — 一键跑 promptfoo 双模型 A/B + 写入本地 checkpoint
# 用法：
#   bash run_eval.sh                  # 跑完追加到 checkpoint（可多次执行）
#   bash run_eval.sh --commit         # 全部跑完后入库
#   bash run_eval.sh --status         # 查看 checkpoint 当前进度

set -e
cd /home/bre/agentrel/eval

# ── 特殊命令 ──────────────────────────────────────────────────
if [ "$1" == "--commit" ]; then
    echo "🚀 提交 checkpoint 到 DB..."
    JUDGE_API_URL="https://api.commonstack.ai/v1/chat/completions" \
    JUDGE_API_KEY="ak-9e4757e086036058f5e95f13d89d188d41559e8a39488a232b8d66f8dcb69679" \
    JUDGE_MODEL="google/gemini-2.5-flash" \
    python3 push_results.py --commit
    exit 0
fi

if [ "$1" == "--status" ]; then
    python3 push_results.py --status
    exit 0
fi

# ── 正常跑 eval ───────────────────────────────────────────────
CONCURRENCY=${2:-8}
TIMESTAMP=$(date +%Y-%m-%d-%H%M)
OUTPUT_FILE="results/promptfoo-${TIMESTAMP}.json"

mkdir -p results

echo "🚀 AgentRel Eval 开始"
echo "   并发数: $CONCURRENCY"
echo "   输出: $OUTPUT_FILE"
echo ""

# 跑 promptfoo
PROVIDER_API_URL="https://api.commonstack.ai/v1/chat/completions" \
PROVIDER_API_KEY="ak-9e4757e086036058f5e95f13d89d188d41559e8a39488a232b8d66f8dcb69679" \
promptfoo eval \
  --config promptfoo.yaml \
  --max-concurrency $CONCURRENCY \
  --output $OUTPUT_FILE \
  2>&1

echo ""
echo "✅ Promptfoo 跑完，开始评分并写入 checkpoint..."

# 评分 + 追加到本地 checkpoint（不入库）
JUDGE_API_URL="https://api.commonstack.ai/v1/chat/completions" \
JUDGE_API_KEY="ak-9e4757e086036058f5e95f13d89d188d41559e8a39488a232b8d66f8dcb69679" \
JUDGE_MODEL="google/gemini-2.5-flash" \
python3 push_results.py $OUTPUT_FILE

echo ""
echo "📋 当前进度："
python3 push_results.py --status

echo ""
echo "💡 全部跑完后执行入库："
echo "   bash run_eval.sh --commit"
