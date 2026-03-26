'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { LangToggle } from '@/components/LangToggle'
import { t } from '@/lib/i18n'

export default function ResetPasswordRequestPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [lang, toggleLang]    = useLang()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (err) { setError('오류: ' + err.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('forgotPwSentTitle', lang)}</h2>
          <p className="text-slate-500 text-sm mb-6">
            <strong>{email}</strong>
          </p>
          <Link href="/login" className="text-[#3182F6] text-sm hover:underline">{t('backToLogin', lang)}</Link>
        </div>
      </div>
    )
  }

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
          <h1 className="text-xl font-bold text-slate-800">{t('forgotPassword', lang)}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('forgotPwSubtitle', lang)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('loginEmail', lang)}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('forgotPwPlaceholder', lang)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-[#3182F6] focus:bg-white text-slate-800"
            />
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3182F6] hover:bg-[#1B64DA] disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors active:scale-[0.98]"
          >
            {loading ? t('forgotPwSending', lang) : t('forgotPwSendBtn', lang)}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          <Link href="/login" className="text-slate-400 hover:text-slate-600 text-xs">← {t('backToLogin', lang)}</Link>
        </p>
      </div>
    </div>
  )
}
