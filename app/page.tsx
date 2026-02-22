'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Student, UserMeta } from '@/lib/types'
import { getUserMeta } from '@/lib/auth'
import { STATUS_COLORS, STUDENT_STATUSES } from '@/lib/constants'
import Link from 'next/link'
import { useLang } from '@/lib/useLang'
import { LangToggle } from '@/components/LangToggle'
import { t, statusLabel } from '@/lib/i18n'

interface StatusCount { status: string; count: number }

interface HealthCheck {
  name: string; status: 'ok' | 'error' | 'warn'; ms: number; detail?: string
}
interface HealthResult {
  ok: boolean; checkedAt: string; checks: HealthCheck[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser]             = useState<UserMeta | null>(null)
  const [stats, setStats]           = useState({ students: 0, agencies: 0, consultations: 0, thisMonth: 0 })
  const [visaAlert60, setVisaAlert60] = useState<Student[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<StatusCount[]>([])
  const [pendingStudents, setPendingStudents] = useState<Student[]>([])
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [lang, toggleLang]          = useLang()
  const [health, setHealth]         = useState<HealthResult | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/health')
      setHealth(await res.json())
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const meta = getUserMeta(session)
    if (meta?.role === 'student') { router.push('/portal'); return }
    setUser(meta as any)
    await Promise.all([loadStats(), loadVisaAlert(), loadStatusBreakdown(), loadPendingStudents()])
    setLoading(false)
    if (meta?.role === 'master') fetchHealth()
  }

