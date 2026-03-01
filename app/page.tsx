'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { Student } from '@/lib/types'
import { STATUS_COLORS, STUDENT_STATUSES } from '@/lib/constants'
import Link from 'next/link'
import { useLang } from '@/lib/useLang'
import { t, statusLabel } from '@/lib/i18n'
import { useAdminAuth } from '@/lib/useAdminAuth'
import { AppLayout } from '@/components/Layout/AppLayout'

// recharts — SSR 비활성화
const {
  PieChart, Pie, Cell, Tooltip: ReTooltip, ResponsiveContainer,
} = {
  PieChart:           dynamic(() => import('recharts').then(m => ({ default: m.PieChart          })), { ssr: false }),
  Pie:                dynamic(() => import('recharts').then(m => ({ default: m.Pie               })), { ssr: false }),
  Cell:               dynamic(() => import('recharts').then(m => ({ default: m.Cell              })), { ssr: false }),
  Tooltip:            dynamic(() => import('recharts').then(m => ({ default: m.Tooltip           })), { ssr: false }),
  ResponsiveContainer: dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false }),
} as const

interface StatusCount { status: string; count: number }

interface DocStats {
  pending: number
  submitted: number
  reviewing: number
  approved: number
  rejected: number
}

interface TopikDist { name: string; value: number; color: string }

interface ActivityItem {
  type: 'student' | 'consult'
  label: string
  sub: string
  at: string
  href: string
}

interface HealthCheck {
  name: string; status: 'ok' | 'error' | 'warn'; ms: number; detail?: string
}
interface HealthResult {
  ok: boolean; checkedAt: string; checks: HealthCheck[]
}

