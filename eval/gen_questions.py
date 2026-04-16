#!/usr/bin/env python3
"""
批量生成补题脚本 - 基于官方文档生成 eval 题目
用法: python3 gen_questions.py
输出: new_questions.json（追加到 questions.json 前先人工审核）
"""

import json, os, re, sys, time
import requests
from pathlib import Path

# ── P2 defensive validation ──────────────────────────────────
# Rejects polluted Q text (generator bleed-through), empty GT,
# and Q≈GT overlap. Used at draft + merged-file stage.

POLLUTION_PATTERNS = [
    "标准答案",                    # generator template marker
    "**标准答案**", "**标准答案：**",
    "### Q", "### STARKNET-Q", "### ETH-Q",
    "### MANTLE-Q", "### MONAD-Q", "### SUI-Q",
    "**Skill：**", "**问题：**",
]


def _normalize(s: str) -> str:
    return re.sub(r"\s+", "", s or "").lower()


def validate_questions(questions: list, *, require_gt: bool) -> list:
    """Return list of (qid, reason) for failing questions. Empty list = all pass."""
    failures = []
    for q in questions:
        qid = q.get("question_id") or q.get("id") or "?"
        qtext = q.get("question", "")
        gt = q.get("ground_truth", "")

        for pat in POLLUTION_PATTERNS:
            if pat in qtext:
                failures.append((qid, f"question contains pollution marker: {pat!r}"))
                break

        if require_gt:
            if not gt.strip():
                failures.append((qid, "ground_truth is empty"))
                continue
            qn, gn = _normalize(qtext), _normalize(gt)
            if qn and gn:
                if qn == gn:
                    failures.append((qid, "question == ground_truth (verbatim)"))
                else:
                    # high overlap: shorter is >=80% contained in longer
                    short, long = (qn, gn) if len(qn) <= len(gn) else (gn, qn)
                    if len(short) >= 30 and short in long and len(short) / len(long) >= 0.8:
                        failures.append((qid, f"Q≈GT overlap >=80% ({len(short)}/{len(long)} chars)"))
    return failures


def report_validation(failures: list, *, label: str) -> bool:
    """Print failures. Return True if all clean."""
    if not failures:
        print(f"[validate:{label}] OK — no issues")
        return True
    print(f"[validate:{label}] FAILED — {len(failures)} issue(s):")
    for qid, reason in failures:
        print(f"  - {qid}: {reason}")
    return False


def _cli_validate(path: str) -> int:
    p = Path(path)
    data = json.loads(p.read_text())
    # promptfoo-flat shape: each entry is {"vars": {...}}
    if data and isinstance(data[0], dict) and "vars" in data[0]:
        data = [d["vars"] for d in data]
    require_gt = any(("ground_truth" in q) for q in data)
    fails = validate_questions(data, require_gt=require_gt)
    ok = report_validation(fails, label=p.name)
    return 0 if ok else 1


API_KEY = "ak-9e4757e086036058f5e95f13d89d188d41559e8a39488a232b8d66f8dcb69679"
BASE_URL = "https://api.commonstack.ai/v1"

def call_llm(prompt: str, model="openai/gpt-4o-mini") -> str:
    resp = requests.post(
        f"{BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        json={"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.3},
        timeout=60
    )
    return resp.json()["choices"][0]["message"]["content"]

def fetch_url(url: str) -> str:
    """抓取官方文档内容"""
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        return resp.text[:8000]  # 取前8000字符够用
    except Exception as e:
        return f"[fetch error: {e}]"

