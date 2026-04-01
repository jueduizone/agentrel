import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { serviceClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
  }

  // Ensure public.users record exists (created by trigger on first OAuth login)
  const db = serviceClient
  await new Promise(r => setTimeout(r, 200))  // wait for trigger

  const { data: profile } = await db
    .from('users')
    .select('id, api_key')
    .eq('id', data.user.id)
    .single()

  // If no profile yet (trigger might not have run), create it
  if (!profile) {

    const apiKey = 'agentrel_' + crypto.randomBytes(24).toString('hex')
    await db.from('users').insert({
      id: data.user.id,
      email: data.user.email,
      api_key: apiKey,
      role: 'developer',
    })
  }

  // Set session cookie marker and redirect with token in URL fragment (client reads it)
  const response = NextResponse.redirect(`${origin}/auth/oauth-success`)
  response.cookies.set('agentrel_session', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: data.session.expires_in,
    path: '/',
  })

  return response
}
