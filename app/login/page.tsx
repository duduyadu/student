'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { LangToggle } from '@/components/LangToggle'
import { t } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [lang, toggleLang]      = useLang()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(t('loginError', lang))
      setLoading(false)
      return
    }

    const appMeta  = data.user?.app_metadata  as { role?: string } | undefined
    const userMeta = data.user?.user_metadata as { name_kr?: string } | undefined

    // 감사 로그: 로그인 이벤트
    await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'LOGIN',
        user_id: data.user?.id,
        user_role: appMeta?.role,
        user_name: userMeta?.name_kr,
      }),
    }).catch(() => {})

    if (appMeta?.role === 'student') {
      router.push('/portal')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">

        {/* 언어 토글 */}
        <div className="flex justify-end mb-4">
          <LangToggle lang={lang} onToggle={toggleLang} />
        </div>

        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">AE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">AJU E&J</h1>
          <p className="text-slate-500 text-sm mt-1">{t('loginSubtitle', lang)}</p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('loginEmail', lang)}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ajuenj.com"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('loginPassword', lang)}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('pwPlaceholder', lang)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? t('loggingIn', lang) : t('loginBtn', lang)}
          </button>
        </form>

        <div className="flex justify-between items-center mt-4">
          <Link href="/auth/reset-password-request" className="text-xs text-slate-400 hover:text-blue-500">
            {t('forgotPassword', lang)}
          </Link>
          <Link href="/register" className="text-xs text-blue-600 hover:underline font-medium">
            {t('registerLink', lang)}
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          ⓒ 2026 AJU E&J. All rights reserved.
        </p>
      </div>
    </div>
  )
}
