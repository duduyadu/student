'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordRequestPage() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

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
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">이메일을 확인하세요</h2>
          <p className="text-slate-500 text-sm mb-6">
            <strong>{email}</strong>로 비밀번호 재설정 링크를 발송했습니다.
          </p>
          <Link href="/login" className="text-blue-600 text-sm hover:underline">로그인 페이지로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3">
            <span className="text-white text-xl font-bold">AE</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">비밀번호 찾기</h1>
          <p className="text-slate-500 text-sm mt-1">가입한 이메일을 입력하면 재설정 링크를 보내드립니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="가입한 이메일 주소"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? '발송 중...' : '재설정 링크 발송'}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          <Link href="/login" className="text-slate-400 hover:text-slate-600 text-xs">← 로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}
