'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team, GroupBet } from '@/types'

export default function GruposPage() {
  const supabase = createClient()
  const [teams, setTeams] = useState<Team[]>([])
  const [bets, setBets] = useState<Record<string, GroupBet>>({})
  const [selections, setSelections] = useState<Record<string, { first: number | null; second: number | null }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: ts } = await supabase.from('teams').select('*').order('group_name').order('name')
      const { data: bs } = await supabase.from('group_bets').select('*').eq('user_id', user.id)

      if (ts) setTeams(ts)
      if (bs) {
        const betsMap: Record<string, GroupBet> = {}
        const selMap: Record<string, { first: number | null; second: number | null }> = {}
        bs.forEach((b: GroupBet) => {
          betsMap[b.group_name] = b
          selMap[b.group_name] = { first: b.first_place_team_id, second: b.second_place_team_id }
        })
        setBets(betsMap)
        setSelections(selMap)
      }
      setLoading(false)
    }
    load()
  }, [])

  const groups = [...new Set(teams.map(t => t.group_name))].sort()

  const handleSelect = (group: string, position: 'first' | 'second', teamId: number) => {
    setSelections(prev => {
      const current = prev[group] || { first: null, second: null }
      // Si ya está seleccionado en la otra posición, intercambia
      if (position === 'first' && current.second === teamId) {
        return { ...prev, [group]: { first: teamId, second: null } }
      }
      if (position === 'second' && current.first === teamId) {
        return { ...prev, [group]: { first: null, second: teamId } }
      }
      return { ...prev, [group]: { ...current, [position]: teamId } }
    })
  }

  const handleSave = async (group: string) => {
    if (!userId) return
    const sel = selections[group]
    if (!sel?.first || !sel?.second) return

    setSaving(group)
    const payload = {
      user_id: userId,
      group_name: group,
      first_place_team_id: sel.first,
      second_place_team_id: sel.second,
    }

    if (bets[group]) {
      await supabase.from('group_bets').update(payload).eq('id', bets[group].id)
    } else {
      const { data } = await supabase.from('group_bets').insert(payload).select().single()
      if (data) setBets(prev => ({ ...prev, [group]: data }))
    }

    setSaved(prev => ({ ...prev, [group]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [group]: false })), 2000)
    setSaving(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Cargando grupos...</div>
      </div>
    )
  }

  const completedGroups = groups.filter(g => selections[g]?.first && selections[g]?.second).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="section-title">👥 Clasificación de grupos</h1>
      <p className="section-subtitle">
        Elige los 2 equipos que clasifiquen de cada grupo. 3 puntos por cada acierto.
      </p>

      <div className="flex items-center gap-3 mb-8">
        <span className="badge-gold">{completedGroups}/{groups.length} grupos completados</span>
        <span className="badge-gray">3 pts por clasificado correcto</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => {
          const groupTeams = teams.filter(t => t.group_name === group)
          const sel = selections[group] || { first: null, second: null }
          const bet = bets[group]
          const isComplete = sel.first && sel.second

          return (
            <div key={group} className={`card ${isComplete ? 'border-yellow-500/30' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">Grupo {group}</h2>
                {bet && (
                  <span className="badge-gold text-xs">
                    +{bet.points_earned} pts
                  </span>
                )}
              </div>

              <div className="space-y-1 mb-4">
                {groupTeams.map(team => {
                  const isFirst = sel.first === team.id
                  const isSecond = sel.second === team.id

                  return (
                    <div
                      key={team.id}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        isFirst ? 'bg-yellow-500/20 border border-yellow-500/40' :
                        isSecond ? 'bg-blue-500/20 border border-blue-500/40' :
                        'bg-gray-800 hover:bg-gray-750 border border-transparent'
                      }`}
                    >
                      <span className="text-lg">{team.flag_emoji}</span>
                      <span className="text-sm font-medium flex-1">{team.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSelect(group, 'first', team.id)}
                          title="1º clasificado"
                          className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                            isFirst
                              ? 'bg-yellow-500 text-gray-950'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          1
                        </button>
                        <button
                          onClick={() => handleSelect(group, 'second', team.id)}
                          title="2º clasificado"
                          className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                            isSecond
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          2
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Preview selección */}
              <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                <div>🥇 1º: {sel.first ? groupTeams.find(t => t.id === sel.first)?.name : '—'}</div>
                <div>🥈 2º: {sel.second ? groupTeams.find(t => t.id === sel.second)?.name : '—'}</div>
              </div>

              <button
                onClick={() => handleSave(group)}
                disabled={saving === group || !isComplete}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                  saved[group]
                    ? 'bg-green-600 text-white'
                    : isComplete
                      ? 'btn-primary'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {saving === group ? 'Guardando...' :
                 saved[group] ? '✓ Guardado' :
                 bet ? 'Actualizar' :
                 isComplete ? 'Guardar' : 'Selecciona 1º y 2º'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
