#!/usr/bin/env node
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function upsert(skill) {
  const r = await fetch(BASE + '/rest/v1/skills', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ ...skill, version: '1.0.0', time_sensitivity: 'stable', updated_at: new Date().toISOString() }),
  })
  if (!r.ok) console.error('error:', skill.id, await r.text())
  return r.ok
}

const SKILLS = [

// ============================================================
// 1. 账户抽象 AA 实战（EIP-4337）
// ============================================================
{
  id: 'ethereum/account-abstraction-integration',
  name: '账户抽象（AA）实战：Biconomy / ZeroDev / Pimlico',
  description: 'Use when user asks about account abstraction, EIP-4337, smart wallets, gasless transactions, session keys, Biconomy, ZeroDev, or how to implement AA in a dApp.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['account-abstraction', 'eip-4337', 'smart-wallet', 'gasless', 'session-key', 'biconomy', 'zerodev', 'pimlico'],
  content: `# 账户抽象（AA）实战指南

## EIP-4337 核心概念

\`\`\`
用户 → UserOperation → Bundler → EntryPoint → Smart Account (合约钱包)
                                              ↓
                                        Paymaster（可代付 gas）
\`\`\`

| 组件 | 作用 |
|------|------|
| **Smart Account** | 用户的合约钱包（可编程逻辑） |
| **Bundler** | 打包 UserOp 发链，类似矿工 |
| **Paymaster** | 代付 gas / 用 ERC-20 付 gas |
| **EntryPoint** | 官方标准合约（验证 + 执行）|

---

## 方案选择

| SDK | 特点 | 推荐场景 |
|-----|------|---------|
| **Biconomy** | 成熟，Gasless API 最简单 | 快速接入 gasless |
| **ZeroDev** | Kernel 架构，插件化 session key | 需要 session key |
| **Pimlico** | 基础设施层，permissionless.js | 自定义 AA |
| **Safe** | 最成熟的多签智能钱包 | 企业/DAO 多签 |

---

## Biconomy（最快上手）

\`\`\`bash
npm install @biconomy/account @biconomy/bundler @biconomy/paymaster
\`\`\`

\`\`\`typescript
import { createSmartAccountClient } from "@biconomy/account"
import { createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygonAmoy } from "viem/chains"

// 1. EOA signer（可以是 wagmi 连接的钱包）
const account = privateKeyToAccount("0x...")
const signer = createWalletClient({ account, chain: polygonAmoy, transport: http() })

// 2. 创建 Smart Account
const smartAccount = await createSmartAccountClient({
  signer,
  bundlerUrl: "https://bundler.biconomy.io/api/v2/80002/YOUR_API_KEY",
  biconomyPaymasterApiKey: "YOUR_PAYMASTER_KEY",  // 可选：gasless
})

const address = await smartAccount.getAccountAddress()

// 3. 发送交易（gasless）
const tx = await smartAccount.sendTransaction({
  to: contractAddress,
  data: encodedCallData,
})
console.log("tx hash:", tx.transactionHash)
\`\`\`

---

## ZeroDev + Session Keys

\`\`\`bash
npm install @zerodev/sdk @zerodev/ecdsa-validator permissionless
\`\`\`

\`\`\`typescript
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { ENTRYPOINT_ADDRESS_V07 } from "permissionless"

// 创建 Kernel Smart Account
const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
  signer,
  entryPoint: ENTRYPOINT_ADDRESS_V07,
})
const account = await createKernelAccount(publicClient, {
  plugins: { sudo: ecdsaValidator },
  entryPoint: ENTRYPOINT_ADDRESS_V07,
})

// Session Key（用户签名一次，游戏/应用自动执行）
import { toPermissionValidator } from "@zerodev/permissions"
import { toECDSASigner } from "@zerodev/permissions/signers"
import { toCallPolicy } from "@zerodev/permissions/policies"

const sessionKeySigner = privateKeyToAccount(generatePrivateKey())  // 临时 key
const sessionKeyValidator = await toPermissionValidator(publicClient, {
  entryPoint: ENTRYPOINT_ADDRESS_V07,
  signer: await toECDSASigner({ signer: sessionKeySigner }),
  policies: [
    toCallPolicy({
      permissions: [{
        target: gameContract,      // 只能调用指定合约
        valueLimit: parseEther("0"),
        functionName: "move",      // 只能调用 move 函数
      }]
    })
  ],
})
\`\`\`

---

## Pimlico + permissionless.js（基础设施层）

\`\`\`typescript
import { createSmartAccountClient } from "permissionless"
import { signerToSimpleSmartAccount } from "permissionless/accounts"
import { createPimlicoBundlerClient, createPimlicoPaymasterClient } from "permissionless/clients/pimlico"

const bundlerClient = createPimlicoBundlerClient({
  transport: http("https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY"),
  entryPoint: ENTRYPOINT_ADDRESS_V07,
})

const account = await signerToSimpleSmartAccount(publicClient, {
  signer, entryPoint: ENTRYPOINT_ADDRESS_V07, factoryAddress: "0x..."
})

const smartAccountClient = createSmartAccountClient({
  account,
  entryPoint: ENTRYPOINT_ADDRESS_V07,
  chain: sepolia,
  bundlerTransport: http("https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY"),
  middleware: {
    sponsorUserOperation: paymasterClient.sponsorUserOperation,  // gasless
  },
})
\`\`\`

---

## 常见 AA 使用场景

| 场景 | 实现方式 |
|------|---------|
| **Gasless（用户零 gas）** | Paymaster 代付，Biconomy/Pimlico |
| **ERC-20 付 gas** | ERC-20 Paymaster，用 USDC 支付 |
| **批量交易** | UserOp 里 execute 多个 call |
| **游戏 Session Key** | ZeroDev 插件，限定合约+函数 |
| **社交恢复** | 设置 guardian 列表，多签恢复 |
| **自动化执行** | 结合 Chainlink Automation |

## 常见坑
- Smart Account 地址由 factory + salt 决定，不同链上地址相同（但需要各自部署）
- UserOp 的 \`nonce\` 不同于 EOA nonce，是 EntryPoint 管理的
- Paymaster 需要在 Pimlico/Biconomy 控制台充值 ETH/USDC
- 首次部署 Smart Account 会有额外 gas（initCode 非空）
`,
},

// ============================================================
// 2. NFT 技术栈
// ============================================================
{
  id: 'ethereum/nft-tech-stack',
  name: 'NFT 技术栈全指南：存储 + Metadata + Minting',
  description: 'Use when user asks about NFT development, IPFS vs Arweave storage, metadata standards, how to build an NFT collection, minting contracts, or royalty implementation.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['nft', 'erc721', 'erc1155', 'ipfs', 'arweave', 'metadata', 'minting', 'royalty'],
  content: `# NFT 技术栈全指南

## 存储方案对比

| 方案 | 成本 | 永久性 | 去中心化 | 推荐场景 |
|------|------|--------|---------|---------|
| **IPFS + Pinata** | 低（$0/月免费额度） | 依赖 pin 服务 | 是 | 早期项目，快速上线 |
| **Arweave** | 一次性付费（~$0.01/MB） | **永久** | 是 | 高价值 NFT，长期项目 |
| **Filecoin** | 按时间付费 | 合约期内 | 是 | 大文件存储 |
| **中心化服务器** | 极低 | 不保证 | 否 | **不推荐** |

---

## Metadata 标准（OpenSea 兼容）

\`\`\`json
{
  "name": "My NFT #1",
  "description": "This is the first NFT in the collection.",
  "image": "ipfs://QmXxx.../1.png",
  "external_url": "https://myproject.com/nft/1",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Eyes", "value": "Laser", "rarity": 0.02 },
    { "trait_type": "Level", "value": 5, "display_type": "number" },
    { "trait_type": "Birthday", "value": 1546360800, "display_type": "date" }
  ],
  "animation_url": "ipfs://QmXxx.../1.mp4"  // 可选，视频/音频
}
\`\`\`

**tokenURI 格式：**
\`\`\`
ipfs://CID/1.json       ← 推荐（完全去中心化）
https://api.xxx.com/1   ← 可以，但依赖服务器
ar://TXID/1.json        ← Arweave（永久）
\`\`\`

---

## Pinata（IPFS 最简单）

\`\`\`typescript
import PinataSDK from "@pinata/sdk"
const pinata = new PinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET)

// 上传图片
const imgResult = await pinata.pinFileToIPFS(fs.createReadStream("./nft.png"), {
  pinataMetadata: { name: "NFT #1" }
})
const imageURI = \`ipfs://\${imgResult.IpfsHash}\`

// 上传 metadata JSON
const metadata = { name: "My NFT #1", image: imageURI, attributes: [...] }
const metaResult = await pinata.pinJSONToIPFS(metadata)
const tokenURI = \`ipfs://\${metaResult.IpfsHash}\`
\`\`\`

---

## Arweave（永久存储）

\`\`\`typescript
import Arweave from "arweave"
const arweave = Arweave.init({ host: "arweave.net", port: 443, protocol: "https" })

const key = JSON.parse(fs.readFileSync("arweave-key.json"))

// 上传文件
const tx = await arweave.createTransaction({ data: fs.readFileSync("./nft.png") }, key)
tx.addTag("Content-Type", "image/png")
await arweave.transactions.sign(tx, key)
await arweave.transactions.post(tx)
const imageURI = \`ar://\${tx.id}\`

// 或使用 Bundlr（批量更便宜）
import { NodeBundlr } from "@bundlr-network/client"
const bundlr = new NodeBundlr("https://node1.bundlr.network", "arweave", key)
const response = await bundlr.uploadFile("./nft.png")
\`\`\`

---

## ERC-721 Minting 合约

\`\`\`solidity
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721URIStorage, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;
  
  uint256 public constant MAX_SUPPLY = 10000;
  uint256 public constant PRICE = 0.05 ether;
  bool public saleActive = false;
  
  string private _baseTokenURI;  // ipfs://CID/
  
  constructor() ERC721("My NFT", "MNFT") Ownable(msg.sender) {}
  
  // Public mint
  function mint(uint256 quantity) external payable {
    require(saleActive, "Sale not active");
    require(quantity <= 10, "Max 10 per tx");
    require(_tokenIds.current() + quantity <= MAX_SUPPLY, "Exceeds supply");
    require(msg.value >= PRICE * quantity, "Insufficient payment");
    
    for (uint i = 0; i < quantity; i++) {
      _tokenIds.increment();
      _safeMint(msg.sender, _tokenIds.current());
    }
  }
  
  // Reveal（先 mint 后揭示 metadata）
  function setBaseURI(string memory baseURI) external onlyOwner {
    _baseTokenURI = baseURI;
  }
  
  function _baseURI() internal view override returns (string memory) {
    return _baseTokenURI;
  }
  
  // EIP-2981 版税（5%）
  function royaltyInfo(uint256, uint256 salePrice) external view 
    returns (address receiver, uint256 royaltyAmount) {
    return (owner(), salePrice * 500 / 10000);
  }
  
  function withdraw() external onlyOwner {
    payable(owner()).transfer(address(this).balance);
  }
}
\`\`\`

---

## ERC-1155（多种类 NFT / SFT）

\`\`\`solidity
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract GameItems is ERC1155 {
  uint256 public constant SWORD = 1;
  uint256 public constant SHIELD = 2;
  uint256 public constant GOLD = 3;  // FT（同质化）
  
  constructor() ERC1155("https://api.game.com/items/{id}.json") {
    _mint(msg.sender, SWORD, 100, "");   // 100 把剑
    _mint(msg.sender, GOLD, 1e18, "");  // 大量金币
  }
}
\`\`\`

---

## Lazy Minting（节省 gas）

原理：NFT 不预先 mint，用户购买时才 mint，签名作为凭证。

\`\`\`solidity
// 卖家离线签名 voucher
bytes32 hash = keccak256(abi.encode(tokenId, price, uri));
bytes32 ethHash = keccak256(abi.encodePacked("\\x19Ethereum Signed Message:\\n32", hash));
(v, r, s) = vm.sign(sellerKey, ethHash);

// 买家链上验证并 mint
function redeem(uint tokenId, uint price, string memory uri, bytes memory sig) external payable {
  require(msg.value >= price);
  address signer = ECDSA.recover(hash, sig);
  require(signer == seller, "Invalid signature");
  _safeMint(msg.sender, tokenId);
  _setTokenURI(tokenId, uri);
}
\`\`\`

## 工具推荐
- **Manifold Studio** — 无代码 NFT 部署
- **ThirdWeb** — NFT SDK + dashboard
- **Zora Protocol** — 免费 mint + 版税基础设施
- **OpenSea SDK** — 上架/交易集成
`,
},

// ============================================================
// 3. DeFi 核心数学
// ============================================================
{
  id: 'ethereum/defi-math',
  name: 'DeFi 核心数学：AMM / 利率模型 / 清算机制',
  description: 'Use when user asks about AMM formulas, constant product market maker, Uniswap pricing math, compound interest rates, liquidation mechanisms, or DeFi protocol mathematics.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['defi', 'amm', 'uniswap', 'math', 'interest-rate', 'liquidation', 'compound', 'aave'],
  content: `# DeFi 核心数学

## AMM：恒定乘积公式（Uniswap V2）

**核心公式：** \`x * y = k\`（x、y 是两种代币数量，k 是常数）

### 价格计算
\`\`\`
当前价格 = y / x（1 个 x 能换多少 y）

例：池子有 10 ETH + 20000 USDC
ETH 价格 = 20000 / 10 = 2000 USDC
\`\`\`

### Swap 计算（含手续费 0.3%）
\`\`\`
输入 Δx，输出 Δy：
Δy = y * Δx * 997 / (x * 1000 + Δx * 997)

例：用 1 ETH 换 USDC，池子 10ETH + 20000USDC
Δy = 20000 * 1 * 997 / (10 * 1000 + 1 * 997)
   = 19940000 / 10997
   ≈ 1813 USDC（价格滑点 ~9.35%）
\`\`\`

### 价格影响（Price Impact）
\`\`\`
交易量 / 池子深度 越大，价格影响越大
Price Impact = 1 - x / (x + Δx)

例：1 ETH / 10 ETH 池 = 10% impact（很大）
    1 ETH / 1000 ETH 池 = 0.1% impact（正常）
\`\`\`

---

## Uniswap V3：集中流动性

V3 引入 **价格区间** 概念，LP 只在指定范围提供流动性：

\`\`\`
tick：价格用 tick 表示，price(tick) = 1.0001^tick
tickLower/tickUpper：流动性有效的价格范围

虚拟流动性公式：
L = Δx / (1/√Pa - 1/√Pb)  ← 计算需要多少 token X
L = Δy / (√Pb - √Pa)       ← 计算需要多少 token Y
\`\`\`

**集中流动性的影响：**
- 相同资金，价格区间越窄，资金效率越高（但 IL 风险越大）
- 价格跑出区间时，LP 100% 持有价值低的一侧

---

## 利率模型（Compound / Aave）

### 利用率（Utilization Rate）
\`\`\`
U = 总借款 / 总存款

例：10000 USDC 存款，7000 USDC 被借出
U = 7000 / 10000 = 70%
\`\`\`

### 分段利率模型（Kinked Rate Model）
\`\`\`
Slope1（正常区间，U < 最优点）：
借款利率 = BaseRate + U * Slope1

Slope2（高风险区间，U > 最优点）：
借款利率 = BaseRate + 最优点 * Slope1 + (U - 最优点) * Slope2

例（Aave USDC 参数）：
BaseRate = 0%, 最优点 = 90%, Slope1 = 4%, Slope2 = 60%

U=50%: 借款利率 = 0 + 50%*4% = 2%
U=90%: 借款利率 = 0 + 90%*4% = 3.6%（最优点）
U=95%: 借款利率 = 3.6% + 5%*60% = 6.6%（陡增惩罚）
U=99%: 借款利率 = 3.6% + 9%*60% = 9%
\`\`\`

存款利率 = 借款利率 * U * (1 - 协议费)

---

## 清算机制

### Health Factor（Aave）
\`\`\`
HF = Σ(抵押品价值 × 清算门槛) / 总借款价值

HF > 1：安全
HF = 1：清算临界点
HF < 1：可被清算

例：
存入 $10000 ETH（清算门槛 82.5%）
借出 $6000 USDC
HF = 10000 * 0.825 / 6000 = 1.375（安全）

ETH 跌 30% → $7000
HF = 7000 * 0.825 / 6000 = 0.9625 → 可被清算
\`\`\`

### 清算奖励
\`\`\`
清算人偿还 50% 的债务（close factor = 50%）
获得抵押品 + 5-15% 奖励（liquidation bonus）

例：
用户欠 $6000 USDC，抵押 $7000 ETH（bonus 5%）
清算人还 $3000 USDC
获得 ETH = $3000 * 1.05 = $3150 的 ETH
套利利润 = $150
\`\`\`

---

## 无常损失（Impermanent Loss）

\`\`\`
IL = 2√r/(1+r) - 1，其中 r = 价格变化比率

价格变化 → IL
+25%     → -0.6%
+50%     → -2.0%
+100%    → -5.7%（翻倍亏 5.7%）
+200%    → -13.4%
-50%     → -5.7%

恢复原价 → IL = 0（无永久损失）
\`\`\`

**Solidity 实现参考：**
\`\`\`solidity
// 计算 sqrt 用于 V3 流动性计算
function sqrt(uint256 x) internal pure returns (uint256 y) {
  if (x == 0) return 0;
  uint256 z = (x + 1) / 2;
  y = x;
  while (z < y) { y = z; z = (x / z + z) / 2; }
}

// Q96 定点数（Uniswap V3 内部格式）
// sqrtPriceX96 = sqrt(price) * 2^96
uint160 sqrtPriceX96 = ...;
uint256 price = uint256(sqrtPriceX96) * uint256(sqrtPriceX96) >> 192;
\`\`\`
`,
},

// ============================================================
// 4. 智能合约测试策略
// ============================================================
{
  id: 'ethereum/contract-testing-strategy',
  name: '智能合约测试策略：单元 / Fuzz / Invariant / Fork',
  description: 'Use when user asks about smart contract testing methodology, how to write comprehensive tests, fuzzing strategies, invariant testing, or achieving high test coverage in Solidity.',
  ecosystem: 'ethereum', type: 'guide', source: 'community', confidence: 'high',
  tags: ['testing', 'fuzzing', 'invariant', 'forge', 'hardhat', 'coverage', 'solidity', 'audit'],
  content: `# 智能合约测试策略

## 测试层次金字塔

\`\`\`
        ┌─────────────┐
        │   Fork Test  │  ← 真实链状态测试
       ┌┴─────────────┴┐
       │ Invariant Test │  ← 系统不变量验证
      ┌┴───────────────┴┐
      │   Fuzz Testing   │  ← 随机输入测试
     ┌┴─────────────────┴┐
     │    Unit Testing    │  ← 基础功能验证
     └───────────────────┘
\`\`\`

---

## 1. 单元测试（Foundry）

\`\`\`solidity
contract VaultTest is Test {
  Vault vault;
  ERC20Mock token;
  address alice = makeAddr("alice");
  
  function setUp() public {
    token = new ERC20Mock();
    vault = new Vault(address(token));
    token.mint(alice, 1000e18);
    vm.prank(alice);
    token.approve(address(vault), type(uint256).max);
  }
  
  function test_deposit() public {
    vm.prank(alice);
    vault.deposit(100e18);
    assertEq(vault.balanceOf(alice), 100e18);
  }
  
  // 测试 revert
  function test_RevertWhen_DepositZero() public {
    vm.prank(alice);
    vm.expectRevert(Vault.ZeroAmount.selector);
    vault.deposit(0);
  }
  
  // 测试 event
  function test_EmitDeposit() public {
    vm.expectEmit(true, false, false, true);
    emit Deposit(alice, 100e18);  // 期望的 event
    vm.prank(alice);
    vault.deposit(100e18);
  }
}
\`\`\`

---

## 2. Fuzz Testing

\`\`\`solidity
// Foundry 自动生成随机输入（默认 256 次）
function testFuzz_deposit(uint256 amount) public {
  // 约束合法输入范围
  amount = bound(amount, 1, 1000e18);
  
  token.mint(alice, amount);
  vm.prank(alice);
  vault.deposit(amount);
  
  assertEq(vault.balanceOf(alice), amount);
  assertEq(token.balanceOf(address(vault)), amount);
}

// 多参数 fuzz
function testFuzz_transferAndWithdraw(uint256 depositAmt, uint256 withdrawAmt) public {
  depositAmt = bound(depositAmt, 1e18, 1000e18);
  withdrawAmt = bound(withdrawAmt, 1, depositAmt);  // 不能超过存款
  
  vm.startPrank(alice);
  vault.deposit(depositAmt);
  vault.withdraw(withdrawAmt);
  vm.stopPrank();
  
  assertEq(vault.balanceOf(alice), depositAmt - withdrawAmt);
}
\`\`\`

增加 fuzz 次数：
\`\`\`toml
# foundry.toml
[fuzz]
runs = 10000  # 默认 256，高风险合约建议 10000+
\`\`\`

---

## 3. Invariant Testing（最强大）

**不变量**：无论发生什么操作，系统始终应该满足的条件。

\`\`\`solidity
// Handler：定义合法操作集合
contract VaultHandler is CommonBase, StdCheats, StdUtils {
  Vault vault;
  ERC20Mock token;
  uint256 public totalDeposited;
  
  constructor(Vault _vault, ERC20Mock _token) {
    vault = _vault; token = _token;
  }
  
  function deposit(uint256 amount) public {
    amount = bound(amount, 1, 1e30);
    token.mint(msg.sender, amount);
    vm.prank(msg.sender);
    token.approve(address(vault), amount);
    vm.prank(msg.sender);
    vault.deposit(amount);
    totalDeposited += amount;
  }
  
  function withdraw(uint256 amount) public {
    amount = bound(amount, 0, vault.balanceOf(msg.sender));
    if (amount == 0) return;
    vm.prank(msg.sender);
    vault.withdraw(amount);
    totalDeposited -= amount;
  }
}

// Invariant 测试合约
contract VaultInvariantTest is Test {
  Vault vault;
  VaultHandler handler;
  
  function setUp() public {
    vault = new Vault(...);
    handler = new VaultHandler(vault, token);
    targetContract(address(handler));  // Foundry 随机调用 handler 的函数
  }
  
  // 不变量 1：vault token 余额 = 所有存款之和
  function invariant_vaultBalanceMatchesDeposits() public {
    assertEq(token.balanceOf(address(vault)), handler.totalDeposited());
  }
  
  // 不变量 2：不能取出超过存款
  function invariant_noFreeWithdrawal() public {
    assertGe(handler.totalDeposited(), 0);
  }
}
\`\`\`

---

## 4. Fork Testing（主网状态）

\`\`\`solidity
contract ForkTest is Test {
  address constant UNISWAP_V3_POOL = 0x...;
  address constant WHALE = 0x大户地址;
  
  function setUp() public {
    vm.createSelectFork(vm.envString("MAINNET_RPC"), 19000000);
    // 现在可以直接与真实合约交互
  }
  
  function test_swapOnRealUniswap() public {
    // 冒充大户
    vm.prank(WHALE);
    // 与真实 Uniswap V3 交互
    ISwapRouter(UNISWAP_ROUTER).exactInputSingle(...);
  }
  
  function test_aaveLiquidation() public {
    // 模拟价格崩盘 → 触发清算
    vm.mockCall(CHAINLINK_ORACLE, abi.encodeWithSelector(latestRoundData.selector),
      abi.encode(0, 1000e8, 0, block.timestamp, 0));  // ETH 价格跌到 $1000
    // 执行清算
    aavePool.liquidationCall(...);
  }
}
\`\`\`

---

## 覆盖率目标

| 合约类型 | 目标覆盖率 |
|---------|----------|
| 核心 DeFi 逻辑 | **>95%** |
| 权限/访问控制 | **100%** |
| 辅助/工具函数 | >80% |
| View 函数 | >70% |

\`\`\`bash
forge coverage --report lcov
genhtml lcov.info -o coverage-report
\`\`\`

## 审计前清单
- [ ] 所有 public/external 函数都有单元测试
- [ ] Fuzz 测试覆盖所有数值输入
- [ ] 关键不变量有 Invariant 测试
- [ ] Fork 测试验证与主网协议集成
- [ ] Gas snapshot 对比前后版本
- [ ] slither / aderyn 静态分析无高危告警
`,
},

// ============================================================
// 5. Solana 生态工具集成
// ============================================================
{
  id: 'solana/ecosystem-tools',
  name: 'Solana 生态工具：Helius / Metaplex / Jupiter',
  description: 'Use when user asks about Solana development tools, Helius RPC, Metaplex NFTs, Jupiter swap aggregator, or building applications on Solana beyond basic Anchor development.',
  ecosystem: 'solana', type: 'guide', source: 'community', confidence: 'high',
  tags: ['solana', 'helius', 'metaplex', 'jupiter', 'rpc', 'nft', 'swap', 'tools'],
  content: `# Solana 生态工具指南

## Helius（最强 Solana RPC）

\`\`\`bash
npm install helius-sdk
\`\`\`

\`\`\`typescript
import { Helius } from "helius-sdk"
const helius = new Helius("YOUR_API_KEY")  // helius.dev 注册，免费额度足够开发

// 获取钱包所有资产（NFT + Token）
const assets = await helius.rpc.getAssetsByOwner({
  ownerAddress: "wallet_address",
  page: 1, limit: 100,
})

// DAS（数字资产标准）查询 NFT metadata
const asset = await helius.rpc.getAsset({ id: "mint_address" })

// 解析交易（人类可读）
const tx = await helius.rpc.parseTransaction({ transactions: ["tx_signature"] })
// 返回: { type: "SWAP", swapData: {...}, tokenTransfers: [...] }

// Webhook（监听地址活动）
const webhook = await helius.createWebhook({
  accountAddresses: ["wallet_address"],
  transactionTypes: ["ANY"],
  webhookURL: "https://your-server.com/webhook",
})
\`\`\`

---

## Metaplex（Solana NFT 标准）

\`\`\`bash
npm install @metaplex-foundation/mpl-token-metadata
npm install @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults
\`\`\`

\`\`\`typescript
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { mplTokenMetadata, createNft, fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata"
import { generateSigner, percentAmount } from "@metaplex-foundation/umi"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"

const umi = createUmi("https://api.mainnet-beta.solana.com")
  .use(walletAdapterIdentity(wallet))
  .use(mplTokenMetadata())

// Mint NFT
const mint = generateSigner(umi)
await createNft(umi, {
  mint,
  name: "My NFT",
  uri: "https://arweave.net/xxx/metadata.json",
  sellerFeeBasisPoints: percentAmount(5),  // 5% 版税
  creators: [{ address: umi.identity.publicKey, verified: true, share: 100 }],
}).sendAndConfirm(umi)

// 读取 NFT metadata
const metadata = await fetchMetadataFromSeeds(umi, { mint: mint.publicKey })
console.log(metadata.name, metadata.uri)
\`\`\`

### Candy Machine V3（批量 Mint）
\`\`\`typescript
import { mplCandyMachine, create, mintV2 } from "@metaplex-foundation/mpl-candy-machine"

// 创建 Candy Machine
const candyMachine = generateSigner(umi)
await create(umi, {
  candyMachine,
  collectionMint: collectionMint.publicKey,
  collectionUpdateAuthority: umi.identity,
  itemsAvailable: 10000,
  guards: {
    solPayment: { lamports: sol(0.1), destination: treasury },
    startDate: { date: new Date("2024-01-01") },
    mintLimit: { id: 1, limit: 3 },  // 每人最多 3 个
  },
}).sendAndConfirm(umi)

// 用户 mint
await mintV2(umi, { candyMachine: candyMachine.publicKey, ... }).sendAndConfirm(umi)
\`\`\`

---

## Jupiter（Solana DEX 聚合器）

\`\`\`bash
npm install @jup-ag/api
\`\`\`

\`\`\`typescript
import { createJupiterApiClient } from "@jup-ag/api"
import { Connection, VersionedTransaction } from "@solana/web3.js"

const jupiterApi = createJupiterApiClient()

// 1. 获取最优路由
const quote = await jupiterApi.quoteGet({
  inputMint: "So11111111111111111111111111111111111111112",  // SOL
  outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USDC
  amount: 1_000_000_000,  // 1 SOL (lamports)
  slippageBps: 50,  // 0.5%
})
console.log("Expected output:", quote.outAmount, "USDC")

// 2. 执行 Swap
const swapResult = await jupiterApi.swapPost({
  swapRequest: {
    quoteResponse: quote,
    userPublicKey: wallet.publicKey.toString(),
    wrapAndUnwrapSol: true,
  }
})

const swapTx = VersionedTransaction.deserialize(
  Buffer.from(swapResult.swapTransaction, "base64")
)
swapTx.sign([wallet])
const txId = await connection.sendRawTransaction(swapTx.serialize())
\`\`\`

---

## Solana Pay（支付协议）

\`\`\`typescript
import { encodeURL, createTransfer, validateTransfer } from "@solana/pay"
import { PublicKey } from "@solana/web3.js"
import BigNumber from "bignumber.js"

// 生成支付链接（展示为 QR code）
const url = encodeURL({
  recipient: new PublicKey("your_wallet"),
  amount: new BigNumber(1),         // 1 USDC
  splToken: new PublicKey("USDC_MINT"),
  reference: new PublicKey(reference),  // 用于追踪
  label: "My Store",
  message: "Order #123",
})

// 验证支付
const { amount, reference } = parseURL(url)
const response = await findReference(connection, reference)
await validateTransfer(connection, response.signature, { recipient, amount, splToken })
\`\`\`

---

## 常用 Solana 工具

| 工具 | 用途 |
|------|------|
| **Helius** | 增强 RPC + 解析 API |
| **Metaplex** | NFT 标准 + Candy Machine |
| **Jupiter** | DEX 聚合最优路由 |
| **Jito** | MEV 保护 + bundle 发送 |
| **Tensor** | NFT 交易市场 API |
| **Dialect** | 链上通知/消息 |
| **Clockwork** | 定时自动化任务 |
| **Drift** | 永续合约 + 现货 SDK |
`,
},

]

async function main() {
  console.log(`Writing ${SKILLS.length} P1 skills...`)
  let written = 0
  for (const s of SKILLS) {
    const ok = await upsert(s)
    console.log((ok ? '✓' : '✗') + ' ' + s.id)
    if (ok) written++
    await sleep(100)
  }
  console.log(`\nDone: ${written}/${SKILLS.length}`)

  const fin = await fetch(BASE + '/rest/v1/skills?select=type&limit=1000', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  const all = await fin.json()
  const c = {}
  for (const s of all) c[s.type] = (c[s.type]||0)+1
  console.log('\nDB total:', all.length)
  for (const [t,n] of Object.entries(c).sort((a,b)=>b[1]-a[1])) console.log(' ', t+':', n)
}

main().catch(console.error)
