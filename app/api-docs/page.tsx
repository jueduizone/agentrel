import { redirect } from 'next/navigation'
import { siteUrl } from '@/lib/site-url'

export default function ApiDocsPage() {
  redirect(siteUrl('/api/v1/skill.md'))
}
