const SUPABASE_URL = 'https://zkpeutvzmrfhlzpsbyhr.supabase.co'
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcGV1dHZ6bXJmaGx6cHNieWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjk1MTI0MSwiZXhwIjoyMDg4NTI3MjQxfQ.DtvWVp2SrwNrfR503XjPUiW_H_T4GRrHqCTnjMZb9hI'

const WAGMI_CONTENT = `---
id: ethereum/wagmi-v2
name: wagmi v2 React Hooks
version: 2.0.0
ecosystem: ethereum
type: docs
time_sensitivity: evergreen
source: verified
confidence: high
maintainer: wagmi contributors
last_updated: 2026-03-19
---

## Overview

wagmi v2 is the definitive React Hooks library for Ethereum. It is built on top of viem and TanStack Query, providing type-safe, performant hooks for reading and writing to the blockchain. wagmi v2 is a significant rewrite from v1 with breaking changes.

## Core Hooks

### useAccount
\`\`\`typescript
import { useAccount } from 'wagmi'

function Profile() {
  const { address, isConnected, chain } = useAccount()
  if (!isConnected) return <div>Not connected</div>
  return <div>Connected: {address} on {chain?.name}</div>
}
\`\`\`

### useConnect / useDisconnect
\`\`\`typescript
import { useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

function ConnectButton() {
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  return (
    <button onClick={() => connect({ connector: injected() })}>
      Connect Wallet
    </button>
  )
}
\`\`\`

### useReadContract
\`\`\`typescript
import { useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'

const { data: balance } = useReadContract({
  address: '0xTokenAddress',
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: ['0xUserAddress'],
})
\`\`\`

### useWriteContract
\`\`\`typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

function MintButton() {
  const { writeContract, data: hash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  return (
    <button onClick={() =>
      writeContract({
        address: '0xNFTContract',
        abi: nftAbi,
        functionName: 'mint',
        args: [1n],
        value: parseEther('0.01'),
      })
    }>
      {isSuccess ? 'Minted!' : 'Mint NFT'}
    </button>
  )
}
\`\`\`

## v1 → v2 Migration Key Points

- **Config**: Use \`createConfig\` with \`transports\` (viem) instead of \`configureChains\`
- **Providers removed**: Replace \`publicProvider()\` with viem HTTP transport
- **useContractRead → useReadContract**: Renamed, same API
- **useContractWrite → useWriteContract**: Now returns \`writeContract\` (sync) not \`write\`
- **usePrepareContractWrite removed**: No longer needed; write directly
- **BigNumber → bigint**: All numeric values use native bigint

\`\`\`typescript
// v2 config setup
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})
\`\`\`

## Installation
\`\`\`bash
npm install wagmi viem@2.x @tanstack/react-query
\`\`\`

## Reference
- [wagmi docs](https://wagmi.sh)
- [Migration guide v1→v2](https://wagmi.sh/react/guides/migrate-from-v1-to-v2)
`

const VIEM_CONTENT = `---
id: ethereum/viem-quickstart
name: viem TypeScript Client
version: 2.0.0
ecosystem: ethereum
type: docs
time_sensitivity: evergreen
source: verified
confidence: high
maintainer: viem contributors
last_updated: 2026-03-19
---

## Overview

viem is a lightweight, type-safe TypeScript library for Ethereum. It is the modern replacement for ethers.js, offering tree-shakeable modules, first-class TypeScript types, and a cleaner API. wagmi v2 is built on viem.

## Public Client (Read-Only)

\`\`\`typescript
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
  chain: mainnet,
  transport: http(), // uses public RPC or provide URL: http('https://...')
})

// Read balance
const balance = await client.getBalance({ address: '0x...' })

// Read contract
import { erc20Abi } from 'viem'
const symbol = await client.readContract({
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  abi: erc20Abi,
  functionName: 'symbol',
})
// → 'USDC'
\`\`\`

## Wallet Client (Write)

\`\`\`typescript
import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY')
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
})

// Send ETH
const hash = await walletClient.sendTransaction({
  to: '0xRecipient',
  value: parseEther('0.01'),
})

// Write contract
const txHash = await walletClient.writeContract({
  address: '0xContract',
  abi: contractAbi,
  functionName: 'transfer',
  args: ['0xRecipient', parseUnits('100', 18)],
})
\`\`\`

## Simulate Before Write

\`\`\`typescript
// Always simulate first to catch reverts before spending gas
const { request } = await client.simulateContract({
  address: '0xContract',
  abi: contractAbi,
  functionName: 'transfer',
  args: ['0xRecipient', 100n],
  account,
})
const hash = await walletClient.writeContract(request)
\`\`\`

## vs ethers.js

| Feature | viem | ethers.js v6 |
|---------|------|--------------|
| Bundle size | ~35kB (tree-shakeable) | ~120kB |
| TypeScript | First-class, ABI inference | Good |
| BigInt | Native bigint | Native bigint |
| API style | Functional | Class-based |
| wagmi support | Official | Community |

## Utilities

\`\`\`typescript
import { parseEther, formatEther, parseUnits, formatUnits, isAddress, getAddress } from 'viem'

parseEther('1.0')        // → 1000000000000000000n
formatEther(1000000000000000000n)  // → '1'
isAddress('0x...')       // → boolean
getAddress('0x...')      // checksum address
\`\`\`

## Installation
\`\`\`bash
npm install viem
\`\`\`

## Reference
- [viem docs](https://viem.sh)
- [viem GitHub](https://github.com/wevm/viem)
`

