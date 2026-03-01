'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { StudentDocument, DocCategory, DocStatus } from '@/lib/types'

interface Props {
  studentId: string
  lang?: 'ko' | 'vi'
}

const CATEGORY_LABELS: Record<DocCategory, { ko: string; vi: string }> = {
  identity:  { ko: '신분서류',   vi: 'Giấy tờ tùy thân' },
  school:    { ko: '학교서류',   vi: 'Giấy tờ học tập' },
  financial: { ko: '재정서류',   vi: 'Giấy tờ tài chính' },
  health:    { ko: '건강서류',   vi: 'Giấy tờ sức khỏe' },
}

const STATUS_LABELS: Record<DocStatus, { ko: string; vi: string }> = {
  pending:   { ko: '미제출',  vi: 'Chưa nộp' },
  submitted: { ko: '제출됨',  vi: 'Đã nộp' },
  reviewing: { ko: '검토중',  vi: 'Đang xem xét' },
  approved:  { ko: '승인',    vi: 'Đã duyệt' },
  rejected:  { ko: '반려',    vi: 'Bị từ chối' },
}

const STATUS_COLORS: Record<DocStatus, string> = {
  pending:   'bg-slate-100 text-slate-500',
  submitted: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
}

const CATEGORIES: DocCategory[] = ['identity', 'school', 'financial', 'health']

const STATUS_ORDER: Record<DocStatus, number> = {
  pending:   1,
  submitted: 2,
  reviewing: 3,
  approved:  4,
  rejected:  4,
}

