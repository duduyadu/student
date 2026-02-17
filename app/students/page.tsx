'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Student, UserMeta } from '@/lib/types'
import { STATUS_COLORS } from '@/lib/constants'

export default function StudentsPage() {
  const router = useRouter()
  const [user, setUser]       = useState<UserMeta | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(session.user.user_metadata as UserMeta)
    await loadStudents()
    setLoading(false)
  }

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*, agency:agencies(agency_code, agency_name_kr)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (!error && data) setStudents(data as Student[])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filtered = students.filter(s =>
    s.name_kr.includes(search) || s.name_vn.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = (status: string) => STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">로딩 중...</p></div>
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
          <Link href="/" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent hover:border-slate-300 transition-colors">대시보드</Link>
          <Link href="/students" className="py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">학생 관리</Link>
          {user?.role === 'master' && (
            <Link href="/agencies" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent hover:border-slate-300 transition-colors">유학원 관리</Link>
          )}
        </div>
      </nav>

      {/* 메인 */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">학생 목록 <span className="text-slate-400 font-normal text-base">({filtered.length}명)</span></h2>
          <Link href="/students/new" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            + 학생 등록
          </Link>
        </div>

        {/* 검색 */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름으로 검색 (한국어 / 베트남어)"
            className="w-full md:w-80 px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">👤</p>
              <p>등록된 학생이 없습니다.</p>
              <Link href="/students/new" className="mt-4 inline-block text-blue-600 text-sm hover:underline">첫 번째 학생 등록하기</Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">번호</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">이름 (KR)</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">이름 (VN)</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">유학원</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">상태</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-6 py-3">등록일</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-slate-400">{s.student_code ?? '-'}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{s.name_kr}</td>
                    <td className="px-6 py-4 text-slate-600">{s.name_vn}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {(s.agency as any)?.agency_name_kr ?? '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {s.enrollment_date ?? '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/students/${s.id}`} className="text-blue-600 text-sm hover:underline">
                        상세보기
                      </Link>
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
