import { CANONICAL_SITE_URL, joinSiteUrl, normalizeSiteUrl } from './site-url-constants'

export const CLIENT_SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_APP_URL ||
  CANONICAL_SITE_URL
)

export function getClientSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return CLIENT_SITE_URL
  if (typeof window !== 'undefined') return normalizeSiteUrl(window.location.origin)
  return CLIENT_SITE_URL
}

export function clientSiteUrl(path = ''): string {
  return joinSiteUrl(CLIENT_SITE_URL, path)
}
