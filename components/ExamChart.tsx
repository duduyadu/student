'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { ExamResult } from '@/lib/types'

// recharts는 클라이언트 전용 → dynamic import
const {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} = {
  ResponsiveContainer:  dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer  })), { ssr: false }),
  LineChart:            dynamic(() => import('recharts').then(m => ({ default: m.LineChart            })), { ssr: false }),
  Line:                 dynamic(() => import('recharts').then(m => ({ default: m.Line                })), { ssr: false }),
  XAxis:                dynamic(() => import('recharts').then(m => ({ default: m.XAxis               })), { ssr: false }),
  YAxis:                dynamic(() => import('recharts').then(m => ({ default: m.YAxis               })), { ssr: false }),
  CartesianGrid:        dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid       })), { ssr: false }),
  Tooltip:              dynamic(() => import('recharts').then(m => ({ default: m.Tooltip             })), { ssr: false }),
  Legend:               dynamic(() => import('recharts').then(m => ({ default: m.Legend              })), { ssr: false }),
} as const

export type ChartLevel = 'trend' | 'ai'

interface Props {
  exams: ExamResult[]
  chartLevel?: ChartLevel
  aiAnalysis?: string   // Sprint 4: AI 분석 텍스트
}

// 시험을 날짜 오름차순으로 정렬해 회차 라벨 부여
function toChartData(exams: ExamResult[]) {
  return [...exams]
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))
    .map((e, i) => ({
      name:    `${i + 1}회차`,
      date:    e.exam_date,
      total:   e.total_score,
      reading: e.reading_score   ?? null,
      listen:  e.listening_score ?? null,
      level:   e.level,
    }))
}

// ── 추이 차트 ──────────────────────────────────
function TrendChart({ data }: { data: ReturnType<typeof toChartData> }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-700 mb-4">총점 추이</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 200]} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(val, name) => [
              val,
              name === 'total' ? '총점' : name === 'reading' ? '읽기' : '듣기',
            ]}
            labelFormatter={(label, payload) => {
              const d = (payload as { payload?: { date?: string } }[])?.[0]?.payload?.date
              return `${label}${d ? ` (${d})` : ''}`
            }}
          />
          <Legend formatter={v => v === 'total' ? '총점' : v === 'reading' ? '읽기' : '듣기'} />
          <Line type="monotone" dataKey="total"   stroke="#3949AB" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="reading" stroke="#43A047" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="listen"  stroke="#FB8C00" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────
export default function ExamChart({ exams, chartLevel = 'trend', aiAnalysis }: Props) {
  const data = useMemo(() => toChartData(exams), [exams])

  if (exams.length === 0) return null

  return (
    <div className="space-y-4">
      {/* trend: 항상 표시 */}
      <TrendChart data={data} />

      {/* ai: AI 분석 텍스트 */}
      {chartLevel === 'ai' && aiAnalysis && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-indigo-600 text-sm font-semibold">AI 성적 분석</span>
            <span className="text-xs bg-indigo-100 text-indigo-500 px-2 py-0.5 rounded-full">Gemini</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
        </div>
      )}
    </div>
  )
}
