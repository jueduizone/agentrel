import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}))

  if (!email || !password) {
    return NextResponse.json({ error: '缺少 email 或 password' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error || !data.session) {
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 })
  }

  // Fetch api_key from public.users
  const db = serviceClient
  const { data: profile } = await db
    .from('users')
    .select('api_key, role')
    .eq('id', data.user.id)
    .single()

  return NextResponse.json({
    access_token: data.session.access_token,
    token_type: 'Bearer',
    expires_in: data.session.expires_in,
    api_key: profile?.api_key,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: profile?.role ?? 'developer',
    },
  })
}
