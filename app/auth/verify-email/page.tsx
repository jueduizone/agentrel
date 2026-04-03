'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-6">📬</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">请查收验证邮件</h1>
        <p className="text-gray-500 text-sm mb-2">
          验证邮件已发送至
        </p>
        {email && (
          <p className="font-medium text-gray-900 text-sm mb-4 bg-gray-50 rounded-lg px-4 py-2 inline-block">
            {email}
          </p>
        )}
        <p className="text-gray-400 text-sm mb-8">
          点击邮件中的链接完成注册。如未收到，请检查垃圾邮件文件夹。
        </p>
        <div className="space-y-3">
          <Link href="/auth/login"
            className="block w-full py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-black/80 transition-colors">
            已验证，去登录
          </Link>
          <Link href="/auth/register"
            className="block text-sm text-gray-400 hover:text-gray-600 transition-colors">
            返回注册
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
      <Footer />
    </div>
  )
}