# ──────────────────────────────────────────────
# 每个 skill 的官方文档 URL + 出题配置
# ──────────────────────────────────────────────
SKILL_CONFIGS = [
    # ── SUI ──
    {
        "skill_id": "sui/docs-move-objects",
        "category": "SUI",
        "urls": [
            "https://docs.sui.io/concepts/dynamic-fields",
            "https://docs.sui.io/concepts/object-ownership",
        ],
        "focus": "Sui Dynamic Fields API (dynamic_field module), field names requirements (copy/drop/store), add/borrow/borrow_mut/remove functions, difference from regular struct fields, dynamic object fields vs dynamic fields",
        "target_count": 6,
    },
    {
        "skill_id": "sui/docs-move-programmability",
        "category": "SUI",
        "urls": [
            "https://docs.sui.io/guides/developer/advanced/package-upgrades",
        ],
        "focus": "Sui Move package upgrade policy (Additive/Compatible/Immutable), UpgradeCap object, upgrade restrictions (cannot remove/change existing public functions), upgrade commands with sui client",
        "target_count": 6,
    },
    # ── STARKNET ──
    {
        "skill_id": "starknet/starknet-js",
        "category": "STARKNET",
        "urls": [
            "https://www.starknetjs.com/docs/guides/connect_network",
            "https://www.starknetjs.com/docs/guides/interact",
        ],
        "focus": "starknet.js v6 RpcProvider initialization, Account class usage, invoke/call difference, felt252 encoding, u256 representation as {low, high}, event listening",
        "target_count": 8,
    },
    {
        "skill_id": "starknet/cairo-contract-authoring",
        "category": "STARKNET",
        "urls": [
            "https://docs.starknet.io/architecture-and-concepts/smart-contracts/contract-storage/",
            "https://book.cairo-lang.org/ch14-02-contract-storage.html",
        ],
        "focus": "Cairo storage variables declaration (#[storage]), felt252 type basics, contract interface (#[starknet::interface]), #[external(v0)] vs #[abi(embed_v0)], constructor, emit events",
        "target_count": 8,
    },
    # ── SOLANA ──
    {
        "skill_id": "solana/anchor-idl",
        "category": "SOL",
        "urls": [
            "https://www.anchor-lang.com/docs/idl",
            "https://www.anchor-lang.com/docs/cross-program-invocations",
        ],
        "focus": "Anchor IDL JSON structure, how to generate IDL (anchor build), IDL usage in client (AnchorProvider, Program class), CPI with CpiContext::new, signer seeds for PDA CPI",
        "target_count": 8,
    },
    {
        "skill_id": "solana/metaplex-nft",
        "category": "SOL",
        "urls": [
            "https://developers.metaplex.com/core",
            "https://developers.metaplex.com/core/create-asset",
        ],
        "focus": "Metaplex Core vs Token Metadata (account count difference, cost reduction ~80%), createAsset function parameters, plugins (royalties/freeze), collection creation, burning assets",
        "target_count": 8,
    },
    {
        "skill_id": "solana/ecosystem-tools",
        "category": "SOL",
        "urls": [
            "https://docs.pyth.network/price-feeds/use-real-time-data/solana",
            "https://docs.raydium.io/raydium/liquidity-providers/raydium-clmm",
        ],
        "focus": "Pyth get_price_no_older_than() usage, max_age parameter, pyth-solana-receiver-sdk, Raydium CLMM vs CPMM difference, tick spacing, concentrated liquidity ranges",
        "target_count": 6,
    },
    # ── BASE ──
    {
        "skill_id": "base/ai-agents-wallets",
        "category": "BASE",
        "urls": [
            "https://docs.base.org/builderkits/agentkit/architecture",
        ],
        "focus": "AgentKit wallet types (CdpWalletProvider vs CdpSmartWalletProvider), Smart Wallet vs EOA differences, Account Abstraction ERC-4337, passkey support, gasless transactions via paymaster",
        "target_count": 6,
    },
    {
        "skill_id": "base/ai-agents-overview",
        "category": "BASE",
        "urls": [
            "https://docs.base.org/ai-agents/overview",
        ],
        "focus": "Base AI Agent recommended frameworks (AgentKit, LangChain, LlamaIndex), AgentKit core components (WalletProvider, ActionProvider), onchain vs offchain actions, supported networks",
        "target_count": 6,
    },
    {
        "skill_id": "base/ai-agents-payments-and-transactions",
        "category": "BASE",
        "urls": [
            "https://x402.org/",
            "https://docs.base.org/builderkits/agentkit/actions/erc20-transfer",
        ],
        "focus": "x402 protocol HTTP 402 Payment Required, pay-per-request model, how AI agents attach payment headers, USDC on Base contract address, AgentKit transfer_erc20 action parameters",
        "target_count": 6,
    },
    {
        "skill_id": "base/ai-agents-identity-verification-auth",
        "category": "BASE",
        "urls": [
            "https://onchainkit.xyz/identity/identity",
            "https://docs.base.org/identity/",
        ],
        "focus": "OnchainKit Identity component props (address, schemaId), Verifiable Credentials on Base, DID standard, BaseName resolution, attestation via EAS (Ethereum Attestation Service)",
        "target_count": 6,
    },
    # ── PROTOCOLS / ETH ──
    {
        "skill_id": "protocols/aave-v3-integration",
        "category": "ETH",
        "urls": [
            "https://docs.aave.com/developers/guides/flash-loans",
        ],
        "focus": "Aave V3 flash loan fee (0.05% = 5bps), IFlashLoanSimpleReceiver interface, executeOperation callback parameters, repayment within same tx, Pool contract address on mainnet, flashLoanSimple vs flashLoan",
        "target_count": 6,
    },
    {
        "skill_id": "protocols/uniswap-v3-integration",
        "category": "ETH",
        "urls": [
            "https://docs.uniswap.org/contracts/v4/overview",
            "https://docs.uniswap.org/contracts/v4/concepts/hooks",
        ],
        "focus": "Uniswap V4 PoolManager singleton, hooks lifecycle (beforeSwap/afterSwap/beforeAddLiquidity etc), hook address bit flags, custom accounting, ERC-6909 claims tokens, flash accounting",
        "target_count": 6,
    },
    {
        "skill_id": "protocols/chainlink-integration",
        "category": "ETH",
        "urls": [
            "https://docs.chain.link/data-feeds/using-data-feeds",
        ],
        "focus": "latestRoundData() return values (roundId/answer/startedAt/updatedAt/answeredInRound), ETH/USD decimals=8, staleness check with updatedAt, AggregatorV3Interface import path, heartbeat intervals",
        "target_count": 6,
    },
    {
        "skill_id": "ethereum/defi-math",
        "category": "ETH",
        "urls": [
            "https://docs.uniswap.org/concepts/protocol/swaps",
        ],
        "focus": "Uniswap V2 x*y=k formula, output amount formula with 0.3% fee, Uniswap V3 sqrt price representation (sqrtPriceX96), tick math, concentrated liquidity capital efficiency numbers",
        "target_count": 6,
    },
    {
        "skill_id": "ethereum/mev-protection",
        "category": "ETH",
        "urls": [
            "https://docs.flashbots.net/flashbots-protect/overview",
        ],
        "focus": "Flashbots Protect RPC URL (https://rpc.flashbots.net), MEV-Share hints, sandwich attack prevention, private mempool, slippage setting recommendations (0.5-1%), MEV blocker alternatives",
        "target_count": 6,
    },
    {
        "skill_id": "ethereum/l2-comparison",
        "category": "ETH",
        "urls": [
            "https://docs.arbitrum.io/how-arbitrum-works/bold/gentle-introduction",
            "https://docs.zksync.io/zk-stack/concepts/finality",
        ],
        "focus": "Arbitrum One 7-day challenge period (BoLD protocol), zkSync Era proof-based finality (minutes not days), Arbitrum Stylus (WASM contracts), zkSync native account abstraction vs ERC-4337, EVM equivalence vs compatibility",
        "target_count": 6,
    },
    # ── SECURITY ──
    {
        "skill_id": "security/reentrancy-access-control",
        "category": "General",
        "urls": [
            "https://docs.openzeppelin.com/contracts/5.x/api/utils#ReentrancyGuard",
        ],
        "focus": "OpenZeppelin v5 ReentrancyGuard path change (security/ → utils/), nonReentrant modifier, ReentrancyGuardTransient (EIP-1153), tx.origin vs msg.sender security implications, AccessControl vs Ownable",
        "target_count": 6,
    },
    {
        "skill_id": "security/oracle-price-manipulation",
        "category": "General",
        "urls": [
            "https://docs.uniswap.org/concepts/protocol/oracle",
        ],
        "focus": "Uniswap V2 TWAP using cumulative price, 30-min minimum window recommendation, flash loan attack vector on spot price, Uniswap V3 observe() function, cardinality increase for longer TWAP",
        "target_count": 6,
    },
    # ── DEFI / STANDARDS ──
    {
        "skill_id": "defi/amm-lending-patterns",
        "category": "ETH",
        "urls": [
            "https://docs.uniswap.org/concepts/protocol/concentrated-liquidity",
            "https://resources.curve.fi/base-features/understanding-curve/",
        ],
        "focus": "Uniswap V3 tick spacing (fee tier 0.05%=10, 0.3%=60, 1%=200), position NFT, Curve A parameter amplification factor, virtual price, 3pool composition (DAI/USDC/USDT)",
        "target_count": 6,
    },
    {
        "skill_id": "standards/erc-token-standards",
        "category": "General",
        "urls": [
            "https://eips.ethereum.org/EIPS/eip-4626",
            "https://eips.ethereum.org/EIPS/eip-20",
        ],
        "focus": "ERC-4626 deposit/mint/withdraw/redeem 4 functions, convertToShares/convertToAssets, ERC-20 approve race condition, permit (EIP-2612) as alternative, ERC-777 tokensReceived hook",
        "target_count": 6,
    },
    {
        "skill_id": "standards/erc-nft-standards",
        "category": "General",
        "urls": [
            "https://eips.ethereum.org/EIPS/eip-721",
            "https://eips.ethereum.org/EIPS/eip-1155",
        ],
        "focus": "ERC-721 onERC721Received selector (0x150b7a02), ERC-1155 balanceOfBatch, safeBatchTransferFrom, uri() function with {id} substitution, ERC-2981 royalty standard",
        "target_count": 6,
    },
    {
        "skill_id": "standards/erc-signature-standards",
        "category": "General",
        "urls": [
            "https://eips.ethereum.org/EIPS/eip-712",
        ],
        "focus": "EIP-712 domainSeparator fields (name/version/chainId/verifyingContract/salt), typeHash calculation, structHash, final digest = keccak256(0x1901 + domainSeparator + structHash), EIP-1271 isValidSignature for contracts",
        "target_count": 6,
    },
    # ── CROSS-CHAIN ──
    {
        "skill_id": "cryptoskills/layerzero",
        "category": "General",
        "urls": [
            "https://docs.layerzero.network/v2/developers/evm/oapp/overview",
        ],
        "focus": "LayerZero V2 OApp contract, _lzSend function parameters (dstEid, message, options, MessagingFee), _lzReceive callback, endpoint ID numbers (Ethereum=30101, Base=30184, Arbitrum=30110), DVN configuration",
        "target_count": 6,
    },
    {
        "skill_id": "cryptoskills/wormhole",
        "category": "General",
        "urls": [
            "https://docs.wormhole.com/wormhole/explore-wormhole/vaa",
        ],
        "focus": "VAA structure (version/guardian set index/signatures/timestamp/nonce/emitter chain/emitter address/sequence/consistency level/payload), Guardian network size (19 nodes), 2/3 threshold (13 of 19), Wormhole chain IDs vs EVM chain IDs",
        "target_count": 6,
    },
    # ── COSMOS / POLKADOT ──
    {
        "skill_id": "cosmos/ibc-integration",
        "category": "General",
        "urls": [
            "https://tutorials.cosmos.network/academy/3-ibc/1-what-is-ibc.html",
        ],
        "focus": "IBC Port (application identifier) vs Channel (specific pathway), light client verification, ICS-20 token transfer standard, channel ordering (ORDERED vs UNORDERED), relayer role",
        "target_count": 6,
    },
    {
        "skill_id": "polkadot/substrate-dev-guide",
        "category": "General",
        "urls": [
            "https://docs.substrate.io/learn/runtime-development/",
        ],
        "focus": "Pallet structure (Config trait, Storage, Events, Errors, Call/dispatchable functions), FRAME macros (#[pallet::pallet], #[pallet::storage]), pallet-evm for EVM compatibility, runtime vs smart contract distinction",
        "target_count": 6,
    },
]

