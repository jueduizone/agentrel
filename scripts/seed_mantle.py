"""
Seed Mantle ecosystem skill into Supabase.
"""
import json
import urllib.request
import urllib.parse

URL = "https://zkpeutvzmrfhlzpsbyhr.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGV1dHZ6bXJmaGx6cHNieWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk1MTI0MSwiZXhwIjoyMDg4NTI3MjQxfQ.DtvWVp2SrwNrfR503XjPUiW_H_T4GRrHqCTnjMZb9hI"
HDR = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation",
}

MANTLE_CONTENT = """---
id: mantle/developer-quickstart
name: Mantle Developer Quickstart
version: 1.0.0
ecosystem: mantle
type: technical-doc
time_sensitivity: evergreen
source: community
confidence: high
maintainer: AgentRel Community
last_updated: 2026-04-14
feedback_endpoint: https://agentrel.vercel.app/api/feedback
---

## Overview

Mantle is an Ethereum L2 built on the OP Stack with EigenLayer-powered data availability. It offers high throughput and low fees for DeFi and consumer apps, while maintaining full EVM compatibility.

Key properties:
- **Network**: Mantle Mainnet (Chain ID: 5000) / Mantle Sepolia Testnet (Chain ID: 5003)
- **DA Layer**: EigenDA (EigenLayer) — not Ethereum calldata
- **Stack**: OP Stack (Bedrock) — fully EVM compatible
- **Gas token**: MNT (native token, used for gas fees)
- **Block time**: ~2 seconds

## ⚠️ Critical Gotchas (AI Most Likely to Get Wrong)

### 1. Gas Token is MNT, NOT ETH

On Mantle, the native gas token is **MNT**, not ETH. ETH exists as an ERC-20 on Mantle.

❌ Wrong assumption:
```typescript
// Assuming ETH is the gas token like on mainnet
const tx = { to: recipient, value: ethers.parseEther("0.1") }
```

✅ Correct:
```typescript
// MNT is the native gas token — treat like ETH in terms of tx.value
// But users need MNT (not ETH) in their wallet for gas
const tx = { to: recipient, value: ethers.parseEther("0.1") } // value in MNT
```

### 2. Chain IDs

```typescript
const MANTLE_MAINNET_CHAIN_ID = 5000
const MANTLE_TESTNET_CHAIN_ID = 5003  // Mantle Sepolia

// Add to wallet
await ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x1388', // 5000 in hex
    chainName: 'Mantle',
    nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
    rpcUrls: ['https://rpc.mantle.xyz'],
    blockExplorerUrls: ['https://explorer.mantle.xyz'],
  }]
})
```

### 3. RPC Endpoints

```
Mainnet RPC:  https://rpc.mantle.xyz
Testnet RPC:  https://rpc.sepolia.mantle.xyz
Explorer:     https://explorer.mantle.xyz (mainnet)
              https://explorer.sepolia.mantle.xyz (testnet)
```

### 4. Data Availability (EigenDA)

Mantle uses EigenDA instead of posting calldata to Ethereum. This means:
- Lower fees than L2s that use Ethereum DA
- Transaction data is NOT retrievable from Ethereum directly — use Mantle RPC
- For full DA proofs, use Mantle's DA API, not Ethereum blob queries

### 5. Bridge: Mantle Bridge (OP Stack Standard)

```typescript
// L1 → L2 (deposit) uses OP Stack standard bridge
// Contract: 0x95fC37A27a2f68e3A647CDc081F2702a0cB92E30 (L1StandardBridge on Ethereum)
// Takes ~20 minutes for finality

// L2 → L1 (withdrawal) has 7-day challenge window (OP Stack)
// Use Mantle Bridge UI or SDK for the full flow
```

## Setting Up Development

```bash
# Install dependencies (standard EVM tooling works)
npm install ethers       # v6 recommended
npm install viem wagmi   # modern alternative

# Hardhat config
// hardhat.config.ts
networks: {
  mantle: {
    url: "https://rpc.mantle.xyz",
    chainId: 5000,
    accounts: [process.env.PRIVATE_KEY!],
  },
  mantleSepolia: {
    url: "https://rpc.sepolia.mantle.xyz",
    chainId: 5003,
    accounts: [process.env.PRIVATE_KEY!],
  },
}
```

## Key Contracts (Mantle Mainnet)

| Contract | Address |
|----------|---------|
| MNT Token (ERC-20 on L1) | `0x3c3a81e81dc49A522A592e7622A7E711c06bf354` |
| L2 Standard Bridge | `0x4200000000000000000000000000000000000010` |
| L2 Cross Domain Messenger | `0x4200000000000000000000000000000000000007` |
| WETH on Mantle | `0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111` |

## DeFi Ecosystem on Mantle

Key protocols deployed on Mantle:
- **Agni Finance** — Uniswap v3 fork, largest DEX on Mantle
- **Merchant Moe** — Liquidity book AMM (Trader Joe fork)
- **Lendle** — AAVE v2 fork lending protocol
- **Aurelius** — AAVE v3 fork lending
- **Butter** — Yield aggregator

## Common Patterns

### ethers.js v6 connection
```typescript
import { ethers } from 'ethers'

const provider = new ethers.JsonRpcProvider('https://rpc.mantle.xyz')
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider)

// Check MNT balance (native gas token)
const balance = await provider.getBalance(wallet.address)
console.log('MNT balance:', ethers.formatEther(balance))
```

### viem connection
```typescript
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const mantle = {
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } },
  blockExplorers: { default: { name: 'Mantle Explorer', url: 'https://explorer.mantle.xyz' } },
} as const

const publicClient = createPublicClient({ chain: mantle, transport: http() })
```

## Skill URL
https://agentrel.vercel.app/api/v1/skills/mantle/developer-quickstart
"""

rows = [
    {
        "id": "mantle/developer-quickstart",
        "name": "Mantle Developer Quickstart",
        "ecosystem": "mantle",
        "type": "technical-doc",
        "time_sensitivity": "evergreen",
        "source": "community",
        "confidence": "high",
        "version": "1.0.0",
        "maintainer": "AgentRel Community",
        "content": MANTLE_CONTENT,
        "description": "Mantle L2 development guide — chain ID, MNT gas token, RPC endpoints, bridge contracts, EigenDA DA layer, and DeFi ecosystem overview.",
        "tags": ["mantle", "l2", "op-stack", "eigenda", "evm", "mnt"],
        "health_score": 100,
        "install_count": 0,
        "access": "free",
    }
]

payload = json.dumps(rows).encode()
req = urllib.request.Request(
    f"{URL}/rest/v1/skills",
    data=payload,
    headers=HDR,
    method="POST",
)
res = urllib.request.urlopen(req)
data = json.loads(res.read())
print(f"Upserted {len(data)} row(s):")
for r in data:
    print(f"  id={r['id']} ecosystem={r['ecosystem']}")
