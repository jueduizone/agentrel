import { createClient } from '@supabase/supabase-js'

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ─────────────────────────────────────────────
// Pitfalls block (sourced from zama-ai/fhevm GitHub issues analysis)
// ─────────────────────────────────────────────
const PITFALLS_SETUP = `## Common Pitfalls

### 1. CoprocessorAddress Undefined on Fresh Setup
**Problem:** \`hardhat compile\` fails with \`DeclarationError: Undeclared identifier — CoprocessorAddress: undefined\` in \`ZamaConfig.sol\`.
**Fix:** Ensure \`@fhevm/hardhat-plugin\` is installed and fully configured. Run \`npx hardhat compile\` only after a complete environment bootstrap with a valid network config. Check that all required contract addresses (coprocessor, gateway) are populated.
**Version:** Observed on \`@fhevm/hardhat-plugin 0.0.1-6\` and \`fhevm 0.6.x\`.

### 2. Unsupported Network Configuration
**Problem:** Deploying to a custom or mainnet chain throws \`Error in plugin: This network configuration is not yet supported by the FHEVM hardhat plugin\`. The plugin has a hardcoded allowlist.
**Fix:** Verify the target network chain ID is in the plugin's supported list. For custom networks, manually configure \`gatewayContractAddress\` and \`coprocessorContractAddress\` in \`hardhat.config.ts\`.
**Version:** Confirmed on early mainnet attempts and staging plugin versions.

### 3. ACL Authorization Failures with fromExternal Handles
**Problem:** Encrypted transactions fail with authorization errors even when using the same signer. The \`FHE.fromExternal()\` handle is not recognized by the ACL.
**Fix:** Call \`TFHE.allow(handle, contractAddress)\` and \`TFHE.allow(handle, userAddress)\` *before* the transaction that consumes the handle. The ACL delegation chain must be complete before cross-contract calls.
**Version:** Observed with \`@openzeppelin/confidential-contracts 0.2.0-rc.1\`, \`fhevm 0.6.2\`.

### 4. Shift/Rotate Index Larger Than Bit Width
**Problem:** Shifting a \`euint64\` by a value ≥ 64 does not behave like modular shift — results diverge from expected \`value % bitwidth\` semantics.
**Fix:** Always clamp shift/rotate RHS values to the valid range for the encrypted type before the operation. Add assertions in tests: \`shift(x, 70)\` should equal \`shift(x, 6)\` for \`euint64\`.
**Version:** Confirmed on recent coprocessor builds; regression tests added in fhevm issue #2145.

### 5. Missing REINITIALIZER_VERSION Bump After Contract Modification
**Problem:** Modifying upgradeable contract logic without bumping \`REINITIALIZER_VERSION\` causes upgrade pipelines to skip re-initialization, leaving the on-chain contract in a stale state.
**Fix:** Any logic change to an upgradeable contract must include a \`REINITIALIZER_VERSION\` bump, a corresponding \`reinitializeVX()\` function, and a semantic version bump. Add bytecode-diff CI to catch this automatically.
**Version:** Affects all versions using OpenZeppelin upgradeable proxy patterns.`

const PITFALLS_GATEWAY = `## Common Pitfalls

### 1. Unauthorized Decrypt — ACL Not Set Before Read
**Problem:** \`instance.decrypt()\` throws \`Unauthorized\` even for the contract owner.
**Fix:** The contract must call \`TFHE.allow(encryptedValue, userAddress)\` *before* the user attempts to decrypt. ACL grants are not automatic — every new ciphertext handle requires explicit allowance.
**Version:** All versions.

### 2. Stale fhevmjs Instance After Network Change
**Problem:** Decryption silently fails or returns wrong data after the user switches networks in MetaMask.
**Fix:** Listen to \`window.ethereum\` \`chainChanged\` event and call \`createInstance()\` again with the new network. Cache the instance per network, not globally.
**Version:** All versions of fhevmjs.

### 3. Zero-Address Handle Drops Extra Data
**Problem:** When a ciphertext handle resolves to the zero address, the KMS connector silently drops \`extra_data\`, causing downstream decryption to fail without a clear error.
**Fix:** Check for zero-value handles before calling decrypt. A zero handle means the encrypted value was never initialized — ensure the contract sets a default value in the constructor using \`TFHE.asEuint64(0)\`.
**Version:** Affects kms-connector versions before fhevm issue #2131 patch.

### 4. Wrong Chain ID — Gateway Routing Failure
**Problem:** Requests to the Gateway fail silently when connected to a network with a chain ID not registered with the Zama Gateway service.
**Fix:** Confirm you are on Sepolia (chainId 11155111) or another supported testnet. The Sepolia Gateway URL is \`https://gateway.sepolia.zama.ai\`. For local testing, use MockFHEVM — it does not require a Gateway connection.
**Version:** All versions; mainnet Gateway not yet available.`

