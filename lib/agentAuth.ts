import { serviceClient } from './supabase'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Get user from Bearer token — supports two modes:
 *  1. Supabase JWT  (human login via email/password)
 *  2. agentrel_xxx  (api_key — agent or developer access)
 *
 *  Returns { id, email, role } or null.
 */
export async function getUserFromRequest(
  request: Request
): Promise<{ id: string; email: string | null; role: string } | null> {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const db = serviceClient

  // Mode 1: api_key (format: agentrel_...)
  if (token.startsWith('agentrel_')) {
    const { data } = await db
      .from('users')
      .select('id, email, role')
      .eq('api_key', token)
      .single()
    if (!data) return null
    // Update last_seen_at async
    db.from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {})
    return data
  }

  // Mode 2: Supabase JWT
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) return null

  // Fetch extended profile from public.users
  const { data: profile } = await db
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .single()

  // If profile not yet created (edge case), create it
  if (!profile) {
    await db.from('users').upsert({ id: user.id, email: user.email }).eq('id', user.id)
    return { id: user.id, email: user.email ?? null, role: 'developer' }
  }

  return profile
}
