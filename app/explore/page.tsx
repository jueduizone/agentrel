import { redirect } from 'next/navigation'

// /explore 重定向到 /skills
export default function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  redirect('/skills')
}