const PITFALLS_TESTING = `## Common Pitfalls

### 1. Forgetting TFHE.allow Before Asserting State
**Problem:** \`instance.decrypt()\` in tests throws \`Unauthorized\`, even though the transaction succeeded.
**Fix:** Ensure the contract calls \`TFHE.allow(value, testAccount.address)\` after every state mutation. For tests, a helper function that auto-grants ACL on all updates simplifies this.
**Version:** All versions.

### 2. Hardcoded Ports Cause Concurrent Test Failures in CI
**Problem:** Tests fail with \`PortNotExposed\` or port conflict errors when running concurrently (e.g., \`--parallel\` in Hardhat or multiple CI workers).
**Fix:** Use dynamic port allocation for test containers. Remove \`--test-threads=1\` workarounds and rely on health-check-based port binding. In Hardhat, ensure each test file uses isolated contract deployments.
**Version:** Affects Rust coprocessor CI; also impacts Hardhat tests sharing process-level state.

### 3. Sleep-Based Waits Causing Flaky Tests
**Problem:** Tests using hardcoded \`sleep()\` to wait for blockchain events time out in slow environments or produce false positives in fast ones.
**Fix:** Replace \`await sleep(3000)\` with polling loops that check block number or event count. Use \`waitForTransactionReceipt\` or event listeners instead of fixed delays.
**Version:** Observed in e2e and host-listener test suites; optimized in fhevm issue #2113.

### 4. Instance Scope — Decrypting Other User's Data
**Problem:** \`aliceInstance.decrypt()\` on a handle that only \`bob\` is ACL-authorized for fails silently or returns garbage.
**Fix:** Create a separate fhevmjs instance per signer using \`createInstances(contractAddr, ethers, bob)\`. An instance can only decrypt handles where the corresponding signer is ACL-authorized.
**Version:** All versions.`

const PITFALLS_CONCEPTS = `## Common Pitfalls

### 1. Confusing FHE Privacy with ZK Proof Privacy
**Problem:** Developers assume FHE and ZK proofs solve the same problem and try to use them interchangeably, leading to wrong architecture choices.
**Fix:** ZK proves "I know X without revealing X" — the *prover's input* stays private. FHE computes on encrypted data — the *computation result* stays encrypted for everyone. Use ZK for compliance proofs, FHE for persistent on-chain privacy.
**Version:** Conceptual — applies to all versions.

### 2. Assuming Encrypted Means Anonymous
**Problem:** Developers think encrypted balances or votes mean the *identity* of participants is hidden. It does not — only the *values* are encrypted.
**Fix:** For full anonymity, combine fhEVM with mixers or ZK identity systems. fhEVM hides what you hold or voted, not that you participated.
**Version:** Conceptual — all versions.

### 3. Underestimating Gas Costs of Encrypted Operations
**Problem:** Production contracts hit gas limits because encrypted operations (especially multiplication and comparison) cost significantly more gas than their plaintext equivalents.
**Fix:** Profile gas usage with \`TFHE.add\` (~50K gas), \`TFHE.mul\` (~200K gas), \`TFHE.eq\` (~100K gas) in mind. Batch operations where possible. For complex logic, consider off-chain pre-computation with on-chain verification.
**Version:** Gas costs vary by fhEVM version; benchmark on current testnet before production.`

const PITFALLS_VOTING = `## Common Pitfalls

### 1. Owner Can End Voting Arbitrarily — No Minimum Period
**Problem:** A malicious or careless owner can call \`endVoting()\` immediately after deployment, before any votes are cast.
**Fix:** Add a \`votingDeadline\` timestamp set in the constructor. Require \`block.timestamp >= votingDeadline\` before allowing \`endVoting()\`. For governance, use a timelock or multi-sig as the owner.
**Version:** Design issue — applies to all custom implementations.

### 2. Decryption Callback Not Awaited — Race Condition
**Problem:** Front-end code reads \`plaintextTally\` immediately after calling \`endVoting()\`, getting \`0\` because the Gateway decryption callback hasn't executed yet.
**Fix:** Listen for the \`ResultRevealed\` event instead of polling \`plaintextTally\` directly. The Gateway callback is an async on-chain transaction and may take 30-60 seconds on testnet.
**Version:** All versions using Gateway callback pattern.

### 3. No Double-Vote Protection Allows Repeated ACL Grants
**Problem:** Without the \`hasVoted\` mapping, a single address can submit multiple encrypted votes. The contract correctly adds ciphertexts but does not prevent multiple submissions.
**Fix:** Always check and set \`hasVoted[msg.sender] = true\` before adding the vote to the tally. Consider emitting a \`VoteCast\` event for off-chain monitoring.
**Version:** Design issue — always required.

### 4. Revealing Partial Tally During Voting Period
**Problem:** If the contract emits the running tally (even encrypted) in events, sophisticated observers may infer vote direction by watching ciphertext size changes.
**Fix:** Do not emit tally-related events during the voting period. Only emit \`VoteCast(voter)\` (confirming participation) and \`ResultRevealed\` (after decryption). Keep \`encryptedTally\` as a private state variable.
**Version:** All versions — design best practice.`

