import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 🔒 Si falta algo, NO rompas Edge
  if (!url || !anon) {
    return NextResponse.next()
  }

  let response = NextResponse.next()

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },

      setAll(cookies) {
        // ❗ IMPORTANTE: en Edge NO mutamos request.cookies
        cookies?.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  let user = null

  try {
    const result = await supabase.auth.getUser()
    user = result?.data?.user ?? null
  } catch (e) {
    console.error('Auth error:', e)
  }

  const path = request.nextUrl.pathname

  const protectedRoutes = [
    '/partidos',
    '/apuestas-previas',
    '/grupos',
    '/ranking',
    '/admin',
  ]

  const isProtected = protectedRoutes.some((r) => path.startsWith(r))

  if (!user && isProtected) {
    const urlRedirect = request.nextUrl.clone()
    urlRedirect.pathname = '/auth/login'
    return NextResponse.redirect(urlRedirect)
  }

  if (user && path.startsWith('/auth')) {
    const urlRedirect = request.nextUrl.clone()
    urlRedirect.pathname = '/'
    return NextResponse.redirect(urlRedirect)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}