const ANCHOR_CONTENT = `---
id: solana/anchor-idl
name: Anchor IDL & CPI Guide
version: 0.30.0
ecosystem: solana
type: docs
time_sensitivity: evergreen
source: verified
confidence: high
maintainer: Coral (Anchor)
last_updated: 2026-03-19
---

## Overview

Anchor is the standard framework for Solana program development. It provides a Rust DSL, automatic IDL (Interface Description Language) generation, and a TypeScript client. This skill covers IDL structure, CPI (Cross-Program Invocation), and account constraints.

## IDL Structure

After \`anchor build\`, the IDL is generated at \`target/idl/<program>.json\`:

\`\`\`json
{
  "version": "0.1.0",
  "name": "my_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "counter", "isMut": true, "isSigner": false },
        { "name": "user", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [{ "name": "initValue", "type": "u64" }]
    }
  ],
  "accounts": [
    {
      "name": "Counter",
      "type": { "kind": "struct", "fields": [{ "name": "count", "type": "u64" }] }
    }
  ]
}
\`\`\`

## Account Constraints

\`\`\`rust
use anchor_lang::prelude::*;

#[program]
mod my_program {
    pub fn initialize(ctx: Context<Initialize>, init_value: u64) -> Result<()> {
        ctx.accounts.counter.count = init_value;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 8,  // discriminator + u64
        seeds = [b"counter", user.key().as_ref()],
        bump
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Counter {
    pub count: u64,
}
\`\`\`

## CPI (Cross-Program Invocation)

\`\`\`rust
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub fn transfer_tokens(ctx: Context<TransferCtx>, amount: u64) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.from.to_account_info(),
        to: ctx.accounts.to.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
\`\`\`

## CPI with PDA Signer

\`\`\`rust
// PDA signs on behalf of the program
let seeds = &[b"vault", &[ctx.bumps.vault]];
let signer_seeds = &[&seeds[..]];
let cpi_ctx = CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    cpi_accounts,
    signer_seeds,
);
\`\`\`

## TypeScript Client

\`\`\`typescript
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor'
import { MyProgram, IDL } from './idl/my_program'

const provider = AnchorProvider.env()
const program = new Program<MyProgram>(IDL, provider)

// Call instruction
await program.methods
  .initialize(new BN(42))
  .accounts({ counter: counterPda, user: provider.wallet.publicKey })
  .rpc()

// Fetch account
const counter = await program.account.counter.fetch(counterPda)
console.log(counter.count.toString())
\`\`\`

## Installation
\`\`\`bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli
anchor init my_project
npm install @coral-xyz/anchor
\`\`\`

## Reference
- [Anchor docs](https://www.anchor-lang.com)
- [Anchor GitHub](https://github.com/coral-xyz/anchor)
`