  const loadPendingStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, name_kr, name_vn, status, agency_id, created_at')
      .eq('is_approved', false)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (data) setPendingStudents(data as Student[])
  }

  const approveOne = async (studentId: string): Promise<void> => {
    const now = new Date()
    const yy  = now.getFullYear().toString().slice(-2)
    const { data: stu } = await supabase.from('students').select('agency_id').eq('id', studentId).single()
    let agencyNum = '000'
    if (stu?.agency_id) {
      const { data: ag } = await supabase.from('agencies').select('agency_number').eq('id', stu.agency_id).single()
      if (ag) agencyNum = String(ag.agency_number).padStart(3, '0')
    }
    const yearStart = `${now.getFullYear()}-01-01`
    const yearEnd   = `${now.getFullYear()}-12-31`
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true })
      .eq('agency_id', stu?.agency_id ?? '').eq('is_approved', true)
      .gte('created_at', yearStart).lte('created_at', yearEnd)

    // 레이스 컨디션 방지: 이미 사용 중인 코드면 seq를 증가시켜 재시도
    let seq = (count ?? 0) + 1
    let student_code = `${yy}${agencyNum}${String(seq).padStart(3, '0')}`
    while (true) {
      const { data: collision } = await supabase
        .from('students').select('id').eq('student_code', student_code).maybeSingle()
      if (!collision) break
      seq++
      student_code = `${yy}${agencyNum}${String(seq).padStart(3, '0')}`
    }

    await supabase.from('students').update({ is_approved: true, student_code }).eq('id', studentId)
  }

  const handleApprove = async (studentId: string) => {
    setApprovingId(studentId)
    await approveOne(studentId)
    setPendingStudents(prev => prev.filter(s => s.id !== studentId))
    setSelectedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
    setApprovingId(null)
    await loadStats()
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return
    setBulkApproving(true)
    for (const id of selectedIds) {
      await approveOne(id)
    }
    setPendingStudents(prev => prev.filter(s => !selectedIds.has(s.id)))
    setSelectedIds(new Set())
    setBulkApproving(false)
    await loadStats()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingStudents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingStudents.map(s => s.id)))
    }
  }

  const loadStats = async () => {
    const now   = new Date()
    const mStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const mEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [s, a, c, m] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('agencies').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('consultations').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true })
        .eq('is_active', true).gte('created_at', mStart).lte('created_at', mEnd),
    ])
    setStats({ students: s.count ?? 0, agencies: a.count ?? 0, consultations: c.count ?? 0, thisMonth: m.count ?? 0 })
  }

  const loadVisaAlert = async () => {
    const today  = new Date()
    const in90   = new Date(today); in90.setDate(today.getDate() + 90)
    const { data } = await supabase
      .from('students')
      .select('id, name_kr, name_vn, visa_expiry, student_code, status')
      .eq('is_active', true)
      .gte('visa_expiry', today.toISOString().split('T')[0])
      .lte('visa_expiry', in90.toISOString().split('T')[0])
      .order('visa_expiry', { ascending: true })
    if (data) setVisaAlert60(data as Student[])
  }

  const loadStatusBreakdown = async () => {
    const { data } = await supabase
      .from('students').select('status').eq('is_active', true)
    if (!data) return
    const map = new Map<string, number>()
    data.forEach(r => map.set(r.status, (map.get(r.status) ?? 0) + 1))
    setStatusBreakdown(STUDENT_STATUSES.map(s => ({ status: s, count: map.get(s) ?? 0 })))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const daysLeft = (expiry: string) =>
    Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)

  const urgencyStyle = (days: number) => {
    if (days <= 7)  return { badge: 'bg-red-100 text-red-600',      row: 'border border-red-100' }
    if (days <= 30) return { badge: 'bg-orange-100 text-orange-600', row: '' }
    return              { badge: 'bg-yellow-100 text-yellow-700',    row: '' }
  }

  // 3단계로 분리
  const warn7  = visaAlert60.filter(s => daysLeft(s.visa_expiry!) <= 7)
  const warn30 = visaAlert60.filter(s => { const d = daysLeft(s.visa_expiry!); return d > 7 && d <= 30 })
  const warn90 = visaAlert60.filter(s => daysLeft(s.visa_expiry!) > 30)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">{t('loading', lang)}</p></div>

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">AE</span>
            </div>
            <span className="font-bold text-slate-800">{t('appTitle', lang)}</span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle lang={lang} onToggle={toggleLang} />
            <span className="text-sm text-slate-500">{user?.name_kr}</span>
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-red-500 transition-colors">{t('logout', lang)}</button>
          </div>
        </div>
      </header>

      {/* 네비게이션 */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto">
          <Link href="/" className="py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 whitespace-nowrap">{t('navDashboard', lang)}</Link>
          <Link href="/students" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent whitespace-nowrap">{t('navStudents', lang)}</Link>
          <Link href="/reports" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent whitespace-nowrap">{t('navReports', lang)}</Link>
          {user?.role === 'master' && (
            <Link href="/agencies" className="py-3 text-sm font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent whitespace-nowrap">{t('navAgencies', lang)}</Link>
          )}
        </div>
      </nav>

      {/* 메인 */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <h2 className="text-xl font-bold text-slate-800 mb-5">{t('dashTitle', lang)}</h2>

        {/* 승인 대기 학생 — master 전용 */}
        {user?.role === 'master' && pendingStudents.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-amber-700">
                🆕 {t('pendingNew', lang)} ({pendingStudents.length}명)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-amber-700 underline hover:text-amber-900"
                >
                  {selectedIds.size === pendingStudents.length ? t('deselectAll', lang) : t('selectAll', lang)}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkApproving}
                    className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                  >
                    {bulkApproving ? t('processing', lang) : `${t('approveSelected', lang)} (${selectedIds.size}명)`}
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {pendingStudents.map(s => (
                <div key={s.id} className={`flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border transition-colors ${
                  selectedIds.has(s.id) ? 'border-blue-300 bg-blue-50' : 'border-amber-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                    />
                    <div>
                      <span className="font-medium text-slate-800 text-sm">{s.name_kr}</span>
                      <span className="text-xs text-slate-400 ml-2">{s.name_vn}</span>
                      <span className="text-xs text-slate-400 ml-2">{s.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(s.id)}
                    disabled={approvingId === s.id || bulkApproving}
                    className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg transition-colors shrink-0"
                  >
                    {approvingId === s.id ? t('processing', lang) : t('approveBtn', lang)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label={t('statStudents', lang)}  value={stats.students}      color="blue" />
          <StatCard label={t('statAgencies', lang)}  value={stats.agencies}      color="emerald" />
          <StatCard label={t('statConsults', lang)}  value={stats.consultations} color="violet" />
          <StatCard label={t('statNewMonth', lang)}  value={stats.thisMonth}     color="amber" />
        </div>

        {/* 상태별 분포 + 차트 (Feature 6) */}
        {stats.students > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('studentStatus', lang)}</h3>
            {/* 카드 그리드 */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {statusBreakdown.map(({ status, count }) => (
                <div key={status} className={`rounded-xl p-3 text-center ${STATUS_COLORS[status] ?? 'bg-slate-50 text-slate-600'}`}>
                  <p className="text-xs font-medium opacity-75 mb-1">{statusLabel(status, lang)}</p>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs opacity-60 mt-0.5">
                    {stats.students > 0 ? Math.round(count / stats.students * 100) : 0}%
                  </p>
                </div>
              ))}
            </div>
            {/* 가로 막대 차트 */}
            <div className="space-y-2">
              {statusBreakdown.map(({ status, count }) => {
                const pct = stats.students > 0 ? Math.round(count / stats.students * 100) : 0
                const barColors: Record<string, string> = {
                  '유학전': 'bg-slate-400', '어학연수': 'bg-blue-500',
                  '대학교': 'bg-violet-500', '취업': 'bg-emerald-500',
                }
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-16 text-right shrink-0">{statusLabel(status, lang)}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColors[status] ?? 'bg-slate-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-8 shrink-0">{count}명</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 비자 만료 D-7 이내 (긴급) */}
        {warn7.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-2xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-red-700 mb-3">
              {t('visa7', lang)} ({warn7.length}명)
            </h3>
            <div className="space-y-2">
              {warn7.map(s => {
                const days = daysLeft(s.visa_expiry!)
                return (
                  <Link key={s.id} href={`/students/${s.id}`}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-red-100 hover:bg-red-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800 text-sm">{s.name_kr}</span>
                      <span className="text-xs text-slate-400 hidden sm:inline">{s.student_code ?? ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 hidden sm:inline">{s.visa_expiry}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">D-{days}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* 비자 만료 D-8~D-30 (경고) */}
        {warn30.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-orange-700 mb-3">
              {t('visa30', lang)} ({warn30.length}명)
            </h3>
            <div className="space-y-2">
              {warn30.map(s => {
                const days = daysLeft(s.visa_expiry!)
                return (
                  <Link key={s.id} href={`/students/${s.id}`}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 hover:bg-orange-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800 text-sm">{s.name_kr}</span>
                      <span className="text-xs text-slate-400 hidden sm:inline">{s.student_code ?? ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 hidden sm:inline">{s.visa_expiry}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">D-{days}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* 비자 만료 D-31~D-90 (준비 시작) */}
        {warn90.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-yellow-700 mb-3">
              {t('visa90', lang)} ({warn90.length}명)
            </h3>
            <div className="space-y-2">
              {warn90.map(s => {
                const days = daysLeft(s.visa_expiry!)
                return (
                  <Link key={s.id} href={`/students/${s.id}`}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 hover:bg-yellow-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800 text-sm">{s.name_kr}</span>
                      <span className="text-xs text-slate-400 hidden sm:inline">{s.student_code ?? ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 hidden sm:inline">{s.visa_expiry}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">D-{days}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* 바로가기 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <QuickLink href="/students"     title={t('quickStudents', lang)}  desc={t('quickStudentsDesc', lang)} color="blue" />
          <QuickLink href="/students/new" title={t('quickNew', lang)}       desc={t('quickNewDesc', lang)}      color="emerald" />
          <QuickLink href="/reports"      title={t('quickReports', lang)}   desc={t('quickReportsDesc', lang)}  color="violet" />
        </div>

        {/* API 상태 패널 — master 전용 */}
        {user?.role === 'master' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">🔧 API 상태 모니터</h3>
              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 rounded-lg transition-colors font-medium"
              >
                {healthLoading ? '확인 중...' : '새로고침'}
              </button>
            </div>

            {healthLoading && !health && (
              <div className="text-center py-6 text-slate-400 text-sm">API 상태 확인 중...</div>
            )}

            {!healthLoading && !health && (
              <div className="text-center py-6 text-slate-400 text-sm">상태 정보를 불러올 수 없습니다.</div>
            )}

            {health && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${health.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {health.ok ? '✅ 전체 정상' : '❌ 일부 오류'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(health.checkedAt).toLocaleTimeString('ko-KR')} 기준
                  </span>
                </div>
                <div className="space-y-2">
                  {health.checks.map((c) => (
                    <div key={c.name} className={`flex items-center justify-between rounded-xl px-4 py-2.5 border ${
                      c.status === 'ok'   ? 'bg-emerald-50 border-emerald-100' :
                      c.status === 'warn' ? 'bg-yellow-50 border-yellow-200'  :
                                           'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '❌'}
                        </span>
                        <span className="text-sm font-medium text-slate-700">{c.name}</span>
                        {c.detail && (
                          <span className="text-xs text-slate-400 hidden sm:inline">— {c.detail}</span>
                        )}
                      </div>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                        c.status === 'ok'   ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'warn' ? 'bg-yellow-100 text-yellow-700'   :
                                             'bg-red-100 text-red-600'
                      }`}>
                        {c.ms}ms
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
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
    <div className={`rounded-2xl p-4 md:p-5 ${colors[color]}`}>
      <p className="text-xs md:text-sm font-medium opacity-70">{label}</p>
      <p className="text-2xl md:text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}

function QuickLink({ href, title, desc, color }: { href: string; title: string; desc: string; color: string }) {
  const colors: Record<string, string> = {
    blue:    'hover:border-blue-400 hover:bg-blue-50',
    emerald: 'hover:border-emerald-400 hover:bg-emerald-50',
    violet:  'hover:border-violet-400 hover:bg-violet-50',
  }
  return (
    <Link href={href} className={`block bg-white rounded-2xl p-5 border-2 border-transparent transition-all ${colors[color]}`}>
      <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500">{desc}</p>
    </Link>
  )
}
