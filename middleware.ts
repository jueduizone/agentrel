import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin/* routes
  if (pathname.startsWith('/admin')) {
    // Check for api key in cookie (set by login) or let client-side handle it
    // We do a lightweight check: if no agentrel_session cookie, redirect to login
    // Full role check is done client-side on each admin page
    const sessionCookie = request.cookies.get('agentrel_session')
    if (!sessionCookie) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
