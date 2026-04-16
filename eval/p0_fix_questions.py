"""
P0 fix: clean 5 polluted STARKNET questions + drop 6 fabricated Q1xxx.
Run from eval/ dir. Backs up questions.json before writing.
"""
import json, shutil, sys
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "questions.json"
BAK = HERE / "questions.json.bak_pre_p0fix"

shutil.copy2(SRC, BAK)
qs = json.loads(SRC.read_text())
print(f"loaded {len(qs)} questions; backup -> {BAK.name}")

DROP = {"Q1005","Q1006","Q1008","Q1014","Q1053","Q1054"}

# (question, ground_truth, expected_facts) for the 5 polluted STARKNET ids
FIXES = {
    "STARKNET-Q27": (
        "starknet.js v6 中如何连接 Starknet mainnet？写出正确的 Provider 初始化代码。",
        "starknet.js v6 统一使用 `RpcProvider`，旧版的 `SequencerProvider` 已废弃。代码：\n"
        "```javascript\n"
        "import { RpcProvider } from 'starknet';\n"
        "const provider = new RpcProvider({\n"
        "  nodeUrl: 'https://starknet-mainnet.infura.io/v3/YOUR_KEY',\n"
        "  // 或免费公共节点:\n"
        "  // nodeUrl: 'https://free-rpc.nethermind.io/mainnet-juno'\n"
        "  // nodeUrl: 'https://starknet-mainnet.public.blastapi.io'\n"
        "});\n"
        "```",
        [
            "starknet.js v6 uses RpcProvider for connecting to Starknet mainnet",
            "RpcProvider is constructed with a nodeUrl pointing to a JSON-RPC endpoint (e.g. Infura, Nethermind Juno, or Blast public RPC)",
            "The old SequencerProvider has been deprecated/removed in v6",
        ],
    ),
    "STARKNET-Q32": (
        "starknet.js 中如何监听合约事件？如何过滤特定的 Transfer 事件？",
        "通过 `provider.getEvents` 拉取事件，用 `keys` 字段按事件 selector 过滤；或用 `Contract` 对象的 `parseEvents` 从交易回执解码：\n"
        "```javascript\n"
        "const events = await provider.getEvents({\n"
        "  address: contractAddress,\n"
        "  keys: [['0x事件选择器哈希']],  // Transfer 事件的 selector\n"
        "  from_block: { block_number: startBlock },\n"
        "  to_block: 'latest',\n"
        "  chunk_size: 100\n"
        "});\n"
        "// 或用 Contract 对象的事件解码\n"
        "const contract = new Contract(abi, contractAddress, provider);\n"
        "const parsedEvents = contract.parseEvents(transactionReceipt);\n"
        "```",
        [
            "Use provider.getEvents to query historical events on Starknet via starknet.js",
            "Filter specific events (e.g. Transfer) by passing the event selector hash in the keys parameter",
            "Use Contract.parseEvents on a transaction receipt to decode events using the contract ABI",
        ],
    ),
    "STARKNET-Q36": (
        "用 OpenZeppelin Cairo 实现一个最简单的 ERC-20 合约，需要哪些关键元素？",
        "关键元素：1）`use openzeppelin::token::erc20::{ERC20Component, ERC20HooksEmptyImpl};` 引入 ERC-20 组件；"
        "2）`component!` 宏挂载组件到合约；3）`#[abi(embed_v0)]` 暴露 `ERC20Impl` 和 `ERC20MetadataImpl`；"
        "4）`#[storage]` 中用 `#[substorage(v0)]` 嵌入 `ERC20Component::Storage`；5）constructor 调用 `self.erc20.initializer(name, symbol)`。\n"
        "```cairo\n"
        "#[starknet::contract]\n"
        "mod MyToken {\n"
        "    use openzeppelin::token::erc20::{ERC20Component, ERC20HooksEmptyImpl};\n"
        "    component!(path: ERC20Component, storage: erc20, event: ERC20Event);\n"
        "    #[abi(embed_v0)]\n"
        "    impl ERC20Impl = ERC20Component::ERC20Impl<ContractState>;\n"
        "    #[abi(embed_v0)]\n"
        "    impl ERC20MetadataImpl = ERC20Component::ERC20MetadataImpl<ContractState>;\n"
        "    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;\n"
        "    #[storage]\n"
        "    struct Storage {\n"
        "        #[substorage(v0)]\n"
        "        erc20: ERC20Component::Storage,\n"
        "    }\n"
        "    // constructor 中调用 self.erc20.initializer(name, symbol)\n"
        "}\n"
        "```",
        [
            "Imports the ERC20Component from openzeppelin::token::erc20",
            "Uses the component! macro to embed the ERC20Component into the contract",
            "Exposes ERC20Impl (and typically ERC20MetadataImpl) with #[abi(embed_v0)]",
            "Calls self.erc20.initializer(name, symbol) inside the constructor",
        ],
    ),
    "STARKNET-Q39": (
        "Cairo 合约中如何用 `deploy_syscall` 部署子合约？需要哪些参数？",
        "调用 `starknet::syscalls::deploy_syscall`，传入：1）`class_hash`（要部署的合约类）；2）`contract_address_salt`（影响部署地址的 salt）；3）`calldata.span()`（constructor 参数）；4）`deploy_from_zero: bool`（是否以零地址作 deployer）。返回 `(contract_address, return_data)`。地址 = hash(class_hash, salt, calldata, deployer)，deploy_from_zero=true 时 deployer=0。\n"
        "```cairo\n"
        "use starknet::syscalls::deploy_syscall;\n"
        "let (contract_address, _) = deploy_syscall(\n"
        "    class_hash,\n"
        "    contract_address_salt,\n"
        "    calldata.span(),\n"
        "    false\n"
        ").unwrap_syscall();\n"
        "```",
        [
            "deploy_syscall is imported from starknet::syscalls",
            "deploy_syscall takes four parameters: class_hash, contract_address_salt, calldata (as a span), and deploy_from_zero (bool)",
            "deploy_syscall returns a tuple of (contract_address, return_data) and is typically called with .unwrap_syscall()",
            "The deployed contract's address is determined by hash(class_hash, salt, calldata, deployer); deploy_from_zero=true sets deployer to 0",
        ],
    ),
    "STARKNET-Q44": (
        "Pragma 是 Starknet 上的预言机，如何在合约中获取 ETH/USD 价格？",
        "通过 `IPragmaABIDispatcher.get_data` 调用 Pragma 合约，传入 `DataType::SpotEntry('ETH/USD')` 和聚合方式（如 `AggregationMode::Median`）。返回 `PragmaPricesResponse`，`price` 字段为 8 位精度（即真实价 × 10^8）。\n"
        "```cairo\n"
        "use pragma_lib::abi::{IPragmaABIDispatcher, IPragmaABIDispatcherTrait};\n"
        "use pragma_lib::types::{AggregationMode, DataType, PragmaPricesResponse};\n"
        "// Pragma Mainnet: 0x2a85bd616f912537c50a49a4076db02c00b29b2cdc8a197ce92ed1837fa875b\n"
        "let oracle = IPragmaABIDispatcher { contract_address: pragma_address };\n"
        "let eth_usd_key: felt252 = 'ETH/USD';\n"
        "let response: PragmaPricesResponse = oracle.get_data(\n"
        "    DataType::SpotEntry(eth_usd_key),\n"
        "    AggregationMode::Median(())\n"
        ");\n"
        "let price = response.price;  // 8 位精度\n"
        "```\n"
        "注意：1）应校验 `price > 0`；2）检查 `last_updated_timestamp` 防止用过期价格；3）Cairo shortstring 'ETH/USD' 自动编码为 felt252。",
        [
            "Use IPragmaABIDispatcher with the Pragma contract address to query prices",
            "Call get_data with DataType::SpotEntry('ETH/USD') and an AggregationMode (e.g. Median) to fetch the price",
            "The returned price is in 8 decimals (price × 10^8)",
            "Validate price > 0 and check last_updated_timestamp to avoid stale prices",
        ],
    ),
}

new_qs = []
fixed = []
dropped = []
for q in qs:
    qid = q["question_id"]
    if qid in DROP:
        dropped.append(qid)
        continue
    if qid in FIXES:
        new_q, new_gt, new_facts = FIXES[qid]
        q["question"] = new_q
        q["ground_truth"] = new_gt
        q["expected_facts"] = new_facts
        fixed.append(qid)
    new_qs.append(q)

# Sanity: no remaining pollution
remaining_polluted = [q["question_id"] for q in new_qs if "标准答案" in q.get("question","")]
assert not remaining_polluted, f"still polluted: {remaining_polluted}"

SRC.write_text(json.dumps(new_qs, ensure_ascii=False, indent=2))
print(f"fixed: {fixed}")
print(f"dropped: {dropped}")
print(f"new total: {len(new_qs)} (was {len(qs)})")
