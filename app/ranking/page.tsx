import { createClient } from '@/lib/supabase/server'
import type { RankingEntry } from '@/types'

export const revalidate = 60

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ranking } = await supabase
    .from('rankings')
    .select('*')
    .order('total_points', { ascending: false })

  const myPosition = ranking?.findIndex((r: RankingEntry) => r.id === user?.id) ?? -1

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="section-title">📊 Ranking</h1>
      <p className="section-subtitle">Clasificación general de todos los participantes.</p>

      {myPosition >= 0 && (
        <div className="card border-yellow-500/40 mb-6 flex items-center gap-4">
          <span className="text-3xl">{medals[myPosition] || `#${myPosition + 1}`}</span>
          <div className="flex-1">
            <div className="text-sm text-gray-400">Tu posición</div>
            <div className="font-bold">{ranking![myPosition].username}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-yellow-400">
              {ranking![myPosition].total_points}
            </div>
            <div className="text-xs text-gray-500">puntos</div>
          </div>
        </div>
      )}

      {ranking && ranking.length > 0 ? (
        <div className="space-y-2">
          {ranking.map((r: RankingEntry, i: number) => (
            <div
              key={r.id}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                r.id === user?.id
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-gray-900 border-gray-800'
              }`}
            >
              <div className="w-8 text-center">
                {i < 3 ? (
                  <span className="text-xl">{medals[i]}</span>
                ) : (
                  <span className="text-gray-500 font-bold">#{i + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold truncate ${r.id === user?.id ? 'text-yellow-400' : 'text-white'}`}>
                    {r.username}
                  </span>
                  {r.id === user?.id && <span className="badge-gold text-xs">Tú</span>}
                </div>
                {r.full_name && (
                  <div className="text-xs text-gray-500 truncate">{r.full_name}</div>
                )}
              </div>

              {/* Desglose de puntos */}
              <div className="hidden sm:flex gap-3 text-xs text-gray-500">
                <div className="text-center">
                  <div className="font-medium text-gray-300">{r.match_points}</div>
                  <div>partidos</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-300">{r.group_points}</div>
                  <div>grupos</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-300">{r.special_points}</div>
                  <div>especiales</div>
                </div>
              </div>

              <div className="text-right ml-2">
                <div className={`text-xl font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-white'}`}>
                  {r.total_points}
                </div>
                <div className="text-xs text-gray-500">pts</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-gray-400">Nadie ha apostado todavía.</p>
          <p className="text-gray-600 text-sm mt-1">¡Sé el primero en aparecer aquí!</p>
        </div>
      )}
    </div>
  )
}
