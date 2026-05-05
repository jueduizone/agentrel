import { CANONICAL_SITE_URL, joinSiteUrl, normalizeSiteUrl } from './site-url-constants'

export const SITE_URL = normalizeSiteUrl(
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  CANONICAL_SITE_URL
)

export function siteUrl(path = ''): string {
  return joinSiteUrl(SITE_URL, path)
}