const PITFALLS_BOUNTY = `## Common Pitfalls

### 1. Submitting Without Claiming the Issue First
**Problem:** Developers build a full solution and submit a PR without first commenting on the GitHub issue to claim it. Another developer claims it simultaneously and gets the bounty.
**Fix:** Always comment "I'll work on this" on the bounty issue *before* starting development. Zama awards bounties to the first claimer with an accepted solution.
**Version:** Process — applies to all bounty rounds.

### 2. Scope Creep Beyond Bounty Requirements
**Problem:** Submissions are rejected because they include unrequested features or architectural changes that the Zama team didn't ask for, making review harder.
**Fix:** Read the bounty requirements carefully. Build exactly what is specified. If you see related improvements, note them in the PR description as "out of scope — future work" rather than implementing them.
**Version:** Process — all rounds.

### 3. Missing Tests and Documentation in Submission
**Problem:** PRs are not merged (and bounties not paid) because submissions lack unit tests or do not include documentation updates for new APIs.
**Fix:** Every bounty submission must include: unit tests covering the happy path and at least one error case, updated README or docs for any new function, and a brief description of the approach in the PR.
**Version:** Required since bounty program v2 (2024).`

// ─────────────────────────────────────────────
// New skill contents
// ─────────────────────────────────────────────

