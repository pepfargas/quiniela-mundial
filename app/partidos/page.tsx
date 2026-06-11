'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match, MatchBet } from '@/types'

const STAGES: Record<string, string> = {
  group: '🏟️ Fase de grupos',
  round16: '⚔️ Octavos de final',
  quarter: '🔥 Cuartos de final',
  semi: '🌟 Semifinales',
  '3rd': '🥉 Tercer puesto',
  final: '🏆 Final',
}

export default function PartidosPage() {
  const supabase = createClient()
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<number, MatchBet>>({})
  const [editing, setEditing] = useState<Record<number, { prediction: string; home: string; away: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState('group')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: ms } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .order('match_date')

      const { data: bs } = await supabase
        .from('match_bets')
        .select('*')
        .eq('user_id', user.id)

      if (ms) setMatches(ms)
      if (bs) {
        const betsMap: Record<number, MatchBet> = {}
        const editMap: Record<number, { prediction: string; home: string; away: string }> = {}
        bs.forEach((b: MatchBet) => {
          betsMap[b.match_id] = b
          editMap[b.match_id] = {
            prediction: b.prediction,
            home: b.predicted_home?.toString() ?? '',
            away: b.predicted_away?.toString() ?? '',
          }
        })
        setBets(betsMap)
        setEditing(editMap)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (matchId: number) => {
    if (!userId) return
    const e = editing[matchId]
    if (!e?.prediction) return

    setSaving(matchId)
    const payload = {
      user_id: userId,
      match_id: matchId,
      prediction: e.prediction,
      predicted_home: e.home !== '' ? parseInt(e.home) : null,
      predicted_away: e.away !== '' ? parseInt(e.away) : null,
    }

    if (bets[matchId]) {
      await supabase.from('match_bets').update(payload).eq('id', bets[matchId].id)
    } else {
      const { data } = await supabase.from('match_bets').insert(payload).select().single()
      if (data) setBets(prev => ({ ...prev, [matchId]: data }))
    }
    setSaving(null)
  }

  const stageMatches = matches.filter(m => m.stage === activeStage)
  const stages = [...new Set(matches.map(m => m.stage))]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Cargando partidos...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="section-title">⚽ Partidos</h1>
      <p className="section-subtitle">
        Elige signo (1X2) y opcionalmente el resultado exacto para más puntos.
        Las apuestas se cierran cuando empieza cada partido.
      </p>

      {/* Info puntos */}
      <div className="flex gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="badge-gold">2 pts</span> signo correcto
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="badge-gold">5 pts</span> resultado exacto
        </div>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {stages.map(stage => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeStage === stage
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {STAGES[stage] || stage}
          </button>
        ))}
      </div>

      {stageMatches.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          No hay partidos en esta fase todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {stageMatches.map(match => {
            const bet = bets[match.id]
            const e = editing[match.id] || { prediction: '', home: '', away: '' }
            const isFinished = match.status === 'finished'
            const isPast = new Date(match.match_date) < new Date()
            const locked = isFinished || isPast

            return (
              <div key={match.id} className={`card ${isFinished ? 'opacity-80' : ''}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {match.group_name && (
                      <span className="badge-gray">Grupo {match.group_name}</span>
                    )}
                    <span className={`badge ${
                      match.status === 'live' ? 'bg-red-500/20 text-red-400' :
                      match.status === 'finished' ? 'bg-gray-700 text-gray-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {match.status === 'live' ? '🔴 En vivo' : match.status === 'finished' ? 'Finalizado' : '⏰ Próximo'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(match.match_date).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    <div className="text-2xl">{(match.home_team as any)?.flag_emoji}</div>
                    <div className="font-semibold text-sm mt-1">{(match.home_team as any)?.name}</div>
                    <div className="text-xs text-gray-500">{(match.home_team as any)?.code}</div>
                  </div>

                  <div className="text-center px-4">
                    {isFinished ? (
                      <div className="text-2xl font-black text-yellow-400">
                        {match.home_score} - {match.away_score}
                      </div>
                    ) : (
                      <div className="text-gray-600 font-bold">vs</div>
                    )}
                    {bet?.points_earned > 0 && (
                      <div className="text-xs text-green-400 mt-1">+{bet.points_earned} pts</div>
                    )}
                  </div>

                  <div className="text-center flex-1">
                    <div className="text-2xl">{(match.away_team as any)?.flag_emoji}</div>
                    <div className="font-semibold text-sm mt-1">{(match.away_team as any)?.name}</div>
                    <div className="text-xs text-gray-500">{(match.away_team as any)?.code}</div>
                  </div>
                </div>

                {/* Apuesta */}
                {!locked ? (
                  <div className="border-t border-gray-800 pt-3 space-y-3">
                    {/* 1X2 */}
                    <div className="flex gap-2 justify-center">
                      {['1', 'X', '2'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setEditing(prev => ({ ...prev, [match.id]: { ...(prev[match.id] || { home: '', away: '' }), prediction: opt } }))}
                          className={`w-16 py-2 rounded-lg font-bold text-sm transition-colors ${
                            e.prediction === opt
                              ? 'bg-yellow-500 text-gray-950'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {opt === '1' ? (match.home_team as any)?.code : opt === '2' ? (match.away_team as any)?.code : 'X'}
                        </button>
                      ))}
                    </div>

                    {/* Resultado exacto */}
                    <div className="flex items-center gap-2 justify-center">
                      <span className="text-xs text-gray-500">Resultado exacto (opcional):</span>
                      <input
                        type="number"
                        min="0" max="20"
                        value={e.home}
                        onChange={ev => setEditing(prev => ({ ...prev, [match.id]: { ...(prev[match.id] || { prediction: '' }), home: ev.target.value, away: prev[match.id]?.away ?? '' } }))}
                        className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-1 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="0"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="number"
                        min="0" max="20"
                        value={e.away}
                        onChange={ev => setEditing(prev => ({ ...prev, [match.id]: { ...(prev[match.id] || { prediction: '' }), away: ev.target.value, home: prev[match.id]?.home ?? '' } }))}
                        className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-1 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                        placeholder="0"
                      />
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={() => handleSave(match.id)}
                        disabled={saving === match.id || !e.prediction}
                        className="btn-primary px-6 text-sm disabled:opacity-40"
                      >
                        {saving === match.id ? 'Guardando...' : bet ? '✓ Actualizar apuesta' : 'Guardar apuesta'}
                      </button>
                    </div>
                  </div>
                ) : bet ? (
                  <div className="border-t border-gray-800 pt-3 flex items-center justify-center gap-4">
                    <span className="text-sm text-gray-400">Tu apuesta:</span>
                    <span className="badge-gold font-bold">{bet.prediction}</span>
                    {bet.predicted_home !== null && (
                      <span className="text-sm text-gray-400">
                        Resultado: {bet.predicted_home} - {bet.predicted_away}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="border-t border-gray-800 pt-3 text-center text-sm text-gray-600">
                    No apostaste en este partido
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
