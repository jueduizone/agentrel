export const CANONICAL_SITE_URL = 'https://agent.openbuild.xyz'

export function normalizeSiteUrl(url: string | undefined): string {
  return (url || CANONICAL_SITE_URL).replace(/\/+$/, '')
}

export function joinSiteUrl(baseUrl: string, path = ''): string {
  if (!path) return baseUrl
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}
