'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TeacherEvaluation, EvaluationTemplate } from '@/lib/types'
import StarRating from '@/components/StarRating'

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
const lbl = 'block text-xs font-medium text-slate-500 mb-1'

interface Props {
  studentId: string
  evaluations: TeacherEvaluation[]
  templates: EvaluationTemplate[]
  onRefresh: () => void
}

interface FormState {
  eval_date: string
  eval_period: string
  evaluator_name: string
  evaluator_role: string
  is_public: boolean
  scores: Record<string, number>
  overall_comment: string
  internal_memo: string
}

function buildDefaultScores(templates: EvaluationTemplate[]): Record<string, number> {
  return Object.fromEntries(
    templates.filter(t => t.field_type === 'rating').map(t => [t.field_key, 0])
  )
}

function calcAvg(scores: Record<string, number | string>): number {
  const vals = Object.values(scores).map(Number).filter(n => !isNaN(n) && n > 0)
  if (!vals.length) return 0
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export default function EvaluationPanel({ studentId, evaluations, templates, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState<FormState>({
    eval_date:       '',
    eval_period:     '',
    evaluator_name:  '',
    evaluator_role:  'teacher',
    is_public:       false,
    scores:          buildDefaultScores(templates),
    overall_comment: '',
    internal_memo:   '',
  })

  const ratingTemplates = templates.filter(t => t.field_type === 'rating')

  const openAdd = () => {
    setForm({
      eval_date:       '',
      eval_period:     '',
      evaluator_name:  '',
      evaluator_role:  'teacher',
      is_public:       false,
      scores:          buildDefaultScores(templates),
      overall_comment: '',
      internal_memo:   '',
    })
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (ev: TeacherEvaluation) => {
    const base = buildDefaultScores(templates)
    const merged = { ...base, ...(ev.scores as Record<string, number>) }
    setForm({
      eval_date:       ev.eval_date,
      eval_period:     ev.eval_period ?? '',
      evaluator_name:  ev.evaluator_name,
      evaluator_role:  ev.evaluator_role,
      is_public:       ev.is_public,
      scores:          merged,
      overall_comment: ev.overall_comment ?? '',
      internal_memo:   ev.internal_memo ?? '',
    })
    setEditId(ev.id)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      student_id:      studentId,
      eval_date:       form.eval_date,
      eval_period:     form.eval_period || null,
      evaluator_name:  form.evaluator_name,
      evaluator_role:  form.evaluator_role,
      is_public:       form.is_public,
      scores:          form.scores,
      overall_comment: form.overall_comment || null,
      internal_memo:   form.internal_memo || null,
    }
    if (editId) {
      await supabase.from('teacher_evaluations').update(payload).eq('id', editId)
    } else {
      await supabase.from('teacher_evaluations').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 평가 기록을 삭제하시겠습니까?')) return
    await supabase.from('teacher_evaluations').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="space-y-3">
      {/* 툴바 */}
      <div className="flex justify-end">
        <button onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition-colors">
          + 평가 추가
        </button>
      </div>

      {/* 입력 폼 */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 shadow-sm space-y-4 border border-blue-100">
          <h3 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">
            {editId ? '평가 수정' : '새 선생님 평가'}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>평가 날짜 *</label>
              <input type="date" required value={form.eval_date}
                onChange={e => setForm(p => ({ ...p, eval_date: e.target.value }))}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>평가 구분</label>
              <input value={form.eval_period}
                onChange={e => setForm(p => ({ ...p, eval_period: e.target.value }))}
                className={inp} placeholder="2026-02 월말평가 1차" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>평가자 이름 *</label>
              <input required value={form.evaluator_name}
                onChange={e => setForm(p => ({ ...p, evaluator_name: e.target.value }))}
                className={inp} placeholder="이영희 선생님" />
            </div>
            <div>
              <label className={lbl}>역할</label>
              <select value={form.evaluator_role}
                onChange={e => setForm(p => ({ ...p, evaluator_role: e.target.value }))}
                className={inp}>
                <option value="teacher">선생님</option>
                <option value="manager">매니저</option>
                <option value="director">원장</option>
              </select>
            </div>
          </div>

          {/* 공개 여부 */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-sm text-slate-600 font-medium flex-1">대사관 제출용 공개 여부</span>
            <div className="flex gap-1">
              <div onClick={() => setForm(p => ({ ...p, is_public: false }))}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  !form.is_public ? 'bg-slate-500 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
                🔒 비공개
              </div>
              <div onClick={() => setForm(p => ({ ...p, is_public: true }))}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  form.is_public ? 'bg-green-500 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
                📌 공개
              </div>
            </div>
          </div>

          {/* 정량 평가 - 템플릿 기반 동적 렌더링 */}
          <div>
            <label className={lbl}>정량 평가 (별점)</label>
            <div className="space-y-2 bg-slate-50 rounded-xl p-4">
              {ratingTemplates.map(tmpl => (
                <div key={tmpl.field_key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{tmpl.label_kr}</span>
                  <div className="flex items-center gap-2">
                    <StarRating
                      value={form.scores[tmpl.field_key] ?? 0}
                      max={tmpl.max_value}
                      onChange={v => setForm(p => ({ ...p, scores: { ...p.scores, [tmpl.field_key]: v } }))}
                    />
                    <span className="text-xs text-slate-400 w-8 text-right">
                      {form.scores[tmpl.field_key] || 0}/{tmpl.max_value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 정성 평가 */}
          <div>
            <label className={lbl}>종합 의견 (공개)</label>
            <textarea rows={3} value={form.overall_comment}
              onChange={e => setForm(p => ({ ...p, overall_comment: e.target.value }))}
              className={inp + ' resize-none'} placeholder="학생의 전반적인 상황과 발전 방향..." />
          </div>
          <div>
            <label className={lbl}>내부 메모 (비공개 - 대사관 제출 제외)</label>
            <textarea rows={2} value={form.internal_memo}
              onChange={e => setForm(p => ({ ...p, internal_memo: e.target.value }))}
              className={inp + ' resize-none border-dashed'} placeholder="내부 관리용 메모 (PDF에 포함되지 않음)..." />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm">취소</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium">
              {saving ? '저장 중...' : (editId ? '수정 완료' : '저장')}
            </button>
          </div>
        </form>
      )}

      {/* 평가 목록 */}
      {evaluations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center text-slate-400">
          <p className="text-3xl mb-2">⭐</p>
          <p className="text-sm">평가 기록이 없습니다.</p>
        </div>
      ) : (
        evaluations.map(ev => {
          const avg = calcAvg(ev.scores)
          return (
            <div key={ev.id} className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${
              ev.is_public ? 'border-green-400' : 'border-slate-200'
            }`}>
              {/* 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-slate-700">{ev.eval_date}</span>
                    {ev.eval_period && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{ev.eval_period}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ev.is_public ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {ev.is_public ? '📌 공개' : '🔒 비공개'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">👤 {ev.evaluator_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {avg > 0 && (
                    <div className="text-center">
                      <StarRating value={Math.round(avg)} readonly size="sm" />
                      <p className="text-xs text-slate-400 mt-0.5">평균 {avg}/5</p>
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(ev)} className="text-xs text-slate-300 hover:text-blue-500 px-1">수정</button>
                    <button onClick={() => handleDelete(ev.id)} className="text-xs text-slate-300 hover:text-red-500 px-1">삭제</button>
                  </div>
                </div>
              </div>

              {/* 별점 목록 */}
              {ratingTemplates.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-1.5">
                  {ratingTemplates.map(tmpl => {
                    const score = Number(ev.scores[tmpl.field_key] ?? 0)
                    if (!score) return null
                    return (
                      <div key={tmpl.field_key} className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{tmpl.label_kr}</span>
                        <div className="flex items-center gap-1">
                          <StarRating value={score} max={tmpl.max_value} readonly size="sm" />
                          <span className="text-xs text-slate-400">{score}/{tmpl.max_value}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {ev.overall_comment && (
                <p className="text-sm text-slate-700 leading-relaxed">{ev.overall_comment}</p>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
