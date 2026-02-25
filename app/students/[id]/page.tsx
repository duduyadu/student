'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Student, Consultation, ExamResult, UserMeta, TeacherEvaluation, EvaluationTemplate, AspirationHistory } from '@/lib/types'
import { getUserMeta } from '@/lib/auth'
import { STATUS_COLORS, TOPIK_LEVELS, CONSULT_TYPES } from '@/lib/constants'
import ConsultTimeline from './_components/ConsultTimeline'
import EvaluationPanel from './_components/EvaluationPanel'
import AspirationTracker from './_components/AspirationTracker'
import DocumentChecklist from './_components/DocumentChecklist'
import ExamChart, { type ChartLevel } from '@/components/ExamChart'

export default function StudentDetailPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [user, setUser]         = useState<UserMeta | null>(null)
  const [student, setStudent]   = useState<Student | null>(null)
  const [consults, setConsults] = useState<Consultation[]>([])
  const [exams, setExams]       = useState<ExamResult[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setTab]     = useState<'info' | 'consult' | 'exam' | 'evaluation' | 'docs' | 'consent'>('info')
  const [consents, setConsents] = useState<{id:string; consent_date:string; consent_type:string; consent_text:string}[]>([])
  const [expandedConsent, setExpandedConsent] = useState<string | null>(null)

  // 선생님 평가
  const [evaluations, setEvaluations]       = useState<TeacherEvaluation[]>([])
  const [evalTemplates, setEvalTemplates]   = useState<EvaluationTemplate[]>([])

  // 희망 대학 이력
  const [aspirations, setAspirations] = useState<AspirationHistory[]>([])

  // 시험 추가/수정 폼
  const [showExamForm, setShowExamForm] = useState(false)
  const [savingExam, setSavingExam]     = useState(false)
  const [editExamId, setEditExamId]     = useState<string | null>(null)
  const [exam, setExam] = useState({ exam_date: '', exam_type: 'TOPIK', reading_score: '', listening_score: '', total_score: '', level: '2급' })

  // 차트 레벨 + Excel 업로드 + AI 분석
  const [chartLevel, setChartLevel]         = useState<ChartLevel>('trend')
  const [excelUploading, setExcelUploading] = useState(false)
  const [excelDate, setExcelDate]           = useState('')
  const [excelRound, setExcelRound]         = useState('')
  const [showExcelForm, setShowExcelForm]   = useState(false)
  const [aiAnalysis, setAiAnalysis]         = useState<string>('')
  const [aiLoading, setAiLoading]           = useState(false)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const meta = getUserMeta(session)
    // 학생 역할은 포털로 이동
    if (meta.role === 'student') { router.push('/portal'); return }
    setUser(meta)
    await Promise.all([loadStudent(), loadConsults(), loadExams(), loadConsents(), loadEvaluations(), loadEvalTemplates(), loadAspirations()])
    setLoading(false)
  }

  const loadStudent = async () => {
    const { data } = await supabase
      .from('students')
      .select('*, agency:agencies(agency_code, agency_name_kr)')
      .eq('id', id).single()
    // RLS가 접근을 막은 경우(타 유학원 학생) → 목록으로
    if (!data) { router.push('/students'); return }
    setStudent(data as Student)
  }

  const loadConsults = async () => {
    const { data } = await supabase
      .from('consultations').select('*')
      .eq('student_id', id).order('consult_date', { ascending: false })
    if (data) setConsults(data)
  }

  const loadExams = async () => {
    const { data } = await supabase
      .from('exam_results').select('*')
      .eq('student_id', id).order('exam_date', { ascending: false })
    if (data) setExams(data)
  }

  const loadConsents = async () => {
    const { data } = await supabase
      .from('privacy_consents').select('id, consent_date, consent_type, consent_text')
      .eq('student_id', id).order('consent_date', { ascending: false })
    if (data) setConsents(data)
  }

  const loadEvaluations = async () => {
    const { data } = await supabase
      .from('teacher_evaluations').select('*')
      .eq('student_id', id).order('eval_date', { ascending: false })
    if (data) setEvaluations(data as TeacherEvaluation[])
  }

  const loadEvalTemplates = async () => {
    const { data } = await supabase
      .from('evaluation_templates').select('*')
      .eq('is_active', true).order('sort_order')
    if (data) setEvalTemplates(data as EvaluationTemplate[])
  }

  const loadAspirations = async () => {
    const { data } = await supabase
      .from('aspiration_history').select('*')
      .eq('student_id', id).order('changed_date', { ascending: false })
    if (data) setAspirations(data as AspirationHistory[])
  }

  // 총점으로 등급 자동 계산 (TOPIK I 기준: 200점 만점)
  const calcLevel = (total: number): string => {
    if (total >= 140) return '2급'
    if (total >= 80)  return '1급'
    return '불합격'
  }

  const handleTotalChange = (v: string) => {
    const n = parseInt(v)
    setExam(prev => ({ ...prev, total_score: v, level: isNaN(n) ? prev.level : calcLevel(n) }))
  }

  const openEditExam = (e: ExamResult) => {
    setExam({
      exam_date:       e.exam_date,
      exam_type:       e.exam_type,
      reading_score:   e.reading_score?.toString()   ?? '',
      listening_score: e.listening_score?.toString() ?? '',
      total_score:     e.total_score.toString(),
      level:           e.level,
    })
    setEditExamId(e.id)
    setShowExamForm(true)
  }

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingExam(true)
    const payload = {
      student_id:      id,
      exam_date:       exam.exam_date,
      exam_type:       exam.exam_type,
      reading_score:   exam.reading_score   ? parseInt(exam.reading_score)   : null,
      listening_score: exam.listening_score ? parseInt(exam.listening_score) : null,
      writing_score:   null,
      total_score:     parseInt(exam.total_score),
      level:           exam.level,
    }
    if (editExamId) {
      await supabase.from('exam_results').update(payload).eq('id', editExamId)
    } else {
      await supabase.from('exam_results').insert(payload)
    }
    await loadExams()
    setExam({ exam_date: '', exam_type: 'TOPIK', reading_score: '', listening_score: '', total_score: '', level: '2급' })
    setShowExamForm(false)
    setEditExamId(null)
    setSavingExam(false)
  }

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('이 시험 성적을 삭제하시겠습니까?')) return
    await supabase.from('exam_results').delete().eq('id', examId)
    await loadExams()
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !excelDate) { alert('시험 날짜를 먼저 입력하세요.'); return }
    setExcelUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('studentId', id)
    fd.append('examDate', excelDate)
    if (excelRound) fd.append('roundNumber', excelRound)
    const res = await fetch('/api/mock-exam-import', { method: 'POST', body: fd })
    const json = await res.json()
    if (res.ok) {
      alert(json.message)
      setShowExcelForm(false)
      await loadExams()
    } else {
      alert('오류: ' + json.error)
    }
    setExcelUploading(false)
    e.target.value = ''
  }

  const handleAiAnalysis = async () => {
    setAiLoading(true)
    setChartLevel('ai')
    try {
      const res  = await fetch(`/api/exam-ai-analysis?studentId=${id}`)
      const json = await res.json()
      if (res.ok) setAiAnalysis(json.analysis)
      else        alert('AI 분석 오류: ' + json.error)
    } catch {
      alert('AI 분석 요청 실패')
    } finally {
      setAiLoading(false)
    }
  }

  const [photoUploading, setPhotoUploading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleExportPdf = async () => {
    setPdfLoading(true)
    try {
      const res = await fetch('/api/life-record-pdf-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: [id], lang: 'both' }),
      })
      if (!res.ok) throw new Error('PDF 생성 실패')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      const cd   = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : `생활기록부_${student?.name_kr}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('PDF 생성 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setPdfLoading(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('5MB 이하 이미지만 업로드 가능합니다.'); return }
    setPhotoUploading(true)
    const path = `${id}/profile`
    const { error: upErr } = await supabase.storage
      .from('student-photos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { alert('업로드 실패: ' + upErr.message); setPhotoUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(path)
    const url = `${publicUrl}?t=${Date.now()}`
    await supabase.from('students').update({ photo_url: url }).eq('id', id)
    setStudent(prev => prev ? { ...prev, photo_url: url } : prev)
    setPhotoUploading(false)
  }

  const handleDelete = async () => {
    if (!confirm(`${student?.name_kr} 학생을 삭제하시겠습니까?\n삭제 후 목록에서 사라집니다.`)) return
    await supabase.from('students').update({ is_active: false }).eq('id', id)
    router.push('/students')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const levelColor = (level: string) => {
    const map: Record<string, string> = {
      '6급': 'bg-blue-100 text-blue-700', '5급': 'bg-indigo-100 text-indigo-700',
      '4급': 'bg-violet-100 text-violet-700', '3급': 'bg-emerald-100 text-emerald-700',
      '2급': 'bg-amber-100 text-amber-700', '1급': 'bg-orange-100 text-orange-700',
      '불합격': 'bg-red-100 text-red-600',
    }
    return map[level] ?? 'bg-slate-100 text-slate-600'
  }

  if (loading) return <Centered><p className="text-slate-400">로딩 중...</p></Centered>
  if (!student) return <Centered><p className="text-slate-400">학생 정보를 찾을 수 없습니다.</p></Centered>

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
        <div className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto">
          <Link href="/" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent whitespace-nowrap">대시보드</Link>
          <Link href="/students" className="py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 whitespace-nowrap">학생 관리</Link>
          <Link href="/reports" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent whitespace-nowrap">통계</Link>
          {user?.role === 'master' && (
            <Link href="/agencies" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent whitespace-nowrap">유학원 관리</Link>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 뒤로가기 */}
        <Link href="/students" className="text-slate-400 hover:text-slate-600 text-sm mb-4 inline-block">← 목록으로</Link>

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* 프로필 사진 */}
            <label className="relative w-14 h-14 shrink-0 cursor-pointer group" title="클릭해서 사진 변경">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
              {student.photo_url ? (
                <img src={student.photo_url} alt="프로필" className="w-14 h-14 rounded-2xl object-cover" />
              ) : (
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <span className="text-blue-600 text-xl font-bold">{student.name_kr[0]}</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-500 group-hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors">
                {photoUploading ? (
                  <span className="text-white text-[8px]">...</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </label>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-xs text-slate-400">{student.student_code ?? '-'}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800">{student.name_kr}</h2>
              <p className="text-slate-500 text-sm">{student.name_vn}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[student.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {student.status}
                </span>
                {(student.agency as any)?.agency_name_kr && (
                  <span className="text-xs text-slate-400">{(student.agency as any).agency_name_kr}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPdf}
              disabled={pdfLoading}
              className="text-sm bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
              title="생활기록부 PDF 출력"
            >
              {pdfLoading ? (
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              )}
              {pdfLoading ? 'PDF 생성 중...' : '생활기록부 PDF (KO+VI)'}
            </button>
            <Link href={`/students/${id}/edit`} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors">
              수정
            </Link>
            <button onClick={handleDelete} className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl transition-colors">
              삭제
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-4 bg-white rounded-2xl p-1 shadow-sm w-fit">
          {([
            { key: 'info',       label: '기본 정보',                        show: true },
            { key: 'consult',    label: `상담 히스토리 (${consults.length})`, show: true },
            { key: 'exam',       label: `시험 성적 (${exams.length})`,       show: true },
            { key: 'evaluation', label: `선생님 평가 (${evaluations.length})`, show: true },
            { key: 'docs',       label: '서류 체크리스트',                     show: true },
            { key: 'consent',    label: `개인정보 동의 (${consents.length})`, show: user?.role === 'master' },
          ] as const).filter(t => t.show).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 기본 정보 탭 ── */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard title="개인 정보">
              <InfoRow label="생년월일"      value={student.dob} />
              <InfoRow label="성별"          value={student.gender === 'M' ? '남성' : '여성'} />
              <InfoRow label="이메일"        value={student.email} />
              <InfoRow label="한국 연락처"   value={student.phone_kr} />
              <InfoRow label="베트남 연락처" value={student.phone_vn} />
            </InfoCard>
            <InfoCard title="학부모 정보">
              <InfoRow label="학부모 이름 (VN)"   value={student.parent_name_vn} />
              <InfoRow label="학부모 연락처 (VN)" value={student.parent_phone_vn} />
            </InfoCard>
            <InfoCard title="학업 정보">
              {student.language_school    && <InfoRow label="재학 어학원" value={student.language_school} />}
              {student.current_university && <InfoRow label="재학 대학교" value={student.current_university} />}
              {student.current_company    && <InfoRow label="재직 회사"   value={student.current_company} />}
              <InfoRow label="고등학교 성적"  value={student.high_school_gpa?.toString()} />
              <InfoRow label="유학원 등록일"  value={student.enrollment_date} />
              <InfoRow label="목표 대학"      value={student.target_university} />
              <InfoRow label="목표 학과"      value={student.target_major} />
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-400">토픽 등급</span>
                {student.topik_level
                  ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor(student.topik_level)}`}>{student.topik_level}</span>
                  : <span className="text-slate-700 font-medium">-</span>
                }
              </div>
            </InfoCard>
            <InfoCard title="비자 / 체류 / ARC">
              <InfoRow label="비자 종류"            value={student.visa_type} />
              <InfoRow label="비자 만료일"          value={student.visa_expiry} />
              <InfoRow label="외국인등록번호 (ARC)" value={student.arc_number} />
              <InfoRow label="ARC 발급일"           value={student.arc_issue_date} />
              <InfoRow label="ARC 만료일"           value={student.arc_expiry_date} />
            </InfoCard>
            {student.notes && (
              <div className="md:col-span-2">
                <InfoCard title="비고">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{student.notes}</p>
                </InfoCard>
              </div>
            )}

            {/* 희망 대학 변경 이력 */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <AspirationTracker
                  studentId={id}
                  aspirations={aspirations}
                  onRefresh={loadAspirations}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── 상담 히스토리 탭 (타임라인) ── */}
        {activeTab === 'consult' && (
          <ConsultTimeline
            studentId={id}
            consultations={consults}
            onRefresh={loadConsults}
          />
        )}

        {/* ── 시험 성적 탭 ── */}
        {activeTab === 'exam' && (
          <div className="space-y-3">
            {/* 툴바 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* 차트 레벨 토글 */}
              <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm text-xs font-medium">
                {(['trend', 'radar', 'ai'] as ChartLevel[]).map(lv => (
                  <button key={lv}
                    onClick={() => {
                      if (lv === 'ai' && !aiAnalysis) handleAiAnalysis()
                      else setChartLevel(lv)
                    }}
                    disabled={lv === 'ai' && aiLoading}
                    className={`px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${chartLevel === lv ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                    {lv === 'trend' ? '📈 추이' : lv === 'radar' ? '🕸️ 레이더' : aiLoading ? '분석 중...' : '🤖 AI 분석'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowExcelForm(!showExcelForm)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                  📊 Excel 업로드
                </button>
                <button onClick={() => {
                  if (showExamForm) {
                    setShowExamForm(false)
                    setEditExamId(null)
                    setExam({ exam_date: '', exam_type: 'TOPIK', reading_score: '', listening_score: '', total_score: '', level: '2급' })
                  } else {
                    setEditExamId(null)
                    setExam({ exam_date: '', exam_type: 'TOPIK', reading_score: '', listening_score: '', total_score: '', level: '2급' })
                    setShowExamForm(true)
                  }
                }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                  {showExamForm ? '✕ 닫기' : '+ 성적 추가'}
                </button>
              </div>
            </div>

            {/* Excel 업로드 폼 */}
            {showExcelForm && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 border border-emerald-100">
                <h3 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">모의고사 Excel 업로드</h3>
                <p className="text-xs text-slate-400">Excel 형식: 학생코드, 이름, 듣기, 읽기, 합계, 등급 컬럼 포함</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>시험 날짜 *</label>
                    <input type="date" value={excelDate} onChange={e => setExcelDate(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>회차 (선택)</label>
                    <input type="number" value={excelRound} onChange={e => setExcelRound(e.target.value)} className={inp} placeholder="예: 4" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Excel 파일 선택</label>
                  <input type="file" accept=".xlsx,.xls,.csv"
                    disabled={excelUploading || !excelDate}
                    onChange={handleExcelUpload}
                    className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50" />
                </div>
                {excelUploading && <p className="text-xs text-emerald-600 animate-pulse">업로드 중...</p>}
              </div>
            )}

            {showExamForm && (
              <form onSubmit={handleSaveExam} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">
                  {editExamId ? '시험 성적 수정' : '시험 성적 추가'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>시험 날짜 *</label>
                    <input type="date" required value={exam.exam_date} onChange={e => setExam(p => ({ ...p, exam_date: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>시험 유형</label>
                    <input value={exam.exam_type} onChange={e => setExam(p => ({ ...p, exam_type: e.target.value }))} className={inp} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>읽기 (0-100)</label>
                    <input type="number" min="0" max="100" value={exam.reading_score} onChange={e => setExam(p => ({ ...p, reading_score: e.target.value }))} className={inp} placeholder="0" />
                  </div>
                  <div>
                    <label className={lbl}>듣기 (0-100)</label>
                    <input type="number" min="0" max="100" value={exam.listening_score} onChange={e => setExam(p => ({ ...p, listening_score: e.target.value }))} className={inp} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>총점 * (0-200) — 입력 시 등급 자동 계산</label>
                    <input type="number" required min="0" max="200" value={exam.total_score} onChange={e => handleTotalChange(e.target.value)} className={inp} placeholder="0" />
                  </div>
                  <div>
                    <label className={lbl}>등급</label>
                    <select value={exam.level} onChange={e => setExam(p => ({ ...p, level: e.target.value }))} className={inp}>
                      {TOPIK_LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => {
                    setShowExamForm(false)
                    setEditExamId(null)
                    setExam({ exam_date: '', exam_type: 'TOPIK', reading_score: '', listening_score: '', total_score: '', level: '2급' })
                  }} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm">취소</button>
                  <button type="submit" disabled={savingExam} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium">
                    {savingExam ? '저장 중...' : (editExamId ? '수정 완료' : '저장')}
                  </button>
                </div>
              </form>
            )}

            {/* 차트 */}
            {exams.length > 0 && (
              <ExamChart exams={exams} chartLevel={chartLevel} aiAnalysis={aiAnalysis} />
            )}

            {/* 성적 목록 */}
            {exams.length === 0
              ? <Empty text="시험 기록이 없습니다." />
              : exams.map(e => (
                <div key={e.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">{e.exam_date}</span>
                      <span className="text-xs text-slate-400">{e.exam_type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${levelColor(e.level)}`}>{e.level}</span>
                      <button onClick={() => openEditExam(e)} className="text-xs text-slate-300 hover:text-blue-500 transition-colors">수정</button>
                      <button onClick={() => handleDeleteExam(e.id)} className="text-xs text-slate-300 hover:text-red-500 transition-colors">삭제</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <ScoreBox label="총점" value={e.total_score}     total={200} bold />
                    <ScoreBox label="읽기" value={e.reading_score}   total={100} />
                    <ScoreBox label="듣기" value={e.listening_score} total={100} />
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ── 선생님 평가 탭 ── */}
        {activeTab === 'evaluation' && (
          <EvaluationPanel
            studentId={id}
            evaluations={evaluations}
            templates={evalTemplates}
            onRefresh={loadEvaluations}
          />
        )}

        {/* ── 서류 체크리스트 탭 ── */}
        {activeTab === 'docs' && (
          <DocumentChecklist studentId={id} />
        )}

        {/* ── 개인정보 동의 탭 (master 전용) ── */}
        {activeTab === 'consent' && (
          <div className="space-y-3">
            {consents.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-slate-400 text-sm">
                동의 이력이 없습니다.
              </div>
            ) : consents.map(c => (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {c.consent_type === 'signup' ? '가입 동의' : c.consent_type}
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(c.consent_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedConsent(expandedConsent === c.id ? null : c.id)}
                    className="text-xs text-slate-400 hover:text-blue-500"
                  >
                    {expandedConsent === c.id ? '접기' : '동의 내용 보기'}
                  </button>
                </div>
                {expandedConsent === c.id && (
                  <div className="mt-3 bg-slate-50 rounded-xl p-4 text-xs text-slate-600 whitespace-pre-line leading-relaxed border border-slate-100">
                    {c.consent_text}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ── 공통 컴포넌트 ────────────────────────────────────────────

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
const lbl = 'block text-xs font-medium text-slate-500 mb-1'

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center">{children}</div>
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium">{value || '-'}</span>
    </div>
  )
}

function ScoreBox({ label, value, total, bold }: { label: string; value?: number | null; total: number; bold?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-slate-800 ${bold ? 'text-lg font-bold' : 'text-base font-semibold'}`}>{value ?? '-'}</p>
      <p className="text-xs text-slate-300">/ {total}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl p-12 shadow-sm text-center text-slate-400">
      <p className="text-3xl mb-2">📋</p>
      <p className="text-sm">{text}</p>
    </div>
  )
}
