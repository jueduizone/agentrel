'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          {/* Email icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
            <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">请验证您的邮箱</h1>
          <p className="text-gray-500 text-sm mb-4">
            验证邮件已发送至
          </p>
          {email && (
            <p className="font-medium text-gray-800 mb-4 break-all">{email}</p>
          )}
          <p className="text-gray-500 text-sm mb-6">
            请点击邮件中的链接完成注册。如未收到，请检查垃圾邮件文件夹。
          </p>

          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-black/80 transition-colors text-center"
            >
              前往登录
            </Link>
            <Link
              href="/auth/register"
              className="block w-full border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
            >
              重新注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
