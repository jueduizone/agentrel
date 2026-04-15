import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'

const ecosystems = [
  {
    id: 'monad',
    name: 'Monad',
    description: 'EVM-compatible L1 with 10,000 tps, 400ms block time, and 800ms finality.',
    href: '/ecosystem/monad',
    available: true,
    stats: ['10,000 tps', '400ms blocks', 'EVM'],
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    logo: '/logos/monad.png',
  },
  {
    id: 'zama',
    name: 'Zama',
    description: 'Fully Homomorphic Encryption for the EVM. Build confidential smart contracts with fhEVM.',
    href: '/ecosystem/zama',
    available: true,
    stats: ['FHE', 'Solidity', 'On-chain Privacy'],
    color: 'bg-red-100 text-red-700 border-red-200',
    logo: '/logos/zama.webp',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    description: 'The original smart contract platform powering DeFi, NFTs, and the decentralized web.',
    href: '/ecosystem/ethereum',
    available: true,
    stats: ['EVM', 'PoS', 'L1'],
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    logo: '/logos/ethereum.png',
  },
  {
    id: 'solana',
    name: 'Solana',
    description: 'High-performance L1 with 65,000 tps and Rust-based programs for scalable dApps.',
    href: '/ecosystem/solana',
    available: true,
    stats: ['65,000 tps', '400ms blocks', 'Rust'],
    color: 'bg-green-100 text-green-700 border-green-200',
    logo: '/logos/solana.png',
  },
  {
    id: 'base',
    name: 'Base',
    description: "Coinbase's Ethereum L2 built on the OP Stack, bringing billions onchain with low fees.",
    href: '/ecosystem/base',
    available: true,
    stats: ['OP Stack', 'L2', 'EVM', 'Low fees'],
    color: 'bg-sky-100 text-sky-700 border-sky-200',
    logo: '/logos/base.png',
  },
  {
    id: 'sui',
    name: 'Sui',
    description: 'Object-centric L1 using Move language with parallel execution for high throughput.',
    href: '/ecosystem/sui',
    available: true,
    stats: ['Move', 'Parallel', 'L1', 'BFT'],
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    logo: '/logos/sui.png',
  },
  {
    id: 'ton',
    name: 'TON',
    description: 'The Open Network — a sharded blockchain built by the Telegram community.',
    href: '/ecosystem/ton',
    available: true,
    stats: ['Sharding', '100k+ tps', 'L1', 'Telegram'],
    color: 'bg-sky-100 text-sky-600 border-sky-200',
    logo: '/logos/ton.png',
  },
  {
    id: 'aptos',
    name: 'Aptos',
    description: 'Move-based L1 blockchain. Skills coming soon.',
    href: null,
    available: false,
    stats: ['Move', 'BFT', 'L1'],
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    logo: '/logos/aptos.png',
  },
]

export default function EcosystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Ecosystems</h1>
          <p className="mt-2 text-muted-foreground">
            Browse AI context skills by blockchain ecosystem
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ecosystems.map((eco) => {
            const card = (
              <div
                className={`flex flex-col rounded-xl border p-5 transition-colors ${
                  eco.available
                    ? 'border-border hover:border-foreground/60 hover:bg-muted/50 cursor-pointer'
                    : 'border-border opacity-60 cursor-default'
                }`}
              >
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={eco.logo}
                        alt={eco.name}
                        width={28}
                        height={28}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <h2 className="font-semibold text-foreground">{eco.name}</h2>
                  </div>
                  {eco.available ? (
                    <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mb-4 flex-1 text-sm text-muted-foreground">{eco.description}</p>

                {/* Stats */}
                <div className="flex flex-wrap gap-1.5">
                  {eco.stats.map((stat) => (
                    <span
                      key={stat}
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${eco.color}`}
                    >
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            )

            return eco.available && eco.href ? (
              <Link key={eco.id} href={eco.href}>
                {card}
              </Link>
            ) : (
              <div key={eco.id}>{card}</div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
