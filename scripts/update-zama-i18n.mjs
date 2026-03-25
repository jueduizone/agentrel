import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const skills = [
  {
    id: 'zama/fhevm-dev-guide',
    name_zh: 'fhEVM 开发指南：全同态加密智能合约',
    description_zh:
      '当你需要用 Zama fhEVM 编写加密合约、使用 TFHE 库、实现隐私 dApp 时使用。涵盖加密类型、核心操作、ACL 权限控制。',
  },
  {
    id: 'zama/fhe-concepts',
    name_zh: '全同态加密（FHE）核心概念：Zama TFHE 原理',
    description_zh:
      '了解 FHE 是什么、与 ZK Proof 的区别、TFHE 方案优势，以及 Zama 产品生态（TFHE-rs / fhEVM / Concrete）。',
  },
  {
    id: 'zama/gateway-decrypt',
    name_zh: 'Gateway 与前端解密：fhevmjs 使用指南',
    description_zh:
      '当你需要在前端读取加密合约状态时使用。涵盖 fhevmjs SDK、createInstance、客户端解密流程、ACL 授权验证。',
  },
  {
    id: 'zama/testing-guide',
    name_zh: 'fhEVM 合约测试：Hardhat 完整指南',
    description_zh:
      '用 MockFHEVM 本地快速测试加密合约，包含加密输入、断言密态、常见陷阱，以及 CI 与集成测试最佳实践。',
  },
  {
    id: 'zama/use-case-voting',
    name_zh: '隐私投票合约：完整 Solidity 实现',
    description_zh:
      '完整的保密投票合约示例：链上加密投票、密文累加计票、结束后 Gateway 解密揭晓，防止投票期间信息泄露。',
  },
  {
    id: 'zama/grant-bounty',
    name_zh: 'Zama Grants 与 Bounty 项目申请指南',
    description_zh:
      '了解 Zama 对 FHE 开发者的资助计划：bounty.zama.ai 赏金任务（$500-$10,000+）、Grant 申请流程及适合项目类型。',
  },
]

async function run() {
  console.log('Testing column existence with first skill...')

  const first = skills[0]
  const { error: testError } = await client
    .from('skills')
    .update({ name_zh: first.name_zh, description_zh: first.description_zh })
    .eq('id', first.id)

  if (testError) {
    if (testError.message.includes('column') || testError.code === 'PGRST204' || testError.code === '42703') {
      console.error('Column not found. Please run the following SQL in Supabase Dashboard:')
      console.error('')
      console.error('ALTER TABLE skills ADD COLUMN IF NOT EXISTS name_zh text;')
      console.error('ALTER TABLE skills ADD COLUMN IF NOT EXISTS description_zh text;')
      process.exit(1)
    }
    console.error(`Unexpected error: ${testError.message}`)
    process.exit(1)
  }

  console.log(`✓ Updated: ${first.id}`)

  for (const skill of skills.slice(1)) {
    const { error } = await client
      .from('skills')
      .update({ name_zh: skill.name_zh, description_zh: skill.description_zh })
      .eq('id', skill.id)

    if (error) {
      console.error(`Failed to update ${skill.id}:`, error.message)
    } else {
      console.log(`✓ Updated: ${skill.id}`)
    }
  }

  console.log('Done!')
}

run()
