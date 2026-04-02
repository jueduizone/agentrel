import { createClient as _createSupabase, SupabaseClient } from '@supabase/supabase-js'

// Browser/public client — safe in client components
export const supabase = _createSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Browser client alias for OAuth flows
export function createClient() {
  return _createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Service role admin client — SERVER ONLY
// Initialized lazily to prevent crashing when this module is bundled for the client.
// Only env vars prefixed with NEXT_PUBLIC_ are available client-side;
// SUPABASE_SERVICE_KEY is undefined on the client, so we guard it.
let _serviceClient: SupabaseClient | null = null
export const serviceClient: SupabaseClient = new Proxy(
  {} as SupabaseClient,
  {
    get(_target, prop: string | symbol) {
      if (!_serviceClient) {
        if (!process.env.SUPABASE_SERVICE_KEY) {
          throw new Error('serviceClient is server-only and cannot be used on the client.')
        }
        _serviceClient = _createSupabase(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        )
      }
      const val = (_serviceClient as unknown as Record<string | symbol, unknown>)[prop]
      return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(_serviceClient) : val
    }
  }
)
