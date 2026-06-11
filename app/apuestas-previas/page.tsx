'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SpecialQuestion, SpecialBet } from '@/types'

export default function ApuestasPreviasPage() {
  const supabase = createClient()
  const [questions, setQuestions] = useState<SpecialQuestion[]>([])
  const [bets, setBets] = useState<Record<number, SpecialBet>>({})
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: qs } = await supabase
        .from('special_questions')
        .select('*')
        .eq('is_active', true)
        .order('id')

      const { data: bs } = await supabase
        .from('special_bets')
        .select('*')
        .eq('user_id', user.id)

      if (qs) setQuestions(qs)
      if (bs) {
        const betsMap: Record<number, SpecialBet> = {}
        const answersMap: Record<number, string> = {}
        bs.forEach((b: SpecialBet) => {
          betsMap[b.question_id] = b
          answersMap[b.question_id] = b.answer
        })
        setBets(betsMap)
        setAnswers(answersMap)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (questionId: number) => {
    if (!userId || !answers[questionId]?.trim()) return
    setSaving(questionId)

    const existing = bets[questionId]
    if (existing) {
      await supabase
        .from('special_bets')
        .update({ answer: answers[questionId] })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('special_bets')
        .insert({ user_id: userId, question_id: questionId, answer: answers[questionId] })
    }

    setSaved(prev => ({ ...prev, [questionId]: true }))
    setTimeout(() => setSaved(prev => ({ ...prev, [questionId]: false })), 2000)
    setSaving(null)
  }

  const getStatusBadge = (q: SpecialQuestion) => {
    if (!bets[q.id]) return <span className="badge-gray">Sin responder</span>
    if (bets[q.id]?.is_correct === true) return <span className="badge-green">✓ Correcto</span>
    if (bets[q.id]?.is_correct === false) return <span className="badge-red">✗ Incorrecto</span>
    return <span className="badge-gold">✓ Apostado</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Cargando preguntas...</div>
      </div>
    )
  }

  const totalPossiblePoints = questions.reduce((sum, q) => sum + q.points, 0)
  const earnedPoints = Object.values(bets).reduce((sum, b) => sum + (b.points_earned || 0), 0)
  const answeredCount = Object.keys(bets).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="section-title">🏆 Apuestas previas al Mundial</h1>
        <p className="section-subtitle">
          Responde antes de que empiece el Mundial. Las respuestas se bloquean al inicio del torneo.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-400">{answeredCount}/{questions.length}</div>
            <div className="text-xs text-gray-500 mt-1">Respondidas</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-400">{earnedPoints}</div>
            <div className="text-xs text-gray-500 mt-1">Puntos ganados</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-400">{totalPossiblePoints}</div>
            <div className="text-xs text-gray-500 mt-1">Puntos posibles</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map(q => (
          <div key={q.id} className="card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-gold">{q.points} pts</span>
                  {getStatusBadge(q)}
                </div>
                <h3 className="font-medium text-white">{q.question}</h3>
              </div>
            </div>

            {q.correct_answer && (
              <div className="mb-3 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-yellow-400">
                Respuesta correcta: <strong>{q.correct_answer}</strong>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                className="input-field flex-1"
                placeholder={
                  q.question_type === 'team' ? 'Ej: España' :
                  q.question_type === 'player' ? 'Ej: Pedri' :
                  q.question_type === 'number' ? 'Ej: 156' :
                  'Tu respuesta...'
                }
                disabled={!!q.correct_answer}
              />
              <button
                onClick={() => handleSave(q.id)}
                disabled={saving === q.id || !!q.correct_answer || !answers[q.id]?.trim()}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-40 ${
                  saved[q.id]
                    ? 'bg-green-600 text-white'
                    : 'btn-primary'
                }`}
              >
                {saving === q.id ? '...' : saved[q.id] ? '✓ Guardado' : bets[q.id] ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
