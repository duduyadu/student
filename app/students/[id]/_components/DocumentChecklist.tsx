'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StudentDocument, DocCategory, DocStatus } from '@/lib/types'

interface Props {
  studentId: string
}

const CATEGORY_LABELS: Record<DocCategory, string> = {
  identity:  '신분서류',
  school:    '학교서류',
  financial: '재정서류',
  health:    '건강서류',
}

const STATUS_LABELS: Record<DocStatus, string> = {
  pending:   '미제출',
  submitted: '제출됨',
  reviewing: '검토중',
  approved:  '승인',
  rejected:  '반려',
}

const STATUS_COLORS: Record<DocStatus, string> = {
  pending:   'bg-slate-100 text-slate-500',
  submitted: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
}

const ALL_STATUSES: DocStatus[] = ['pending', 'submitted', 'reviewing', 'approved', 'rejected']
const CATEGORIES: DocCategory[] = ['identity', 'school', 'financial', 'health']

export default function DocumentChecklist({ studentId }: Props) {
  const [docs, setDocs]               = useState<StudentDocument[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeCategory, setCategory] = useState<DocCategory>('identity')
  const [updating, setUpdating]       = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null)

  useEffect(() => {
    loadDocs()
  }, [studentId])

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }

  const loadDocs = async () => {
    setLoading(true)
    const token = await getToken()
    const res = await fetch(`/api/student-documents?studentId=${studentId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setDocs(data)
    }
    setLoading(false)
  }

  const updateStatus = async (docId: string, status: DocStatus, extra?: Record<string, unknown>) => {
    setUpdating(docId)
    const token = await getToken()
    await fetch(`/api/student-documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status, ...extra }),
    })
    await loadDocs()
    setUpdating(null)
  }

  const handleStatusChange = async (doc: StudentDocument, newStatus: DocStatus) => {
    if (newStatus === 'rejected') {
      setRejectModal({ id: doc.id, reason: doc.reject_reason ?? '' })
      return
    }
    await updateStatus(doc.id, newStatus)
  }

  const submitReject = async () => {
    if (!rejectModal) return
    await updateStatus(rejectModal.id, 'rejected', { reject_reason: rejectModal.reason })
    setRejectModal(null)
  }

  const approvedCount = docs.filter(d => d.status === 'approved').length
  const totalCount    = docs.length
  const pct           = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

  const filtered = docs.filter(d => d.doc_type?.category === activeCategory)

  const getDaysUntilExpiry = (date?: string) => {
    if (!date) return null
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  }

  if (loading) {
    return <div className="text-center py-10 text-slate-400 text-sm">서류 목록 불러오는 중...</div>
  }

  return (
    <div className="space-y-4">
      {/* 진행률 요약 */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">
            서류 체크리스트 ({approvedCount}/{totalCount} 승인 — {pct}%)
          </span>
          <button
            onClick={loadDocs}
            className="text-xs text-slate-400 hover:text-blue-500 transition-colors"
          >
            새로고침
          </button>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm w-fit">
        {CATEGORIES.map(cat => {
          const catDocs = docs.filter(d => d.doc_type?.category === cat)
          const catApproved = catDocs.filter(d => d.status === 'approved').length
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {CATEGORY_LABELS[cat]} ({catApproved}/{catDocs.length})
            </button>
          )
        })}
      </div>

      {/* 서류 목록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">해당 카테고리 서류 없음</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">서류명</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">필수</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">상태</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">만료일</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">제출일</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">파일</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500">상태변경</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(doc => {
                const dt   = doc.doc_type
                const days = getDaysUntilExpiry(doc.expiry_date)
                const expiryClass =
                  days !== null && days <= 7  ? 'text-red-600 font-semibold' :
                  days !== null && days <= 30 ? 'text-orange-500 font-medium' :
                  'text-slate-600'

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{dt?.name_kr}</div>
                      <div className="text-xs text-slate-400">{dt?.name_vi}</div>
                      {doc.reject_reason && (
                        <div className="text-xs text-red-500 mt-1">
                          반려: {doc.reject_reason}
                        </div>
                      )}
                    </td>
                    <td className="text-center px-3 py-3">
                      {dt?.is_required ? (
                        <span className="text-xs text-red-500 font-medium">필수</span>
                      ) : (
                        <span className="text-xs text-slate-400">선택</span>
                      )}
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status as DocStatus]}`}>
                        {STATUS_LABELS[doc.status as DocStatus]}
                      </span>
                      {doc.self_checked && (
                        <div className="text-xs text-slate-400 mt-0.5">자가확인</div>
                      )}
                    </td>
                    <td className="text-center px-3 py-3">
                      {doc.expiry_date ? (
                        <span className={`text-xs ${expiryClass}`}>
                          {doc.expiry_date}
                          {days !== null && days <= 30 && (
                            <span className="ml-1">D-{days}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="text-center px-3 py-3">
                      <span className="text-xs text-slate-500">
                        {doc.submitted_at
                          ? new Date(doc.submitted_at).toLocaleDateString('ko-KR')
                          : '-'}
                      </span>
                    </td>
                    <td className="text-center px-3 py-3">
                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          보기
                        </a>
                      ) : (
                        <span className="text-xs text-slate-300">없음</span>
                      )}
                    </td>
                    <td className="text-center px-3 py-3">
                      <select
                        value={doc.status}
                        disabled={updating === doc.id}
                        onChange={e => handleStatusChange(doc, e.target.value as DocStatus)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 반려 사유 모달 */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800 mb-3">반려 사유 입력</h3>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="반려 사유를 입력하세요 (학생에게 표시됩니다)"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                취소
              </button>
              <button
                onClick={submitReject}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600"
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
