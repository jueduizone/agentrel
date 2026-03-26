---
name: Code4rena Competitive Audit Guide
description: Complete guide to participating as a Warden in Code4rena competitive smart contract audits and maximizing your earnings.
ecosystem: ethereum
type: bounty-guide
source: community
confidence: high
version: 1.0.0
time_sensitivity: evergreen
tags:
  - bounty
  - security
  - audit
  - code4rena
  - smart-contracts
updated_at: 2026-03-26T00:00:00.000Z
---

# Code4rena Competitive Audit Guide

## Introduction to Code4rena

Code4rena (C4) is the leading platform for competitive smart contract security audits, having paid out over $25 million to security researchers (called Wardens) since its founding in 2021. The platform operates on a competition model where multiple Wardens audit the same codebase simultaneously, with rewards allocated based on the severity and uniqueness of findings.

**Code4rena vs Sherlock**: The two main competitive audit platforms have different models. Code4rena uses a points-based leaderboard where rewards scale with finding quality and uniqueness. Sherlock uses a more structured contest format with explicit judge involvement and a separate "judging" phase. C4 typically attracts larger fields of Wardens; Sherlock has higher per-finding rewards but more stringent validity requirements. Both are valuable, and top security researchers participate in both.

Code4rena's competitive model creates strong incentives: a Warden who finds a critical vulnerability that others missed can earn $10,000–$100,000 from a single contest, while a Warden who submits only duplicate findings earns zero.

## The Warden Role

### Becoming a Warden
1. Register at code4rena.com with a GitHub account
2. Complete your Warden profile with bio, credentials, and payment wallet
3. Browse upcoming and active contests — no application required to participate
4. Submit your first findings to earn your initial leaderboard ranking

### The Points and Ranking System
C4 uses a rolling leaderboard based on "award points" earned from valid findings:
- **High severity findings**: 3x multiplier on award share
- **Medium severity findings**: 1x multiplier
- **Gas optimizations**: Separate pool, lower multiplier
- **QA reports**: Fixed allocation from a QA pool

**Leaderboard tiers**: Certified Lead Senior Auditor, Certified Auditor, and general Warden. Higher-tier Wardens get access to private contests with significantly higher prize pools (often $200,000+) and less competition.

**Advancing tiers**: Consistently perform in the top 10 of multiple public contests and pass Code4rena's certification process (which includes a review of your methodology and sample audit work).

## Competition Structure

### Typical Contest Timeline
- **Duration**: 3–7 days for most contests; up to 14 days for large codebases
- **Day 1–2**: Read docs, map codebase, focus on high-complexity areas
- **Day 3–5**: Deep dive on critical paths, write PoCs for suspected vulnerabilities
- **Final hours**: Polish reports, submit findings through the C4 portal
- **Post-contest**: Judge reviews submissions, deduplication, severity adjustments
- **Awards**: Distributed 2–4 weeks after contest closes

### Finding Categories

**High Severity**: Direct loss of funds, critical system failure, or broken core invariants. Examples:
- Reentrancy enabling fund drainage
- Access control bypass allowing admin operations
- Integer overflow/underflow causing incorrect accounting
- Logic errors in liquidation or price calculation

**Medium Severity**: Indirect loss of funds, protocol malfunction under certain conditions. Examples:
- Flash loan price manipulation affecting a secondary calculation
- Denial of service under specific token or state conditions
- Incorrect slippage handling causing suboptimal trades

**Low Severity / Non-Critical**: Minor issues that don't directly risk funds. Often bundled into a QA report rather than individual submissions.

**Gas Optimizations (GAS)**: Opportunities to reduce transaction costs. Aggregated into a Gas report with a separate prize pool.

**QA Report**: A comprehensive report of low-severity and non-critical findings, graded A/B/C, with a fixed prize pool allocation.

## Valid vs Invalid Findings

Understanding the deduplication and validation process is crucial to maximizing earnings:

### What Makes a Finding Valid
- **Exploitable under realistic conditions**: The attack must be achievable without requiring compromised keys or impossibly precise timing
- **Within scope**: Only contracts/functions listed in the contest's scope document count
- **Reproducible**: Must include a working PoC or clear step-by-step explanation
- **Novel**: Not mentioned in the protocol's own documentation as a known limitation

### Common Duplicate Scenarios
- Same root cause, different manifestation: Only the most impactful instance is credited
- Same bug found by 10 Wardens: Award is split among all valid submitters (pro-rated by severity)
- Race condition between similar issues: Judge determines which is the "parent" finding

