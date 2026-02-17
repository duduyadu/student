'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Agency, UserMeta } from '@/lib/types'
import { STUDENT_STATUSES } from '@/lib/constants'

export default function NewStudentPage() {
  const router = useRouter()
  const [user, setUser]       = useState<UserMeta | null>(null)
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    name_kr: '', name_vn: '', dob: '', gender: 'M',
    phone_kr: '', phone_vn: '', email: '',
    parent_name_vn: '', parent_phone_vn: '',
    high_school_gpa: '', enrollment_date: '',
    target_university: '', target_major: '',
    visa_type: '', visa_expiry: '',
    status: '유학전', agency_id: '', notes: '',
  })

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(session.user.user_metadata as UserMeta)

    const { data } = await supabase.from('agencies').select('*').eq('is_active', true).order('agency_number')
    if (data) setAgencies(data)
  }

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const generateStudentCode = async (agencyId: string): Promise<string> => {
    const now     = new Date()
    const yy      = now.getFullYear().toString().slice(-2)          // "26"
    const yearStart = `${now.getFullYear()}-01-01`
    const yearEnd   = `${now.getFullYear()}-12-31`

    // 유학원 번호 조회
    const selectedAgency = agencies.find(a => a.id === agencyId)
    const agencyNum = selectedAgency
      ? String(selectedAgency.agency_number).padStart(3, '0')
      : '000'

    // 해당 유학원 + 해당 연도 학생 수 조회
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .gte('created_at', yearStart)
      .lte('created_at', yearEnd)

    const seq = String((count ?? 0) + 1).padStart(3, '0')           // "001"
    return `${yy}-${agencyNum}-${seq}`                               // "26-001-001"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!form.name_kr || !form.name_vn || !form.dob) {
      setError('이름(한국어), 이름(베트남어), 생년월일은 필수입니다.')
      setLoading(false)
      return
    }

    const studentCode = form.agency_id
      ? await generateStudentCode(form.agency_id)
      : null

    const payload: Record<string, unknown> = {
      name_kr:          form.name_kr,
      name_vn:          form.name_vn,
      dob:              form.dob,
      gender:           form.gender,
      phone_kr:         form.phone_kr  || null,
      phone_vn:         form.phone_vn  || null,
      email:            form.email     || null,
      parent_name_vn:   form.parent_name_vn   || null,
      parent_phone_vn:  form.parent_phone_vn  || null,
      high_school_gpa:  form.high_school_gpa  ? parseFloat(form.high_school_gpa) : null,
      enrollment_date:  form.enrollment_date  || null,
      target_university: form.target_university || null,
      target_major:     form.target_major      || null,
      visa_type:        form.visa_type         || null,
      visa_expiry:      form.visa_expiry       || null,
      status:           form.status,
      agency_id:        form.agency_id || null,
      notes:            form.notes     || null,
      preferred_lang:   'vi',
      student_code:     studentCode,
    }

    const { error } = await supabase.from('students').insert(payload)

    if (error) {
      setError('저장 실패: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/students')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
        <div className="max-w-6xl mx-auto px-6 flex gap-6">
          <Link href="/" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent">대시보드</Link>
          <Link href="/students" className="py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">학생 관리</Link>
        </div>
      </nav>

      {/* 메인 */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/students" className="text-slate-400 hover:text-slate-600 text-sm">← 목록으로</Link>
          <h2 className="text-xl font-bold text-slate-800">학생 신규 등록</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <Section title="기본 정보">
            <Row>
              <Field label="한국 이름 *" required>
                <input type="text" value={form.name_kr} onChange={e => set('name_kr', e.target.value)} className={input} placeholder="홍길동" />
              </Field>
              <Field label="베트남 이름 *" required>
                <input type="text" value={form.name_vn} onChange={e => set('name_vn', e.target.value)} className={input} placeholder="Nguyen Van A" />
              </Field>
            </Row>
            <Row>
              <Field label="생년월일 *" required>
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
              <Field label="상태">
                <select value={form.status} onChange={e => set('status', e.target.value)} className={input}>
                  {STUDENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </Row>
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
              <Field label="유학원 등록일">
                <input type="date" value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} className={input} />
              </Field>
            </Row>
            <Row>
              <Field label="목표 대학">
                <input type="text" value={form.target_university} onChange={e => set('target_university', e.target.value)} className={input} placeholder="서울대학교" />
              </Field>
              <Field label="목표 학과">
                <input type="text" value={form.target_major} onChange={e => set('target_major', e.target.value)} className={input} placeholder="컴퓨터공학과" />
              </Field>
            </Row>
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
            <Link href="/students" className="flex-1 text-center py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium">
              취소
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? '저장 중...' : '학생 등록'}
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

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
