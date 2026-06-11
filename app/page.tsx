import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Obtener top 3 ranking
  const { data: ranking } = await supabase
    .from('rankings')
    .select('*')
    .limit(3)

  // Próximos partidos
  const { data: matches } = await supabase
    .from('matches')
    .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
    .eq('status', 'upcoming')
    .order('match_date', { ascending: true })
    .limit(3)

  return (
    <div className="world-bg min-h-screen">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="text-7xl mb-4 trophy-glow">🏆</div>
        <h1 className="text-5xl font-black text-white mb-3">
          Quiniela <span className="text-yellow-400">Mundial 2026</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
          Compite con tus amigos prediciendo los resultados del Mundial. El mejor gana la gloria eterna.
        </p>

        {!user && (
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register" className="btn-primary text-lg px-6 py-3">
              Crear cuenta
            </Link>
            <Link href="/auth/login" className="btn-secondary text-lg px-6 py-3">
              Entrar
            </Link>
          </div>
        )}

        {user && (
          <div className="flex gap-4 justify-center">
            <Link href="/partidos" className="btn-primary text-lg px-6 py-3">
              ⚽ Apostar partidos
            </Link>
            <Link href="/apuestas-previas" className="btn-secondary text-lg px-6 py-3">
              🏆 Apuestas especiales
            </Link>
          </div>
        )}
      </div>

      {/* Puntuación info */}
      <div className="max-w-7xl mx-auto px-4 mb-12">
        <h2 className="text-xl font-bold text-center text-gray-300 mb-6">¿Cómo se puntúa?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '1️⃣', label: 'Signo 1X2 correcto', pts: '2 pts' },
            { icon: '🎯', label: 'Resultado exacto', pts: '5 pts' },
            { icon: '👥', label: 'Clasificado de grupo', pts: '3 pts' },
            { icon: '🏆', label: 'Apuesta especial', pts: '6–15 pts' },
          ].map(item => (
            <div key={item.label} className="card text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-sm text-gray-400 mb-1">{item.label}</div>
              <div className="text-yellow-400 font-bold">{item.pts}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 grid md:grid-cols-2 gap-8">
        {/* Top ranking */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">🏅 Top clasificación</h2>
            <Link href="/ranking" className="text-yellow-400 text-sm hover:underline">Ver todo</Link>
          </div>
          {ranking && ranking.length > 0 ? (
            <div className="space-y-3">
              {ranking.map((r: any, i: number) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-xl">{['🥇', '🥈', '🥉'][i]}</span>
                  <div className="flex-1">
                    <div className="font-medium">{r.username}</div>
                    <div className="text-xs text-gray-500">{r.full_name}</div>
                  </div>
                  <span className="text-yellow-400 font-bold">{r.total_points} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nadie ha apostado todavía. ¡Sé el primero!</p>
          )}
        </div>

        {/* Próximos partidos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">📅 Próximos partidos</h2>
            <Link href="/partidos" className="text-yellow-400 text-sm hover:underline">Ver todos</Link>
          </div>
          {matches && matches.length > 0 ? (
            <div className="space-y-3">
              {matches.map((m: any) => (
                <div key={m.id} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                  <span className="text-sm">{m.home_team?.flag_emoji} {m.home_team?.code}</span>
                  <span className="text-xs text-gray-500 mx-auto">vs</span>
                  <span className="text-sm">{m.away_team?.code} {m.away_team?.flag_emoji}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(m.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Los partidos se añadirán pronto.</p>
          )}
        </div>
      </div>
    </div>
  )
}
