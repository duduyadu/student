'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Agency } from '@/lib/types'
import { STUDENT_STATUSES, TOPIK_LEVELS } from '@/lib/constants'
import { t } from '@/lib/i18n'
import { useLang } from '@/lib/useLang'
import { useAdminAuth } from '@/lib/useAdminAuth'
import { AppLayout } from '@/components/Layout/AppLayout'

export default function EditStudentPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [lang, toggleLang] = useLang()
  const { user, handleLogout } = useAdminAuth()

  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [photoUrl, setPhotoUrl]       = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

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

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('agencies').select('*').eq('is_active', true).order('agency_number'),
    ]).then(([studentRes, agenciesRes]) => {

    if (agenciesRes.data) setAgencies(agenciesRes.data)

    if (studentRes.data) {
      const s = studentRes.data
      setPhotoUrl(s.photo_url ?? null)
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
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert(t('photoSizeLimit', lang)); return }
    setPhotoUploading(true)
    const path = `${id}/profile`
    const { error: upErr } = await supabase.storage
      .from('student-photos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { alert(t('uploadFail', lang) + upErr.message); setPhotoUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(path)
    const url = `${publicUrl}?t=${Date.now()}`
    await supabase.from('students').update({ photo_url: url }).eq('id', id)
    setPhotoUrl(url)
    setPhotoUploading(false)
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.name_kr || !form.name_vn || !form.dob) {
      setError(t('requiredMsg', lang))
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
      setError(t('saveFail', lang) + dbError.message)
      setSaving(false)
      return
    }

    // 감사 로그: 학생 정보 수정
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">{t('loading', lang)}</p></div>
  }

  return (
    <AppLayout user={user} lang={lang} onToggleLang={toggleLang} onLogout={handleLogout} activeNav="students">
      {/* 메인 */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/students/${id}`} className="text-slate-400 hover:text-slate-600 text-sm">{t('backToDetail', lang)}</Link>
          <h2 className="text-xl font-bold text-slate-800">{t('editStudentTitle', lang)}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 프로필 사진 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">{t('profilePhoto', lang)}</h3>
            <div className="flex items-center gap-6">
              <label className="relative w-24 h-24 shrink-0 cursor-pointer group" title={t('clickToUpload', lang)}>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
                {photoUrl ? (
                  <img src={photoUrl} alt="프로필" className="w-24 h-24 rounded-2xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-24 h-24 bg-blue-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-blue-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-blue-600 group-hover:bg-blue-700 rounded-full flex items-center justify-center shadow-sm transition-colors">
                  {photoUploading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </label>
              <div className="text-sm text-slate-500 space-y-1">
                <p className="font-medium text-slate-700">{t('clickToUpload', lang)}</p>
                <p>{t('photoFormatHint', lang)}</p>
                <p className="text-xs text-slate-400">{t('pdfPhotoNote', lang)}</p>
              </div>
            </div>
          </div>

          {/* 기본 정보 */}
          <Section title={t('basicInfo', lang)}>
            <Row>
              <Field label={`${t('fieldNameKr', lang)} *`}>
                <input type="text" value={form.name_kr} onChange={e => set('name_kr', e.target.value)} className={input} placeholder="홍길동" />
              </Field>
              <Field label={`${t('fieldNameVn', lang)} *`}>
                <input type="text" value={form.name_vn} onChange={e => set('name_vn', e.target.value)} className={input} placeholder="Nguyen Van A" />
              </Field>
            </Row>
            <Row>
              <Field label={`${t('dob', lang)} *`}>
                <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className={input} />
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
              <Field label={t('fieldStudyStep', lang)}>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={input}>
                  {STUDENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </Row>
            {form.status !== '유학전' && (
              <Field label={
                form.status === '어학연수' ? t('languageSchool', lang) :
                form.status === '대학교'   ? t('currentUniv', lang) : t('currentCompany', lang)
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
              <Field label={t('phoneVn', lang)}>
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
              <Field label={t('topikLevel', lang)}>
                <select value={form.topik_level} onChange={e => set('topik_level', e.target.value)} className={input}>
                  <option value="">{t('noTopik', lang)}</option>
                  {TOPIK_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </Field>
            </Row>
            <Row>
              <Field label={t('fieldEnrollDate', lang)}>
                <input type="date" value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} className={input} />
              </Field>
              <Field label={t('fieldTargetUniv', lang)}>
                <input type="text" value={form.target_university} onChange={e => set('target_university', e.target.value)} className={input} placeholder="서울대학교" />
              </Field>
            </Row>
            <Field label={t('fieldTargetMajor', lang)}>
              <input type="text" value={form.target_major} onChange={e => set('target_major', e.target.value)} className={input} placeholder="컴퓨터공학과" />
            </Field>
          </Section>

          {/* 비자/체류 */}
          <Section title={t('sectionVisa', lang)}>
            <Row>
              <Field label={t('fieldVisaType', lang)}>
                <input type="text" value={form.visa_type} onChange={e => set('visa_type', e.target.value)} className={input} placeholder="D-4-1" />
              </Field>
              <Field label={t('fieldVisaExpiry', lang)}>
                <input type="date" value={form.visa_expiry} onChange={e => set('visa_expiry', e.target.value)} className={input} />
              </Field>
            </Row>
            <Row>
              <Field label={t('arcNumber', lang)}>
                <input type="text" value={form.arc_number} onChange={e => set('arc_number', e.target.value)} className={input} placeholder="A123456789" />
              </Field>
              <Field label={t('arcIssueDate', lang)}>
                <input type="date" value={form.arc_issue_date} onChange={e => set('arc_issue_date', e.target.value)} className={input} />
              </Field>
            </Row>
            <Row>
              <Field label={t('arcExpiry', lang)}>
                <input type="date" value={form.arc_expiry_date} onChange={e => set('arc_expiry_date', e.target.value)} className={input} />
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
            <Link href={`/students/${id}`} className="flex-1 text-center py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium">
              {t('cancelBtn2', lang)}
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? t('saving', lang) : t('saveComplete', lang)}
            </button>
          </div>
        </form>
      </main>
    </AppLayout>
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
