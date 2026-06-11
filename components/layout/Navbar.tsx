'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUser()
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/')
  }

  const navLinks = [
    { href: '/', label: '🏠 Inicio' },
    { href: '/partidos', label: '⚽ Partidos' },
    { href: '/apuestas-previas', label: '🏆 Apuestas previas' },
    { href: '/grupos', label: '👥 Grupos' },
    { href: '/ranking', label: '📊 Ranking' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🌍</span>
          <span className="text-yellow-400">Quiniela</span>
          <span className="text-white">2026</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname === link.href
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {profile?.is_admin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/admin')
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              ⚙️ Admin
            </Link>
          )}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {profile ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-sm text-gray-300">
                👤 {profile.username}
              </span>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Salir
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="btn-secondary text-sm px-3 py-1.5">
                Entrar
              </Link>
              <Link href="/auth/register" className="btn-primary text-sm px-3 py-1.5">
                Registrarse
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-400 hover:text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-950 border-t border-gray-800 px-4 py-3 space-y-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${
                pathname === link.href
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {profile?.is_admin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-400">
              ⚙️ Admin
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
