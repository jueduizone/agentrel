import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/supabase'

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}))

  if (!email || !password) {
    return NextResponse.json({ error: '缺少 email 或 password' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email.trim().toLowerCase())) {
    return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '密码至少 8 位' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data, error } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,  // skip email confirmation for now
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already exists')) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Fetch auto-created public.users record (created by trigger)
  const db = serviceClient
  await new Promise(r => setTimeout(r, 100))  // brief wait for trigger
  const { data: profile } = await db
    .from('users')
    .select('id, email, api_key, role')
    .eq('id', data.user.id)
    .single()

  return NextResponse.json({
    user_id: data.user.id,
    email: data.user.email,
    api_key: profile?.api_key,
    message: '注册成功',
  }, { status: 201 })
}
