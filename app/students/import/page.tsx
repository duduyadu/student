'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import type { Agency, UserMeta } from '@/lib/types'
import { getUserMeta } from '@/lib/auth'
import { STUDENT_STATUSES } from '@/lib/constants'

// 템플릿 컬럼 정의
const TEMPLATE_COLS = [
  '한국 이름',     // name_kr (필수)
  '베트남 이름',   // name_vn (필수)
  '생년월일',      // dob (필수, YYYY-MM-DD)
  '성별',          // 남/여
  '유학원 코드',   // 예: 001
  '상태',          // 유학전/어학연수/대학교/취업
  '한국 연락처',
  '베트남 연락처',
  '이메일',
  '목표 대학',
  '목표 학과',
  '비자 종류',
  '비자 만료일',   // YYYY-MM-DD
  '토픽 등급',     // 1급~6급/불합격
  '비고',
]

const TEMPLATE_EXAMPLE = [
  '홍길동', 'Nguyen Van A', '2000-01-15', '남', '001',
  '어학연수', '010-1234-5678', '+84-123-456-789', 'example@email.com',
  '서울대학교', '컴퓨터공학과', 'D-4-1', '2026-12-31', '3급', '예시 데이터 — 이 행은 삭제하세요',
]

interface PreviewRow {
  rowNum:           number
  name_kr:          string
  name_vn:          string
  dob:              string
  gender:           string
  agency_code:      string
  status:           string
  phone_kr:         string
  phone_vn:         string
  email:            string
  target_university:string
  target_major:     string
  visa_type:        string
  visa_expiry:      string
  topik_level:      string
  notes:            string
  error?:           string
}