const METAPLEX_CONTENT = `---
id: solana/metaplex-nft
name: Metaplex NFT Minting
version: 1.0.0
ecosystem: solana
type: docs
time_sensitivity: evergreen
source: verified
confidence: high
maintainer: Metaplex Foundation
last_updated: 2026-03-19
---

## Overview

Metaplex is the standard NFT infrastructure on Solana. Candy Machine v3 handles collection minting with guards (payment, whitelist, etc.). The umi SDK is the modern TypeScript client replacing the old \`@metaplex-foundation/js\`.

## Setup umi

\`\`\`typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine'
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { keypairIdentity } from '@metaplex-foundation/umi'

const umi = createUmi('https://api.devnet.solana.com')
  .use(mplTokenMetadata())
  .use(mplCandyMachine())

// Load keypair
const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes)
umi.use(keypairIdentity(keypair))
\`\`\`

## NFT Metadata Standard

\`\`\`json
{
  "name": "My NFT #1",
  "symbol": "MNFT",
  "description": "A description of my NFT",
  "image": "https://arweave.net/abc123/image.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Rarity", "value": "Rare" }
  ],
  "properties": {
    "files": [{ "uri": "https://arweave.net/abc123/image.png", "type": "image/png" }],
    "category": "image"
  }
}
\`\`\`

## Create Collection NFT

\`\`\`typescript
import { createNft, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata'
import { generateSigner, percentAmount } from '@metaplex-foundation/umi'

const collectionMint = generateSigner(umi)

await createNft(umi, {
  mint: collectionMint,
  name: 'My Collection',
  symbol: 'MC',
  uri: 'https://arweave.net/metadata.json',
  sellerFeeBasisPoints: percentAmount(5), // 5% royalty
  isCollection: true,
}).sendAndConfirm(umi)
\`\`\`

## Candy Machine v3

\`\`\`typescript
import { create, addConfigLines } from '@metaplex-foundation/mpl-candy-machine'
import { generateSigner, sol, dateTime } from '@metaplex-foundation/umi'

const candyMachine = generateSigner(umi)

// Create
await create(umi, {
  candyMachine,
  collectionMint: collectionMint.publicKey,
  collectionUpdateAuthority: umi.identity,
  itemsAvailable: 1000,
  sellerFeeBasisPoints: percentAmount(5),
  guards: {
    solPayment: { lamports: sol(0.1), destination: umi.identity.publicKey },
    startDate: { date: dateTime('2026-04-01T00:00:00Z') },
  },
}).sendAndConfirm(umi)

// Add items
await addConfigLines(umi, {
  candyMachine: candyMachine.publicKey,
  index: 0,
  configLines: [
    { name: '#1', uri: 'https://arweave.net/item1.json' },
    { name: '#2', uri: 'https://arweave.net/item2.json' },
  ],
}).sendAndConfirm(umi)
\`\`\`

## Mint from Candy Machine

\`\`\`typescript
import { mintV2 } from '@metaplex-foundation/mpl-candy-machine'
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox'
import { transactionBuilder, generateSigner } from '@metaplex-foundation/umi'

const nftMint = generateSigner(umi)

await transactionBuilder()
  .add(setComputeUnitLimit(umi, { units: 800_000 }))
  .add(mintV2(umi, {
    candyMachine: candyMachine.publicKey,
    nftMint,
    collectionMint: collectionMint.publicKey,
    collectionUpdateAuthority: umi.identity.publicKey,
  }))
  .sendAndConfirm(umi)
\`\`\`

## Installation
\`\`\`bash
npm install @metaplex-foundation/umi-bundle-defaults
npm install @metaplex-foundation/mpl-candy-machine
npm install @metaplex-foundation/mpl-token-metadata
\`\`\`

## Reference
- [Metaplex docs](https://developers.metaplex.com)
- [Candy Machine v3](https://developers.metaplex.com/candy-machine)
- [umi SDK](https://developers.metaplex.com/umi)
`

