export const ECOSYSTEM_REPOS: Record<string, string[]> = {
  Zama: ['zama-ai/fhevm', 'zama-ai/fhevm-hardhat-template'],
  Monad: ['monad-labs/monad-typescript-sdk', 'monad-xyz/hardhat-monad'],
}

// skill ids that receive crawled content per ecosystem
export const ECOSYSTEM_SKILL_TARGETS: Record<string, string[]> = {
  Zama: ['zama/fhevm-dev-guide', 'zama/testing-guide'],
  Monad: ['monad/overview'],
}
