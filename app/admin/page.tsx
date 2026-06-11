'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Match, Team } from '@/types'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'matches' | 'results' | 'specials'>('matches')

  // Matches
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [newMatch, setNewMatch] = useState({
    home_team_id: '', away_team_id: '', match_date: '',
    stage: 'group', group_name: ''
  })

  // Results
  const [results, setResults] = useState<Record<number, { home: string; away: string }>>({})
  const [savingResult, setSavingResult] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) { router.push('/'); return }
      setIsAdmin(true)

      const { data: ms } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .order('match_date')
      const { data: ts } = await supabase.from('teams').select('*').order('group_name').order('name')

      if (ms) {
        setMatches(ms)
        const resMap: Record<number, { home: string; away: string }> = {}
        ms.forEach((m: Match) => {
          resMap[m.id] = {
            home: m.home_score?.toString() ?? '',
            away: m.away_score?.toString() ?? '',
          }
        })
        setResults(resMap)
      }
      if (ts) setTeams(ts)
      setLoading(false)
    }
    load()
  }, [])

  const handleAddMatch = async () => {
    if (!newMatch.home_team_id || !newMatch.away_team_id || !newMatch.match_date) return
    await supabase.from('matches').insert({
      home_team_id: parseInt(newMatch.home_team_id),
      away_team_id: parseInt(newMatch.away_team_id),
      match_date: newMatch.match_date,
      stage: newMatch.stage,
      group_name: newMatch.group_name || null,
    })
    const { data } = await supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
      .order('match_date')
    if (data) setMatches(data)
    setNewMatch({ home_team_id: '', away_team_id: '', match_date: '', stage: 'group', group_name: '' })
  }

  const handleSaveResult = async (matchId: number) => {
    const res = results[matchId]
    if (res.home === '' || res.away === '') return
    setSavingResult(matchId)

    const homeScore = parseInt(res.home)
    const awayScore = parseInt(res.away)

    // Actualizar resultado del partido
    await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished',
    }).eq('id', matchId)

    // Determinar resultado real
    const realResult = homeScore > awayScore ? '1' : awayScore > homeScore ? '2' : 'X'

    // Obtener apuestas de este partido
    const { data: bets } = await supabase
      .from('match_bets')
      .select('*')
      .eq('match_id', matchId)

    if (bets) {
      for (const bet of bets) {
        let points = 0
        if (bet.prediction === realResult) points += 2
        if (bet.predicted_home === homeScore && bet.predicted_away === awayScore) points += 3 // bonus por exacto (2+3=5)
        await supabase.from('match_bets').update({ points_earned: points }).eq('id', bet.id)
      }
    }

    // Recargar partidos
    const { data } = await supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
      .order('match_date')
    if (data) setMatches(data)

    setSavingResult(null)
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Cargando...</div>
  if (!isAdmin) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="section-title">⚙️ Panel de administración</h1>
      <p className="section-subtitle">Gestiona partidos, resultados y preguntas especiales.</p>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-800 mb-6">
        {[
          { key: 'matches', label: '📅 Partidos' },
          { key: 'results', label: '⚽ Resultados' },
          { key: 'specials', label: '🏆 Especiales' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`pb-3 text-sm ${tab === t.key ? 'tab-active' : 'tab-inactive'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Añadir partidos */}
      {tab === 'matches' && (
        <div>
          <h2 className="font-bold text-lg mb-4">Añadir partido</h2>
          <div className="card mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Local</label>
                <select
                  value={newMatch.home_team_id}
                  onChange={e => setNewMatch({...newMatch, home_team_id: e.target.value})}
                  className="input-field"
                >
                  <option value="">Selecciona equipo</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Visitante</label>
                <select
                  value={newMatch.away_team_id}
                  onChange={e => setNewMatch({...newMatch, away_team_id: e.target.value})}
                  className="input-field"
                >
                  <option value="">Selecciona equipo</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={newMatch.match_date}
                  onChange={e => setNewMatch({...newMatch, match_date: e.target.value})}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Fase</label>
                <select
                  value={newMatch.stage}
                  onChange={e => setNewMatch({...newMatch, stage: e.target.value})}
                  className="input-field"
                >
                  <option value="group">Fase de grupos</option>
                  <option value="round16">Octavos</option>
                  <option value="quarter">Cuartos</option>
                  <option value="semi">Semifinal</option>
                  <option value="3rd">Tercer puesto</option>
                  <option value="final">Final</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Grupo (si aplica)</label>
                <input
                  type="text"
                  value={newMatch.group_name}
                  onChange={e => setNewMatch({...newMatch, group_name: e.target.value.toUpperCase()})}
                  className="input-field"
                  placeholder="A, B, C..."
                  maxLength={1}
                />
              </div>
            </div>
            <button onClick={handleAddMatch} className="btn-primary mt-4">
              + Añadir partido
            </button>
          </div>

          <h2 className="font-bold text-lg mb-3">Partidos ({matches.length})</h2>
          <div className="space-y-2">
            {matches.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800">
                <span className="text-sm text-gray-500 w-20 shrink-0">
                  {new Date(m.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
                <span className="text-sm flex-1">
                  {(m.home_team as any)?.flag_emoji} {(m.home_team as any)?.code} vs {(m.away_team as any)?.code} {(m.away_team as any)?.flag_emoji}
                </span>
                <span className="badge-gray">{m.stage}</span>
                {m.home_score !== null && (
                  <span className="badge-gold">{m.home_score}-{m.away_score}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Resultados */}
      {tab === 'results' && (
        <div>
          <h2 className="font-bold text-lg mb-4">Introducir resultados</h2>
          <p className="text-sm text-gray-500 mb-4">Al guardar el resultado se calculan automáticamente los puntos de cada usuario.</p>
          <div className="space-y-2">
            {matches.map(m => (
              <div key={m.id} className="card flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {(m.home_team as any)?.flag_emoji} {(m.home_team as any)?.name} vs {(m.away_team as any)?.name} {(m.away_team as any)?.flag_emoji}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(m.match_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="30"
                    value={results[m.id]?.home ?? ''}
                    onChange={e => setResults(prev => ({ ...prev, [m.id]: { ...prev[m.id], home: e.target.value } }))}
                    className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    placeholder="0"
                  />
                  <span className="text-gray-500">—</span>
                  <input
                    type="number" min="0" max="30"
                    value={results[m.id]?.away ?? ''}
                    onChange={e => setResults(prev => ({ ...prev, [m.id]: { ...prev[m.id], away: e.target.value } }))}
                    className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    placeholder="0"
                  />
                </div>
                <button
                  onClick={() => handleSaveResult(m.id)}
                  disabled={savingResult === m.id}
                  className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  {savingResult === m.id ? '...' : m.status === 'finished' ? '✓ Actualizar' : 'Guardar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Especiales */}
      {tab === 'specials' && (
        <SpecialsAdmin />
      )}
    </div>
  )
}

function SpecialsAdmin() {
  const supabase = createClient()
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('special_questions').select('*').order('id').then(({ data }) => {
      if (data) {
        setQuestions(data)
        const map: Record<number, string> = {}
        data.forEach((q: any) => { if (q.correct_answer) map[q.id] = q.correct_answer })
        setAnswers(map)
      }
    })
  }, [])

  const handleSaveAnswer = async (qId: number) => {
    setSaving(qId)
    await supabase.from('special_questions').update({ correct_answer: answers[qId] }).eq('id', qId)

    // Evaluar apuestas de esta pregunta
    const { data: bets } = await supabase.from('special_bets').select('*, question:special_questions(points)').eq('question_id', qId)
    if (bets) {
      for (const bet of bets) {
        const correct = bet.answer.toLowerCase().trim() === answers[qId].toLowerCase().trim()
        await supabase.from('special_bets').update({
          is_correct: correct,
          points_earned: correct ? bet.question.points : 0,
        }).eq('id', bet.id)
      }
    }
    setSaving(null)
  }

  return (
    <div>
      <h2 className="font-bold text-lg mb-4">Corregir apuestas especiales</h2>
      <p className="text-sm text-gray-500 mb-4">Introduce la respuesta correcta para evaluar y asignar puntos automáticamente.</p>
      <div className="space-y-3">
        {questions.map(q => (
          <div key={q.id} className="card">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-gold">{q.points} pts</span>
            </div>
            <p className="font-medium mb-3">{q.question}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                className="input-field flex-1"
                placeholder="Respuesta correcta..."
              />
              <button
                onClick={() => handleSaveAnswer(q.id)}
                disabled={saving === q.id || !answers[q.id]}
                className="btn-primary text-sm disabled:opacity-40"
              >
                {saving === q.id ? '...' : '✓ Guardar y puntuar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