const MCP_CONTENT = `---
id: general/mcp-server-guide
name: MCP Server Development Guide
version: 1.0.0
ecosystem: multi
type: guide
time_sensitivity: evergreen
source: verified
confidence: high
maintainer: Anthropic
last_updated: 2026-03-19
---

## Overview

MCP (Model Context Protocol) is an open protocol by Anthropic for connecting AI assistants to external tools, data sources, and services. An MCP Server exposes **Tools** (callable functions), **Resources** (data/files), and **Prompts** (reusable templates) to any MCP-compatible client (Claude Desktop, Cursor, etc.).

## Core Concepts

- **Tools**: Functions the LLM can call (e.g., search_web, query_db)
- **Resources**: Files or data the LLM can read (e.g., file://, db://)
- **Prompts**: Reusable prompt templates with parameters
- **Transport**: stdio (local) or HTTP+SSE (remote)

## Minimal MCP Server (TypeScript)

\`\`\`typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
})

// Register a Tool
server.tool(
  'get_weather',
  'Get current weather for a city',
  { city: z.string().describe('City name') },
  async ({ city }) => {
    // Your implementation here
    const weather = await fetchWeather(city)
    return {
      content: [{ type: 'text', text: \`Weather in \${city}: \${weather.description}, \${weather.temp}°C\` }],
    }
  }
)

// Register a Resource
server.resource(
  'config://app',
  'Application configuration',
  async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify({ version: '1.0' }), mimeType: 'application/json' }],
  })
)

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)
\`\`\`

## Tool with Multiple Parameters

\`\`\`typescript
server.tool(
  'search_database',
  'Search records in the database',
  {
    query: z.string().describe('Search query'),
    limit: z.number().optional().default(10).describe('Max results'),
    table: z.enum(['users', 'products', 'orders']).describe('Table to search'),
  },
  async ({ query, limit, table }) => {
    const results = await db.search(table, query, limit)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    }
  }
)
\`\`\`

## Claude Desktop Config

Add to \`~/Library/Application Support/Claude/claude_desktop_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/your/server/dist/index.js"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`

## HTTP Transport (Remote Server)

\`\`\`typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'

const app = express()
app.use(express.json())

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

app.listen(3000)
\`\`\`

## Error Handling

\`\`\`typescript
server.tool('risky_op', 'Might fail', { id: z.string() }, async ({ id }) => {
  try {
    const result = await riskyOperation(id)
    return { content: [{ type: 'text', text: result }] }
  } catch (err) {
    return {
      content: [{ type: 'text', text: \`Error: \${err.message}\` }],
      isError: true,
    }
  }
})
\`\`\`

## Installation
\`\`\`bash
npm install @modelcontextprotocol/sdk zod
\`\`\`

## Reference
- [MCP Specification](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Servers examples](https://github.com/modelcontextprotocol/servers)
`

const LLM_CONTEXT_CONTENT = `---
id: general/llm-context-engineering
name: LLM Context Engineering
version: 1.0.0
ecosystem: multi
type: guide
time_sensitivity: evergreen
source: verified
confidence: medium
maintainer: AgentRel Community
last_updated: 2026-03-19
---

## Overview

Context engineering is the practice of carefully constructing the input to a language model to maximize output quality. As context windows grow (Claude: 200K tokens, GPT-4o: 128K), effectively managing what goes in — and what doesn't — is a core skill for building reliable AI applications.

## Context Window Fundamentals

\`\`\`
Total context = system prompt + conversation history + retrieved docs + tools/schema + output
\`\`\`

**Token budget example (200K window):**
- System prompt: ~1K tokens
- Tools/function schemas: ~2-5K tokens
- Retrieved context (RAG): ~20-50K tokens
- Conversation history: ~10-30K tokens
- Reserved for output: ~4-8K tokens

## System Prompt Best Practices

\`\`\`markdown
You are [specific role]. Your job is to [specific task].

## Constraints
- Always [hard rule 1]
- Never [hard rule 2]
- When uncertain, [fallback behavior]

## Output Format
Respond in [format]. Example:
[concrete example of desired output]

## Context
[Background information that doesn't change]
\`\`\`

**Key principles:**
1. **Be specific, not vague** — "Answer in 2-3 sentences" not "Be concise"
2. **Use examples** — Show don't tell; one good example > 100 words of description
3. **Separate instructions from data** — Use XML tags or headers to delimit sections
4. **Put critical instructions last** — Recency bias means later instructions are followed more reliably

## RAG vs Fine-Tuning Decision Matrix

| Scenario | Recommendation |
|----------|----------------|
| Dynamic / frequently updated data | RAG |
| Proprietary knowledge base | RAG |
| Style/tone/format changes | Fine-tuning |
| Domain-specific reasoning patterns | Fine-tuning |
| Both knowledge + behavior changes | RAG + Fine-tuning |
| Cost-sensitive production | Fine-tuning (smaller model) |

## RAG Implementation Pattern

\`\`\`typescript
// 1. Chunk documents (overlap to preserve context)
const chunks = splitText(document, { chunkSize: 512, overlap: 50 })

// 2. Embed and store
const embeddings = await embed(chunks)
await vectorDB.upsert(embeddings)

// 3. Retrieve at query time
const query = userMessage
const relevant = await vectorDB.query(query, { topK: 5, minScore: 0.7 })

// 4. Construct context
const context = relevant.map(r => r.text).join('\\n\\n---\\n\\n')

// 5. Build prompt with retrieved context
const prompt = \`
<context>
\${context}
</context>

User question: \${query}

Answer based only on the context above. If not found, say so.
\`
\`\`\`

## Context Compression Techniques

**1. Summarization** — Compress old conversation turns:
\`\`\`typescript
if (tokenCount(history) > 50_000) {
  const summary = await llm.summarize(history.slice(0, -10))
  history = [{ role: 'system', content: \`Previous context: \${summary}\` }, ...history.slice(-10)]
}
\`\`\`

**2. Selective retrieval** — Only include relevant chunks, not entire documents

**3. Structured extraction** — Pre-extract key facts into structured format before adding to context

## Prompt Injection Defense

\`\`\`typescript
// Never interpolate untrusted user input directly into system prompts
// ❌ Bad
const systemPrompt = \`You are a helpful assistant. User info: \${userInput}\`

// ✅ Good — separate system from user data
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: userInput },  // untrusted content in user turn
]
\`\`\`

## Measuring Context Quality

- **Faithfulness**: Does the output match the provided context?
- **Answer relevance**: Does the output address the actual question?
- **Context recall**: Were the relevant chunks actually retrieved?
- Use [RAGAS](https://github.com/explodinggradients/ragas) for automated RAG evaluation

## Reference
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [OpenAI Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [RAGAS evaluation framework](https://github.com/explodinggradients/ragas)
`

