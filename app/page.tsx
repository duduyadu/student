'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { UserMeta } from '@/lib/types'
import Link from 'next/link'

export default function DashboardPage() {
  const router  = useRouter()
  const [user, setUser]           = useState<UserMeta | null>(null)
  const [stats, setStats]         = useState({ students: 0, agencies: 0, consultations: 0, exams: 0 })
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setUser(session.user.user_metadata as UserMeta)
    await loadStats()
    setLoading(false)
  }

  const loadStats = async () => {
    const [s, a, c, e] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('agencies').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('consultations').select('id', { count: 'exact', head: true }),
      supabase.from('exam_results').select('id', { count: 'exact', head: true }),
    ])
    setStats({
      students:      s.count ?? 0,
      agencies:      a.count ?? 0,
      consultations: c.count ?? 0,
      exams:         e.count ?? 0,
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    )
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
            <span className="text-sm text-slate-500">{user?.name_kr} ({user?.role})</span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-red-500 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 네비게이션 */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-6">
            <Link href="/" className="py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              대시보드
            </Link>
            <Link href="/students" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent hover:border-slate-300 transition-colors">
              학생 관리
            </Link>
            {user?.role === 'master' && (
              <Link href="/agencies" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent hover:border-slate-300 transition-colors">
                유학원 관리
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* 메인 */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">대시보드</h2>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="전체 학생" value={stats.students} color="blue" />
          <StatCard label="유학원 수" value={stats.agencies} color="emerald" />
          <StatCard label="상담 기록" value={stats.consultations} color="violet" />
          <StatCard label="시험 기록" value={stats.exams} color="amber" />
        </div>

        {/* 바로가기 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickLink
            href="/students"
            title="학생 목록 보기"
            desc="등록된 유학생 전체 목록을 조회합니다."
            color="blue"
          />
          <QuickLink
            href="/students/new"
            title="학생 신규 등록"
            desc="새로운 베트남 유학생을 등록합니다."
            color="emerald"
          />
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet:  'bg-violet-50 text-violet-700',
    amber:   'bg-amber-50 text-amber-700',
  }
  return (
    <div className={`rounded-2xl p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}

function QuickLink({ href, title, desc, color }: { href: string; title: string; desc: string; color: string }) {
  const colors: Record<string, string> = {
    blue:    'hover:border-blue-400 hover:bg-blue-50',
    emerald: 'hover:border-emerald-400 hover:bg-emerald-50',
  }
  return (
    <Link
      href={href}
      className={`block bg-white rounded-2xl p-6 border-2 border-transparent transition-all ${colors[color]}`}
    >
      <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500">{desc}</p>
    </Link>
  )
}
