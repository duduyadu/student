'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Consultation, ConsultCategory, CounselorRole } from '@/lib/types'

const CATEGORY_LABELS: Record<ConsultCategory, string> = {
  score:    '성적',
  attitude: '태도',
  career:   '진로',
  visa:     '비자',
  life:     '생활',
  family:   '가정',
  other:    '기타',
}

const CATEGORY_COLORS: Record<ConsultCategory, string> = {
  score:    'bg-blue-100 text-blue-700',
  attitude: 'bg-orange-100 text-orange-700',
  career:   'bg-purple-100 text-purple-700',
  visa:     'bg-red-100 text-red-700',
  life:     'bg-green-100 text-green-700',
  family:   'bg-amber-100 text-amber-700',
  other:    'bg-slate-100 text-slate-600',
}

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#3182F6] focus:bg-white text-sm'
const lbl = 'block text-xs font-medium text-slate-500 mb-1'

interface Props {
  studentId: string
  consultations: Consultation[]
  onRefresh: () => void
}

interface FormState {
  consult_date: string
  consult_type: string
  topic_category: ConsultCategory
  counselor_name: string
  counselor_role: CounselorRole
  is_public: boolean
  aspiration_univ: string
  aspiration_major: string
  summary: string
  improvement: string
  next_goal: string
}

const DEFAULT_FORM: FormState = {
  consult_date:    '',
  consult_type:    '정기',
  topic_category:  'other',
  counselor_name:  '',
  counselor_role:  'teacher',
  is_public:       false,
  aspiration_univ: '',
  aspiration_major:'',
  summary:         '',
  improvement:     '',
  next_goal:       '',
}

const PAGE_SIZE = 20

