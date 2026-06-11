import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type Cookie = {
  name: string
  value: string
  options?: any
}

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 🔒 Protección crítica para Vercel
  if (!url || !anon) {
    console.error('Missing Supabase environment variables')
    return supabaseResponse
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },

      setAll(cookiesToSet: Cookie[]) {
        if (!cookiesToSet?.length) return

        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          } catch (err) {
            console.error('Cookie error:', err)
          }
        })
      },
    },
  })

  let user = null

  try {
    const result = await supabase.auth.getUser()
    user = result?.data?.user ?? null
  } catch (err) {
    console.error('Supabase auth error:', err)
  }

  const protectedRoutes = [
    '/partidos',
    '/apuestas-previas',
    '/grupos',
    '/ranking',
    '/admin',
  ]

  const isProtected = protectedRoutes.some((r) =>
    request.nextUrl.pathname.startsWith(r)
  )

  // 🚫 No autenticado → bloquear rutas protegidas
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 🔁 Autenticado → evitar login/register
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
