import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-base font-bold text-black">AgentRel</span>
              <span className="text-xs text-gray-400">by <a href="https://openbuild.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">OpenBuild</a></span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">Web3 AI Context Infrastructure</p>
            <p className="text-xs text-gray-400 mt-3">Open source · MIT License</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/skills" className="hover:text-gray-900 transition-colors">Skills</Link></li>
              <li><Link href="/build" className="hover:text-gray-900 transition-colors">Build</Link></li>
              <li><Link href="/benchmark" className="hover:text-gray-900 transition-colors">Benchmark</Link></li>
              <li><Link href="/bundles" className="hover:text-gray-900 transition-colors">Bundles</Link></li>
              <li><a href="https://ian-docs.vercel.app/docs/agentforum" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">Docs</a></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Community</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="https://github.com/jueduizone/agentrel" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">GitHub</a></li>
              <li><a href="https://discord.gg/agentrel" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">Discord</a></li>
              <li><Link href="/submit" className="hover:text-gray-900 transition-colors">Submit Skill</Link></li>
              <li><a href="https://t.me/agentrel" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">Telegram</a></li>
            </ul>
          </div>

          {/* OpenBuild Ecosystem */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">OpenBuild Ecosystem</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="https://openbuild.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">openbuild.xyz</a></li>
              <li><a href="https://github.com/openbuildxyz" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">GitHub</a></li>
              <li><a href="https://twitter.com/openbuildxyz" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">Twitter / X</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© 2026 AgentRel · Powered by OpenBuild · MIT License</span>
          <div className="flex items-center gap-4">
            <a href="https://github.com/jueduizone/agentrel/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">MIT License</a>
            <a href="https://openbuild.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">OpenBuild</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
