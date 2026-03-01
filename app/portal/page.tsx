'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Student, Consultation, ExamResult } from '@/lib/types'
import { STATUS_COLORS } from '@/lib/constants'
import { t, type Lang } from '@/lib/i18n'
import { useLang } from '@/lib/useLang'
import { LangToggle } from '@/components/LangToggle'
import DocumentTab from './_components/DocumentTab'

export default function PortalPage() {
  const router = useRouter()
  const [student, setStudent]       = useState<Student | null>(null)
  const [loading, setLoading]       = useState(true)
  const [notApproved, setNotApproved] = useState(false)
  const [activeTab, setActiveTab]   = useState<'info' | 'docs' | 'consult' | 'exam' | 'account'>('info')
  const [lang, setLang]             = useState<Lang>('ko')

  // 정보 수정
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editForm, setEditForm]   = useState({
    phone_vn: '', phone_kr: '', visa_type: '', visa_expiry: '', home_address_vn: '',
  })

  // 상담/성적/동의
  const [consults, setConsults]   = useState<Consultation[]>([])
  const [exams, setExams]         = useState<ExamResult[]>([])
  const [consents, setConsents]   = useState<{id:string; consent_date:string; consent_type:string}[]>([])

  // 비밀번호
  const [pwForm, setPwForm]       = useState({ newPw: '', confirmPw: '' })
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwMsg, setPwMsg]         = useState('')
  const [pwError, setPwError]     = useState('')

  // 탈퇴 (Feature 3)
  const [withdrawing, setWithdrawing] = useState(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)

  // 사진 업로드
  const photoInputRef             = useRef<HTMLInputElement>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Lang | null
    if (saved === 'vi') setLang('vi')
    checkAuth()
  }, [])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'vi' : 'ko'
    setLang(next)
    localStorage.setItem('app_lang', next)
    // 학생 선호 언어 DB 업데이트 (Feature 4)
    if (student) {
      supabase.from('students').update({ preferred_lang: next }).eq('id', student.id)
    }
  }

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data } = await supabase
      .from('students')
      .select('*, agency:agencies(agency_code, agency_name_kr, agency_name_vn)')
      .eq('auth_user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!data) {
      const meta = session.user.app_metadata as { role?: string }
      if (meta?.role !== 'student') { router.push('/'); return }
      setLoading(false)
      return
    }

    if (!data.is_approved) { setNotApproved(true); setLoading(false); return }

    setStudent(data as Student)
    setEditForm({
      phone_vn:        data.phone_vn        ?? '',
      phone_kr:        data.phone_kr        ?? '',
      visa_type:       data.visa_type       ?? '',
      visa_expiry:     data.visa_expiry     ?? '',
      home_address_vn: data.home_address_vn ?? '',
    })

    const [consultRes, examRes, consentRes] = await Promise.all([
      supabase.from('consultations').select('*').eq('student_id', data.id).order('consult_date', { ascending: false }),
      supabase.from('exam_results').select('*').eq('student_id', data.id).order('exam_date', { ascending: false }),
      supabase.from('privacy_consents').select('id, consent_date, consent_type').eq('student_id', data.id).order('consent_date', { ascending: false }),
    ])
    if (consultRes.data) setConsults(consultRes.data)
    if (examRes.data)    setExams(examRes.data)
    if (consentRes.data) setConsents(consentRes.data)

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSave = async () => {
    if (!student) return
    setSaving(true); setSaveError('')
    const { error } = await supabase.from('students').update({
      phone_vn:        editForm.phone_vn        || null,
      phone_kr:        editForm.phone_kr        || null,
      visa_type:       editForm.visa_type       || null,
      visa_expiry:     editForm.visa_expiry     || null,
      home_address_vn: editForm.home_address_vn || null,
    }).eq('id', student.id)
    if (error) { setSaveError(t('saveFail', lang) + error.message); setSaving(false); return }
    setStudent(prev => prev ? { ...prev,
      phone_vn: editForm.phone_vn || undefined, phone_kr: editForm.phone_kr || undefined,
      visa_type: editForm.visa_type || undefined, visa_expiry: editForm.visa_expiry || undefined,
      home_address_vn: editForm.home_address_vn || undefined,
    } : prev)
    setEditing(false); setSaving(false)
  }

  const handlePasswordChange = async () => {
    setPwError(''); setPwMsg('')
    if (pwForm.newPw.length < 8) { setPwError(t('pwMin8', lang)); return }
    if (pwForm.newPw !== pwForm.confirmPw) { setPwError(t('pwMismatch', lang)); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
    if (error) { setPwError(t('changeFail', lang) + error.message); setPwSaving(false); return }
    setPwMsg(t('pwChanged', lang))
    setPwForm({ newPw: '', confirmPw: '' })
    setPwSaving(false)
  }

  const handleWithdraw = async () => {
    setWithdrawing(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/student-withdraw', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` },
    })
    if (res.ok) {
      await supabase.auth.signOut()
      router.push('/login')
    } else {
      setWithdrawing(false)
      setShowWithdrawConfirm(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!student) return
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('5MB 이하 이미지만 업로드 가능합니다. / Chỉ tải ảnh dưới 5MB.'); return }
    setPhotoUploading(true)
    const path = `${student.id}/profile`
    const { error: upErr } = await supabase.storage
      .from('student-photos')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) { alert('업로드 실패: ' + upErr.message); setPhotoUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(path)
    const url = `${publicUrl}?t=${Date.now()}`
    await supabase.from('students').update({ photo_url: url }).eq('id', student.id)
    setStudent(prev => prev ? { ...prev, photo_url: url } : prev)
    setPhotoUploading(false)
  }

  const daysLeft = (expiry: string) =>
    Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)

  const levelColor = (level: string) => {
    const map: Record<string, string> = {
      '6급': 'bg-blue-100 text-blue-700', '5급': 'bg-indigo-100 text-indigo-700',
      '4급': 'bg-violet-100 text-violet-700', '3급': 'bg-emerald-100 text-emerald-700',
      '2급': 'bg-amber-100 text-amber-700', '1급': 'bg-orange-100 text-orange-700',
      '불합격': 'bg-red-100 text-red-600',
    }
    return map[level] ?? 'bg-slate-100 text-slate-600'
  }

  const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">{t('loading', lang)}</p></div>

  if (notApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
          <div className="flex justify-end mb-4">
            <button onClick={toggleLang} className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-50">
              {lang === 'ko' ? 'VI' : 'KR'}
            </button>
          </div>
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('pendingTitle', lang)}</h2>
          <p className="text-slate-500 text-sm mb-6 whitespace-pre-line">{t('pendingDesc', lang)}</p>
          <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-red-500">{t('logout', lang)}</button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
          <p className="text-slate-500 text-sm mb-4">{t('noStudentInfo', lang)}</p>
          <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-red-500">{t('logout', lang)}</button>
        </div>
      </div>
    )
  }

  const visaDays = student.visa_expiry ? daysLeft(student.visa_expiry) : null

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">AE</span>
            </div>
            <span className="font-bold text-slate-800">AJU E&J</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleLang}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-slate-500 hover:bg-slate-50 font-medium transition-colors">
              {lang === 'ko' ? '🇻🇳 VI' : '🇰🇷 KR'}
            </button>
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-500">{t('logout', lang)}</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* 프로필 요약 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
          {/* 사진 (F: 클릭해서 업로드) */}
          <label className="relative w-14 h-14 shrink-0 cursor-pointer group" title={t('changePhoto', lang)}>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
              onChange={handlePhotoUpload} disabled={photoUploading} />
            {photoUploading ? (
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                <span className="text-xs text-slate-400">{t('uploading', lang)}</span>
              </div>
            ) : student.photo_url ? (
              <>
                <img src={student.photo_url} alt="프로필" className="w-14 h-14 rounded-2xl object-cover" />
                <div className="absolute inset-0 bg-black/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-medium">수정</span>
                </div>
              </>
            ) : (
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <span className="text-blue-600 text-2xl font-bold">{student.name_kr[0]}</span>
              </div>
            )}
          </label>

          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 text-lg leading-tight">{student.name_kr}</h2>
            <p className="text-slate-500 text-sm">{student.name_vn}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[student.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {student.status}
              </span>
              {student.student_code && (
                <span className="text-xs text-slate-400 font-mono">{student.student_code}</span>
              )}
            </div>
          </div>
        </div>

        {/* 비자 만료 알림 */}
        {visaDays !== null && visaDays <= 90 && (
          <div className={`rounded-2xl p-4 border ${
            visaDays <= 7 ? 'bg-red-50 border-red-300' : visaDays <= 30 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <p className={`text-sm font-semibold ${visaDays <= 7 ? 'text-red-700' : visaDays <= 30 ? 'text-orange-700' : 'text-yellow-700'}`}>
              {visaDays <= 7 ? t('visaUrgent', lang) : visaDays <= 30 ? t('visaWarn30', lang) : t('visaWarn90', lang)}
              <span className="font-bold">D-{visaDays}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">{t('expiryDate', lang)}: {student.visa_expiry}</p>
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm overflow-x-auto">
          {([
            { key: 'info',    label: t('tabInfo', lang) },
            { key: 'docs',    label: t('tabDocs', lang) },
            { key: 'consult', label: `${t('tabConsult', lang)} (${consults.length})` },
            { key: 'exam',    label: `${t('tabExam', lang)} (${exams.length})` },
            { key: 'account', label: t('tabAccount', lang) },
          ] as const).map(tb => (
            <button key={tb.key} onClick={() => setActiveTab(tb.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-1 ${
                activeTab === tb.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* ── 서류 탭 ── */}
        {activeTab === 'docs' && student && (
          <DocumentTab studentId={student.id} lang={lang} />
        )}

        {/* ── 내 정보 탭 ── */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              {!editing && (
                <button onClick={() => { setEditing(true); setSaveError('') }}
                  className="text-sm text-blue-600 border border-blue-200 px-4 py-1.5 rounded-xl hover:bg-blue-50 transition-colors font-medium">
                  {t('editInfo', lang)}
                </button>
              )}
            </div>

            {editing ? (
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
                  {t('editTitle', lang)} <span className="text-xs font-normal text-slate-400 ml-1">{t('editSubNote', lang)}</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t('phoneVn', lang)}</label>
                    <input className={inp} value={editForm.phone_vn} onChange={e => setEditForm(p => ({ ...p, phone_vn: e.target.value }))} placeholder="+84-123-456-789" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t('phoneKr', lang)}</label>
                    <input className={inp} value={editForm.phone_kr} onChange={e => setEditForm(p => ({ ...p, phone_kr: e.target.value }))} placeholder="010-0000-0000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t('visaType', lang)}</label>
                    <input className={inp} value={editForm.visa_type} onChange={e => setEditForm(p => ({ ...p, visa_type: e.target.value }))} placeholder="D-2, D-4 등" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t('visaExpiry', lang)}</label>
                    <input type="date" lang={lang === 'vi' ? 'vi' : 'ko'} className={inp} value={editForm.visa_expiry} onChange={e => setEditForm(p => ({ ...p, visa_expiry: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t('addressVn', lang)}</label>
                  <input className={inp} value={editForm.home_address_vn} onChange={e => setEditForm(p => ({ ...p, home_address_vn: e.target.value }))} />
                </div>
                {saveError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{saveError}</div>}
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl text-sm">
                    {saving ? t('saving', lang) : t('save', lang)}
                  </button>
                  <button onClick={() => { setEditing(false); setSaveError('') }} disabled={saving}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-sm">
                    {t('cancel', lang)}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">{t('basicInfo', lang)}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoRow label={t('dob', lang)}        value={student.dob ?? '-'} />
                    <InfoRow label={t('gender', lang)}     value={student.gender === 'M' ? t('genderM', lang) : t('genderF', lang)} />
                    <InfoRow label={t('agency', lang)}     value={student.agency?.agency_name_vn ?? student.agency?.agency_name_kr ?? '-'} />
                    <InfoRow label={t('email', lang)}      value={student.email ?? '-'} />
                    <InfoRow label={t('topikLevel', lang)} value={student.topik_level ?? '-'} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">{t('contactInfo', lang)}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoRow label={t('phoneVn', lang)} value={student.phone_vn ?? '-'} />
                    <InfoRow label={t('phoneKr', lang)} value={student.phone_kr ?? '-'} />
                    {student.home_address_vn && (
                      <div className="col-span-2"><InfoRow label={t('addressVn', lang)} value={student.home_address_vn} /></div>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">{t('visaInfo', lang)}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoRow label={t('visaType', lang)}   value={student.visa_type   ?? '-'} />
                    <InfoRow label={t('visaExpiry', lang)} value={student.visa_expiry ?? '-'} />
                    {visaDays !== null && <InfoRow label={t('daysLeft', lang)} value={`D-${visaDays}`} />}
                  </div>
                </div>
                {/* 현재 소속 (Feature 2) */}
                {(student.language_school || student.current_university || student.current_company) && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
                      {t('currentAffiliation', lang)}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {student.language_school    && <InfoRow label={t('languageSchool', lang)} value={student.language_school} />}
                      {student.current_university && <InfoRow label={t('currentUniv', lang)}    value={student.current_university} />}
                      {student.current_company    && <InfoRow label={t('currentCompany', lang)} value={student.current_company} />}
                    </div>
                  </div>
                )}
                {(student.target_university || student.target_major) && (
                  <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">{t('studyInfo', lang)}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <InfoRow label={t('targetUniv', lang)}  value={student.target_university ?? '-'} />
                      <InfoRow label={t('targetMajor', lang)} value={student.target_major     ?? '-'} />
                      <InfoRow label={t('gpa', lang)}         value={student.high_school_gpa ? String(student.high_school_gpa) : '-'} />
                      <InfoRow label={t('enrollDate', lang)}  value={student.enrollment_date  ?? '-'} />
                    </div>
                  </div>
                )}
              </>
            )}
            <p className="text-center text-xs text-slate-400 pb-2">{t('editNote', lang)}</p>
          </div>
        )}

        {/* ── 상담 기록 탭 ── */}
        {activeTab === 'consult' && (
          <div className="space-y-3">
            {consults.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-slate-400 text-sm">{t('noConsult', lang)}</div>
            ) : consults.map(c => (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c.consult_type ?? '상담'}</span>
                  <span className="text-xs text-slate-400">{c.consult_date}</span>
                </div>
                {c.summary && (
                  <div className="mb-2">
                    <p className="text-xs text-slate-400 mb-0.5">{t('consultContent', lang)}</p>
                    <p className="text-sm text-slate-700">{c.summary}</p>
                  </div>
                )}
                {c.improvement && (
                  <div className="mb-2">
                    <p className="text-xs text-slate-400 mb-0.5">{t('improvement', lang)}</p>
                    <p className="text-sm text-slate-700">{c.improvement}</p>
                  </div>
                )}
                {c.next_goal && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">{t('nextGoal', lang)}</p>
                    <p className="text-sm text-slate-700">{c.next_goal}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 시험 성적 탭 ── */}
        {activeTab === 'exam' && (
          <div className="space-y-3">
            {exams.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-slate-400 text-sm">{t('noExam', lang)}</div>
            ) : exams.map(e => (
              <div key={e.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{e.exam_type}</span>
                    <span className="text-xs text-slate-400">{e.exam_date}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${levelColor(e.level)}`}>{e.level}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {e.reading_score != null && (
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-xs text-slate-400 mb-0.5">{t('reading', lang)}</p>
                      <p className="font-bold text-slate-800">{e.reading_score}</p>
                    </div>
                  )}
                  {e.listening_score != null && (
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-xs text-slate-400 mb-0.5">{t('listening', lang)}</p>
                      <p className="font-bold text-slate-800">{e.listening_score}</p>
                    </div>
                  )}
                  {e.writing_score != null && (
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-xs text-slate-400 mb-0.5">{t('writing', lang)}</p>
                      <p className="font-bold text-slate-800">{e.writing_score}</p>
                    </div>
                  )}
                  <div className="bg-blue-50 rounded-xl p-2">
                    <p className="text-xs text-blue-400 mb-0.5">{t('total', lang)}</p>
                    <p className="font-bold text-blue-700">{e.total_score}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 계정 설정 탭 ── */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">{t('changePassword', lang)}</h4>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {t('newPw', lang)} <span className="text-slate-400">{t('newPwHint', lang)}</span>
                </label>
                <input type="password" className={inp} value={pwForm.newPw}
                  onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                  placeholder={t('enterNewPw', lang)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('confirmPw', lang)}</label>
                <input type="password" className={inp} value={pwForm.confirmPw}
                  onChange={e => setPwForm(p => ({ ...p, confirmPw: e.target.value }))}
                  placeholder={t('enterConfirmPw', lang)} />
              </div>
              {pwError && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{pwError}</div>}
              {pwMsg   && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl">{pwMsg}</div>}
              <button onClick={handlePasswordChange} disabled={pwSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                {pwSaving ? t('changing', lang) : t('changePassword', lang)}
              </button>
            </div>

            {consents.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">{t('consentHistory', lang)}</h4>
                <div className="space-y-2">
                  {consents.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {c.consent_type === 'signup' ? t('consentSignup', lang) : c.consent_type}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {new Date(c.consent_date).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 탈퇴 (Feature 3) */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
                {t('accountWithdraw', lang)}
              </h4>
              {!showWithdrawConfirm ? (
                <div>
                  <p className="text-xs text-slate-400 mb-3">{t('withdrawDesc', lang)}</p>
                  <button onClick={() => setShowWithdrawConfirm(true)}
                    className="text-sm text-red-500 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors">
                    {t('withdrawBtn', lang)}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-3">
                    {t('withdrawConfirm', lang)}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowWithdrawConfirm(false)} disabled={withdrawing}
                      className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm hover:bg-slate-50">
                      {t('cancel', lang)}
                    </button>
                    <button onClick={handleWithdraw} disabled={withdrawing}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-xl text-sm font-semibold">
                      {withdrawing ? t('processing', lang) : t('withdrawConfirmBtn', lang)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-slate-800 font-medium">{value}</p>
    </div>
  )
}
