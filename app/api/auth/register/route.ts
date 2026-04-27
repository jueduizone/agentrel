import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/supabase'

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}))

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email.trim().toLowerCase())) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Use signUp which sends confirmation email (respects Supabase email settings)
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://agentrel.vercel.app'}/auth/callback`,
    },
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already exists')) {
      return NextResponse.json({ error: 'This email is already registered' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data.user) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }

  // If email confirmation is required, user.identities will be empty or user.email_confirmed_at null
  const needsEmailConfirm = !data.session

  if (needsEmailConfirm) {
    return NextResponse.json({
      user_id: data.user.id,
      email: data.user.email,
      message: 'Registration successful. Please check your email for confirmation.',
      email_confirmation_required: true,
    }, { status: 201 })
  }

  // Auto-confirmed (email confirmations disabled) — return api_key
  const db = serviceClient
  await new Promise(r => setTimeout(r, 200))
  const { data: profile } = await db
    .from('users')
    .select('id, email, api_key, role')
    .eq('id', data.user.id)
    .single()

  return NextResponse.json({
    user_id: data.user.id,
    email: data.user.email,
    api_key: profile?.api_key,
    message: 'Registration successful',
  }, { status: 201 })
}