### Common Invalid Scenarios
- **Requires admin compromise**: If the attack assumes a malicious deployer or owner, it's typically invalid
- **Centralization risk without impact**: Noting that an admin can pause the protocol is not a finding unless it creates an exploitable scenario
- **Test environment artifacts**: Issues only present in test files or deployment scripts
- **Documentation inconsistencies**: Discrepancies between comments and code that don't affect behavior
- **Theoretical maximum gas costs**: Gas-related DoS findings require demonstrating actual cost thresholds

## High-Efficiency Audit Strategy

### Protocol Prioritization
Focus audit time on contest types where vulnerabilities are most frequent:

**DeFi Lending/Borrowing Protocols** (Aave forks, custom lending)
- Check: Liquidation price math, interest rate accumulation, collateral factor edge cases
- Common bugs: Off-by-one in health factor, flash loan during liquidation, precision loss in rate calculations

**Automated Market Makers**
- Check: Fee-on-transfer token compatibility, price manipulation via donation, K invariant maintenance
- Common bugs: Sandwich attack vectors, virtual reserves accounting, pool imbalance edge cases

**Cross-Chain Bridges**
- Check: Message replay protection, validator set updates, token reconciliation
- Common bugs: Missing nonce validation, incorrect chain ID checks, fund locking on failed messages

**Proxy and Upgrade Patterns**
- Check: Storage slot collisions, initialization function security, implementation contract selfdestruct
- Common bugs: Uninitialized proxies, storage layout changes breaking upgrades, delegatecall to attacker-controlled addresses

**Access Control and Permission Systems**
- Check: Role assignment/revocation logic, timelock bypass conditions, multi-sig requirements
- Common bugs: Missing access modifiers, incorrect role hierarchy, initialization without access control

### Time Allocation Framework
For a 5-day contest on a 2,000 line codebase:
- **Day 1 (8h)**: Read all docs, map all external calls, draw architecture diagram, list all state variables
- **Day 2 (8h)**: Audit highest-complexity contracts (core logic, math-heavy functions)
- **Day 3 (6h)**: Audit peripheral contracts, integration points, access control
- **Day 4 (6h)**: Deep dive on 3–5 suspicious areas identified in previous days, write PoCs
- **Day 5 (4h)**: Write and polish reports, submit QA/Gas reports

## Recommended Tools

### Static Analysis
- **Slither**: Python-based static analyzer from Trail of Bits. Run `slither . --filter-paths test` to skip test files. Generates detector reports for common vulnerability classes.
- **4naly3er**: C4-specific automated analyzer that generates Gas and QA report templates. Saves 1–2 hours on every contest.
- **Semgrep**: Rule-based pattern matching for custom vulnerability checks.

### Dynamic Analysis and Testing
- **Foundry (forge)**: Industry-standard testing framework. Use `forge test --fork-url $RPC_URL -vvv` for mainnet fork testing. Write invariant tests with `forge invariant` to fuzz state transitions.
- **Echidna**: Property-based fuzzer from Trail of Bits. Excellent for finding arithmetic errors and invariant violations automatically.
- **Medusa**: Next-generation fuzzer compatible with Foundry configuration.

### Visualization and Code Reading
- **Surya**: Generates call graphs and inheritance diagrams for Solidity code. Invaluable for understanding complex proxy patterns.
- **sol2uml**: Creates UML class diagrams from Solidity source.
- **VSCode + Solidity extension**: Use "Go to Definition" and "Find All References" extensively to trace data flows.

## High-Frequency Vulnerability Classes

Analysis of 300+ Code4rena findings across $15M+ in awards reveals these top vulnerability patterns:

1. **Precision and Rounding Errors (18%)**: Division before multiplication, truncation in interest calculations, incorrect decimal handling in price feeds

2. **Reentrancy (14%)**: Cross-function reentrancy, cross-contract reentrancy via callbacks, ERC-777 hooks

3. **Price Oracle Manipulation (13%)**: Spot price reliance, single-block TWAP, Uniswap V2 flash loan price distortion

4. **Access Control Issues (12%)**: Missing modifiers, incorrect role checks, initialization without protection

5. **Integer Overflow/Underflow (9%)**: Solidity <0.8.0 codebases, unchecked blocks in 0.8.x code, casting between int/uint

6. **Logic Errors in Core Math (9%)**: Incorrect fee calculations, wrong reward distribution logic, off-by-one in epoch counting

7. **Flash Loan Attack Vectors (8%)**: Single-transaction price manipulation, governance attacks, collateral self-referential valuation

8. **Denial of Service (7%)**: Unbounded loops, block gas limit issues, griefing via dust deposits

9. **Front-Running / MEV (6%)**: Slippage without deadline, approve race conditions, oracle update sandwiching

10. **Signature Replay Attacks (4%)**: Missing nonce, missing chain ID, missing contract address in signed message
