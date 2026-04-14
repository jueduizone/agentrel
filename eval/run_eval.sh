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
    ZENMUX_API_KEY=*** \
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
ZENMUX_API_KEY=*** \
promptfoo eval \
  --config promptfoo.yaml \
  --concurrency $CONCURRENCY \
  --output $OUTPUT_FILE \
  2>&1

echo ""
echo "✅ Promptfoo 跑完，开始评分并写入 checkpoint..."

# 评分 + 追加到本地 checkpoint（不入库）
ZENMUX_API_KEY=*** \
python3 push_results.py $OUTPUT_FILE

echo ""
echo "📋 当前进度："
python3 push_results.py --status

echo ""
echo "💡 全部跑完后执行入库："
echo "   bash run_eval.sh --commit"
