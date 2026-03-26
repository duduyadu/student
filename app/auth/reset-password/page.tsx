'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { LangToggle } from '@/components/LangToggle'
import { t } from '@/lib/i18n'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const [ready, setReady]         = useState(false)
  const [lang, toggleLang]        = useLang()

  useEffect(() => {
    // Supabase가 URL hash에서 세션 복원
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError(t('pwMin8', lang)); return }
    if (password !== password2) { setError(t('pwMismatch', lang)); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError('오류: ' + err.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('resetPwDoneTitle', lang)}</h2>
          <p className="text-slate-500 text-sm">{t('resetPwDoneDesc', lang)}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md text-center">
          <p className="text-slate-500 text-sm">{t('resetPwCheckingLink', lang)}</p>
        </div>
      </div>
    )
  }

  const inp = 'w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#3182F6] focus:bg-white text-slate-800'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md">
        <div className="flex justify-end mb-2">
          <LangToggle lang={lang} onToggle={toggleLang} />
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#3182F6] rounded-2xl mb-3">
            <span className="text-white text-xl font-bold">AE</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">{t('resetPwTitle', lang)}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('newPw', lang)}</label>
            <input type="password" className={inp} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('pw8hint', lang)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('confirmPw', lang)}</label>
            <input type="password" className={inp} value={password2} onChange={e => setPassword2(e.target.value)} placeholder={t('pw2hint', lang)} required />
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors active:scale-[0.98]"
          >
            {loading ? t('changing', lang) : t('changePassword', lang)}
          </button>
        </form>
      </div>
    </div>
  )
}
