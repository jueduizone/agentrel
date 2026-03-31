import { serviceClient } from './supabase'

/**
 * Get user from Bearer token.
 * Supports: agentrel_xxx (api_key from public.users)
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
    // Update last_seen async
    db.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', data.id).then(() => {})
    return data
  }

  // Supabase JWT mode (deferred to avoid cold start overhead)
  // TODO: implement if needed
  return null
}
