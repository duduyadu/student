'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Agency, UserMeta } from '@/lib/types'
import { getUserMeta } from '@/lib/auth'
import { STUDENT_STATUSES, TOPIK_LEVELS } from '@/lib/constants'

export default function EditStudentPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [user, setUser]       = useState<UserMeta | null>(null)
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    name_kr: '', name_vn: '', dob: '', gender: 'M',
    phone_kr: '', phone_vn: '', email: '',
    parent_name_vn: '', parent_phone_vn: '',
    high_school_gpa: '', enrollment_date: '',
    target_university: '', target_major: '',
    visa_type: '', visa_expiry: '',
    arc_number: '', arc_issue_date: '', arc_expiry_date: '',
    topik_level: '',
    status: '유학전', agency_id: '', notes: '',
    language_school: '', current_university: '', current_company: '',
  })

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const meta = getUserMeta(session)
    // 학생 역할은 포털로 이동
    if (meta.role === 'student') { router.push('/portal'); return }
    setUser(meta)

    const [studentRes, agenciesRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('agencies').select('*').eq('is_active', true).order('agency_number'),
    ])

    if (agenciesRes.data) setAgencies(agenciesRes.data)

    if (studentRes.data) {
      const s = studentRes.data
      setForm({
        name_kr:           s.name_kr          ?? '',
        name_vn:           s.name_vn          ?? '',
        dob:               s.dob              ?? '',
        gender:            s.gender           ?? 'M',
        phone_kr:          s.phone_kr         ?? '',
        phone_vn:          s.phone_vn         ?? '',
        email:             s.email            ?? '',
        parent_name_vn:    s.parent_name_vn   ?? '',
        parent_phone_vn:   s.parent_phone_vn  ?? '',
        high_school_gpa:   s.high_school_gpa != null ? String(s.high_school_gpa) : '',
        enrollment_date:   s.enrollment_date  ?? '',
        target_university: s.target_university ?? '',
        target_major:      s.target_major     ?? '',
        visa_type:         s.visa_type         ?? '',
        visa_expiry:       s.visa_expiry       ?? '',
        arc_number:        s.arc_number         ?? '',
        arc_issue_date:    s.arc_issue_date     ?? '',
        arc_expiry_date:   s.arc_expiry_date    ?? '',
        topik_level:       s.topik_level        ?? '',
        status:            s.status             ?? '유학전',
        agency_id:         s.agency_id        ?? '',
        notes:             s.notes            ?? '',
        language_school:   s.language_school   ?? '',
        current_university: s.current_university ?? '',
        current_company:   s.current_company   ?? '',
      })
    } else {
      router.push('/students')
      return
    }

    setLoading(false)
  }

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.name_kr || !form.name_vn || !form.dob) {
      setError('이름(한국어), 이름(베트남어), 생년월일은 필수 항목입니다.')
      setSaving(false)
      return
    }

    const payload: Record<string, unknown> = {
      name_kr:           form.name_kr,
      name_vn:           form.name_vn,
      dob:               form.dob,
      gender:            form.gender,
      phone_kr:          form.phone_kr          || null,
      phone_vn:          form.phone_vn          || null,
      email:             form.email             || null,
      parent_name_vn:    form.parent_name_vn    || null,
      parent_phone_vn:   form.parent_phone_vn   || null,
      high_school_gpa:   form.high_school_gpa   ? parseFloat(form.high_school_gpa) : null,
      enrollment_date:   form.enrollment_date   || null,
      target_university: form.target_university || null,
      target_major:      form.target_major      || null,
      visa_type:         form.visa_type         || null,
      visa_expiry:       form.visa_expiry       || null,
      arc_number:        form.arc_number        || null,
      arc_issue_date:    form.arc_issue_date    || null,
      arc_expiry_date:   form.arc_expiry_date   || null,
      topik_level:       form.topik_level       || null,
      status:            form.status,
      agency_id:         form.agency_id         || null,
      notes:             form.notes             || null,
      language_school:   form.language_school   || null,
      current_university: form.current_university || null,
      current_company:   form.current_company   || null,
    }

    const { error: dbError } = await supabase
      .from('students')
      .update(payload)
      .eq('id', id)

    if (dbError) {
      setError('저장 실패: ' + dbError.message)
      setSaving(false)
      return
    }

    // 감사 로그: 학생 정보 수정
    await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE',
        user_name: user?.name_kr,
        user_role: user?.role,
        target_table: 'students',
        target_id: id,
        details: { name_kr: form.name_kr },
      }),
    }).catch(() => {})

    router.push(`/students/${id}`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">로딩 중...</p></div>
  }

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

      {/* 메인 */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/students/${id}`} className="text-slate-400 hover:text-slate-600 text-sm">← 상세보기로</Link>
          <h2 className="text-xl font-bold text-slate-800">학생 정보 수정</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <Section title="기본 정보">
            <Row>
              <Field label="한국 이름 *">
                <input type="text" value={form.name_kr} onChange={e => set('name_kr', e.target.value)} className={input} placeholder="홍길동" />
              </Field>
              <Field label="베트남 이름 *">
                <input type="text" value={form.name_vn} onChange={e => set('name_vn', e.target.value)} className={input} placeholder="Nguyen Van A" />
              </Field>
            </Row>
            <Row>
              <Field label="생년월일 *">
                <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className={input} />
              </Field>
              <Field label="성별">
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={input}>
                  <option value="M">남 (M)</option>
                  <option value="F">여 (F)</option>
                </select>
              </Field>
            </Row>
            <Row>
              <Field label="유학원">
                <select value={form.agency_id} onChange={e => set('agency_id', e.target.value)} className={input}>
                  <option value="">선택 안 함</option>
                  {agencies.map(a => (
                    <option key={a.id} value={a.id}>{a.agency_name_kr} ({a.agency_code})</option>
                  ))}
                </select>
              </Field>
              <Field label="유학 단계">
                <select value={form.status} onChange={e => set('status', e.target.value)} className={input}>
                  {STUDENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </Row>
            {form.status !== '유학전' && (
              <Field label={
                form.status === '어학연수' ? '재학 중인 어학원' :
                form.status === '대학교'   ? '재학 중인 대학교' : '재직 중인 회사'
              }>
                <input
                  type="text"
                  value={
                    form.status === '어학연수' ? form.language_school :
                    form.status === '대학교'   ? form.current_university : form.current_company
                  }
                  onChange={e => set(
                    form.status === '어학연수' ? 'language_school' :
                    form.status === '대학교'   ? 'current_university' : 'current_company',
                    e.target.value
                  )}
                  className={input}
                  placeholder={
                    form.status === '어학연수' ? '예: 연세어학당' :
                    form.status === '대학교'   ? '예: 서울대학교' : '예: 삼성전자'
                  }
                />
              </Field>
            )}
          </Section>

          {/* 연락처 */}
          <Section title="연락처">
            <Row>
              <Field label="한국 연락처">
                <input type="tel" value={form.phone_kr} onChange={e => set('phone_kr', e.target.value)} className={input} placeholder="010-1234-5678" />
              </Field>
              <Field label="베트남 연락처">
                <input type="tel" value={form.phone_vn} onChange={e => set('phone_vn', e.target.value)} className={input} placeholder="+84-123-456-789" />
              </Field>
            </Row>
            <Field label="이메일">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={input} placeholder="student@example.com" />
            </Field>
          </Section>

          {/* 학부모 정보 */}
          <Section title="학부모 정보">
            <Row>
              <Field label="학부모 이름 (VN)">
                <input type="text" value={form.parent_name_vn} onChange={e => set('parent_name_vn', e.target.value)} className={input} />
              </Field>
              <Field label="학부모 연락처 (VN)">
                <input type="tel" value={form.parent_phone_vn} onChange={e => set('parent_phone_vn', e.target.value)} className={input} />
              </Field>
            </Row>
          </Section>

          {/* 학업 정보 */}
          <Section title="학업 정보">
            <Row>
              <Field label="고등학교 성적 (GPA)">
                <input type="number" step="0.01" min="0" max="10" value={form.high_school_gpa} onChange={e => set('high_school_gpa', e.target.value)} className={input} placeholder="예: 8.5" />
              </Field>
              <Field label="토픽 등급">
                <select value={form.topik_level} onChange={e => set('topik_level', e.target.value)} className={input}>
                  <option value="">없음</option>
                  {TOPIK_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </Field>
            </Row>
            <Row>
              <Field label="유학원 등록일">
                <input type="date" value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} className={input} />
              </Field>
              <Field label="목표 대학">
                <input type="text" value={form.target_university} onChange={e => set('target_university', e.target.value)} className={input} placeholder="서울대학교" />
              </Field>
            </Row>
            <Field label="목표 학과">
              <input type="text" value={form.target_major} onChange={e => set('target_major', e.target.value)} className={input} placeholder="컴퓨터공학과" />
            </Field>
          </Section>

          {/* 비자/체류 */}
          <Section title="비자 / 체류">
            <Row>
              <Field label="비자 종류">
                <input type="text" value={form.visa_type} onChange={e => set('visa_type', e.target.value)} className={input} placeholder="D-4-1" />
              </Field>
              <Field label="비자 만료일">
                <input type="date" value={form.visa_expiry} onChange={e => set('visa_expiry', e.target.value)} className={input} />
              </Field>
            </Row>
            {/* 외국인등록증 (ARC) */}
            <Row>
              <Field label="외국인등록번호 (ARC)">
                <input type="text" value={form.arc_number} onChange={e => set('arc_number', e.target.value)} className={input} placeholder="A123456789" />
              </Field>
              <Field label="ARC 발급일">
                <input type="date" value={form.arc_issue_date} onChange={e => set('arc_issue_date', e.target.value)} className={input} />
              </Field>
            </Row>
            <Row>
              <Field label="ARC 만료일">
                <input type="date" value={form.arc_expiry_date} onChange={e => set('arc_expiry_date', e.target.value)} className={input} />
              </Field>
              <div />
            </Row>
          </Section>

          {/* 비고 */}
          <Section title="비고">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={4}
              className={input + ' resize-none'}
              placeholder="특이사항, 추가 메모..."
            />
          </Section>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <div className="flex gap-3 pb-8">
            <Link href={`/students/${id}`} className="flex-1 text-center py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium">
              취소
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

const input = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
