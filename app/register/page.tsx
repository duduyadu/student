'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Agency } from '@/lib/types'
import { STUDENT_STATUSES } from '@/lib/constants'
import { useLang } from '@/lib/useLang'
import { LangToggle } from '@/components/LangToggle'
import { t } from '@/lib/i18n'

const PRIVACY_TEXT_KO = `AJU E&J는 유학 관리 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.

■ 수집 항목: 이름(한국어/베트남어), 전화번호, 이메일, 비자 정보, 유학 단계
■ 수집 목적: 유학생 관리, 비자 만료 안내, 상담 서비스 제공
■ 보유 기간: 서비스 탈퇴 또는 졸업 후 3년
■ 제3자 제공: 없음

위 내용에 동의하지 않을 경우 서비스 이용이 제한될 수 있습니다.`

const PRIVACY_TEXT_VI = `AJU E&J thu thập và sử dụng thông tin cá nhân để cung cấp dịch vụ quản lý du học như sau.

■ Thông tin thu thập: Họ tên (KR/VN), số điện thoại, email, thông tin visa, giai đoạn du học
■ Mục đích: Quản lý du học sinh, thông báo hết hạn visa, cung cấp dịch vụ tư vấn
■ Thời gian lưu trữ: 3 năm sau khi rút khỏi dịch vụ hoặc tốt nghiệp
■ Cung cấp cho bên thứ ba: Không

Nếu không đồng ý, việc sử dụng dịch vụ có thể bị hạn chế.`

export default function RegisterPage() {
  const router = useRouter()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')
  const [lang, toggleLang]      = useLang()

  const [form, setForm] = useState({
    name_kr: '', name_vn: '',
    phone_vn: '', email: '', password: '', password2: '',
    status: '유학전',
    agency_id: '',
    dob: '', gender: 'M',
    privacy: false,
  })

  useEffect(() => {
    supabase.from('agencies').select('id, agency_code, agency_name_kr, agency_name_vn')
      .eq('is_active', true).order('agency_number')
      .then(({ data }) => { if (data) setAgencies(data as Agency[]) })
  }, [])

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name_kr || !form.name_vn || !form.phone_vn || !form.email || !form.password || !form.dob) {
      setError(t('registerRequired', lang))
      return
    }
    if (form.password.length < 8) {
      setError(t('pwMin8', lang))
      return
    }
    if (form.password !== form.password2) {
      setError(t('pwMismatch', lang))
      return
    }
    if (!form.privacy) {
      setError(t('privacyRequired', lang))
      return
    }

    setLoading(true)

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name_kr:   form.name_kr,
        name_vn:   form.name_vn,
        phone_vn:  form.phone_vn || null,
        email:     form.email,
        password:  form.password,
        dob:       form.dob || null,
        gender:    form.gender,
        status:    form.status,
        agency_id: form.agency_id || null,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? t('registerRequired', lang))
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
          <div className="flex justify-end mb-2">
            <LangToggle lang={lang} onToggle={toggleLang} />
          </div>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('registerDoneTitle', lang)}</h2>
          <p className="text-slate-500 text-sm mb-2 whitespace-pre-line">{t('registerDoneDesc', lang)}</p>
          <p className="text-xs text-slate-400 mb-6">{t('registerDoneNote', lang)}</p>
          <Link href="/login" className="text-blue-600 text-sm hover:underline">
            {t('goToLogin', lang)}
          </Link>
        </div>
      </div>
    )
  }

  const inp = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8 relative">
          <div className="absolute right-0 top-0">
            <LangToggle lang={lang} onToggle={toggleLang} />
          </div>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3">
            <span className="text-white text-xl font-bold">AE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t('registerTitle', lang)}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('registerSubtitle', lang)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">{t('sectionBasic', lang)}</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldNameKr', lang)} <span className="text-red-500">*</span></label>
                <input className={inp} value={form.name_kr} onChange={e => set('name_kr', e.target.value)} placeholder="홍길동" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldNameVn', lang)} <span className="text-red-500">*</span></label>
                <input className={inp} value={form.name_vn} onChange={e => set('name_vn', e.target.value)} placeholder="Nguyen Van A" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('dob', lang)} <span className="text-red-500">*</span></label>
                <input type="date" lang={lang === 'vi' ? 'vi' : 'ko'} className={inp} value={form.dob} onChange={e => set('dob', e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('gender', lang)} <span className="text-red-500">*</span></label>
                <select className={inp} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="M">{t('genderM', lang)}</option>
                  <option value="F">{t('genderF', lang)}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldPhoneVn', lang)} <span className="text-red-500">*</span></label>
              <input type="tel" className={inp} value={form.phone_vn} onChange={e => set('phone_vn', e.target.value)} placeholder="+84-123-456-789" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldStudyStep', lang)} <span className="text-red-500">*</span></label>
                <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                  {STUDENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldAgency', lang)}</label>
                <select className={inp} value={form.agency_id} onChange={e => set('agency_id', e.target.value)}>
                  <option value="">{t('noSelect', lang)}</option>
                  {agencies.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.agency_name_vn ?? a.agency_name_kr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 계정 정보 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">{t('sectionAccount', lang)}</h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldEmail', lang)} <span className="text-red-500">*</span></label>
              <input type="email" className={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@email.com" />
              <p className="text-xs text-slate-400 mt-1">{t('emailHint', lang)}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldPassword', lang)} <span className="text-red-500">*</span></label>
              <input type="password" className={inp} value={form.password} onChange={e => set('password', e.target.value)} placeholder={t('pw8hint', lang)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('fieldPassword2', lang)} <span className="text-red-500">*</span></label>
              <input type="password" className={inp} value={form.password2} onChange={e => set('password2', e.target.value)} placeholder={t('pw2hint', lang)} />
            </div>
          </div>

          {/* 개인정보 동의 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2 mb-3">{t('privacyTitle', lang)}</h3>
            <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 whitespace-pre-line leading-relaxed mb-4 max-h-40 overflow-y-auto">
              {lang === 'ko' ? PRIVACY_TEXT_KO : PRIVACY_TEXT_VI}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.privacy}
                onChange={e => set('privacy', e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-slate-700">
                <strong>{t('privacyAgree', lang)}</strong> <span className="text-red-500">*</span>
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? t('submitProcessing', lang) : t('submitRegister', lang)}
          </button>

          <p className="text-center text-sm text-slate-500">
            {t('alreadyAccount', lang)}{' '}
            <Link href="/login" className="text-blue-600 hover:underline">{t('loginNow', lang)}</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
