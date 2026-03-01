'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/lib/types'
import { STATUS_COLORS, STUDENT_STATUSES } from '@/lib/constants'
import { useLang } from '@/lib/useLang'
import { t, statusLabel, monthLabel } from '@/lib/i18n'
import { useAdminAuth } from '@/lib/useAdminAuth'
import { AppLayout } from '@/components/Layout/AppLayout'

interface AgencyStat { name: string; count: number }
interface MonthStat  { month: number; count: number }
interface StatusStat { status: string; count: number }

export default function ReportsPage() {
  const { user, handleLogout } = useAdminAuth()
  const [loading, setLoading] = useState(true)
  const [total, setTotal]     = useState(0)
  const [lang, toggleLang]    = useLang()
  const [statusStats, setStatusStats]   = useState<StatusStat[]>([])
  const [agencyStats, setAgencyStats]   = useState<AgencyStat[]>([])
  const [monthStats,  setMonthStats]    = useState<MonthStat[]>([])
  const [activeTab, setActiveTab]       = useState<'stats' | 'audit'>('stats')
  const [auditLogs, setAuditLogs]       = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditTotal, setAuditTotal]     = useState(0)

  useEffect(() => {
    if (!user) return
    Promise.all([loadStatusStats(), loadAgencyStats(), loadMonthStats()])
      .then(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadAuditLogs = async () => {
    setAuditLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch('/api/audit?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setAuditLogs(json.data ?? [])
        setAuditTotal(json.count ?? 0)
      }
    } finally {
      setAuditLoading(false)
    }
  }

  const loadStatusStats = async () => {
    const { data } = await supabase.from('students').select('status').eq('is_active', true)
    if (!data) return
    setTotal(data.length)
    const map = new Map<string, number>()
    data.forEach(r => map.set(r.status, (map.get(r.status) ?? 0) + 1))
    setStatusStats(STUDENT_STATUSES.map(s => ({ status: s, count: map.get(s) ?? 0 })))
  }

  const loadAgencyStats = async () => {
    const { data } = await supabase
      .from('students')
      .select('agency:agencies(agency_name_vn, agency_name_kr)')
      .eq('is_active', true)
    if (!data) return

    const map = new Map<string, number>()
    data.forEach(r => {
      const a    = Array.isArray(r.agency) ? r.agency[0] : r.agency
      const name = a?.agency_name_vn ?? a?.agency_name_kr ?? '__unassigned__'
      map.set(name, (map.get(name) ?? 0) + 1)
    })
    const sorted = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
    setAgencyStats(sorted)
  }

  const loadMonthStats = async () => {
    const year  = new Date().getFullYear()
    const start = `${year}-01-01`
    const end   = `${year}-12-31`
    const { data } = await supabase
      .from('students')
      .select('created_at')
      .eq('is_active', true)
      .gte('created_at', start)
      .lte('created_at', end)
    if (!data) return

    const map = new Map<string, number>()
    for (let m = 1; m <= 12; m++) {
      map.set(String(m).padStart(2, '0'), 0)
    }
    data.forEach(r => {
      const m = r.created_at.slice(5, 7)
      map.set(m, (map.get(m) ?? 0) + 1)
    })
    setMonthStats([...map.entries()].map(([month, count]) => ({ month: parseInt(month), count })))
  }

  const maxAgency = Math.max(...agencyStats.map(a => a.count), 1)
  const maxMonth  = Math.max(...monthStats.map(m => m.count), 1)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">{t('loading', lang)}</p></div>

  return (
    <AppLayout user={user} lang={lang} onToggleLang={toggleLang} onLogout={handleLogout} activeNav="reports">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">{t('reportTitle', lang)}</h2>
          {user?.role === 'master' && (
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                통계
              </button>
              <button
                onClick={() => { setActiveTab('audit'); if (auditLogs.length === 0) loadAuditLogs() }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                감사 로그
              </button>
            </div>
          )}
        </div>

        {/* 감사 로그 탭 */}
        {activeTab === 'audit' && user?.role === 'master' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">감사 로그 (최근 100건 / 총 {auditTotal}건)</h3>
              <button
                onClick={loadAuditLogs}
                disabled={auditLoading}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                {auditLoading ? '로딩 중...' : '새로고침'}
              </button>
            </div>
            {auditLoading ? (
              <p className="text-slate-400 text-sm py-4 text-center">감사 로그 로딩 중...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">감사 로그가 없습니다. (DB 트리거 미적용 시 빈 화면)</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 px-2 text-slate-500 font-medium">시간</th>
                      <th className="text-left py-2 px-2 text-slate-500 font-medium">액션</th>
                      <th className="text-left py-2 px-2 text-slate-500 font-medium">테이블</th>
                      <th className="text-left py-2 px-2 text-slate-500 font-medium">사용자</th>
                      <th className="text-left py-2 px-2 text-slate-500 font-medium">역할</th>
                      <th className="text-left py-2 px-2 text-slate-500 font-medium">상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 px-2 text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            log.action === 'INSERT' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                            log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                            log.action === 'LOGIN'  ? 'bg-violet-100 text-violet-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{log.action}</span>
                        </td>
                        <td className="py-2 px-2 text-slate-600">{log.target_table ?? '-'}</td>
                        <td className="py-2 px-2 text-slate-600">{log.user_name ?? log.user_id?.slice(0, 8) ?? '-'}</td>
                        <td className="py-2 px-2 text-slate-500">{log.user_role ?? '-'}</td>
                        <td className="py-2 px-2 text-slate-400 max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details).slice(0, 60) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 통계 탭 */}
        {(activeTab === 'stats' || user?.role !== 'master') && (
        <><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          {/* 상태별 분포 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('statsByStatus', lang)}</h3>
            <div className="space-y-3">
              {statusStats.map(({ status, count }) => {
                const pct = total > 0 ? Math.round(count / total * 100) : 0
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{statusLabel(status, lang)}</span>
                      <span className="text-slate-500">{count}명 ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor(status)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-slate-400 mt-4 text-right">{t('totalN', lang)} {total}명</p>
          </div>

          {/* 월별 등록 추이 (올해) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('monthlyTrend', lang)} ({new Date().getFullYear()})</h3>
            <div className="flex items-end gap-1 h-36">
              {monthStats.map(({ month, count }) => {
                const pct = maxMonth > 0 ? Math.round(count / maxMonth * 100) : 0
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-slate-500">{count > 0 ? count : ''}</span>
                    <div className="w-full bg-slate-100 rounded-t-md overflow-hidden" style={{ height: '96px' }}>
                      <div
                        className="w-full bg-blue-400 rounded-t-md transition-all duration-500"
                        style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{monthLabel(month, lang)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 유학원별 학생 수 */}
        {agencyStats.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('statsByAgency', lang)}</h3>
            <div className="space-y-2.5">
              {agencyStats.map(({ name, count }) => {
                const pct = Math.round(count / maxAgency * 100)
                const displayName = name === '__unassigned__' ? t('unassigned', lang) : name
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-36 shrink-0 truncate">{displayName}</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </>
        )}
      </main>
    </AppLayout>
  )
}

function barColor(status: string): string {
  const map: Record<string, string> = {
    '유학전':   'bg-slate-400',
    '어학연수': 'bg-blue-400',
    '대학교':   'bg-violet-400',
    '취업':     'bg-emerald-400',
  }
  return map[status] ?? 'bg-slate-300'
}
