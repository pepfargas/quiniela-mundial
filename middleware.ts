import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 🔴 SI FALLA SUPABASE → NO ROMPER WEB
  if (!url || !anon) {
    return response
  }

  let user = null

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}, // 🔴 NO tocar cookies en edge
      },
    })

    const result = await supabase.auth.getUser()
    user = result?.data?.user ?? null
  } catch (e) {
    console.error('Middleware Supabase error:', e)
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
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/auth/login'
    return NextResponse.redirect(redirect)
  }

  if (user && path.startsWith('/auth')) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/'
    return NextResponse.redirect(redirect)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}