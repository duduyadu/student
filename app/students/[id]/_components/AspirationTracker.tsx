'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AspirationHistory } from '@/lib/types'

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm'
const lbl = 'block text-xs font-medium text-slate-500 mb-1'

interface Props {
  studentId: string
  aspirations: AspirationHistory[]
  onRefresh: () => void
}

interface FormState {
  changed_date: string
  university: string
  major: string
  reason: string
}

const DEFAULT_FORM: FormState = {
  changed_date: '',
  university:   '',
  major:        '',
  reason:       '',
}

export default function AspirationTracker({ studentId, aspirations, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState<FormState>(DEFAULT_FORM)
  const [editId, setEditId]     = useState<string | null>(null)

  const openAdd = () => { setForm(DEFAULT_FORM); setEditId(null); setShowForm(true) }
  const openEdit = (a: AspirationHistory) => {
    setForm({
      changed_date: a.changed_date,
      university:   a.university ?? '',
      major:        a.major ?? '',
      reason:       a.reason ?? '',
    })
    setEditId(a.id)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      student_id:   studentId,
      changed_date: form.changed_date,
      university:   form.university || null,
      major:        form.major || null,
      reason:       form.reason || null,
    }
    if (editId) {
      await supabase.from('aspiration_history').update(payload).eq('id', editId)
    } else {
      await supabase.from('aspiration_history').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 희망 대학 이력을 삭제하시겠습니까?')) return
    await supabase.from('aspiration_history').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">🎯 희망 대학 변경 이력</h3>
        <button
          onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-xl transition-colors"
        >
          + 이력 추가
        </button>
      </div>

      {/* 입력 폼 */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-indigo-50 rounded-2xl p-4 space-y-3 border border-indigo-100">
          <h4 className="text-xs font-semibold text-indigo-700 pb-2 border-b border-indigo-100">
            {editId ? '이력 수정' : '새 희망 대학 이력'}
          </h4>

          <div>
            <label className={lbl}>변경 날짜 *</label>
            <input type="date" required value={form.changed_date}
              onChange={e => setForm(p => ({ ...p, changed_date: e.target.value }))}
              className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>희망 대학</label>
              <input value={form.university}
                onChange={e => setForm(p => ({ ...p, university: e.target.value }))}
                className={inp} placeholder="예: 서울대학교" />
            </div>
            <div>
              <label className={lbl}>희망 학과</label>
              <input value={form.major}
                onChange={e => setForm(p => ({ ...p, major: e.target.value }))}
                className={inp} placeholder="예: 경영학과" />
            </div>
          </div>

          <div>
            <label className={lbl}>변경 사유</label>
            <input value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              className={inp} placeholder="예: 성적 향상으로 목표 상향 조정" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs">취소</button>
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-medium">
              {saving ? '저장 중...' : (editId ? '수정 완료' : '저장')}
            </button>
          </div>
        </form>
      )}

      {/* 이력 목록 */}
      {aspirations.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400 text-sm">
          희망 대학 변경 이력이 없습니다.
        </div>
      ) : (
        <div className="relative">
          {/* 세로 연결선 */}
          {aspirations.length > 1 && (
            <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-indigo-100" />
          )}
          <div className="space-y-2">
            {aspirations.map((a, idx) => (
              <div key={a.id} className="relative pl-7">
                {/* 타임라인 점 */}
                <div className={`absolute left-0 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${idx === 0 ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-indigo-300'}`}>
                  <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-white' : 'bg-indigo-300'}`} />
                </div>

                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-slate-400 font-medium">{a.changed_date}</span>
                        {idx === 0 && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">최신</span>
                        )}
                      </div>
                      {(a.university || a.major) ? (
                        <p className="text-sm font-semibold text-slate-800">
                          {[a.university, a.major].filter(Boolean).join(' · ')}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">대학/학과 미입력</p>
                      )}
                      {a.reason && (
                        <p className="text-xs text-slate-500 mt-1">{a.reason}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(a)}
                        className="text-xs text-slate-300 hover:text-indigo-500 transition-colors px-1">수정</button>
                      <button onClick={() => handleDelete(a.id)}
                        className="text-xs text-slate-300 hover:text-red-500 transition-colors px-1">삭제</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
