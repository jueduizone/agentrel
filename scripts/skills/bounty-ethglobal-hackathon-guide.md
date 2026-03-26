---
name: ETHGlobal Hackathon Complete Guide
description: Complete guide to participating in and winning ETHGlobal hackathons, the world's largest Ethereum hackathon series.
ecosystem: ethereum
type: hackathon-guide
source: community
confidence: high
version: 1.0.0
time_sensitivity: evergreen
tags:
  - hackathon
  - ethglobal
  - ethereum
  - web3
  - competition
updated_at: 2026-03-26T00:00:00.000Z
---

# ETHGlobal Hackathon Complete Guide

## Introduction to ETHGlobal

ETHGlobal is the world's largest Ethereum hackathon series, having run over 60 events across 20+ cities and online platforms since 2017. With over 50,000 builders participating globally, ETHGlobal events serve as a proving ground for the next generation of Web3 applications and have launched dozens of projects that became major protocols.

ETHGlobal is backed by the Ethereum Foundation and top Web3 infrastructure companies. Their hackathons are known for exceptionally high prize pools (often $500,000+), world-class mentorship, and direct access to protocol teams as sponsor judges. Alumni include projects like Uniswap v2 (originated as a hackathon demo), Safe, Flashbots, and many others.

## Major ETHGlobal Events

### ETHGlobal Online (Virtual, Quarterly)
- Fully remote format accessible worldwide
- 4-week submission window with weekly workshops
- Prize pools typically $300,000–$500,000
- Ideal for first-time participants and solo hackers
- Recent editions: ETHGlobal Online (March 2026), Superhack

### ETHDenver (Denver, CO — February/March)
- Largest Ethereum hackathon in North America, co-located with ETHDenver conference
- 10,000+ attendees, 1,000+ hackers
- Prize pool often exceeds $1,000,000 across sponsor tracks
- Requires travel to Denver; limited spots for hackathon track

### ETHGlobal Istanbul / Bangkok / Singapore
- Annual flagship in-person hackathons rotating between global cities
- 48-hour intensive format with 800–1,200 hackers
- Direct access to 30+ sponsor teams for technical support
- Highly competitive; project quality is typically very high

### ETHGlobal Scaling Hackathons (Pragma)
- Focus on specific scaling or infrastructure challenges
- Smaller, more specialized events with deep technical focus

## Competition Format

### 48-Hour Hackathon Structure
Most in-person ETHGlobal events follow a strict 48-hour format:
- **Hour 0**: Opening ceremony, sponsor introductions, track announcements
- **Hours 1–6**: Team formation, ideation, environment setup
- **Hours 6–42**: Core building phase — most successful teams code 80% of their project here
- **Hours 42–47**: Demo preparation, README writing, video recording
- **Hour 48**: Submission deadline — hard cutoff, no exceptions

### Sponsor Tracks
Each hackathon has 15–40 sponsor tracks, each with their own prize pool and judging criteria. Sponsors include:
- **Infrastructure**: Alchemy, Infura, The Graph, Chainlink, IPFS
- **L2s**: Optimism, Arbitrum, Base, Polygon, zkSync, Starknet
- **DeFi**: Uniswap, Aave, Compound, 1inch
- **Wallets/AA**: Safe, Biconomy, Pimlico, ZeroDev

Each sponsor defines their own judging criteria for their track bounty, separate from the main hackathon prizes.

### Prize Pool Structure
- **Grand Prize**: Usually 1–3 winners, $10,000–$50,000 each
- **Category Prizes**: Best DeFi, Best NFT, Best Infrastructure, etc.
- **Sponsor Bounties**: $500–$25,000 per sponsor, multiple winners per track
- **Special Awards**: Best first-time hacker, best solo project

## Registration and Team Formation

### Registration
- Monitor ethglobal.com and @ETHGlobal on Twitter for event announcements
- Apply early — popular in-person events fill within hours of opening
- Build application requires: GitHub profile, brief project description, motivation statement
- For online hackathons, registration is typically open to all

