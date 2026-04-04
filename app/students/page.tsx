'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Student, Agency } from '@/lib/types'
import { STATUS_COLORS, STUDENT_STATUSES, EDUCATION_PHASES, EDUCATION_PHASE_COLORS } from '@/lib/constants'
import * as XLSX from 'xlsx'
import { useLang } from '@/lib/useLang'
import { t, statusLabel as slabel } from '@/lib/i18n'
import { useAdminAuth } from '@/lib/useAdminAuth'
import { AppLayout } from '@/components/Layout/AppLayout'

export default function StudentsPage() {
  const { user, handleLogout } = useAdminAuth()
  const [students, setStudents]   = useState<Student[]>([])
  const [agencies, setAgencies]   = useState<Agency[]>([])
  const [search, setSearch]       = useState('')
  const [agencyFilter, setAgencyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [educationFilter, setEducationFilter] = useState('')
  const [loading, setLoading]     = useState(true)
  const [lang, toggleLang]        = useLang()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPdfLoading, setBulkPdfLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([loadStudents(), loadAgencies()])
      .then(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*, agency:agencies(agency_code, agency_name_kr, agency_name_vn)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (!error && data) setStudents(data as Student[])
  }

  const loadAgencies = async () => {
    const { data } = await supabase.from('agencies').select('*').eq('is_active', true).order('agency_number')
    if (data) setAgencies(data)
  }

  const filtered = students.filter(s => {
    const matchSearch = s.name_kr.includes(search) || s.name_vn.toLowerCase().includes(search.toLowerCase())
    const matchAgency = agencyFilter === '' || s.agency_id === agencyFilter
    const matchStatus = statusFilter === '' || s.status === statusFilter
    const matchEducation = educationFilter === '' || (s.education_phase ?? '미시작') === educationFilter
    return matchSearch && matchAgency && matchStatus && matchEducation
  })

  const handleExport = () => {
    const rows = filtered.map(s => ({
      '학생코드':         s.student_code ?? '',
      '이름(한국어)':     s.name_kr,
      '이름(베트남어)':   s.name_vn,
      '유학원':           s.agency?.agency_name_vn ?? s.agency?.agency_name_kr ?? '',
      '유학단계':         s.status,
      '교육단계':         s.education_phase ?? '미시작',
      '생년월일':         s.dob ?? '',
      '성별':             s.gender === 'M' ? '남' : '여',
      '한국연락처':       s.phone_kr ?? '',
      '베트남연락처':     s.phone_vn ?? '',
      '이메일':           s.email ?? '',
      '학부모이름(VN)':   s.parent_name_vn ?? '',
      '학부모연락처(VN)': s.parent_phone_vn ?? '',
      '고교GPA':          s.high_school_gpa ?? '',
      '토픽등급':         s.topik_level ?? '',
      '유학원등록일':     s.enrollment_date ?? '',
      '목표대학':         s.target_university ?? '',
      '목표학과':         s.target_major ?? '',
      '재학어학원':       s.language_school ?? '',
      '재학대학교':       s.current_university ?? '',
      '재직회사':         s.current_company ?? '',
      '비자종류':         s.visa_type ?? '',
      '비자만료일':       s.visa_expiry ?? '',
      '비고':             s.notes ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)

    // 열 너비 최적화
    ws['!cols'] = [
      { wch: 14 }, // 학생코드
      { wch: 12 }, // 이름(한국어)
      { wch: 20 }, // 이름(베트남어)
      { wch: 20 }, // 유학원
      { wch: 8  }, // 유학단계
      { wch: 12 }, // 생년월일
      { wch: 6  }, // 성별
      { wch: 16 }, // 한국연락처
      { wch: 18 }, // 베트남연락처
      { wch: 24 }, // 이메일
      { wch: 18 }, // 학부모이름
      { wch: 18 }, // 학부모연락처
      { wch: 8  }, // 고교GPA
      { wch: 8  }, // 토픽등급
      { wch: 12 }, // 유학원등록일
      { wch: 18 }, // 목표대학
      { wch: 16 }, // 목표학과
      { wch: 18 }, // 재학어학원
      { wch: 18 }, // 재학대학교
      { wch: 18 }, // 재직회사
      { wch: 8  }, // 비자종류
      { wch: 12 }, // 비자만료일
      { wch: 30 }, // 비고
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '학생목록')

    const today = new Date().toISOString().split('T')[0]
    const statusLabel = statusFilter ? `_${statusFilter}` : ''
    XLSX.writeFile(wb, `AJU_학생목록${statusLabel}_${today}.xlsx`)
  }

  const handleBulkPdf = async () => {
    if (selectedIds.size === 0) return
    setBulkPdfLoading(true)
    try {
      const { data: { session: pdfSession } } = await supabase.auth.getSession()
      const res = await fetch('/api/life-record-pdf-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pdfSession ? { 'Authorization': `Bearer ${pdfSession.access_token}` } : {}),
        },
        body: JSON.stringify({ studentIds: Array.from(selectedIds), lang: 'both' }),
      })
      if (!res.ok) throw new Error('ZIP 생성 실패')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      const cd   = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : '생활기록부_일괄.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('PDF 일괄 다운로드 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setBulkPdfLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id)))
    }
  }

  const statusColor = (status: string) => STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'

  const placement = (s: Student): string | null => {
    if (s.status === '어학연수') return s.language_school ?? null
    if (s.status === '대학교')   return s.current_university ?? null
    if (s.status === '취업')     return s.current_company ?? null
    return null
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">{t('loading', lang)}</p></div>

  return (
    <AppLayout user={user} lang={lang} onToggleLang={toggleLang} onLogout={handleLogout} activeNav="students">
      {/* 메인 */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* 헤더 행 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-slate-800">{t('studentList', lang)} <span className="text-slate-400 font-normal text-base">({filtered.length}명)</span></h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBulkPdf}
              disabled={bulkPdfLoading || selectedIds.size === 0}
              className="bg-[#3182F6] hover:bg-[#1B64DA] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
              title={selectedIds.size === 0 ? '학생을 먼저 선택하세요' : `${selectedIds.size}명 PDF 다운로드`}
            >
              {bulkPdfLoading ? (
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              )}
              {bulkPdfLoading ? t('pdfBulkZip', lang) : selectedIds.size > 0 ? `${t('pdfBulkSelected', lang)} (${selectedIds.size}명)` : t('pdfBulkDownload', lang)}
            </button>
            <button
              onClick={handleExport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            >
              {t('exportExcel', lang)}
            </button>
            <Link href="/students/import" className="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
              {t('importBulk', lang)}
            </Link>
            <Link href="/students/new" className="bg-[#3182F6] hover:bg-[#1B64DA] text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
              {t('addStudent', lang)}
            </Link>
          </div>
        </div>

        {/* 검색 + 필터 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            id="student-search"
            name="student-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchName', lang)}
            autoComplete="off"
            className="flex-1 min-w-48 px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#3182F6] focus:bg-white text-sm"
          />
          <select
            id="agency-filter"
            name="agency-filter"
            value={agencyFilter}
            onChange={e => setAgencyFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#3182F6] focus:bg-white text-sm"
          >
            <option value="">{t('allAgencies', lang)}</option>
            {agencies.map(a => (
              <option key={a.id} value={a.id}>
                {a.agency_name_vn ?? a.agency_name_kr}
              </option>
            ))}
          </select>
          <select
            id="status-filter"
            name="status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#3182F6] focus:bg-white text-sm"
          >
            <option value="">{t('allStatus', lang)}</option>
            {STUDENT_STATUSES.map(s => (
              <option key={s} value={s}>{slabel(s, lang)}</option>
            ))}
          </select>
          <select
            id="education-filter"
            name="education-filter"
            value={educationFilter}
            onChange={e => setEducationFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#3182F6] focus:bg-white text-sm"
          >
            <option value="">전체 교육단계</option>
            {EDUCATION_PHASES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm text-center py-16 text-slate-400">
            {(search || agencyFilter || statusFilter) ? (
              <>
                <p className="text-4xl mb-3">🔍</p>
                <p className="text-slate-500 font-medium">{t('noSearchResult', lang)}</p>
                <button
                  onClick={() => { setSearch(''); setAgencyFilter(''); setStatusFilter(''); setEducationFilter('') }}
                  className="mt-4 inline-block text-[#3182F6] text-sm hover:underline"
                >
                  {t('clearFilter', lang)}
                </button>
              </>
            ) : (
              <>
                <p className="text-4xl mb-3">👤</p>
                <p>{t('noStudents', lang)}</p>
                <Link href="/students/new" className="mt-4 inline-block text-[#3182F6] text-sm hover:underline">{t('addFirstStudent', lang)}</Link>
              </>
            )}
          </div>
        ) : (
          <>
            {/* 모바일: 카드 목록 */}
            <div className="md:hidden space-y-2">
              {/* 모바일 전체선택 */}
              <div className="flex items-center gap-2 px-1 mb-1">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-2 border-slate-400 text-[#3182F6] focus:border-[#3182F6] cursor-pointer"
                />
                <span className="text-xs text-slate-500">{t('selectAllLabel', lang)} ({selectedIds.size}/{filtered.length})</span>
              </div>
              {filtered.map(s => (
                <div key={s.id} className={`bg-white rounded-2xl px-4 py-3.5 shadow-sm transition-colors ${selectedIds.has(s.id) ? 'ring-2 ring-[#3182F6]/40 bg-[#EBF3FE]' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="w-4 h-4 mt-1 rounded border-2 border-slate-400 text-[#3182F6] focus:border-[#3182F6] cursor-pointer shrink-0"
                    />
                    {/* 프로필 사진 썸네일 */}
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 shrink-0 mt-0.5">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt={s.name_kr} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                          {s.name_kr.charAt(0)}
                        </div>
                      )}
                    </div>
                    <Link href={`/students/${s.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-slate-800 truncate">{s.name_kr}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusColor(s.status)}`}>{slabel(s.status, lang)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${EDUCATION_PHASE_COLORS[s.education_phase ?? '미시작']}`}>{s.education_phase ?? '미시작'}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{s.name_vn}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {s.agency?.agency_name_vn ?? s.agency?.agency_name_kr ?? t('unassigned', lang)}
                        {s.student_code && <span className="ml-2 font-mono">{s.student_code}</span>}
                        {placement(s) && <span className="ml-2 text-[#3182F6]">{placement(s)}</span>}
                      </p>
                    </Link>
                    <span className="text-slate-300 text-sm mt-1">›</span>
                  </div>
                </div>
              ))}
            </div>

            {/* PC: 테이블 */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 w-14 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && selectedIds.size === filtered.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-2 border-slate-400 text-[#3182F6] focus:border-[#3182F6] cursor-pointer"
                        />
                        <span className="text-[10px] text-slate-400 font-medium">전체</span>
                      </div>
                    </th>
                    <th className="w-14 px-4 py-3"></th>
                    <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">{t('colCode', lang)}</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">{t('colNameKr', lang)}</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">{t('colNameVn', lang)}</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">{t('colAgency', lang)}</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">{t('colStatus', lang)}</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">교육단계</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">{t('colEnrollDate', lang)}</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(s => (
                    <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(s.id) ? 'bg-[#EBF3FE]' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="w-4 h-4 rounded border-2 border-slate-400 text-[#3182F6] focus:border-[#3182F6] cursor-pointer"
                        />
                      </td>
                      {/* 프로필 사진 썸네일 */}
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 mx-auto">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt={s.name_kr} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                              {s.name_kr.charAt(0)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-400">{s.student_code ?? '-'}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{s.name_kr}</td>
                      <td className="px-6 py-4 text-slate-600">{s.name_vn}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {s.agency?.agency_name_vn ?? s.agency?.agency_name_kr ?? '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(s.status)}`}>
                          {slabel(s.status, lang)}
                        </span>
                        {placement(s) && <p className="text-xs text-[#3182F6] mt-1">{placement(s)}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${EDUCATION_PHASE_COLORS[s.education_phase ?? '미시작']}`}>
                          {s.education_phase ?? '미시작'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{s.enrollment_date ?? '-'}</td>
                      <td className="px-6 py-4">
                        <Link href={`/students/${s.id}`} className="text-[#3182F6] text-sm hover:underline">{t('viewDetail', lang)}</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </AppLayout>
  )
}
