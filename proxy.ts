import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/surat-jalan',
  '/invoice',
  '/stok',
  '/master',
  '/laporan',
  '/settings',
]

export function proxy(request: NextRequest) {
  const isAuthenticated = request.cookies.get('pnj_auth')?.value === 'true'
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))

  if (!isAuthenticated && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/surat-jalan/:path*',
    '/invoice/:path*',
    '/stok/:path*',
    '/master/:path*',
    '/laporan/:path*',
    '/settings/:path*',
    '/login',
  ],
}
