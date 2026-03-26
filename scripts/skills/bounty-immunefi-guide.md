---
name: Immunefi Bug Bounty Program Guide
description: Complete guide to participating in Immunefi, the largest Web3 bug bounty platform protecting $190B+ in assets.
ecosystem: multichain
type: bounty-guide
source: community
confidence: high
version: 1.0.0
time_sensitivity: evergreen
tags:
  - bounty
  - security
  - web3
  - immunefi
  - bug-bounty
updated_at: 2026-03-26T00:00:00.000Z
---

# Immunefi Bug Bounty Program Guide

## Introduction to Immunefi

Immunefi is the largest Web3 bug bounty platform in the world, protecting over $190 billion in user funds across hundreds of blockchain protocols. Founded in 2020, Immunefi has paid out over $100 million in bounty rewards to security researchers who discover and responsibly disclose vulnerabilities in smart contracts, DeFi protocols, and blockchain infrastructure.

The platform bridges the gap between security researchers (whitehats) and Web3 projects that need their code audited and secured. Unlike traditional bug bounty platforms, Immunefi specializes exclusively in blockchain and smart contract security, with bounty rewards that can reach into the millions of dollars for critical findings.

## How to Participate

### Step 1: Register and Set Up Your Profile
- Create an account at immunefi.com with a valid email address
- Complete your whitehat profile with your experience, skills, and wallet address for receiving payments
- Read and accept the platform's terms of service and responsible disclosure policy

### Step 2: Browse Available Programs
- Navigate to the "Bug Bounties" section to see all active programs
- Filter by blockchain ecosystem, reward range, or program type
- Each program has a dedicated page with scope definition, reward tiers, and special rules
- Look for programs with high total value locked (TVL) — these often have the most impactful vulnerabilities

### Step 3: Select Your Target
- Choose programs where you have domain expertise (e.g., DeFi AMMs, lending protocols, bridges)
- Review the in-scope and out-of-scope assets carefully before starting
- Check the program's "Known Issues" section to avoid submitting already-identified vulnerabilities
- Study the protocol's documentation, whitepaper, and existing audits

### Step 4: Submit Your Report
- Write a detailed, structured report following Immunefi's report format
- Include clear proof of concept (PoC) demonstrating the vulnerability
- Submit through the Immunefi platform portal — never contact the project directly first

## Report Format Requirements

A high-quality Immunefi report must include:

**Impact Statement**: Clearly describe what an attacker can achieve by exploiting the vulnerability. Be specific about the business impact — fund loss, protocol manipulation, data exposure, etc.

**Root Cause Analysis**: Explain the underlying technical cause of the vulnerability. Reference specific smart contract functions, lines of code, or protocol logic that contains the flaw.

**Proof of Concept (PoC)**: Provide working code that demonstrates the vulnerability can be exploited. Use Foundry or Hardhat tests, including a fork test against mainnet state if applicable. The PoC should be reproducible by the triage team.

**Recommended Fix**: Suggest a concrete code change or architectural improvement that would remediate the vulnerability.

**References**: Link to relevant documentation, similar past vulnerabilities, or EIPs/standards that apply.

## Severity Classification and Reward Ranges

Immunefi uses a standardized severity framework based on the potential impact:

**Critical** ($50,000 – $10,000,000+)
- Direct theft or loss of user funds
- Permanent freezing of funds in any amount
- Minting of unbacked tokens
- Chain reorganization attacks causing double-spend

**High** ($10,000 – $100,000)
- Temporary freezing of funds exceeding $1M
- Significant economic manipulation (e.g., oracle price manipulation)
- Unauthorized privilege escalation to admin roles

**Medium** ($1,000 – $25,000)
- Temporary freezing of funds under $1M
- Theft of unclaimed yield or fees
- Smart contract fails to perform advertised function

**Low** ($100 – $5,000)
- Contract fails gracefully under edge cases
- Minor economic inefficiencies
- User experience degradations

## Historic Largest Bounty Payouts

Immunefi has facilitated some of the largest bug bounty payouts in history:

- **Wormhole Bridge — $10,000,000**: A critical vulnerability in the cross-chain bridge's guardian verification logic that could have allowed minting of unbacked tokens.
- **Aurora Engine — $6,000,000**: A critical flaw in the Ethereum compatibility layer that could drain the NEAR protocol's Aurora treasury.
- **Poly Network — $5,000,000**: A reward offered for return of funds after a $611M hack, setting a precedent for crisis bounties.
- **Polygon — $2,000,000**: A vulnerability in the Plasma bridge that could have allowed double-spend attacks.
- **Optimism — $2,000,000**: A critical bug in the OP Stack that could allow infinite ETH minting.

## Common Reasons for Rejection

Understanding why reports get rejected helps researchers focus on high-quality submissions:

**Out of Scope**: The affected contract or asset is not listed in the program's scope. Always verify the exact contract addresses and repositories before submitting.

**Duplicate Finding**: Another researcher already reported the same vulnerability. Immunefi uses a first-to-report policy for deduplication.

**Known Issue**: The vulnerability is listed in the project's known issues section or was reported in a previous audit. Check audit reports from Certik, Trail of Bits, OpenZeppelin, etc.

**Insufficient Impact**: The finding requires impractical preconditions (e.g., compromised admin key, MEV conditions that cost more than the gain) or the impact doesn't meet the minimum threshold.

**Invalid PoC**: The proof of concept doesn't work, relies on incorrect assumptions, or contains logical errors.

**Theoretical Only**: The submission describes a theoretical attack without demonstrating it is actually exploitable in the current deployment.

## Tips for Improving Success Rate

1. **Specialize in protocol types**: Become an expert in AMMs, lending protocols, bridges, or liquid staking — don't try to audit everything.

2. **Study past exploits**: Review DeFi hacks on Rekt.news and understand the vulnerability classes. Flash loan attacks, reentrancy, oracle manipulation, and access control bugs are perennial favorites.

3. **Build a test environment**: Use Foundry's fork testing to test exploits against mainnet state with real protocol data and actual token balances.

4. **Read the code, not just the docs**: Smart contract behavior is defined by code, not documentation. Discrepancies between the two are often vulnerability indicators.

5. **Time your research**: New protocol launches and major upgrades are high-opportunity moments. Monitor GitHub repositories for recent code changes.

6. **Write detailed reports**: Triage teams review hundreds of submissions. Clear, well-structured reports with working PoCs get prioritized and approved faster.
