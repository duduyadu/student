'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Student, Consultation, ExamResult, UserMeta } from '@/lib/types'
import { STATUS_COLORS, TOPIK_LEVELS, CONSULT_TYPES } from '@/lib/constants'

export default function StudentDetailPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [user, setUser]         = useState<UserMeta | null>(null)
  const [student, setStudent]   = useState<Student | null>(null)
  const [consults, setConsults] = useState<Consultation[]>([])
  const [exams, setExams]       = useState<ExamResult[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setTab]     = useState<'info' | 'consult' | 'exam'>('info')

  // 상담 추가 폼
  const [showConsultForm, setShowConsultForm] = useState(false)
  const [savingConsult, setSavingConsult]     = useState(false)
  const [consult, setConsult] = useState({ consult_date: '', consult_type: '정기', summary: '', improvement: '', next_goal: '' })

  // 시험 추가 폼
  const [showExamForm, setShowExamForm] = useState(false)
  const [savingExam, setSavingExam]     = useState(false)
  const [exam, setExam] = useState({ exam_date: '', exam_type: 'TOPIK', reading_score: '', listening_score: '', writing_score: '', total_score: '', level: '3급' })

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(session.user.user_metadata as UserMeta)
    await Promise.all([loadStudent(), loadConsults(), loadExams()])
    setLoading(false)
  }

  const loadStudent = async () => {
    const { data } = await supabase
      .from('students')
      .select('*, agency:agencies(agency_code, agency_name_kr)')
      .eq('id', id).single()
    if (data) setStudent(data as Student)
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

  // 총점으로 등급 자동 계산
  const calcLevel = (total: number): string => {
    if (total >= 230) return '6급'
    if (total >= 190) return '5급'
    if (total >= 150) return '4급'
    if (total >= 120) return '3급'
    if (total >= 80)  return '2급'
    if (total >= 40)  return '1급'
    return '불합격'
  }

  const handleTotalChange = (v: string) => {
    const n = parseInt(v)
    setExam(prev => ({ ...prev, total_score: v, level: isNaN(n) ? prev.level : calcLevel(n) }))
  }

  const handleSaveConsult = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConsult(true)
    const { error } = await supabase.from('consultations').insert({
      student_id:   id,
      consult_date: consult.consult_date,
      consult_type: consult.consult_type,
      summary:      consult.summary      || null,
      improvement:  consult.improvement  || null,
      next_goal:    consult.next_goal    || null,
    })
    if (!error) {
      await loadConsults()
      setConsult({ consult_date: '', consult_type: '정기', summary: '', improvement: '', next_goal: '' })
      setShowConsultForm(false)
    }
    setSavingConsult(false)
  }

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingExam(true)
    const { error } = await supabase.from('exam_results').insert({
      student_id:      id,
      exam_date:       exam.exam_date,
      exam_type:       exam.exam_type,
      reading_score:   exam.reading_score   ? parseInt(exam.reading_score)   : null,
      listening_score: exam.listening_score ? parseInt(exam.listening_score) : null,
      writing_score:   exam.writing_score   ? parseInt(exam.writing_score)   : null,
      total_score:     parseInt(exam.total_score),
      level:           exam.level,
    })
    if (!error) {
      await loadExams()
      setExam({ exam_date: '', exam_type: 'TOPIK', reading_score: '', listening_score: '', writing_score: '', total_score: '', level: '3급' })
      setShowExamForm(false)
    }
    setSavingExam(false)
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
        <div className="max-w-6xl mx-auto px-6 flex gap-6">
          <Link href="/" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent">대시보드</Link>
          <Link href="/students" className="py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">학생 관리</Link>
          {user?.role === 'master' && (
            <Link href="/agencies" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent">유학원 관리</Link>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 뒤로가기 */}
        <Link href="/students" className="text-slate-400 hover:text-slate-600 text-sm mb-4 inline-block">← 목록으로</Link>

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-blue-600 text-xl font-bold">{student.name_kr[0]}</span>
            </div>
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
          <Link href={`/students/${id}/edit`} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors">
            수정
          </Link>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-4 bg-white rounded-2xl p-1 shadow-sm w-fit">
          {([
            { key: 'info',    label: '기본 정보' },
            { key: 'consult', label: `상담 기록 (${consults.length})` },
            { key: 'exam',    label: `시험 성적 (${exams.length})` },
          ] as const).map(t => (
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
            <InfoCard title="비자 / 체류">
              <InfoRow label="비자 종류"   value={student.visa_type} />
              <InfoRow label="비자 만료일" value={student.visa_expiry} />
            </InfoCard>
            {student.notes && (
              <div className="md:col-span-2">
                <InfoCard title="비고">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{student.notes}</p>
                </InfoCard>
              </div>
            )}
          </div>
        )}

        {/* ── 상담 기록 탭 ── */}
        {activeTab === 'consult' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setShowConsultForm(!showConsultForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                {showConsultForm ? '✕ 닫기' : '+ 상담 추가'}
              </button>
            </div>

            {showConsultForm && (
              <form onSubmit={handleSaveConsult} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">상담 기록 추가</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>상담 날짜 *</label>
                    <input type="date" required value={consult.consult_date} onChange={e => setConsult(p => ({ ...p, consult_date: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>상담 유형</label>
                    <select value={consult.consult_type} onChange={e => setConsult(p => ({ ...p, consult_type: e.target.value }))} className={inp}>
                      {CONSULT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={lbl}>상담 내용</label>
                  <textarea rows={3} value={consult.summary} onChange={e => setConsult(p => ({ ...p, summary: e.target.value }))} className={inp + ' resize-none'} placeholder="상담 내용을 입력하세요..." />
                </div>
                <div>
                  <label className={lbl}>개선 사항</label>
                  <input value={consult.improvement} onChange={e => setConsult(p => ({ ...p, improvement: e.target.value }))} className={inp} placeholder="개선할 점..." />
                </div>
                <div>
                  <label className={lbl}>다음 목표</label>
                  <input value={consult.next_goal} onChange={e => setConsult(p => ({ ...p, next_goal: e.target.value }))} className={inp} placeholder="다음 상담까지 목표..." />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowConsultForm(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm">취소</button>
                  <button type="submit" disabled={savingConsult} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium">
                    {savingConsult ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            )}

            {consults.length === 0
              ? <Empty text="상담 기록이 없습니다." />
              : consults.map(c => (
                <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">{c.consult_date}</span>
                    {c.consult_type && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c.consult_type}</span>}
                  </div>
                  {c.summary     && <p className="text-sm text-slate-700 mb-1"><span className="font-medium">상담 내용: </span>{c.summary}</p>}
                  {c.improvement && <p className="text-sm text-slate-600 mb-1"><span className="font-medium">개선 사항: </span>{c.improvement}</p>}
                  {c.next_goal   && <p className="text-sm text-slate-600"><span className="font-medium">다음 목표: </span>{c.next_goal}</p>}
                </div>
              ))
            }
          </div>
        )}

        {/* ── 시험 성적 탭 ── */}
        {activeTab === 'exam' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setShowExamForm(!showExamForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                {showExamForm ? '✕ 닫기' : '+ 시험 성적 추가'}
              </button>
            </div>

            {showExamForm && (
              <form onSubmit={handleSaveExam} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 pb-2 border-b border-slate-100">시험 성적 추가</h3>
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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>읽기 (0-100)</label>
                    <input type="number" min="0" max="100" value={exam.reading_score} onChange={e => setExam(p => ({ ...p, reading_score: e.target.value }))} className={inp} placeholder="0" />
                  </div>
                  <div>
                    <label className={lbl}>듣기 (0-100)</label>
                    <input type="number" min="0" max="100" value={exam.listening_score} onChange={e => setExam(p => ({ ...p, listening_score: e.target.value }))} className={inp} placeholder="0" />
                  </div>
                  <div>
                    <label className={lbl}>쓰기 (0-100)</label>
                    <input type="number" min="0" max="100" value={exam.writing_score} onChange={e => setExam(p => ({ ...p, writing_score: e.target.value }))} className={inp} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>총점 * (0-300) — 입력 시 등급 자동 계산</label>
                    <input type="number" required min="0" max="300" value={exam.total_score} onChange={e => handleTotalChange(e.target.value)} className={inp} placeholder="0" />
                  </div>
                  <div>
                    <label className={lbl}>등급</label>
                    <select value={exam.level} onChange={e => setExam(p => ({ ...p, level: e.target.value }))} className={inp}>
                      {TOPIK_LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowExamForm(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm">취소</button>
                  <button type="submit" disabled={savingExam} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium">
                    {savingExam ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            )}

            {exams.length === 0
              ? <Empty text="시험 기록이 없습니다." />
              : exams.map(e => (
                <div key={e.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">{e.exam_date}</span>
                      <span className="text-xs text-slate-400">{e.exam_type}</span>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${levelColor(e.level)}`}>{e.level}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <ScoreBox label="총점" value={e.total_score}     total={300} bold />
                    <ScoreBox label="읽기" value={e.reading_score}   total={100} />
                    <ScoreBox label="듣기" value={e.listening_score} total={100} />
                    <ScoreBox label="쓰기" value={e.writing_score}   total={100} />
                  </div>
                </div>
              ))
            }
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