function DocStatusStepper({ status, lang }: { status: DocStatus; lang: 'ko' | 'vi' }) {
  const steps = [
    { ko: '미제출', vi: 'Chưa nộp' },
    { ko: '제출',   vi: 'Đã nộp' },
    { ko: '검토',   vi: 'Xem xét' },
    { ko: '완료',   vi: 'Hoàn thành' },
  ]
  const current = STATUS_ORDER[status]

  return (
    <div className="flex items-start w-full mt-3">
      {steps.map((step, i) => {
        const stepNum  = i + 1
        const isActive = stepNum <= current
        const isLast   = i === steps.length - 1
        const isApproved = status === 'approved' && stepNum === 4
        const isRejected = status === 'rejected' && stepNum === 4

        const dotCls =
          isRejected ? 'bg-red-500 border-red-500' :
          isApproved ? 'bg-green-500 border-green-500' :
          isActive   ? 'bg-blue-500 border-blue-500' :
          'bg-white border-slate-300'

        const labelCls =
          isRejected ? 'text-red-500 font-medium' :
          isApproved ? 'text-green-600 font-medium' :
          stepNum === current ? 'text-blue-600 font-medium' :
          isActive ? 'text-slate-500' : 'text-slate-400'

        const lineCls = stepNum < current ? 'bg-blue-400' : 'bg-slate-200'

        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${dotCls}`} />
              <span className={`text-[9px] mt-0.5 leading-tight text-center ${labelCls}`}>
                {lang === 'ko' ? step.ko : step.vi}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-1 mt-[-10px] ${lineCls}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function DocumentTab({ studentId, lang = 'ko' }: Props) {
  const [docs, setDocs]               = useState<StudentDocument[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeCategory, setCategory] = useState<DocCategory>('identity')
  const [checking, setChecking]       = useState<string | null>(null)
  const [uploading, setUploading]     = useState<string | null>(null)
  const fileInputRef                  = useRef<HTMLInputElement>(null)
  const [pendingDocId, setPendingDocId] = useState<string | null>(null)

  useEffect(() => { loadDocs() }, [studentId])

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
    if (res.ok) setDocs(await res.json())
    setLoading(false)
  }

  const handleSelfCheck = async (doc: StudentDocument) => {
    setChecking(doc.id)
    const token = await getToken()
    await fetch(`/api/student-documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ self_checked: true, status: 'submitted' }),
    })
    await loadDocs()
    setChecking(null)
  }

  const handleFileUpload = async (docId: string, file: File) => {
    setUploading(docId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploading(null); return }

    const path = `${studentId}/${docId}/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage
      .from('student-documents')
      .upload(path, file, { upsert: true })

    if (error || !data) {
      alert(lang === 'ko' ? '파일 업로드 실패' : 'Tải lên thất bại')
      setUploading(null)
      return
    }

    const { data: urlData } = supabase.storage
      .from('student-documents')
      .getPublicUrl(data.path)

    const token = await getToken()
    await fetch(`/api/student-documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        file_url: urlData.publicUrl,
        file_name: file.name,
        status: 'submitted',
      }),
    })
    await loadDocs()
    setUploading(null)
  }

  const approvedCount = docs.filter(d => d.status === 'approved').length
  const totalCount    = docs.length
  const missingCount  = docs.filter(d => d.doc_type?.is_required && d.status === 'pending').length
  const expiringCount = docs.filter(d => {
    if (!d.expiry_date) return false
    const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000)
    return days <= 30
  }).length
  const pct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

  const filtered = docs.filter(d => d.doc_type?.category === activeCategory)

  const getDaysUntilExpiry = (date?: string) => {
    if (!date) return null
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  }

  const lbl = (key: 'ko' | 'vi', map: { ko: string; vi: string }) => map[key]

  if (loading) {
    return <div className="text-center py-10 text-slate-400 text-sm">
      {lang === 'ko' ? '서류 목록 불러오는 중...' : 'Đang tải danh sách...'}
    </div>
  }

  return (
    <div className="space-y-4">
      {/* 진행률 요약 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-slate-800 text-sm">
            {lang === 'ko' ? '서류 준비 현황' : 'Tình trạng hồ sơ'}
          </span>
          <span className="text-xs text-slate-400">{approvedCount}/{totalCount}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 mb-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-4 text-xs">
          {missingCount > 0 && (
            <span className="text-red-500 font-medium">
              {lang === 'ko' ? `미제출 ${missingCount}건` : `Chưa nộp ${missingCount} hồ sơ`}
            </span>
          )}
          {expiringCount > 0 && (
            <span className="text-orange-500 font-medium">
              {lang === 'ko' ? `만료 임박 ${expiringCount}건` : `Sắp hết hạn ${expiringCount}`}
            </span>
          )}
          {missingCount === 0 && expiringCount === 0 && (
            <span className="text-green-600 font-medium">
              {lang === 'ko' ? '모든 서류가 정상입니다' : 'Tất cả hồ sơ bình thường'}
            </span>
          )}
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm overflow-x-auto">
        {CATEGORIES.map(cat => {
          const catDocs     = docs.filter(d => d.doc_type?.category === cat)
          const catApproved = catDocs.filter(d => d.status === 'approved').length
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex-1 ${
                activeCategory === cat ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {lbl(lang, CATEGORY_LABELS[cat])} ({catApproved}/{catDocs.length})
            </button>
          )
        })}
      </div>

      {/* 서류 목록 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-slate-400 text-sm">
            {lang === 'ko' ? '해당 카테고리 서류 없음' : 'Không có hồ sơ'}
          </div>
        ) : filtered.map(doc => {
          const dt   = doc.doc_type
          const days = getDaysUntilExpiry(doc.expiry_date)
          const expiryClass =
            days !== null && days <= 7  ? 'text-red-600 font-semibold' :
            days !== null && days <= 30 ? 'text-orange-500 font-medium' :
            'text-slate-600'
          const isExpiring = days !== null && days <= 30

          return (
            <div key={doc.id} className={`bg-white rounded-2xl shadow-sm p-4 ${
              doc.status === 'pending' && dt?.is_required ? 'border-l-4 border-red-400' :
              doc.status === 'rejected' ? 'border-l-4 border-orange-400' : ''
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-800">
                      {lang === 'ko' ? dt?.name_kr : dt?.name_vi}
                    </span>
                    {dt?.is_required ? (
                      <span className="text-xs text-red-500 font-medium">
                        {lang === 'ko' ? '필수' : 'Bắt buộc'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {lang === 'ko' ? '선택' : 'Tùy chọn'}
                      </span>
                    )}
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status as DocStatus]}`}>
                      {lbl(lang, STATUS_LABELS[doc.status as DocStatus])}
                    </span>
                  </div>

                  {/* 만료일 */}
                  {doc.expiry_date && (
                    <div className={`text-xs mt-1 ${expiryClass}`}>
                      {lang === 'ko' ? '만료' : 'Hết hạn'}: {doc.expiry_date}
                      {isExpiring && (
                        <span className="ml-1">
                          (D-{days})
                        </span>
                      )}
                    </div>
                  )}

                  {/* 반려 사유 */}
                  {doc.status === 'rejected' && doc.reject_reason && (
                    <div className="text-xs text-red-500 mt-1">
                      {lang === 'ko' ? '반려 사유' : 'Lý do từ chối'}: {doc.reject_reason}
                    </div>
                  )}

                  {/* 업로드된 파일 */}
                  {doc.file_url && (
                    <div className="mt-1">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        {doc.file_name ?? (lang === 'ko' ? '파일 보기' : 'Xem file')}
                      </a>
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-1.5 flex-shrink-0">
                  {/* 자가 체크 (pending 상태만) */}
                  {doc.status === 'pending' && (
                    <button
                      onClick={() => handleSelfCheck(doc)}
                      disabled={checking === doc.id}
                      className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      {checking === doc.id
                        ? '...'
                        : (lang === 'ko' ? '체크하기' : 'Đánh dấu')}
                    </button>
                  )}

                  {/* 파일 업로드 */}
                  {(doc.status === 'pending' || doc.status === 'rejected') && (
                    <button
                      onClick={() => {
                        setPendingDocId(doc.id)
                        fileInputRef.current?.click()
                      }}
                      disabled={uploading === doc.id}
                      className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      {uploading === doc.id
                        ? '...'
                        : (lang === 'ko' ? '파일 업로드' : 'Tải lên')}
                    </button>
                  )}
                </div>
              </div>

              {/* 단계별 진행 바 */}
              <DocStatusStepper status={doc.status as DocStatus} lang={lang} />
            </div>
          )
        })}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic"
        className="hidden"
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file && pendingDocId) {
            await handleFileUpload(pendingDocId, file)
            setPendingDocId(null)
          }
          if (fileInputRef.current) fileInputRef.current.value = ''
        }}
      />
    </div>
  )
}
