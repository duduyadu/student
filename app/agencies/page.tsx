'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Agency, UserMeta } from '@/lib/types'

export default function AgenciesPage() {
  const router = useRouter()
  const [user, setUser]         = useState<UserMeta | null>(null)
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    agency_name_vn: '', agency_name_kr: '',
    contact_person: '', contact_phone: '',
    email: '', password: '',
  })

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const meta = session.user.user_metadata as UserMeta
    if (meta.role !== 'master') { router.push('/'); return }
    setUser(meta)
    await loadAgencies()
    setLoading(false)
  }

  const loadAgencies = async () => {
    const { data } = await supabase
      .from('agencies')
      .select('*')
      .order('agency_number')
    if (data) setAgencies(data)
  }

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!form.agency_name_vn) {
      setError('유학원명 (베트남어)은 필수입니다.')
      setSaving(false)
      return
    }

    // 등록 순서대로 자동 코드 생성: 001, 002, ...
    const nextNumber = agencies.length + 1
    const autoCode   = String(nextNumber).padStart(3, '0')

    // 1. 로그인 계정 생성 (이메일/비밀번호 입력한 경우)
    let userId: string | null = null
    if (form.email && form.password) {
      const res = await fetch('/api/create-agency-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:          form.email,
          password:       form.password,
          agency_code:    autoCode,
          agency_name_kr: form.agency_name_vn, // 메타데이터엔 VN명 사용
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError('계정 생성 실패: ' + json.error)
        setSaving(false)
        return
      }
      userId = json.user_id
    }

    // 2. agencies 테이블에 저장
    const { error: dbError } = await supabase.from('agencies').insert({
      agency_code:    autoCode,
      agency_number:  nextNumber,
      agency_name_vn: form.agency_name_vn,
      agency_name_kr: form.agency_name_kr || null,
      contact_person: form.contact_person || null,
      contact_phone:  form.contact_phone  || null,
      user_id:        userId,
      is_active:      true,
    })

    if (dbError) {
      setError('저장 실패: ' + dbError.message)
      setSaving(false)
      return
    }

    await loadAgencies()
    setShowForm(false)
    setForm({ agency_name_vn: '', agency_name_kr: '', contact_person: '', contact_phone: '', email: '', password: '' })
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">로딩 중...</p></div>

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
          <Link href="/students" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent">학생 관리</Link>
          <Link href="/agencies" className="py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">유학원 관리</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">유학원 관리 <span className="text-slate-400 font-normal text-base">({agencies.length}개)</span></h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            {showForm ? '✕ 닫기' : '+ 유학원 등록'}
          </button>
        </div>

        {/* 등록 폼 */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">유학원 신규 등록</h3>
              <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                코드 자동 부여: {String(agencies.length + 1).padStart(3, '0')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">유학원명 (베트남어) *</label>
                <input value={form.agency_name_vn} onChange={e => set('agency_name_vn', e.target.value)} className={inp} placeholder="Trung tâm du học Hà Nội" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">유학원명 (한국어)</label>
                <input value={form.agency_name_kr} onChange={e => set('agency_name_kr', e.target.value)} className={inp} placeholder="하노이 유학원" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">담당자 이름</label>
                <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} className={inp} placeholder="Tran Minh" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">담당자 연락처</label>
                <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} className={inp} placeholder="+84-912-345-678" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-3">로그인 계정 생성 (선택)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">이메일</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="agency@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">비밀번호</label>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inp} placeholder="8자 이상" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">입력하지 않으면 유학원 정보만 저장됩니다.</p>
            </div>

            {error && <p className="mt-3 text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">취소</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium">
                {saving ? '저장 중...' : '유학원 등록'}
              </button>
            </div>
          </form>
        )}

        {/* 유학원 목록 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {agencies.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">🏫</p>
              <p>등록된 유학원이 없습니다.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">코드</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">유학원명</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">담당자</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">연락처</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {agencies.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-medium text-slate-500">{a.agency_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{a.agency_name_vn ?? a.agency_name_kr}</p>
                      {a.agency_name_vn && a.agency_name_kr && (
                        <p className="text-xs text-slate-400">{a.agency_name_kr}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{a.contact_person || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{a.contact_phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {a.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
