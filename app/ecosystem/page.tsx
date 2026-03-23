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
    dotColor: 'bg-purple-500',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    description: 'The original smart contract platform. Skills coming soon.',
    href: null,
    available: false,
    stats: ['EVM', 'PoS', 'L1'],
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-400',
  },
  {
    id: 'solana',
    name: 'Solana',
    description: 'High-performance L1 with Rust-based programs. Skills coming soon.',
    href: null,
    available: false,
    stats: ['65,000 tps', '400ms blocks', 'Rust'],
    color: 'bg-green-100 text-green-700 border-green-200',
    dotColor: 'bg-green-400',
  },
  {
    id: 'aptos',
    name: 'Aptos',
    description: 'Move-based L1 blockchain. Skills coming soon.',
    href: null,
    available: false,
    stats: ['Move', 'BFT', 'L1'],
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    dotColor: 'bg-teal-400',
  },
]

export default function EcosystemPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Ecosystems</h1>
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
                    ? 'border-border hover:border-black hover:bg-muted/20 cursor-pointer'
                    : 'border-border opacity-60 cursor-default'
                }`}
              >
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${eco.dotColor}`} />
                    <h2 className="font-semibold text-black">{eco.name}</h2>
                  </div>
                  {eco.available ? (
                    <span className="rounded-full bg-black px-2 py-0.5 text-xs font-medium text-white">
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