export default function ImportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [user, setUser]         = useState<UserMeta | null>(null)
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [preview, setPreview]   = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(getUserMeta(session))
    const { data } = await supabase.from('agencies').select('*').eq('is_active', true).order('agency_number')
    if (data) setAgencies(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── 템플릿 다운로드 ─────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLS, TEMPLATE_EXAMPLE])

    // 열 너비 설정
    ws['!cols'] = TEMPLATE_COLS.map(() => ({ wch: 18 }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '학생등록양식')
    XLSX.writeFile(wb, 'AJU_학생등록양식.xlsx')
  }

  // ── 파일 파싱 ───────────────────────────────────────────────
  const parseFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('.xlsx 또는 .xls 파일만 업로드할 수 있습니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const wb   = XLSX.read(e.target?.result, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]

      const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim() !== ''))

      const parsed: PreviewRow[] = dataRows.map((row, i) => {
        const get = (idx: number) => String(row[idx] ?? '').trim()
        const name_kr           = get(0)
        const name_vn           = get(1)
        const dob               = get(2)
        const genderRaw         = get(3)
        const agency_code       = get(4)
        const statusRaw         = get(5)
        const phone_kr          = get(6)
        const phone_vn          = get(7)
        const email             = get(8)
        const target_university = get(9)
        const target_major      = get(10)
        const visa_type         = get(11)
        const visa_expiry       = get(12)
        const topik_level       = get(13)
        const notes             = get(14)

        const errs: string[] = []
        if (!name_kr) errs.push('한국 이름 필수')
        if (!name_vn) errs.push('베트남 이름 필수')
        if (!dob)     errs.push('생년월일 필수')
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) errs.push('생년월일은 YYYY-MM-DD 형식')
        if (visa_expiry && !/^\d{4}-\d{2}-\d{2}$/.test(visa_expiry)) errs.push('비자 만료일은 YYYY-MM-DD 형식')
        if (agency_code && !agencies.find(a => a.agency_code === agency_code)) errs.push(`유학원 코드 "${agency_code}" 없음`)

        return {
          rowNum: i + 2,
          name_kr, name_vn, dob,
          gender:           genderRaw === '여' ? 'F' : 'M',
          agency_code,
          status:           (STUDENT_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : '유학전',
          phone_kr, phone_vn, email,
          target_university, target_major,
          visa_type, visa_expiry, topik_level, notes,
          error: errs.length ? errs.join(' / ') : undefined,
        }
      })

      setPreview(parsed)
      setImportError('')
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  // ── 일괄 저장 ───────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true)
    setImportError('')

    const validRows = preview.filter(r => !r.error)
    if (validRows.length === 0) { setImporting(false); return }

    const agencyMap  = new Map(agencies.map(a => [a.agency_code, a]))
    const year       = new Date().getFullYear()
    const yearStart  = `${year}-01-01`
    const yearEnd    = `${year}-12-31`
    const yy         = String(year).slice(-2)

    // 유학원별 현재 카운트 조회
    const agencyCounts = new Map<string, number>()
    const uniqueCodes  = [...new Set(validRows.map(r => r.agency_code).filter(Boolean))]
    for (const code of uniqueCodes) {
      const agency = agencyMap.get(code)
      if (!agency) continue
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', agency.id)
        .gte('created_at', yearStart)
        .lte('created_at', yearEnd)
      agencyCounts.set(code, count ?? 0)
    }

    // 유학원별 순번 오프셋 (같은 배치 내 중복 방지)
    const agencySeq = new Map<string, number>()

    const payloads = validRows.map(row => {
      const agency = agencyMap.get(row.agency_code)
      let student_code: string | null = null

      if (agency) {
        const seq = (agencySeq.get(row.agency_code) ?? 0) + 1
        agencySeq.set(row.agency_code, seq)
        const base    = agencyCounts.get(row.agency_code) ?? 0
        const agencyNum = String(agency.agency_number).padStart(3, '0')
        student_code = `${yy}${agencyNum}${String(base + seq).padStart(3, '0')}`
      }

      return {
        name_kr:           row.name_kr,
        name_vn:           row.name_vn,
        dob:               row.dob,
        gender:            row.gender,
        agency_id:         agency?.id ?? null,
        status:            row.status || '유학전',
        phone_kr:          row.phone_kr          || null,
        phone_vn:          row.phone_vn          || null,
        email:             row.email             || null,
        target_university: row.target_university || null,
        target_major:      row.target_major      || null,
        visa_type:         row.visa_type         || null,
        visa_expiry:       row.visa_expiry       || null,
        topik_level:       row.topik_level       || null,
        notes:             row.notes             || null,
        preferred_lang:    'vi',
        student_code,
      }
    })

    const { error } = await supabase.from('students').insert(payloads)

    if (error) {
      setImportError('저장 실패: ' + error.message)
      setImporting(false)
    } else {
      router.push('/students')
    }
  }

  const validCount   = preview.filter(r => !r.error).length
  const invalidCount = preview.filter(r =>  r.error).length

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">AE</span>
            </div>
            <span className="font-bold text-slate-800">AJU E&J 학생관리</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user?.name_kr}</span>
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-500">로그아웃</button>
          </div>
        </div>
      </header>

      {/* 네비게이션 */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex gap-6">
          <Link href="/" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent">대시보드</Link>
          <Link href="/students" className="py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">학생 관리</Link>
          {user?.role === 'master' && (
            <Link href="/agencies" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent">유학원 관리</Link>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/students" className="text-slate-400 hover:text-slate-600 text-sm">← 목록으로</Link>
          <h2 className="text-xl font-bold text-slate-800">학생 일괄 등록</h2>
        </div>

        {/* STEP 1: 템플릿 다운로드 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center">1</span>
            <h3 className="text-sm font-semibold text-slate-700">양식 다운로드</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4 ml-8">아래 버튼으로 Excel 양식을 다운로드하고, 빈 셀에 학생 정보를 입력하세요.</p>
          <div className="ml-8 flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
            {[
              { col: '한국 이름', req: true },
              { col: '베트남 이름', req: true },
              { col: '생년월일', req: true, note: 'YYYY-MM-DD' },
              { col: '성별', note: '남/여' },
              { col: '유학원 코드', note: '001, 002...' },
              { col: '상태', note: '유학전/어학연수/대학교/취업' },
            ].map(({ col, req, note }) => (
              <span key={col} className="bg-slate-50 px-2 py-1 rounded-lg">
                {col}{req && <span className="text-red-500 ml-0.5">*</span>}
                {note && <span className="text-slate-400 ml-1">({note})</span>}
              </span>
            ))}
            <span className="text-slate-300">+ 연락처, 비자, 토픽 등급 등</span>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="ml-8 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            양식 다운로드 (.xlsx)
          </button>
        </div>

        {/* STEP 2: 파일 업로드 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center">2</span>
            <h3 className="text-sm font-semibold text-slate-700">파일 업로드</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4 ml-8">작성한 Excel 파일을 업로드하면 자동으로 미리보기가 표시됩니다.</p>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`ml-8 border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <p className="text-3xl mb-2">📂</p>
            <p className="text-sm text-slate-600 font-medium">파일을 드래그하거나 클릭하여 선택</p>
            <p className="text-xs text-slate-400 mt-1">.xlsx, .xls 지원</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* STEP 3: 미리보기 + 저장 */}
        {preview.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="text-sm font-semibold text-slate-700">미리보기 및 등록</h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-medium">정상 {validCount}건</span>
                {invalidCount > 0 && <span className="text-red-500 font-medium">오류 {invalidCount}건</span>}
              </div>
            </div>

            {invalidCount > 0 && (
              <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600">
                오류가 있는 행은 등록되지 않습니다. 오류를 확인하고 파일을 수정 후 다시 업로드하세요.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">행</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">이름 (KR)</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">이름 (VN)</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">생년월일</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">성별</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">유학원</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">상태</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">오류</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {preview.map(row => (
                    <tr key={row.rowNum} className={row.error ? 'bg-red-50' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2 text-slate-400">{row.rowNum}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{row.name_kr || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{row.name_vn || '-'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.dob || '-'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.gender === 'F' ? '여' : '남'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.agency_code || '-'}</td>
                      <td className="px-3 py-2 text-slate-500">{row.status}</td>
                      <td className="px-3 py-2 text-red-500">{row.error ?? <span className="text-emerald-500">✓</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importError && (
              <div className="mt-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{importError}</div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setPreview([]); setImportError('') }}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                초기화
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {importing ? '등록 중...' : `${validCount}명 등록`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
