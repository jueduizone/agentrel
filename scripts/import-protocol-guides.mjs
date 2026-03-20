#!/usr/bin/env node
/**
 * 导入主流 DeFi 协议集成文档
 * 覆盖：Uniswap V3, Aave V3, Compound V3, Chainlink, OpenZeppelin, Hardhat, Foundry, wagmi, viem
 * 内容：how-to-integrate，不是协议概览，是开发者直接可用的集成指南
 */
const KEY = 'process.env.SUPABASE_SERVICE_KEY'
const BASE = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function upsert(skill) {
  const r = await fetch(BASE + '/rest/v1/skills', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ ...skill, updated_at: new Date().toISOString() }),
  })
  if (!r.ok) console.error('upsert error:', skill.id, await r.text())
  return r.ok
}

const SKILLS = [

// ============================================================
// UNISWAP V3
// ============================================================
{
  id: 'protocols/uniswap-v3-integration',
  name: 'Uniswap V3 集成指南',
  description: 'Use when user asks how to integrate Uniswap V3, execute swaps, provide liquidity, or use the Uniswap SDK. Covers swap router, position manager, price quotes, and fee tiers.',
  ecosystem: 'ethereum', type: 'guide', source: 'official', confidence: 'high',
  tags: ['uniswap', 'dex', 'swap', 'liquidity', 'defi', 'ethereum', 'integration'],
  content: `# Uniswap V3 集成指南

## 核心合约地址（Ethereum Mainnet）
- **SwapRouter02:** \`0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45\`
- **NonfungiblePositionManager:** \`0xC36442b4a4522E871399CD717aBDD847Ab11FE88\`
- **Quoter V2:** \`0x61fFE014bA17989E743c5F6cB21bF9697530B21e\`
- **Factory:** \`0x1F98431c8aD98523631AE4a59f267346ea31F984\`

## 安装 SDK
\`\`\`bash
npm install @uniswap/v3-sdk @uniswap/sdk-core
npm install @uniswap/smart-order-router  # 自动路由
\`\`\`

## 执行 Swap（最简路径）
\`\`\`typescript
import { ethers } from 'ethers'

const SWAP_ROUTER = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
const swapRouterABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)'
]

async function swapExactInput(signer, tokenIn, tokenOut, amountIn, minOut) {
  // 1. Approve
  const token = new ethers.Contract(tokenIn, ['function approve(address,uint256)'], signer)
  await token.approve(SWAP_ROUTER, amountIn)
  
  // 2. Swap
  const router = new ethers.Contract(SWAP_ROUTER, swapRouterABI, signer)
  return router.exactInputSingle({
    tokenIn, tokenOut,
    fee: 3000,          // 0.3% — 最常用 fee tier
    recipient: await signer.getAddress(),
    amountIn,
    amountOutMinimum: minOut,
    sqrtPriceLimitX96: 0
  })
}
\`\`\`

## Fee Tiers
| Fee | 适用场景 |
|-----|---------|
| 100 (0.01%) | 稳定币对（USDC/USDT）|
| 500 (0.05%) | 相关资产（ETH/stETH）|
| 3000 (0.3%) | 标准对（ETH/USDC）|
| 10000 (1%) | 波动性高的小币 |

## 获取价格 Quote
\`\`\`typescript
const quoterABI = ['function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)']
const quoter = new ethers.Contract('0x61fFE014bA17989E743c5F6cB21bF9697530B21e', quoterABI, provider)

const [amountOut] = await quoter.quoteExactInputSingle.staticCall({
  tokenIn: WETH, tokenOut: USDC, amountIn: ethers.parseEther('1'), fee: 3000, sqrtPriceLimitX96: 0
})
\`\`\`

## 使用 Smart Order Router（自动最优路径）
\`\`\`typescript
import { AlphaRouter, SwapType } from '@uniswap/smart-order-router'
import { CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core'

const router = new AlphaRouter({ chainId: 1, provider })
const route = await router.route(
  CurrencyAmount.fromRawAmount(WETH_TOKEN, amountIn.toString()),
  USDC_TOKEN,
  TradeType.EXACT_INPUT,
  { slippageTolerance: new Percent(50, 10_000), deadline: Math.floor(Date.now()/1000) + 180, type: SwapType.SWAP_ROUTER_02, recipient }
)
// route.methodParameters.calldata — 直接发送
\`\`\`

## 添加流动性（Position Manager）
\`\`\`typescript
const NPM_ABI = ['function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)']

// tick 计算：price → tick = Math.floor(Math.log(price) / Math.log(1.0001))
\`\`\`

## 常见坑
- \`amountOutMinimum\` 设 0 会被 sandwich 攻击，至少设 95% 预期值
- Quoter 用 \`staticCall\`，不要真实发送
- deadline 必须设，防止交易在内存池里无限等待
- WETH 地址: \`0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2\`
`,
},

// ============================================================
// AAVE V3
// ============================================================
{
  id: 'protocols/aave-v3-integration',
  name: 'Aave V3 集成指南',
  description: 'Use when user asks how to integrate Aave V3, implement lending/borrowing, use flash loans, or manage positions. Covers Pool contract, supply, borrow, repay, and flash loan patterns.',
  ecosystem: 'ethereum', type: 'guide', source: 'official', confidence: 'high',
  tags: ['aave', 'lending', 'flash-loan', 'defi', 'ethereum', 'integration', 'borrow'],
  content: `# Aave V3 集成指南

## 核心合约（Ethereum Mainnet）
- **Pool:** \`0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2\`
- **PoolAddressesProvider:** \`0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e\`
- **AaveOracle:** \`0x54586bE62E3c3580375aE3723C145253060Ca0C2\`

## 安装
\`\`\`bash
npm install @aave/contract-helpers @aave/math-utils
\`\`\`

## Supply（存款）
\`\`\`typescript
import { Pool } from '@aave/contract-helpers'

const pool = new Pool(provider, {
  POOL: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  WETH_GATEWAY: '0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C',
})

// Approve + Supply
const txs = await pool.supply({ user, reserve: USDC_ADDRESS, amount: '1000', onBehalfOf: user })
for (const tx of txs) await signer.sendTransaction(await tx.tx())
\`\`\`

## Borrow（借款）
\`\`\`typescript
// interestRateMode: 1 = stable, 2 = variable (variable 推荐)
const txs = await pool.borrow({
  user, reserve: WETH_ADDRESS, amount: '0.1',
  interestRateMode: InterestRate.Variable,
  onBehalfOf: user,
})
\`\`\`

## Flash Loan
\`\`\`solidity
// 合约必须继承 IFlashLoanSimpleReceiver
import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";

contract MyFlashLoan is FlashLoanSimpleReceiverBase {
  constructor(IPoolAddressesProvider provider) FlashLoanSimpleReceiverBase(provider) {}

  function executeOperation(
    address asset, uint256 amount, uint256 premium,
    address initiator, bytes calldata params
  ) external override returns (bool) {
    // ===== 在这里写套利/清算逻辑 =====
    
    // 归还 = amount + premium
    IERC20(asset).approve(address(POOL), amount + premium);
    return true;
  }

  function requestFlashLoan(address token, uint256 amount) external {
    POOL.flashLoanSimple(address(this), token, amount, "", 0);
  }
}
\`\`\`

## Health Factor & 清算
\`\`\`typescript
// 获取用户账户数据
const { totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor } 
  = await pool.getUserAccountData(userAddress)

// healthFactor < 1e18 = 可清算
// healthFactor = totalCollateral * liquidationThreshold / totalDebt
\`\`\`

## E-Mode（高效率模式）
- E-Mode 允许相关资产（如 ETH 生态）获得更高 LTV（最高 97%）
- \`pool.setUserEMode(categoryId)\` 开启
- 只有 categoryId 内的资产才能作为抵押品

## 常见坑
- Flash loan premium = 0.05%，必须归还 amount + premium
- Variable 利率会随市场波动，不适合长期不监控的头寸
- Health factor 降到 1.0 以下立即触发清算，要设预警
- aToken（如 aUSDC）是生息凭证，余额会持续增长
`,
},

// ============================================================
// CHAINLINK ORACLE
// ============================================================
{
  id: 'protocols/chainlink-integration',
  name: 'Chainlink 集成指南',
  description: 'Use when user asks how to use Chainlink price feeds, VRF, CCIP, or Automation. Covers Data Feeds, randomness, cross-chain messaging, and keeper automation.',
  ecosystem: 'ethereum', type: 'guide', source: 'official', confidence: 'high',
  tags: ['chainlink', 'oracle', 'price-feed', 'vrf', 'ccip', 'automation', 'integration'],
  content: `# Chainlink 集成指南

## 安装
\`\`\`bash
npm install @chainlink/contracts
\`\`\`

## Price Feeds（最常用）
\`\`\`solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceConsumer {
  AggregatorV3Interface internal priceFeed;
  
  // ETH/USD on Ethereum: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
  constructor() { priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419); }
  
  function getLatestPrice() public view returns (int) {
    (, int price,,,) = priceFeed.latestRoundData();
    return price; // 8 decimals: 200000000000 = $2000
  }
}
\`\`\`

## 主要 Price Feed 地址（Mainnet）
| Pair | Address |
|------|---------|
| ETH/USD | \`0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419\` |
| BTC/USD | \`0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c\` |
| USDC/USD | \`0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6\` |
| LINK/USD | \`0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c\` |

完整列表: https://docs.chain.link/data-feeds/price-feeds/addresses

## VRF V2.5（链上随机数）
\`\`\`solidity
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2Plus.sol";

contract RandomGame is VRFConsumerBaseV2Plus {
  uint256 public s_subscriptionId; // 在 vrf.chain.link 创建并充值 LINK
  
  function requestRandom() external returns (uint256 requestId) {
    return s_vrfCoordinator.requestRandomWords(
      VRFV2PlusClient.RandomWordsRequest({
        keyHash: 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae, // 500 gwei key hash
        subId: s_subscriptionId,
        requestConfirmations: 3,
        callbackGasLimit: 100000,
        numWords: 1,
        extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
      })
    );
  }
  
  function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
    uint256 result = randomWords[0] % 100; // 0-99 的随机数
  }
}
\`\`\`

## CCIP（跨链消息）
\`\`\`solidity
import "@chainlink/contracts-ccip/src/v0.8/CCIPReceiver.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";

// 发送跨链消息
IRouterClient router = IRouterClient(0xE561d5E02641c58De07aCE84dDF4D9F3abDed3c1); // Ethereum Sepolia
Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
  receiver: abi.encode(destinationAddress),
  data: abi.encode(payload),
  tokenAmounts: new Client.EVMTokenAmount[](0),
  feeToken: address(linkToken),
  extraArgs: ""
});
uint256 fee = router.getFee(destinationChainSelector, message);
IERC20(linkToken).approve(address(router), fee);
router.ccipSend(destinationChainSelector, message);
\`\`\`

## Automation（定时执行合约）
\`\`\`solidity
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract AutoTask is AutomationCompatibleInterface {
  function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
    upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
  }
  
  function performUpkeep(bytes calldata) external override {
    // 定时执行的逻辑
  }
}
\`\`\`

## 常见坑
- Price feed 有心跳间隔（ETH/USD 是 1 小时），需检查 \`updatedAt\` 是否过期
- VRF subscription 需要充足 LINK，不足会导致 callback 失败
- CCIP 跨链费用用 LINK 或 native token 支付，提前查询 \`getFee\`
`,
},

// ============================================================
// OPENZEPPELIN
// ============================================================
{
  id: 'protocols/openzeppelin-patterns',
  name: 'OpenZeppelin 合约模式',
  description: 'Use when user asks about OpenZeppelin contracts, access control, upgradeable contracts, ERC implementations, or standard Solidity security patterns.',
  ecosystem: 'ethereum', type: 'guide', source: 'official', confidence: 'high',
  tags: ['openzeppelin', 'solidity', 'access-control', 'upgradeable', 'erc20', 'erc721', 'security'],
  content: `# OpenZeppelin 合约模式

## 安装
\`\`\`bash
npm install @openzeppelin/contracts
npm install @openzeppelin/contracts-upgradeable  # 可升级版本
\`\`\`

## ERC-20 Token
\`\`\`solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
  constructor(uint256 initialSupply) ERC20("MyToken", "MTK") Ownable(msg.sender) {
    _mint(msg.sender, initialSupply * 10 ** decimals());
  }
  function mint(address to, uint256 amount) public onlyOwner { _mint(to, amount); }
}
\`\`\`

## ERC-721 NFT
\`\`\`solidity
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721URIStorage, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;
  
  function mint(address to, string memory tokenURI) public onlyOwner returns (uint256) {
    _tokenIds.increment();
    uint256 newId = _tokenIds.current();
    _safeMint(to, newId);
    _setTokenURI(newId, tokenURI);
    return newId;
  }
}
\`\`\`

## Access Control（多角色）
\`\`\`solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyContract is AccessControl {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
  
  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(MINTER_ROLE, msg.sender);
  }
  
  function mint(address to) public onlyRole(MINTER_ROLE) { ... }
}
\`\`\`

## 可升级合约（UUPS）
\`\`\`solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyContractV1 is UUPSUpgradeable, OwnableUpgradeable {
  function initialize() public initializer {
    __Ownable_init(msg.sender);
    __UUPSUpgradeable_init();
  }
  function _authorizeUpgrade(address) internal override onlyOwner {}
}
// 部署: upgrades.deployProxy(MyContractV1, [], { kind: 'uups' })
// 升级: upgrades.upgradeProxy(proxyAddress, MyContractV2)
\`\`\`

## ReentrancyGuard（防重入）
\`\`\`solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SafeVault is ReentrancyGuard {
  function withdraw(uint256 amount) external nonReentrant {
    // CEI 模式: Check → Effect → Interact
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;  // Effect 先改状态
    payable(msg.sender).transfer(amount);  // 最后 Interact
  }
}
\`\`\`

## Pausable
\`\`\`solidity
import "@openzeppelin/contracts/utils/Pausable.sol";

contract MyContract is Pausable, Ownable {
  function pause() public onlyOwner { _pause(); }
  function unpause() public onlyOwner { _unpause(); }
  function transfer() public whenNotPaused { ... }
}
\`\`\`

## 常见坑
- 可升级合约**不能有 constructor**，用 \`initialize()\` 替代，且加 \`initializer\` modifier
- 可升级合约**不能改变 storage 布局**，只能追加新变量
- 使用 \`_disableInitializers()\` 防止实现合约被直接初始化
- AccessControl 比 Ownable 更灵活，多人团队项目优先使用
`,
},

// ============================================================
// WAGMI + VIEM (前端)
// ============================================================
{
  id: 'protocols/wagmi-viem-integration',
  name: 'wagmi + viem 前端集成',
  description: 'Use when user asks how to build Web3 frontend with React, connect wallets, read contract data, or send transactions using wagmi or viem. Covers hooks, config, and TypeScript patterns.',
  ecosystem: 'ethereum', type: 'guide', source: 'official', confidence: 'high',
  tags: ['wagmi', 'viem', 'react', 'frontend', 'wallet', 'typescript', 'web3'],
  content: `# wagmi + viem 前端集成

## 安装
\`\`\`bash
npm install wagmi viem @tanstack/react-query
\`\`\`

## 初始化配置
\`\`\`typescript
// config.ts
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygon, base } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, base],
  connectors: [
    injected(),
    walletConnect({ projectId: 'YOUR_PROJECT_ID' }),
    coinbaseWallet({ appName: 'My App' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
\`\`\`

\`\`\`tsx
// App.tsx
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config'

const queryClient = new QueryClient()

export function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <YourApp />
      </QueryClientProvider>
    </WagmiProvider>
  )
}
\`\`\`

## 常用 Hooks
\`\`\`typescript
import { useAccount, useConnect, useDisconnect, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

// 连接状态
const { address, isConnected, chain } = useAccount()

// 余额
const { data: balance } = useBalance({ address, token: USDC_ADDRESS })

// 读合约
const { data: totalSupply } = useReadContract({
  address: TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'totalSupply',
})

// 写合约
const { writeContract, data: hash } = useWriteContract()
const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

function sendTx() {
  writeContract({ address: CONTRACT, abi: ABI, functionName: 'transfer', args: [to, amount] })
}
\`\`\`

## viem 直接调用（不用 React）
\`\`\`typescript
import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { mainnet } from 'viem/chains'

// 读
const publicClient = createPublicClient({ chain: mainnet, transport: http() })
const balance = await publicClient.getBalance({ address: '0x...' })
const result = await publicClient.readContract({ address, abi, functionName: 'balanceOf', args: [userAddr] })

// 写
const walletClient = createWalletClient({ account, chain: mainnet, transport: http() })
const hash = await walletClient.writeContract({ address, abi, functionName: 'transfer', args: [to, parseEther('1')] })
await publicClient.waitForTransactionReceipt({ hash })
\`\`\`

## TypeScript ABI 类型推导
\`\`\`typescript
// 用 const as 保留类型信息
const ERC20_ABI = [...] as const
// 或用 viem 的 parseAbi
import { parseAbi } from 'viem'
const abi = parseAbi(['function balanceOf(address) returns (uint256)', 'event Transfer(address indexed from, address indexed to, uint256 value)'])
\`\`\`

## 常见坑
- \`useReadContract\` 默认 refetch interval 4s，可设 \`watch: true\` 实时监听
- \`writeContract\` 返回 hash 后还需 \`useWaitForTransactionReceipt\` 等待确认
- 多链项目注意切换链时 address 不变但 chainId 变，需监听 \`chain.id\`
- WalletConnect projectId 必须在 cloud.walletconnect.com 申请
`,
},

// ============================================================
// HARDHAT
// ============================================================
{
  id: 'protocols/hardhat-guide',
  name: 'Hardhat 开发框架指南',
  description: 'Use when user asks about Hardhat setup, writing tests, deploying contracts, using plugins, or debugging Solidity. Covers common workflows and TypeScript configuration.',
  ecosystem: 'ethereum', type: 'guide', source: 'official', confidence: 'high',
  tags: ['hardhat', 'testing', 'deployment', 'solidity', 'typescript', 'development'],
  content: `# Hardhat 开发框架指南

## 初始化
\`\`\`bash
npm install --save-dev hardhat
npx hardhat init  # 选 TypeScript project
npm install --save-dev @nomicfoundation/hardhat-toolbox  # 包含 ethers, chai, mocha
\`\`\`

## hardhat.config.ts 关键配置
\`\`\`typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    sepolia: { url: process.env.SEPOLIA_RPC_URL!, accounts: [process.env.PRIVATE_KEY!] },
    mainnet: { url: process.env.MAINNET_RPC_URL!, accounts: [process.env.PRIVATE_KEY!] },
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY },
};
export default config;
\`\`\`

## 写测试
\`\`\`typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyToken", function () {
  async function deployFixture() {
    const [owner, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MyToken");
    const token = await Token.deploy(ethers.parseEther("1000000"));
    return { token, owner, user };
  }

  it("should mint tokens to owner", async function () {
    const { token, owner } = await loadFixture(deployFixture);
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("1000000"));
  });
  
  it("should transfer tokens", async function () {
    const { token, owner, user } = await loadFixture(deployFixture);
    await token.transfer(user.address, ethers.parseEther("100"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
  });
});
\`\`\`

## Fork Mainnet 测试
\`\`\`typescript
// hardhat.config.ts
networks: {
  hardhat: {
    forking: { url: process.env.MAINNET_RPC_URL!, blockNumber: 19000000 }
  }
}

// test 里冒充大户
const whale = await ethers.getImpersonatedSigner("0x大户地址")
await ethers.provider.send("hardhat_setBalance", [whale.address, "0x56BC75E2D63100000"])
\`\`\`

## 部署脚本
\`\`\`typescript
import { ethers } from "hardhat";

async function main() {
  const Token = await ethers.getContractFactory("MyToken");
  const token = await Token.deploy(ethers.parseEther("1000000"));
  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());
}

main().catch(console.error);
\`\`\`
\`\`\`bash
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat verify --network sepolia DEPLOYED_ADDRESS "1000000000000000000000000"
\`\`\`

## 常用命令
\`\`\`bash
npx hardhat compile          # 编译
npx hardhat test             # 跑测试
npx hardhat test --grep "transfer"  # 过滤
npx hardhat coverage         # 覆盖率
npx hardhat node             # 本地节点
npx hardhat console          # 交互式控制台
\`\`\`

## 常见坑
- \`loadFixture\` 用快照回滚，比每次重新部署快 10x
- Fork 测试要注意 \`blockNumber\`，太旧的区块可能状态不对
- Verify 时构造函数参数顺序必须和部署时完全一致
`,
},

// ============================================================
// FOUNDRY
// ============================================================
{
  id: 'protocols/foundry-guide',
  name: 'Foundry 开发框架指南',
  description: 'Use when user asks about Foundry, forge, cast, anvil, or Solidity-native testing. Covers test patterns, fuzzing, invariant testing, deployment, and scripting.',
  ecosystem: 'ethereum', type: 'guide', source: 'official', confidence: 'high',
  tags: ['foundry', 'forge', 'cast', 'anvil', 'testing', 'fuzzing', 'solidity'],
  content: `# Foundry 开发框架指南

## 安装
\`\`\`bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
\`\`\`

## 项目结构
\`\`\`
my-project/
├── src/          # 合约
├── test/         # 测试（*.t.sol）
├── script/       # 部署脚本（*.s.sol）
├── lib/          # 依赖（git submodule）
└── foundry.toml
\`\`\`

## 写测试（Solidity-native）
\`\`\`solidity
// test/MyToken.t.sol
import "forge-std/Test.sol";
import "../src/MyToken.sol";

contract MyTokenTest is Test {
  MyToken token;
  address alice = makeAddr("alice");
  address bob = makeAddr("bob");

  function setUp() public {
    token = new MyToken(1000e18);
    deal(address(token), alice, 100e18);  // 给 alice 100 token
  }

  function test_transfer() public {
    vm.prank(alice);  // 冒充 alice
    token.transfer(bob, 10e18);
    assertEq(token.balanceOf(bob), 10e18);
  }

  // Fuzz testing
  function testFuzz_transfer(uint256 amount) public {
    amount = bound(amount, 1, 100e18);
    vm.prank(alice);
    token.transfer(bob, amount);
    assertEq(token.balanceOf(bob), amount);
  }
}
\`\`\`

## Cheatcodes 速查
\`\`\`solidity
vm.prank(address)         // 下一次调用冒充该地址
vm.startPrank(address)    // 持续冒充直到 stopPrank()
vm.deal(address, amount)  // 设置 ETH 余额
deal(token, address, amount)  // 设置 ERC20 余额
vm.warp(timestamp)        // 设置区块时间
vm.roll(blockNumber)      // 设置区块号
vm.expectRevert("msg")    // 期望 revert
vm.expectEmit(true, true, false, true)  // 期望 event
vm.createFork(rpcUrl)     // 创建 fork
vm.selectFork(forkId)     // 切换 fork
\`\`\`

## 部署脚本
\`\`\`solidity
// script/Deploy.s.sol
import "forge-std/Script.sol";

contract Deploy is Script {
  function run() external {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    vm.startBroadcast(deployerPrivateKey);
    
    MyToken token = new MyToken(1000000e18);
    console.log("Token:", address(token));
    
    vm.stopBroadcast();
  }
}
\`\`\`
\`\`\`bash
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC --broadcast --verify
\`\`\`

## cast 常用命令
\`\`\`bash
cast call $CONTRACT "balanceOf(address)(uint256)" $ADDRESS    # 调用只读函数
cast send $CONTRACT "transfer(address,uint256)" $TO $AMOUNT --private-key $KEY
cast abi-encode "f(address,uint256)" 0x... 100
cast storage $CONTRACT 0   # 读取 slot 0
cast code $CONTRACT        # 读取字节码
cast 4byte 0xa9059cbb      # 解码函数选择器
\`\`\`

## 常用命令
\`\`\`bash
forge build
forge test -vvv              # 详细输出
forge test --match-test test_transfer
forge coverage
forge snapshot               # gas 快照
forge fmt                    # 格式化
\`\`\`

## Hardhat vs Foundry 选择
| 场景 | 推荐 |
|------|------|
| 快速原型 | Foundry |
| 复杂 JS/TS 逻辑 | Hardhat |
| Fuzz/Invariant 测试 | Foundry |
| 和前端深度集成 | Hardhat |
| Gas 优化分析 | Foundry |
`,
},

// ============================================================
// SOLANA ANCHOR
// ============================================================
{
  id: 'protocols/solana-anchor-guide',
  name: 'Solana Anchor 开发框架指南',
  description: 'Use when user asks about Solana smart contract development, Anchor framework, program accounts, instructions, PDAs, or Solana testing patterns.',
  ecosystem: 'solana', type: 'guide', source: 'official', confidence: 'high',
  tags: ['solana', 'anchor', 'rust', 'pda', 'program', 'testing', 'development'],
  content: `# Solana Anchor 开发框架指南

## 安装
\`\`\`bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install latest && avm use latest
\`\`\`

## 初始化项目
\`\`\`bash
anchor init my-program
cd my-program
anchor build
anchor test
\`\`\`

## Program 基本结构
\`\`\`rust
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod my_program {
  use super::*;
  
  pub fn initialize(ctx: Context<Initialize>, data: u64) -> Result<()> {
    let account = &mut ctx.accounts.my_account;
    account.data = data;
    account.authority = ctx.accounts.user.key();
    Ok(())
  }
  
  pub fn update(ctx: Context<Update>, new_data: u64) -> Result<()> {
    require!(ctx.accounts.my_account.authority == ctx.accounts.user.key(), ErrorCode::Unauthorized);
    ctx.accounts.my_account.data = new_data;
    Ok(())
  }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
  #[account(init, payer = user, space = 8 + MyAccount::INIT_SPACE)]
  pub my_account: Account<'info, MyAccount>,
  #[account(mut)]
  pub user: Signer<'info>,
  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub my_account: Account<'info, MyAccount>,
  pub user: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct MyAccount {
  pub data: u64,
  pub authority: Pubkey,
}

#[error_code]
pub enum ErrorCode {
  #[msg("Unauthorized")]
  Unauthorized,
}
\`\`\`

## PDA（Program Derived Address）
\`\`\`rust
// 创建 PDA account
#[derive(Accounts)]
#[instruction(seed: String)]
pub struct CreatePDA<'info> {
  #[account(
    init, payer = user,
    space = 8 + 32,
    seeds = [b"vault", user.key().as_ref(), seed.as_bytes()],
    bump
  )]
  pub vault: Account<'info, Vault>,
  #[account(mut)]
  pub user: Signer<'info>,
  pub system_program: Program<'info, System>,
}

// 在 instruction 里使用 bump
let (pda, bump) = Pubkey::find_program_address(&[b"vault", user.key().as_ref()], ctx.program_id);
\`\`\`

## 测试（TypeScript）
\`\`\`typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("my-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MyProgram as Program<MyProgram>;

  it("initialize", async () => {
    const myAccount = anchor.web3.Keypair.generate();
    await program.methods
      .initialize(new anchor.BN(42))
      .accounts({ myAccount: myAccount.publicKey, user: provider.wallet.publicKey, systemProgram: anchor.web3.SystemProgram.programId })
      .signers([myAccount])
      .rpc();
    
    const account = await program.account.myAccount.fetch(myAccount.publicKey);
    assert.equal(account.data.toNumber(), 42);
  });
});
\`\`\`

## 客户端调用
\`\`\`typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(IDL, PROGRAM_ID, provider);

// 调用 instruction
const tx = await program.methods.update(new BN(100))
  .accounts({ myAccount: accountPubkey, user: wallet.publicKey })
  .rpc();
\`\`\`

## Space 计算（account 大小）
| 类型 | 字节 |
|------|------|
| Discriminator | 8 |
| bool | 1 |
| u8/i8 | 1 |
| u64/i64 | 8 |
| Pubkey | 32 |
| String(n) | 4 + n |
| Vec<T>(n) | 4 + n * size_of(T) |

## 常见坑
- Account discriminator = 8 bytes，必须加进 space 计算
- PDA 不能签名，用 \`seeds\` + \`bump\` 代替
- \`init_if_needed\` 有安全风险，避免在生产使用
- Solana 账户租金豁免需要 ≥ 2 年租金（约 0.002 SOL/128bytes）
`,
},

// ============================================================
// CHAIN CONFIG REFERENCE
// ============================================================
{
  id: 'protocols/chain-config-reference',
  name: '主流链配置速查表',
  description: 'Use when user needs chain IDs, RPC URLs, block explorers, faucets, or network configuration for Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Solana, or other chains.',
  ecosystem: 'multi-chain', type: 'guide', source: 'community', confidence: 'high',
  tags: ['chain-id', 'rpc', 'explorer', 'faucet', 'network', 'configuration', 'multi-chain'],
  content: `# 主流链配置速查表

## EVM 主网

| 链 | Chain ID | RPC | Explorer |
|----|---------|-----|---------|
| **Ethereum** | 1 | https://eth.llamarpc.com | etherscan.io |
| **Polygon** | 137 | https://polygon.llamarpc.com | polygonscan.com |
| **Arbitrum One** | 42161 | https://arb1.arbitrum.io/rpc | arbiscan.io |
| **Optimism** | 10 | https://mainnet.optimism.io | optimistic.etherscan.io |
| **Base** | 8453 | https://mainnet.base.org | basescan.org |
| **BSC** | 56 | https://bsc-dataseed.binance.org | bscscan.com |
| **Avalanche C** | 43114 | https://api.avax.network/ext/bc/C/rpc | snowtrace.io |
| **Linea** | 59144 | https://rpc.linea.build | lineascan.build |
| **zkSync Era** | 324 | https://mainnet.era.zksync.io | explorer.zksync.io |
| **Scroll** | 534352 | https://rpc.scroll.io | scrollscan.com |

## EVM 测试网

| 链 | Chain ID | RPC | Faucet |
|----|---------|-----|--------|
| **Sepolia** | 11155111 | https://rpc.sepolia.org | sepoliafaucet.com |
| **Holesky** | 17000 | https://rpc.holesky.ethpandaops.io | faucet.holesky.ethpandaops.io |
| **Polygon Amoy** | 80002 | https://rpc-amoy.polygon.technology | faucet.polygon.technology |
| **Arbitrum Sepolia** | 421614 | https://sepolia-rollup.arbitrum.io/rpc | faucet.arbitrum.io |
| **Base Sepolia** | 84532 | https://sepolia.base.org | faucet.quicknode.com/base/sepolia |
| **OP Sepolia** | 11155420 | https://sepolia.optimism.io | faucet.quicknode.com/optimism/sepolia |

## 免费 RPC 提供商（无需 API Key）

| 提供商 | 链支持 | 速率限制 |
|--------|--------|---------|
| **LlamaRPC** | ETH/Polygon/Arb/Op | 宽松 |
| **PublicNode** | 多链 | 宽松 |
| **Infura 免费** | ETH/Polygon | 100K req/day |
| **Alchemy 免费** | ETH/Polygon/Arb | 300M compute/month |
| **QuickNode 免费** | 多链 | 10M req/month |

## 非 EVM 链

| 链 | 网络 | RPC/Endpoint | Explorer |
|----|------|-------------|---------|
| **Solana** | mainnet-beta | https://api.mainnet-beta.solana.com | solscan.io / explorer.solana.com |
| **Solana** | devnet | https://api.devnet.solana.com | — |
| **NEAR** | mainnet | https://rpc.mainnet.near.org | nearblocks.io |
| **NEAR** | testnet | https://rpc.testnet.near.org | — |
| **Cosmos Hub** | — | https://cosmos-rpc.publicnode.com:443 | mintscan.io |
| **Aptos** | mainnet | https://fullnode.mainnet.aptoslabs.com | explorer.aptoslabs.com |
| **Sui** | mainnet | https://fullnode.mainnet.sui.io | suiscan.xyz |

## wagmi/viem 链配置
\`\`\`typescript
import { mainnet, polygon, arbitrum, optimism, base, bsc, avalanche } from 'wagmi/chains'
// 导入即用，无需手动配置 chainId
\`\`\`

## viem 手动配置自定义链
\`\`\`typescript
import { defineChain } from 'viem'
const myChain = defineChain({
  id: 12345, name: 'My Chain',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://my-rpc.com'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://explorer.mychain.com' } },
})
\`\`\`
`,
},

]

async function main() {
  console.log(`Writing ${SKILLS.length} protocol integration skills...`)
  let written = 0
  for (const skill of SKILLS) {
    const ok = await upsert({ ...skill, version: '1.0.0', time_sensitivity: 'time-sensitive', source: skill.source || 'official' })
    console.log((ok ? '✓' : '✗') + ' ' + skill.id)
    if (ok) written++
    await sleep(100)
  }
  console.log(`\nDone: ${written}/${SKILLS.length}`)

  const fin = await fetch(BASE + '/rest/v1/skills?type=eq.guide&select=id', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  console.log('DB guide total:', (await fin.json()).length)
}

main().catch(console.error)
