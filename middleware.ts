import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const isAuthPage = path.startsWith('/auth')

  // 🔴 SOLO LÓGICA SIMPLE → NO EDGE CRASH POSSIBLE
  const token = request.cookies.get('sb-access-token')?.value

  const isLoggedIn = !!token

  if (!isLoggedIn && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (isLoggedIn && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}