const skills = [
  {
    id: 'zama/fhevm-dev-guide',
    version: '2.0.0',
    content: `# fhEVM Developer Guide: Fully Homomorphic Encryption Smart Contracts

## Overview

fhEVM lets you write Solidity smart contracts that compute directly on encrypted data. Users submit encrypted inputs; the chain stores encrypted state; computations happen in ciphertext — plaintext never appears on-chain. This guide covers the full developer workflow from installation to production patterns.

**Audience:** Solidity developers familiar with Hardhat and basic EVM concepts.

## Quick Start

\`\`\`bash
npx create-fhevm-hardhat-project my-fhe-app
cd my-fhe-app && npm install
npx hardhat compile
npx hardhat test
\`\`\`

\`\`\`solidity
// Minimal confidential counter
import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

contract Counter is SepoliaZamaFHEVMConfig {
  euint64 private count;

  constructor() {
    count = TFHE.asEuint64(0);
    TFHE.allow(count, address(this));
  }

  function increment(einput encInput, bytes calldata proof) external {
    euint64 val = TFHE.asEuint64(encInput, proof);
    count = TFHE.add(count, val);
    TFHE.allow(count, address(this));
    TFHE.allow(count, msg.sender);
  }
}
\`\`\`

## Core Concepts

| Concept | Description |
|---------|-------------|
| \`euint8/16/32/64/128/256\` | Encrypted unsigned integers |
| \`ebool\` | Encrypted boolean |
| \`eaddress\` | Encrypted address |
| \`einput\` + \`inputProof\` | How users pass encrypted values to contracts |
| \`TFHE.allow(handle, addr)\` | ACL — grants an address the right to decrypt a ciphertext |
| \`TFHE.select(cond, a, b)\` | Encrypted ternary — replaces \`if/else\` in encrypted logic |

**TFHE Operations Reference**

\`\`\`solidity
// Arithmetic
euint64 c = TFHE.add(a, b);
euint64 d = TFHE.sub(a, b);
euint64 e = TFHE.mul(a, b);    // expensive: ~200K gas

// Comparison (returns ebool)
ebool eq  = TFHE.eq(a, b);
ebool lt  = TFHE.lt(a, b);
ebool le  = TFHE.le(a, b);

// Logical
ebool and = TFHE.and(x, y);
ebool not = TFHE.not(x);

// Conditional selection
euint64 result = TFHE.select(condition, trueVal, falseVal);

// From plaintext constant
euint64 hundred = TFHE.asEuint64(100);

// From user-supplied ciphertext
euint64 amount = TFHE.asEuint64(encInput, inputProof);
\`\`\`

**Gas Reference**

| Operation | Approx Gas |
|-----------|-----------|
| TFHE.add / sub | ~50,000 |
| TFHE.mul | ~200,000 |
| TFHE.eq / lt | ~100,000 |
| TFHE.select | ~80,000 |

## Encrypted ERC-20 Pattern

\`\`\`solidity
import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

contract EncryptedToken is SepoliaZamaFHEVMConfig {
  mapping(address => euint64) private _balances;

  function transfer(address to, einput encAmount, bytes calldata proof) external {
    euint64 amount = TFHE.asEuint64(encAmount, proof);
    ebool canTransfer = TFHE.le(amount, _balances[msg.sender]);
    euint64 transferVal = TFHE.select(canTransfer, amount, TFHE.asEuint64(0));

    _balances[msg.sender] = TFHE.sub(_balances[msg.sender], transferVal);
    _balances[to]         = TFHE.add(_balances[to], transferVal);

    // Grant both parties the right to read their own balance
    TFHE.allow(_balances[msg.sender], msg.sender);
    TFHE.allow(_balances[to], to);
    TFHE.allow(_balances[to], address(this));
  }
}
\`\`\`

## Supported Networks

| Network | Chain ID | Status |
|---------|---------|--------|
| Ethereum Sepolia | 11155111 | Testnet ✅ |
| Zama Devnet | — | Dev testing |
| Mainnet | — | Roadmap |

${PITFALLS_SETUP}

## Version Notes

- **fhevm 0.6.x**: Introduced \`einput\` + \`inputProof\` pattern; deprecated direct ciphertext passing
- **fhevm 0.5.x**: \`TFHE.allow()\` ACL introduced; old \`TFHE.approve()\` removed
- **@fhevm/hardhat-plugin 0.0.1-6**: Known CoprocessorAddress bug on fresh init (see Pitfall #1)

## Resources

- Docs: https://docs.zama.ai/protocol
- Hardhat template: https://github.com/zama-ai/fhevm-hardhat-template
- Discord: https://discord.com/invite/zama
- Community: https://community.zama.ai/c/fhevm`,
  },

  {
    id: 'zama/fhe-concepts',
    version: '2.0.0',
    content: `# Fully Homomorphic Encryption (FHE) Core Concepts: Zama TFHE

## Overview

Fully Homomorphic Encryption (FHE) allows computation directly on encrypted data — the result, when decrypted, matches what you would get by computing on plaintext. Zama's TFHE scheme is the fastest practical FHE implementation and underpins fhEVM. This skill explains the theory and its practical implications for blockchain developers.

**Audience:** Developers evaluating FHE for privacy applications; architects choosing between FHE and ZK proofs.

## Quick Start — Mental Model

\`\`\`
Traditional:  Decrypt → Compute → Encrypt        (data exposed during compute)
FHE:          Encrypt(a) op Encrypt(b) = Encrypt(a op b)  (never decrypted)
\`\`\`

**Analogy:** A locked safe where you can change numbers inside without knowing the combination — only the key holder sees the result.

## Core Concepts

### FHE vs ZK Proofs

| Dimension | ZK Proof | FHE |
|-----------|---------|-----|
| Solves | "Prove I know X without revealing X" | "Compute on X without revealing X" |
| On-chain state | Can be plaintext (just proves validity) | Always ciphertext |
| Privacy scope | Prover's input | All participants' data |
| Best for | Compliance, identity, balance proofs | Private DEX, sealed auctions, confidential voting |
| Compute cost | Proof generation is heavy | Encrypted ops are heavy |
| Composability | Proof → verify | Ciphertext → operate → ciphertext |

**Key insight:** ZK and FHE are complementary, not competing. ZK proves correctness; FHE preserves privacy of state.

### Zama's TFHE Scheme

TFHE (Fast Fully Homomorphic Encryption over the Torus) is Zama's open-source FHE library optimized for:
- Boolean circuits and integer arithmetic
- Arbitrary function evaluation via Programmable Bootstrapping
- ~10-100x faster than other practical FHE schemes

**Current performance (2024):**

| Operation | Plaintext | TFHE encrypted |
|-----------|----------|----------------|
| 64-bit add | < 1 ns | ~50ms |
| 64-bit mul | < 1 ns | ~200ms |
| Comparison | < 1 ns | ~100ms |

### Zama Product Ecosystem

| Product | Purpose | Language |
|---------|---------|----------|
| TFHE-rs | Core FHE library | Rust |
| fhEVM | FHE on EVM smart contracts | Solidity |
| Concrete | General FHE compiler | Python |
| Concrete-ML | Privacy-preserving ML (scikit-learn API) | Python |

### Use Case Fit Guide

| Use Case | FHE Fit | Notes |
|----------|---------|-------|
| Private token balances | ✅ Excellent | Core fhEVM use case |
| Sealed-bid auction | ✅ Excellent | Bids stay private until reveal |
| Private voting | ✅ Excellent | Tally computed in ciphertext |
| MEV-resistant DEX | ✅ Good | Encrypted order book |
| KYC compliance proof | ⚠️ Use ZK instead | ZK better suited |
| High-frequency trading | ❌ Too slow | Gas cost prohibitive |

${PITFALLS_CONCEPTS}

## Version Notes

- **TFHE-rs 0.7.x**: Introduced GPU acceleration for cloud deployments
- **fhEVM 0.6.x**: Added \`eaddress\` and \`ebytes\` types
- **Concrete-ML 1.x**: Breaking API changes from 0.x; full scikit-learn pipeline support added

## Resources

- TFHE-rs: https://github.com/zama-ai/tfhe-rs
- fhEVM docs: https://docs.zama.ai/protocol
- Concrete ML: https://github.com/zama-ai/concrete-ml
- Research paper: https://eprint.iacr.org/2018/421`,
  },

  {
    id: 'zama/gateway-decrypt',
    version: '2.0.0',
    content: `# Gateway & Client-Side Decryption with fhevmjs

## Overview

The Gateway is Zama's decryption service that lets off-chain clients read encrypted on-chain state. When a contract stores a \`euint64\`, users can't read it directly from RPC — they need the Gateway. The \`fhevmjs\` SDK handles encryption of inputs and decryption of outputs. This skill covers the full client-side workflow.

**Audience:** Frontend developers integrating with fhEVM contracts.

## Quick Start

\`\`\`bash
npm install fhevmjs ethers
\`\`\`

\`\`\`typescript
import { createInstance } from 'fhevmjs'
import { BrowserProvider } from 'ethers'

const provider = new BrowserProvider(window.ethereum)
const signer = await provider.getSigner()

const instance = await createInstance({
  network: await provider.getNetwork(),
  gatewayUrl: 'https://gateway.sepolia.zama.ai',
})

// Encrypt an input to send to the contract
const encrypted = instance.encrypt64(100n)
await token.transfer(recipient, encrypted.handles[0], encrypted.inputProof)

// Decrypt a value from contract storage (must be ACL-authorized)
const handle = await token.balances(signer.address)
const balance = await instance.decrypt(TOKEN_ADDRESS, handle)
console.log('Balance:', balance)
\`\`\`

## Core Concepts

**How the decryption flow works:**

\`\`\`
User calls instance.decrypt(contractAddr, handle)
    ↓
fhevmjs sends request to Gateway
    ↓
Gateway verifies: is user's address ACL-authorized for this handle?
    ↓
  [Yes] → Returns plaintext value
  [No]  → Throws Unauthorized
\`\`\`

**Two decryption modes:**

| Mode | When to use | API |
|------|-------------|-----|
| Client-side (off-chain) | User reads their own data | \`instance.decrypt()\` |
| Contract callback (on-chain) | Contract needs plaintext result | \`Gateway.requestDecryption()\` |

**Instance lifecycle:**
- One instance per connected network
- Re-create on wallet network change (\`chainChanged\` event)
- Caches public keys — first \`createInstance\` is slow (~1s), subsequent calls are fast

## Full Frontend Example

\`\`\`typescript
import { createInstance, FhevmInstance } from 'fhevmjs'
import { BrowserProvider, Contract } from 'ethers'

let fhevmInstance: FhevmInstance | null = null
let currentChainId: bigint | null = null

async function getOrCreateInstance(provider: BrowserProvider): Promise<FhevmInstance> {
  const network = await provider.getNetwork()
  if (fhevmInstance && currentChainId === network.chainId) {
    return fhevmInstance
  }
  fhevmInstance = await createInstance({
    network,
    gatewayUrl: 'https://gateway.sepolia.zama.ai',
  })
  currentChainId = network.chainId
  return fhevmInstance
}

async function readEncryptedBalance(
  contractAddress: string,
  abi: unknown[],
  userAddress: string
): Promise<bigint> {
  const provider = new BrowserProvider(window.ethereum)
  const instance = await getOrCreateInstance(provider)
  const contract = new Contract(contractAddress, abi, provider)

  const handle = await contract.balances(userAddress)
  if (handle === 0n) return 0n   // uninitialized handle → zero balance

  return instance.decrypt(contractAddress, handle)
}

// Listen for network changes and reset instance
window.ethereum.on('chainChanged', () => {
  fhevmInstance = null
  currentChainId = null
})
\`\`\`

## Contract-Side Decryption (Callback Pattern)

\`\`\`solidity
import "fhevm/gateway/GatewayCaller.sol";

contract MyContract is SepoliaZamaGatewayConfig, GatewayCaller {
  uint64 public revealedValue;

  function requestReveal(euint64 secret) external {
    uint256[] memory cts = new uint256[](1);
    cts[0] = Gateway.toUint256(secret);
    Gateway.requestDecryption(
      cts,
      this.revealCallback.selector,
      0,
      block.timestamp + 100,
      false
    );
  }

  function revealCallback(uint256, uint64 result) external onlyGateway {
    revealedValue = result;
  }
}
\`\`\`

${PITFALLS_GATEWAY}

## Version Notes

- **fhevmjs 0.6.x**: \`createInstance\` now requires \`gatewayUrl\` explicitly; auto-detection removed
- **fhevmjs 0.5.x**: \`encrypt32\` / \`encrypt64\` API stabilized; older \`seal\` API deprecated
- **Gateway Sepolia**: Public endpoint, rate-limited. For production load testing, use local MockFHEVM

## Resources

- fhevmjs SDK: https://github.com/zama-ai/fhevmjs
- Gateway docs: https://docs.zama.ai/protocol/gateway
- Sepolia Gateway: https://gateway.sepolia.zama.ai
- Discord: https://discord.com/invite/zama`,
  },

  {
    id: 'zama/testing-guide',
    version: '2.0.0',
    content: `# Testing fhEVM Contracts with Hardhat

## Overview

fhEVM contracts require a specialized testing setup because standard Hardhat cannot process encrypted types. Zama provides MockFHEVM — a fast in-process simulator that runs FHE operations as plaintext arithmetic, giving you near-instant test feedback. This guide covers both MockFHEVM unit tests and Sepolia integration tests.

**Audience:** Solidity developers writing tests for fhEVM contracts.

## Quick Start

\`\`\`bash
npx create-fhevm-hardhat-project my-project
cd my-project && npm install
npx hardhat test    # runs in MockFHEVM mode by default
\`\`\`

\`\`\`typescript
import { ethers } from 'hardhat'
import { createInstances } from '../instance'  // from template

it('increments counter', async () => {
  const [alice] = await ethers.getSigners()
  const Counter = await ethers.getContractFactory('EncryptedCounter')
  const counter = await Counter.deploy()

  const instance = await createInstances(counter.target as string, ethers, alice)
  const enc = instance.encrypt64(5n)

  await counter.connect(alice).increment(enc.handles[0], enc.inputProof)

  const handle = await counter.count()
  const value = await instance.decrypt(counter.target as string, handle)
  expect(value).to.equal(5n)
})
\`\`\`

## Core Concepts

**MockFHEVM vs Real Gateway:**

| | MockFHEVM | Sepolia Gateway |
|--|----------|-----------------|
| Speed | < 1s / test | 30-60s / test |
| Real FHE | No (arithmetic simulation) | Yes |
| Network required | No | Sepolia RPC |
| Use for | Unit tests, CI | Integration, pre-deploy |

**Instance scope:**
- One \`FhevmInstance\` per (contract, signer) pair
- \`createInstances(contractAddr, ethers, signer)\` — from template helper
- Each instance can only decrypt handles authorized for its signer

**Test structure:**

\`\`\`typescript
describe('EncryptedToken', () => {
  let token: EncryptedToken
  let alice: HardhatEthersSigner
  let bob: HardhatEthersSigner
  let aliceInst: FhevmInstance
  let bobInst: FhevmInstance

  beforeEach(async () => {
    [alice, bob] = await ethers.getSigners()
    token = await (await ethers.getContractFactory('EncryptedToken')).deploy()
    await token.waitForDeployment()

    aliceInst = await createInstances(token.target as string, ethers, alice)
    bobInst   = await createInstances(token.target as string, ethers, bob)
  })

  it('confidential transfer', async () => {
    // Encrypt amount
    const enc = aliceInst.encrypt64(100n)

    // Submit tx
    const tx = await token.connect(alice).transfer(bob.address, enc.handles[0], enc.inputProof)
    await tx.wait()

    // Decrypt and assert (each user reads their own balance)
    const aliceBal = await aliceInst.decrypt(
      token.target as string,
      await token.balances(alice.address)
    )
    const bobBal = await bobInst.decrypt(
      token.target as string,
      await token.balances(bob.address)
    )

    expect(aliceBal).to.equal(900n)
    expect(bobBal).to.equal(100n)
  })
})
\`\`\`

## Running Tests

\`\`\`bash
# MockFHEVM (default)
npx hardhat test

# Specific file
npx hardhat test test/EncryptedToken.ts

# Real Sepolia Gateway
npx hardhat test --network sepolia

# With gas reporting
REPORT_GAS=true npx hardhat test
\`\`\`

## CI Configuration

\`\`\`yaml
# GitHub Actions example
- name: Run fhEVM tests
  env:
    HARDHAT_MOCK_FHEVM: "true"
  run: npx hardhat test
\`\`\`

${PITFALLS_TESTING}

## Version Notes

- **Hardhat plugin 0.0.1-6**: Known \`CoprocessorAddress undefined\` bug on fresh init (see Pitfall #1)
- **MockFHEVM v2**: Added support for \`eaddress\` and \`ebytes\` types; older mock silently returned wrong values for these
- **fhevmjs 0.6.x**: \`createInstances\` helper API changed — check template for updated signature

## Resources

- Hardhat template: https://github.com/zama-ai/fhevm-hardhat-template
- MockFHEVM docs: https://docs.zama.ai/protocol/testing
- Discord: https://discord.com/invite/zama`,
  },

  {
    id: 'zama/use-case-voting',
    version: '2.0.0',
    content: `# Confidential Voting Contract — Full Implementation

## Overview

Standard on-chain voting exposes every vote in real-time, enabling vote-buying and coercion. With fhEVM, each vote is an encrypted \`euint64\` (0 = No, 1 = Yes). The contract accumulates votes by adding ciphertexts. The tally is decrypted by the Gateway only after the owner ends voting — no intermediate results are ever visible.

**Audience:** Solidity developers building governance, polls, or any private selection mechanism.

## Quick Start

\`\`\`bash
npm install fhevm
\`\`\`

Deploy the contract below to Sepolia. Use \`fhevmjs\` on the frontend to encrypt votes before submission.

## Core Concepts

- **Private inputs:** Voter encrypts their 0/1 choice off-chain; contract never sees plaintext vote
- **Encrypted accumulation:** \`TFHE.add(encryptedTally, vote)\` works in ciphertext — running total is private
- **ACL-controlled reveal:** Only after \`endVoting()\` does the Gateway decrypt the final tally
- **Permanent vote privacy:** Individual votes are never revealed even after voting ends

## Full Solidity Implementation

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

contract EncryptedVoting is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    address public owner;
    uint256 public votingDeadline;
    bool public votingOpen;
    uint256 public plaintextTally;
    bool public resultRevealed;

    euint64 private encryptedTally;
    mapping(address => bool) public hasVoted;
    uint256 public voterCount;

    event VoteCast(address indexed voter);
    event VotingEnded(uint256 requestId);
    event ResultRevealed(uint256 tally);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor(uint256 durationSeconds) {
        owner = msg.sender;
        votingOpen = true;
        votingDeadline = block.timestamp + durationSeconds;
        encryptedTally = TFHE.asEuint64(0);
        TFHE.allow(encryptedTally, address(this));
    }

    function vote(einput encryptedVote, bytes calldata inputProof) external {
        require(votingOpen, "Voting closed");
        require(block.timestamp < votingDeadline, "Past deadline");
        require(!hasVoted[msg.sender], "Already voted");

        euint64 v = TFHE.asEuint64(encryptedVote, inputProof);
        encryptedTally = TFHE.add(encryptedTally, v);
        TFHE.allow(encryptedTally, address(this));

        hasVoted[msg.sender] = true;
        voterCount++;
        emit VoteCast(msg.sender);
    }

    function endVoting() external onlyOwner {
        require(votingOpen, "Already ended");
        require(block.timestamp >= votingDeadline, "Voting period not over");
        votingOpen = false;

        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(encryptedTally);
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.decryptionCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        emit VotingEnded(requestId);
    }

    function decryptionCallback(uint256, uint64 result) external onlyGateway {
        plaintextTally = result;
        resultRevealed = true;
        emit ResultRevealed(result);
    }
}
\`\`\`

## Frontend Integration

\`\`\`typescript
import { createInstance } from 'fhevmjs'

const instance = await createInstance({ network, gatewayUrl: 'https://gateway.sepolia.zama.ai' })
const encrypted = instance.encrypt64(1n)  // 1 = Yes, 0 = No

// Cast vote
await voting.vote(encrypted.handles[0], encrypted.inputProof)

// Wait for result after owner calls endVoting()
// ⚠️ Do NOT poll plaintextTally immediately — Gateway callback takes 30-60s on testnet
voting.on('ResultRevealed', (tally) => {
  const total = await voting.voterCount()
  console.log(\`Yes: \${tally} / \${total} (\${Number(tally) * 100 / Number(total)}%)\`)
})
\`\`\`

## vs. Public On-chain Voting

| Property | Public Voting | fhEVM Voting |
|----------|--------------|--------------|
| Vote privacy | None | Full |
| Running tally visible | Yes | No |
| Gas cost | Low (~50K) | Higher (~300K/vote) |
| Coercion resistance | Low | High |
| Tally auditability | Full | After reveal only |

${PITFALLS_VOTING}

## Version Notes

- **fhevm 0.6.x**: \`GatewayCaller\` base contract and \`onlyGateway\` modifier required; older callback pattern without \`GatewayCaller\` is deprecated
- **Gateway callback timing**: Sepolia Gateway decryption takes 30-90s; Zama Devnet is faster for testing
- **\`einput\` validation**: fhevm 0.6+ validates that the input proof matches the encrypted value; contracts on 0.5.x that skipped proof validation should be upgraded

## Resources

- fhEVM docs: https://docs.zama.ai/protocol
- GatewayCaller reference: https://docs.zama.ai/protocol/gateway/gateway-caller
- Example: https://github.com/zama-ai/fhevm/tree/main/examples
- Discord: https://discord.com/invite/zama`,
  },

  {
    id: 'zama/grant-bounty',
    version: '2.0.0',
    content: `# Zama Grants & Bounty Program

## Overview

Zama runs two funding programs for FHE developers: a bounty platform for scoped tasks (paying $200–$10,000+) and a grants program for larger projects ($1K–$200K). Both are actively funded and regularly updated with new opportunities. This skill covers how to find, claim, and successfully complete bounties, and how to apply for grants.

**Audience:** Developers and builders interested in getting funded for FHE work.

## Quick Start

1. Browse bounties: https://bounty.zama.ai
2. Join Discord to see announcements: https://discord.com/invite/zama
3. Comment on a GitHub issue to claim a bounty *before starting work*
4. Submit PR with tests + docs included

## Core Concepts

### Bounty Platform (bounty.zama.ai)

**Bounty categories:**

| Category | Description | Reward Range |
|----------|-------------|--------------|
| fhEVM Use Cases | New confidential smart contracts | $500 – $10,000+ |
| TFHE-rs Optimizations | Rust FHE library improvements | $1,000 – $15,000 |
| Concrete-ML Models | Privacy-preserving ML with scikit-learn | $500 – $5,000 |
| Documentation | Guides, translations, video content | $200 – $2,000 |
| Bug Reports | Security vulnerabilities | Up to $50,000 |

**Bounty lifecycle:**
1. Issue posted on GitHub with bounty label
2. Developer comments to claim
3. Developer submits PR referencing the issue
4. Zama reviews (typically 1-2 weeks)
5. Payout in USDC after merge

### Grants Program (zama.ai/grants)

**What gets funded:**

| Type | Examples | Range |
|------|---------|-------|
| Micro Grant | PoC, small tools, plugin | $1K – $10K |
| Standard Grant | Full protocol, significant tooling | $10K – $100K |
| Research Grant | Academic work, benchmarking | $50K – $200K |

**Strong application signals:**
- Clear FHE-specific problem statement
- Working prototype or prior bounty contributions
- Milestone-based delivery timeline
- Team with Solidity + cryptography background (or prior fhEVM experience)

## What Gets Accepted

High-signal project categories for 2024-2025:
- Confidential DeFi primitives (AMM, lending with hidden balances)
- Developer tooling (fhEVM IDE plugins, gas estimators, debuggers)
- Cross-chain FHE bridges
- Privacy-preserving on-chain games
- fhEVM + ZK hybrid architectures

## Application Template (Grants)

\`\`\`markdown
## Project: [Name]

**Problem:** What on-chain privacy problem does this solve?
**FHE usage:** Which Zama products (fhEVM / TFHE-rs / Concrete-ML)?
**Prototype:** Link to repo or demo
**Milestones:**
- Week 1-4: ...
- Week 5-8: ...
**Team:** Background and relevant experience
**Funding requested:** $X
\`\`\`

${PITFALLS_BOUNTY}

## Version Notes

- **Bounty program v2 (2024):** Tests and documentation became mandatory requirements; previously optional
- **Grant process update (2024 Q3):** Applications now reviewed on a rolling basis (previously quarterly cohorts)
- **USDC payouts:** Zama switched from ETH to USDC payouts in 2023; ensure your wallet address supports USDC on Ethereum mainnet

## Resources

- Bounty platform: https://bounty.zama.ai
- Grants application: https://zama.ai/grants
- Discord: https://discord.com/invite/zama
- Community forum: https://community.zama.ai
- Twitter/X: https://x.com/zama_fhe`,
  },
]

async function main() {
  console.log('Upgrading Zama skills to Level 2 content...\n')

  for (const skill of skills) {
    const { error } = await client
      .from('skills')
      .update({ content: skill.content, version: skill.version })
      .eq('id', skill.id)

    if (error) {
      console.error(`✗ Failed ${skill.id}: ${error.message}`)
    } else {
      console.log(`✓ Updated ${skill.id} (v${skill.version})`)
    }
  }

  console.log('\nAll done!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