const SKILLS = [
  {
    id: 'ethereum/wagmi-v2',
    name: 'wagmi v2 React Hooks',
    ecosystem: 'ethereum',
    type: 'docs',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'verified',
    confidence: 'high',
    version: '2.0.0',
    source_repo: null,
    maintainer: 'wagmi contributors',
    content: WAGMI_CONTENT,
    tags: ['ethereum', 'react', 'wagmi', 'hooks', 'web3'],
  },
  {
    id: 'ethereum/viem-quickstart',
    name: 'viem TypeScript Client',
    ecosystem: 'ethereum',
    type: 'docs',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'verified',
    confidence: 'high',
    version: '2.0.0',
    source_repo: null,
    maintainer: 'viem contributors',
    content: VIEM_CONTENT,
    tags: ['ethereum', 'typescript', 'viem', 'rpc'],
  },
  {
    id: 'solana/anchor-idl',
    name: 'Anchor IDL & CPI Guide',
    ecosystem: 'solana',
    type: 'docs',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'verified',
    confidence: 'high',
    version: '0.30.0',
    source_repo: null,
    maintainer: 'Coral (Anchor)',
    content: ANCHOR_CONTENT,
    tags: ['solana', 'anchor', 'idl', 'cpi', 'rust'],
  },
  {
    id: 'solana/metaplex-nft',
    name: 'Metaplex NFT Minting',
    ecosystem: 'solana',
    type: 'docs',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'verified',
    confidence: 'high',
    version: '1.0.0',
    source_repo: null,
    maintainer: 'Metaplex Foundation',
    content: METAPLEX_CONTENT,
    tags: ['solana', 'nft', 'metaplex', 'candy-machine'],
  },
  {
    id: 'general/mcp-server-guide',
    name: 'MCP Server Development Guide',
    ecosystem: 'multi',
    type: 'guide',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'verified',
    confidence: 'high',
    version: '1.0.0',
    source_repo: null,
    maintainer: 'Anthropic',
    content: MCP_CONTENT,
    tags: ['mcp', 'ai', 'tools', 'llm', 'server'],
  },
  {
    id: 'general/llm-context-engineering',
    name: 'LLM Context Engineering',
    ecosystem: 'multi',
    type: 'guide',
    time_sensitivity: 'evergreen',
    expires_at: null,
    source: 'verified',
    confidence: 'medium',
    version: '1.0.0',
    source_repo: null,
    maintainer: 'AgentRel Community',
    content: LLM_CONTEXT_CONTENT,
    tags: ['llm', 'context', 'prompt', 'rag', 'agent'],
  },
]

async function upsertSkills() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/skills?on_conflict=id`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(SKILLS),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('❌ Failed:', res.status, text)
    process.exit(1)
  }

  console.log('✅ Upserted', SKILLS.length, 'skills successfully')
  for (const s of SKILLS) {
    console.log(`  - ${s.id}`)
  }
}

upsertSkills()