export default function DashboardPage() {
  const { user, handleLogout } = useAdminAuth()
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
  const [docStats, setDocStats]     = useState<DocStats | null>(null)
  const [topikDist, setTopikDist]   = useState<TopikDist[]>([])
  const [recentAct, setRecentAct]   = useState<ActivityItem[]>([])

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

  useEffect(() => {
    if (!user) return
    Promise.all([loadStats(), loadVisaAlert(), loadStatusBreakdown(), loadPendingStudents(), loadDocStats(), loadTopikDist(), loadRecentActivity()])
      .then(() => {
        setLoading(false)
        if (user.role === 'master') fetchHealth()
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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

  const loadDocStats = async () => {
    const { data } = await supabase
      .from('student_documents')
      .select('status, student:students!inner(is_active)')
      .eq('student.is_active', true)
    if (!data) return
    const counts = { pending: 0, submitted: 0, reviewing: 0, approved: 0, rejected: 0 }
    data.forEach(r => {
      const s = r.status as keyof typeof counts
      if (s in counts) counts[s]++
    })
    setDocStats(counts)
  }

  const loadTopikDist = async () => {
    // 각 학생의 최신 exam_results.level 집계
    const { data } = await supabase
      .from('exam_results')
      .select('student_id, level, exam_date')
      .order('exam_date', { ascending: false })
    if (!data) return

    // 학생별 최신 성적만 추출
    const latest = new Map<string, string>()
    data.forEach(r => {
      if (!latest.has(r.student_id)) latest.set(r.student_id, r.level as string)
    })

    const counts = { none: 0, lv1: 0, lv2: 0 }
    const { data: students } = await supabase
      .from('students').select('id').eq('is_active', true)
    if (!students) return

    students.forEach(s => {
      const lv = latest.get(s.id)
      if (!lv || lv === '불합격') counts.none++
      else if (lv === '1급') counts.lv1++
      else counts.lv2++
    })

    setTopikDist([
      { name: '미취득', value: counts.none, color: '#CBD5E1' },
      { name: '1급',    value: counts.lv1,  color: '#60A5FA' },
      { name: '2급+',   value: counts.lv2,  color: '#34D399' },
    ])
  }

  const loadRecentActivity = async () => {
    const [consults, newStudents] = await Promise.all([
      supabase.from('consultations')
        .select('id, student_id, content, created_at, student:students(name_kr)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('students')
        .select('id, name_kr, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const items: ActivityItem[] = []

    consults.data?.forEach(c => {
      const stu = Array.isArray(c.student) ? c.student[0] : c.student
      items.push({
        type: 'consult',
        label: t('actConsult', 'ko'),
        sub: (stu as { name_kr: string } | null)?.name_kr ?? '-',
        at: c.created_at,
        href: `/students/${c.student_id}`,
      })
    })

    newStudents.data?.forEach(s => {
      items.push({
        type: 'student',
        label: t('actNewStudent', 'ko'),
        sub: s.name_kr,
        at: s.created_at,
        href: `/students/${s.id}`,
      })
    })

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    setRecentAct(items.slice(0, 8))
  }

  const loadStatusBreakdown = async () => {
    const { data } = await supabase
      .from('students').select('status').eq('is_active', true)
    if (!data) return
    const map = new Map<string, number>()
    data.forEach(r => map.set(r.status, (map.get(r.status) ?? 0) + 1))
    setStatusBreakdown(STUDENT_STATUSES.map(s => ({ status: s, count: map.get(s) ?? 0 })))
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
    <AppLayout user={user} lang={lang} onToggleLang={toggleLang} onLogout={handleLogout} activeNav="dashboard">
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
                      <span className="text-xs text-slate-400 ml-2">{statusLabel(s.status, lang)}</span>
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
          <StatCard label={t('statStudents', lang)}  value={stats.students}                  color="blue" />
          <StatCard label={t('statNewMonth', lang)}  value={stats.thisMonth}                 color="emerald" />
          <StatCard label={t('statVisa30', lang)}    value={warn7.length + warn30.length}    color="amber" />
          <StatCard label={t('statRejected', lang)}  value={docStats?.rejected ?? 0}         color="red" />
        </div>

        {/* TOPIK 등급 분포 + 최근 활동 피드 (2열 그리드) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* TOPIK 도넛 차트 */}
          {topikDist.length > 0 && topikDist.some(d => d.value > 0) && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                📊 {t('topikDistTitle', lang)}
              </h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topikDist.filter(d => d.value > 0)}
                      cx="40%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {topikDist.filter(d => d.value > 0).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip formatter={(v, name) => [`${v}명`, String(name)]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 justify-center mt-1">
                {topikDist.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-slate-600">{lang === 'ko' ? d.name : (d.name === '미취득' ? t('topikNone', lang) : d.name === '1급' ? t('topikLevel1', lang) : t('topikLevel2', lang))} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 최근 활동 피드 */}
          {recentAct.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                🕐 {t('recentActTitle', lang)}
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-52">
                {recentAct.map((item, i) => (
                  <Link key={i} href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors">
                    <span className={`text-base ${item.type === 'consult' ? 'text-violet-500' : 'text-blue-500'}`}>
                      {item.type === 'consult' ? '💬' : '🆕'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{item.sub}</p>
                      <p className="text-[10px] text-slate-400">{item.label} · {new Date(item.at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 서류 현황 카드 */}
        {docStats !== null && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">
                📋 {t('docStatusTitle', lang)}
              </h3>
              <Link href="/students" className="text-xs text-blue-500 hover:text-blue-700">
                {t('quickStudents', lang)} →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              <DocStatItem
                label={t('docPending', lang)}
                value={docStats.pending}
                bg="bg-slate-50" text="text-slate-600" bar="bg-slate-400"
                total={docStats.pending + docStats.submitted + docStats.reviewing + docStats.approved + docStats.rejected}
              />
              <DocStatItem
                label={t('docSubmitted', lang)}
                value={docStats.submitted}
                bg="bg-blue-50" text="text-blue-700" bar="bg-blue-500"
                total={docStats.pending + docStats.submitted + docStats.reviewing + docStats.approved + docStats.rejected}
              />
              <DocStatItem
                label={t('docReviewing', lang)}
                value={docStats.reviewing}
                bg="bg-amber-50" text="text-amber-700" bar="bg-amber-400"
                total={docStats.pending + docStats.submitted + docStats.reviewing + docStats.approved + docStats.rejected}
              />
              <DocStatItem
                label={t('docApproved', lang)}
                value={docStats.approved}
                bg="bg-emerald-50" text="text-emerald-700" bar="bg-emerald-500"
                total={docStats.pending + docStats.submitted + docStats.reviewing + docStats.approved + docStats.rejected}
              />
              <DocStatItem
                label={t('docRejected', lang)}
                value={docStats.rejected}
                bg="bg-red-50" text="text-red-600" bar="bg-red-400"
                total={docStats.pending + docStats.submitted + docStats.reviewing + docStats.approved + docStats.rejected}
              />
            </div>
            {/* 통합 진행 바 */}
            {(() => {
              const total = docStats.pending + docStats.submitted + docStats.reviewing + docStats.approved + docStats.rejected
              if (total === 0) return null
              const approvedPct  = Math.round(docStats.approved  / total * 100)
              const reviewingPct = Math.round(docStats.reviewing / total * 100)
              const submittedPct = Math.round(docStats.submitted / total * 100)
              const rejectedPct  = Math.round(docStats.rejected  / total * 100)
              return (
                <div className="mt-4">
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 gap-0.5">
                    {approvedPct  > 0 && <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${approvedPct}%` }} />}
                    {reviewingPct > 0 && <div className="bg-amber-400  transition-all duration-500" style={{ width: `${reviewingPct}%` }} />}
                    {submittedPct > 0 && <div className="bg-blue-500   transition-all duration-500" style={{ width: `${submittedPct}%` }} />}
                    {rejectedPct  > 0 && <div className="bg-red-400    transition-all duration-500" style={{ width: `${rejectedPct}%` }} />}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">{t('docTotalLabel', lang)} {total}{t('docCountUnit', lang)}</span>
                    <span className="text-xs text-emerald-600 font-medium">{t('docApprovalLabel', lang)} {approvedPct}%</span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* 상태별 분포 + 차트 (Feature 6) */}
        {stats.students > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('studentStatus', lang)}</h3>
            {/* 카드 그리드 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
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
    </AppLayout>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet:  'bg-violet-50 text-violet-700',
    amber:   'bg-amber-50 text-amber-700',
    red:     'bg-red-50 text-red-600',
  }
  return (
    <div className={`rounded-2xl p-4 md:p-5 ${colors[color]}`}>
      <p className="text-xs md:text-sm font-medium opacity-70">{label}</p>
      <p className="text-2xl md:text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}

function DocStatItem({ label, value, bg, text, bar, total }: {
  label: string; value: number; bg: string; text: string; bar: string; total: number
}) {
  const pct = total > 0 ? Math.round(value / total * 100) : 0
  return (
    <div className={`rounded-xl p-3 ${bg} text-center`}>
      <p className={`text-xs font-medium ${text} opacity-75 mb-1 truncate`}>{label}</p>
      <p className={`text-2xl font-bold ${text}`}>{value}</p>
      <div className="mt-2 h-1 bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs ${text} opacity-60 mt-0.5`}>{pct}%</p>
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
