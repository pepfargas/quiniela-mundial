import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const protectedRoutes = [
    '/partidos',
    '/apuestas-previas',
    '/grupos',
    '/ranking',
    '/admin',
  ]

  const isProtected = protectedRoutes.some((r) =>
    path.startsWith(r)
  )

  const isLoggedIn = request.cookies.has('sb-access-token')

  if (!isLoggedIn && isProtected) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (isLoggedIn && path.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}