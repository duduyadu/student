'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Agency, UserMeta } from '@/lib/types'
import { getUserMeta } from '@/lib/auth'
import { STUDENT_STATUSES } from '@/lib/constants'
import { useLang } from '@/lib/useLang'
import { LangToggle } from '@/components/LangToggle'
import { t } from '@/lib/i18n'

export default function NewStudentPage() {
  const router = useRouter()
  const [user, setUser]       = useState<UserMeta | null>(null)
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [lang, toggleLang]    = useLang()

  const [form, setForm] = useState({
    name_kr: '', name_vn: '', dob: '', gender: 'M',
    phone_kr: '', phone_vn: '', email: '',
    parent_name_vn: '', parent_phone_vn: '',
    high_school_gpa: '', enrollment_date: '',
    target_university: '', target_major: '',
    visa_type: '', visa_expiry: '',
    arc_number: '', arc_issue_date: '', arc_expiry_date: '',
    status: '유학전', agency_id: '', notes: '',
    language_school: '', current_university: '', current_company: '',
  })

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const meta = getUserMeta(session)
    if (meta.role === 'student') { router.push('/portal'); return }
    setUser(meta)

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
    return `${yy}${agencyNum}${seq}`                                 // "26001001"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!form.name_kr || !form.name_vn || !form.dob) {
      setError(t('requiredMsg', lang))
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
      arc_number:       form.arc_number        || null,
      arc_issue_date:   form.arc_issue_date    || null,
      arc_expiry_date:  form.arc_expiry_date   || null,
      status:           form.status,
      agency_id:        form.agency_id || null,
      notes:            form.notes     || null,
      preferred_lang:   'vi',
      student_code:     studentCode,
      language_school:   form.language_school   || null,
      current_university: form.current_university || null,
      current_company:   form.current_company   || null,
    }

    const { data: insertData, error } = await supabase.from('students').insert(payload).select('id').single()

    if (error) {
      setError(t('saveFail', lang) + error.message)
      setLoading(false)
      return
    }

    // 감사 로그: 학생 등록 (앱 레벨 - 사용자 이름 포함)
    await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'INSERT',
        user_name: user?.name_kr,
        user_role: user?.role,
        target_table: 'students',
        target_id: insertData?.id,
        details: { name_kr: form.name_kr, name_vn: form.name_vn },
      }),
    }).catch(() => {}) // 감사 로그 실패는 무시

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
            <span className="font-bold text-slate-800">{t('appTitle', lang)}</span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle lang={lang} onToggle={toggleLang} />
            <span className="text-sm text-slate-500">{user?.name_kr}</span>
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-500">{t('logout', lang)}</button>
          </div>
        </div>
      </header>

      {/* 네비게이션 */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto">
          <Link href="/" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent whitespace-nowrap">{t('navDashboard', lang)}</Link>
          <Link href="/students" className="py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 whitespace-nowrap">{t('navStudents', lang)}</Link>
          <Link href="/reports" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent whitespace-nowrap">{t('navReports', lang)}</Link>
        </div>
      </nav>

      {/* 메인 */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/students" className="text-slate-400 hover:text-slate-600 text-sm">{t('backToList', lang)}</Link>
          <h2 className="text-xl font-bold text-slate-800">{t('newStudentTitle', lang)}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <Section title={t('sectionBasic', lang)}>
            <Row>
              <Field label={t('fieldNameKr', lang)} required>
                <input type="text" value={form.name_kr} onChange={e => set('name_kr', e.target.value)} className={input} placeholder="홍길동" />
              </Field>
              <Field label={t('fieldNameVn', lang)} required>
                <input type="text" value={form.name_vn} onChange={e => set('name_vn', e.target.value)} className={input} placeholder="Nguyen Van A" />
              </Field>
            </Row>
            <Row>
              <Field label={t('dob', lang)} required>
                <input type="date" lang={lang === 'vi' ? 'vi' : 'ko'} value={form.dob} onChange={e => set('dob', e.target.value)} className={input} />
              </Field>
              <Field label={t('fieldGender', lang)}>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={input}>
                  <option value="M">{t('genderM', lang)}</option>
                  <option value="F">{t('genderF', lang)}</option>
                </select>
              </Field>
            </Row>
            <Row>
              <Field label={t('fieldAgencyAdmin', lang)}>
                <select value={form.agency_id} onChange={e => set('agency_id', e.target.value)} className={input}>
                  <option value="">{t('noSelect', lang)}</option>
                  {agencies.map(a => (
                    <option key={a.id} value={a.id}>{a.agency_name_kr} ({a.agency_code})</option>
                  ))}
                </select>
              </Field>
              <Field label={t('fieldStatusAdmin', lang)}>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={input}>
                  {STUDENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </Row>
            {form.status !== '유학전' && (
              <Field label={
                form.status === '어학연수' ? (lang === 'vi' ? 'Trung tâm tiếng Hàn' : '재학 중인 어학원') :
                form.status === '대학교'   ? (lang === 'vi' ? 'Trường đại học hiện tại' : '재학 중인 대학교') :
                                             (lang === 'vi' ? 'Công ty hiện tại' : '재직 중인 회사')
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
          <Section title={t('sectionContact', lang)}>
            <Row>
              <Field label={t('fieldPhoneKr', lang)}>
                <input type="tel" value={form.phone_kr} onChange={e => set('phone_kr', e.target.value)} className={input} placeholder="010-1234-5678" />
              </Field>
              <Field label={t('fieldPhoneVn', lang)}>
                <input type="tel" value={form.phone_vn} onChange={e => set('phone_vn', e.target.value)} className={input} placeholder="+84-123-456-789" />
              </Field>
            </Row>
            <Field label={t('email', lang)}>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={input} placeholder="student@example.com" />
            </Field>
          </Section>

          {/* 학부모 정보 */}
          <Section title={t('sectionParent', lang)}>
            <Row>
              <Field label={t('fieldParentName', lang)}>
                <input type="text" value={form.parent_name_vn} onChange={e => set('parent_name_vn', e.target.value)} className={input} />
              </Field>
              <Field label={t('fieldParentPhone', lang)}>
                <input type="tel" value={form.parent_phone_vn} onChange={e => set('parent_phone_vn', e.target.value)} className={input} />
              </Field>
            </Row>
          </Section>

          {/* 학업 정보 */}
          <Section title={t('sectionStudy', lang)}>
            <Row>
              <Field label={t('fieldGpa', lang)}>
                <input type="number" step="0.01" min="0" max="10" value={form.high_school_gpa} onChange={e => set('high_school_gpa', e.target.value)} className={input} placeholder="예: 8.5" />
              </Field>
              <Field label={t('fieldEnrollDate', lang)}>
                <input type="date" lang={lang === 'vi' ? 'vi' : 'ko'} value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} className={input} />
              </Field>
            </Row>
            <Row>
              <Field label={t('fieldTargetUniv', lang)}>
                <input type="text" value={form.target_university} onChange={e => set('target_university', e.target.value)} className={input} placeholder="서울대학교" />
              </Field>
              <Field label={t('fieldTargetMajor', lang)}>
                <input type="text" value={form.target_major} onChange={e => set('target_major', e.target.value)} className={input} placeholder="컴퓨터공학과" />
              </Field>
            </Row>
          </Section>

          {/* 비자/체류 */}
          <Section title={t('sectionVisa', lang)}>
            <Row>
              <Field label={t('fieldVisaType', lang)}>
                <input type="text" value={form.visa_type} onChange={e => set('visa_type', e.target.value)} className={input} placeholder="D-4-1" />
              </Field>
              <Field label={t('fieldVisaExpiry', lang)}>
                <input type="date" lang={lang === 'vi' ? 'vi' : 'ko'} value={form.visa_expiry} onChange={e => set('visa_expiry', e.target.value)} className={input} />
              </Field>
            </Row>
            {/* 외국인등록증 (ARC) */}
            <Row>
              <Field label={lang === 'vi' ? 'Số thẻ ngoại kiều (ARC)' : '외국인등록번호 (ARC)'}>
                <input type="text" value={form.arc_number} onChange={e => set('arc_number', e.target.value)} className={input} placeholder="A123456789" />
              </Field>
              <Field label={lang === 'vi' ? 'Ngày cấp ARC' : 'ARC 발급일'}>
                <input type="date" lang={lang === 'vi' ? 'vi' : 'ko'} value={form.arc_issue_date} onChange={e => set('arc_issue_date', e.target.value)} className={input} />
              </Field>
            </Row>
            <Row>
              <Field label={lang === 'vi' ? 'Ngày hết hạn ARC' : 'ARC 만료일'}>
                <input type="date" lang={lang === 'vi' ? 'vi' : 'ko'} value={form.arc_expiry_date} onChange={e => set('arc_expiry_date', e.target.value)} className={input} />
              </Field>
              <div />
            </Row>
          </Section>

          {/* 비고 */}
          <Section title={t('sectionNotes', lang)}>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={4}
              className={input + ' resize-none'}
              placeholder={t('fieldNotes', lang)}
            />
          </Section>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <div className="flex gap-3 pb-8">
            <Link href="/students" className="flex-1 text-center py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium">
              {t('cancelBtn2', lang)}
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? t('saving', lang) : t('saveStudent', lang)}
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
