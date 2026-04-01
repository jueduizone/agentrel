import { serviceClient } from './supabase'
import { createClient } from '@supabase/supabase-js'

/**
 * Get user from Bearer token.
 * Supports:
 *   - agentrel_xxx  (api_key from public.users — for Agent API calls)
 *   - Supabase JWT  (access_token from auth session — for human admin UI)
 */
export async function getUserFromRequest(
  request: Request
): Promise<{ id: string; email: string | null; role: string } | null> {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const db = serviceClient

  // api_key mode: agentrel_xxx
  if (token.startsWith('agentrel_')) {
    const { data } = await db
      .from('users')
      .select('id, email, role')
      .eq('api_key', token)
      .single()
    if (!data) return null
    db.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', data.id).then(() => {})
    return data
  }

  // Supabase JWT mode (access_token from auth session)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null

    // Look up role from public.users
    const { data: profile } = await db
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single()
    if (!profile) return null
    return profile
  } catch {
    return null
  }
}