### Team Formation Strategies
- **Pre-formed teams (3–4 people)**: Strongest approach; agree on roles before the event
  - Roles: Smart contract dev, frontend dev, product/design, researcher
- **Find teammates at the event**: Use #find-a-team channels in Discord and opening mixer
- **Solo hacking**: Viable for online events, very difficult for in-person 48h format
- **Optimal team size**: 3–4 people; 2 can work but is stressful; 5+ leads to coordination overhead

## Evaluation Criteria

ETHGlobal judges evaluate projects on:

**Innovation (30%)**: Is the idea genuinely new or significantly better than existing solutions? Does it solve a real problem in a novel way? Judges have seen thousands of projects — clichéd ideas score poorly.

**Technical Execution (35%)**: Does the code actually work? Is the architecture sound? Are smart contracts secure and well-tested? Front-end polished? Can the team demonstrate it live without it breaking?

**Business / Real-World Potential (20%)**: Is there a market for this? Can it grow beyond the hackathon? Does the team understand their user and competitive landscape?

**Alignment with Ethereum Ethos (15%)**: Does the project leverage Ethereum's unique properties (composability, permissionlessness, censorship resistance)? Does it contribute to the decentralized web?

## Top Project Types by Category

Analysis of 500+ ETHGlobal winners reveals these high-performing categories:

**Account Abstraction and Smart Wallets**
- User-friendly wallets with session keys, social recovery, gasless transactions
- Teams using ERC-4337, Safe{Core}, Biconomy, ZeroDev score well across sponsor tracks

**Zero-Knowledge Proofs**
- ZK identity, ZK proofs for compliance, private DeFi, ZK gaming
- Complex to build but scores very high on technical execution and innovation
- Use zkSync, Starknet, Noir, Circom, or Risc Zero

**AI + Web3 Integration**
- On-chain AI agents, verifiable AI inference, AI-governed DAOs
- Rapidly growing category since 2024; high innovation scores

**DeFi Infrastructure**
- Novel AMM mechanisms, intent-based protocols, cross-chain liquidity
- High technical bar but clear product-market fit if well executed

**Consumer Crypto**
- Crypto gaming, social apps, creator monetization, micro-payments
- Judges increasingly reward projects with real UX polish

## How to Win Sponsor Bounties

Sponsor bounty strategy is often more achievable than competing for grand prizes:

1. **Pick 3–5 sponsor tracks on Day 1**: Choose sponsors whose tech stacks you know or can quickly learn. Don't spread across all 30 sponsors.

2. **Read the sponsor brief carefully**: Each sponsor posts detailed requirements. Some want demos of their specific API; others want novel use cases. Match your project to their stated goals.

3. **Use their SDK/API explicitly**: Judges check if you actually used their product. Wrap their technology in a non-trivial way — don't just initialize the client and do nothing with it.

4. **Talk to sponsor reps at their booths**: Build relationships during the hackathon. Sponsor judges are often the same engineers you met at the booth. This is not inappropriate — it's expected.

5. **Submit to sponsor tracks before the deadline**: Many hackathons have separate submission flows for sponsor tracks. Don't miss these.

## Demo and Pitch Tips

**Live Demo**
- Practice your demo 5+ times before judging
- Have a recorded backup video in case of internet issues
- Show a working product, not slides describing a hypothetical
- If contracts aren't deployed to mainnet, explain why (cost, time) and demo on testnet clearly

**3-Minute Pitch Structure**
1. **Hook (15s)**: One sentence — what problem does your project solve?
2. **Problem (30s)**: Make judges feel the pain point
3. **Demo (90s)**: Show the product working, not slides
4. **Tech Stack (20s)**: Briefly explain what you built and what sponsor tech you used
5. **Future Vision (25s)**: What would this become with more time/funding?

**Common Mistakes**
- Spending too much time on problem statement, not enough on demo
- Explaining technical architecture instead of showing user value
- Demos that break during judging with no backup plan
- Teams with unclear ownership (who is the founder?)