export default function ConsultTimeline({ studentId, consultations, onRefresh }: Props) {
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState<FormState>(DEFAULT_FORM)
  const [showPublicOnly, setShowPublicOnly] = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [visibleCount, setVisibleCount]     = useState(PAGE_SIZE)

  const filtered = showPublicOnly
    ? consultations.filter(c => c.is_public)
    : consultations

  // 필터 변경 시 더보기 초기화
  const handleFilterChange = (publicOnly: boolean) => {
    setShowPublicOnly(publicOnly)
    setVisibleCount(PAGE_SIZE)
  }

  const visible = filtered.slice(0, visibleCount)
  const remaining = filtered.length - visibleCount

  const openAdd = () => { setForm(DEFAULT_FORM); setEditId(null); setShowForm(true) }
  const openEdit = (c: Consultation) => {
    setForm({
      consult_date:    c.consult_date,
      consult_type:    c.consult_type ?? '정기',
      topic_category:  (c.topic_category as ConsultCategory) ?? 'other',
      counselor_name:  c.counselor_name ?? '',
      counselor_role:  (c.counselor_role as CounselorRole) ?? 'teacher',
      is_public:       c.is_public ?? false,
      aspiration_univ: c.aspiration_univ ?? '',
      aspiration_major:c.aspiration_major ?? '',
      summary:         c.summary ?? '',
      improvement:     c.improvement ?? '',
      next_goal:       c.next_goal ?? '',
    })
    setEditId(c.id)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      student_id:      studentId,
      consult_date:    form.consult_date,
      consult_type:    form.consult_type || null,
      topic_category:  form.topic_category,
      counselor_name:  form.counselor_name || null,
      counselor_role:  form.counselor_role,
      is_public:       form.is_public,
      aspiration_univ: form.aspiration_univ || null,
      aspiration_major:form.aspiration_major || null,
      summary:         form.summary || null,
      improvement:     form.improvement || null,
      next_goal:       form.next_goal || null,
    }
    if (editId) {
      await supabase.from('consultations').update(payload).eq('id', editId)
    } else {
      await supabase.from('consultations').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 상담 기록을 삭제하시겠습니까?')) return
    await supabase.from('consultations').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="space-y-3">
      {/* 툴바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={() => handleFilterChange(false)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!showPublicOnly ? 'bg-slate-200 text-slate-700' : 'hover:bg-slate-100'}`}
          >
            전체 ({consultations.length})
          </button>
          <button
            onClick={() => handleFilterChange(true)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${showPublicOnly ? 'bg-green-100 text-green-700' : 'hover:bg-slate-100'}`}
          >
            공개만 ({consultations.filter(c => c.is_public).length})
          </button>
        </div>
        <button
          onClick={openAdd}
          className="bg-[#3182F6] hover:bg-[#1B64DA] text-white text-sm px-4 py-2 rounded-xl transition-colors"
        >
          + 상담 추가
        </button>
      </div>

      {/* 입력 폼 */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 shadow-sm space-y-4 border border-blue-100">
          <h3 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">
            {editId ? '상담 기록 수정' : '새 상담 기록'}
          </h3>

          {/* 날짜 + 상담자 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>상담 날짜 *</label>
              <input type="date" required value={form.consult_date}
                onChange={e => setForm(p => ({ ...p, consult_date: e.target.value }))}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>상담자 이름</label>
              <input value={form.counselor_name}
                onChange={e => setForm(p => ({ ...p, counselor_name: e.target.value }))}
                className={inp} placeholder="홍길동 선생님" />
            </div>
          </div>

          {/* 역할 + 주제 카테고리 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>상담자 역할</label>
              <select value={form.counselor_role}
                onChange={e => setForm(p => ({ ...p, counselor_role: e.target.value as CounselorRole }))}
                className={inp}>
                <option value="teacher">선생님</option>
                <option value="manager">매니저</option>
                <option value="director">원장</option>
                <option value="counselor">상담사</option>
              </select>
            </div>
            <div>
              <label className={lbl}>상담 주제</label>
              <select value={form.topic_category}
                onChange={e => setForm(p => ({ ...p, topic_category: e.target.value as ConsultCategory }))}
                className={inp}>
                {(Object.entries(CATEGORY_LABELS) as [ConsultCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 공개 여부 토글 */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-sm text-slate-600 font-medium flex-1">
              대사관 제출용 공개 여부
            </span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setForm(p => ({ ...p, is_public: false }))}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  !form.is_public ? 'bg-slate-500 text-white' : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                🔒 비공개
              </div>
              <div
                onClick={() => setForm(p => ({ ...p, is_public: true }))}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  form.is_public ? 'bg-green-500 text-white' : 'text-slate-400 hover:bg-slate-100'
                }`}
              >
                📌 공개
              </div>
            </label>
          </div>

          {/* 희망 대학 스냅샷 */}
          <div>
            <label className={lbl}>이 상담 시점 희망 대학/학과 (선택)</label>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.aspiration_univ}
                onChange={e => setForm(p => ({ ...p, aspiration_univ: e.target.value }))}
                className={inp} placeholder="A대학교" />
              <input value={form.aspiration_major}
                onChange={e => setForm(p => ({ ...p, aspiration_major: e.target.value }))}
                className={inp} placeholder="무역학과" />
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label className={lbl}>상담 내용</label>
            <textarea rows={3} value={form.summary}
              onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
              className={inp + ' resize-none'} placeholder="상담 내용을 입력하세요..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>개선 사항</label>
              <input value={form.improvement}
                onChange={e => setForm(p => ({ ...p, improvement: e.target.value }))}
                className={inp} placeholder="개선할 점..." />
            </div>
            <div>
              <label className={lbl}>다음 목표</label>
              <input value={form.next_goal}
                onChange={e => setForm(p => ({ ...p, next_goal: e.target.value }))}
                className={inp} placeholder="다음 상담까지 목표..." />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm">취소</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-blue-300 text-white rounded-xl text-sm font-medium">
              {saving ? '저장 중...' : (editId ? '수정 완료' : '저장')}
            </button>
          </div>
        </form>
      )}

      {/* 타임라인 */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center text-slate-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">{showPublicOnly ? '공개 상담 기록이 없습니다.' : '상담 기록이 없습니다.'}</p>
        </div>
      ) : (
        <div className="relative">
          {/* 세로 선 */}
          <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-slate-200" />

          <div className="space-y-1">
            {visible.map((c, idx) => {
              const cat = c.topic_category as ConsultCategory | undefined
              return (
                <div key={c.id} className="relative pl-8">
                  {/* 타임라인 점 */}
                  <div className={`absolute left-0 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs
                    ${c.is_public
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-slate-300 border-slate-300 text-white'
                    }`}>
                    {c.is_public ? '●' : '○'}
                  </div>

                  <div className={`bg-white rounded-2xl p-4 shadow-sm mb-3 border-l-4 ${
                    c.is_public ? 'border-green-400' : 'border-slate-200'
                  }`}>
                    {/* 헤더 */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-700">{c.consult_date}</span>
                        {cat && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat]}`}>
                            {CATEGORY_LABELS[cat]}
                          </span>
                        )}
                        {c.counselor_name && (
                          <span className="text-xs text-slate-400">👤 {c.counselor_name}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.is_public ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {c.is_public ? '📌 공개' : '🔒 비공개'}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(c)}
                          className="text-xs text-slate-300 hover:text-[#3182F6] transition-colors px-1">수정</button>
                        <button onClick={() => handleDelete(c.id)}
                          className="text-xs text-slate-300 hover:text-red-500 transition-colors px-1">삭제</button>
                      </div>
                    </div>

                    {/* 희망 대학 스냅샷 */}
                    {(c.aspiration_univ || c.aspiration_major) && (
                      <div className="mb-2 text-xs bg-[#EBF3FE] text-[#3182F6] px-3 py-1.5 rounded-lg inline-block">
                        🎯 희망: {[c.aspiration_univ, c.aspiration_major].filter(Boolean).join(' · ')}
                      </div>
                    )}

                    {/* 내용 */}
                    {c.summary     && <p className="text-sm text-slate-700 mb-1"><span className="font-medium text-slate-500">내용: </span>{c.summary}</p>}
                    {c.improvement && <p className="text-sm text-slate-600 mb-1"><span className="font-medium text-slate-500">개선: </span>{c.improvement}</p>}
                    {c.next_goal   && <p className="text-sm text-slate-600"><span className="font-medium text-slate-500">목표: </span>{c.next_goal}</p>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 더보기 버튼 */}
          {remaining > 0 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                className="text-sm text-slate-500 hover:text-blue-600 bg-white hover:bg-blue-50 px-5 py-2 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors"
              >
                더보기 ({remaining}개 남음)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