QUESTION_PROMPT_TEMPLATE = """你是一个 Web3 技术评测专家，正在为 AI Agent 评测系统生成题目。

## Skill: {skill_id}
## 官方文档内容（节选）：
{doc_content}

## 出题要求：
1. 生成 {count} 道新题目，考察 AI 是否掌握该 skill 的**精确技术事实**
2. 重点出这类题：
   - 精确的函数名/参数名/返回值
   - 具体的数值（费率、地址、链ID、版本号等）
   - 容易混淆的版本差异（v4 vs v5，V2 vs V3 等）
   - API 用法的关键细节
3. 每题有 2-3 条 expected_facts（简洁、可验证的事实陈述）
4. **不要出**开放性问题、观点题、或需要写完整代码的题
5. 题目用中文，facts 用英文

## 输出格式（严格 JSON）：
```json
[
  {{
    "question": "题目内容（中文）",
    "expected_facts": [
      "Precise fact 1 in English",
      "Precise fact 2 in English"
    ]
  }}
]
```

只输出 JSON，不要其他内容。
"""

def generate_questions_for_skill(config: dict) -> list:
    """为单个 skill 生成补充题目"""
    skill_id = config["skill_id"]
    print(f"\n[{skill_id}] 抓取文档...")

    # 抓取文档
    doc_parts = []
    for url in config["urls"]:
        content = fetch_url(url)
        # 简单清理 HTML tags
        content = re.sub(r'<[^>]+>', ' ', content)
        content = re.sub(r'\s+', ' ', content).strip()
        doc_parts.append(f"URL: {url}\n{content[:3000]}")

    doc_content = "\n\n---\n\n".join(doc_parts)

    # 看看已有几题
    with open('/home/bre/agentrel/eval/questions.json') as f:
        existing = json.load(f)
    existing_count = sum(1 for q in existing if q.get('skill_id') == skill_id)
    need_count = max(0, config["target_count"] - existing_count)

    if need_count <= 0:
        print(f"  已有 {existing_count} 题，无需补充")
        return []

    print(f"  已有 {existing_count} 题，需补 {need_count} 题，调用 LLM 生成...")

    prompt = QUESTION_PROMPT_TEMPLATE.format(
        skill_id=skill_id,
        doc_content=doc_content[:5000],
        count=need_count,
    )

    try:
        raw = call_llm(prompt)
        # 提取 JSON
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            print(f"  [错误] 无法解析 JSON: {raw[:200]}")
            return []
        questions = json.loads(match.group())
        print(f"  生成了 {len(questions)} 道题")
        return questions
    except Exception as e:
        print(f"  [错误] {e}")
        return []


def main():
    output_path = Path('/home/bre/agentrel/eval/new_questions_draft.json')
    questions_path = Path('/home/bre/agentrel/eval/questions.json')

    with open(questions_path) as f:
        existing = json.load(f)

    # 找当前最大 question id
    ids = [q.get('id', '') for q in existing]
    numeric_ids = [int(re.search(r'\d+', i).group()) for i in ids if re.search(r'\d+', i)]
    next_id = max(numeric_ids) + 1 if numeric_ids else 1000

    all_new = []

    for config in SKILL_CONFIGS:
        new_qs = generate_questions_for_skill(config)
        for q in new_qs:
            all_new.append({
                "id": f"Q{next_id:04d}",
                "skill_id": config["skill_id"],
                "category": config["category"],
                "question": q.get("question", ""),
                "expected_facts": q.get("expected_facts", []),
                "_source": "auto-generated-from-official-docs",
                "_needs_review": True,
            })
            next_id += 1
        time.sleep(1)  # 避免限速

    print(f"\n\n=== 完成 ===")
    print(f"共生成 {len(all_new)} 道新题目")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_new, f, ensure_ascii=False, indent=2)
    print(f"已保存到 {output_path}")
    print("请人工审核后再合并到 questions.json")

    # P2 validation on the freshly generated draft (no GT yet)
    print()
    fails = validate_questions(all_new, require_gt=False)
    report_validation(fails, label=output_path.name)


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--validate":
        sys.exit(_cli_validate(sys.argv[2]))
    main()
