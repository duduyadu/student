import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabaseServer'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface CheckResult {
  name:    string
  status:  'ok' | 'error' | 'warn'
  ms:      number
  detail?: string
}

async function measure<T>(fn: () => Promise<T>): Promise<{ result?: T; ms: number; error?: string }> {
  const start = Date.now()
  try {
    const result = await fn()
    return { result, ms: Date.now() - start }
  } catch (err) {
    return { ms: Date.now() - start, error: String(err instanceof Error ? err.message : err) }
  }
}

export async function GET() {
  const checks: CheckResult[] = []

  // ── 1. Supabase DB ─────────────────────────────────────────
  {
    const { ms, error } = await measure(async () => {
      const sb = getServiceClient()
      const { error } = await sb.from('students').select('id', { count: 'exact', head: true })
      if (error) throw new Error(error.message)
    })
    checks.push({
      name:   'Supabase DB',
      status: error ? 'error' : ms > 2000 ? 'warn' : 'ok',
      ms,
      detail: error ?? (ms > 2000 ? '응답 느림' : undefined),
    })
  }

  // ── 2. Gemini AI ─────────────────────────────────────────────
  {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      checks.push({ name: 'Gemini AI', status: 'error', ms: 0, detail: 'GEMINI_API_KEY 미설정' })
    } else {
      const { ms, error } = await measure(async () => {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        await model.generateContent('ping')
      })
      checks.push({
        name:   'Gemini AI',
        status: error ? 'error' : ms > 5000 ? 'warn' : 'ok',
        ms,
        detail: error ?? (ms > 5000 ? '응답 느림' : undefined),
      })
    }
  }

  // ── 3. API 라우트 (HEAD 요청으로 존재 확인) ──────────────────
  const routes = [
    { name: 'PDF 생성 API',       path: '/api/life-record-pdf?studentId=health-check' },
    { name: 'Excel 업로드 API',   path: '/api/mock-exam-import' },
    { name: 'AI 분석 API',        path: '/api/exam-ai-analysis?studentId=health-check' },
    { name: '비자 알림 Cron',     path: '/api/cron/visa-alerts' },
  ]

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  for (const route of routes) {
    const { ms, result, error } = await measure(async () => {
      const res = await fetch(`${base}${route.path}`, { method: 'GET', signal: AbortSignal.timeout(5000) })
      // 400/404는 라우트가 살아있어도 파라미터 부족으로 나올 수 있음 → warn
      return res.status
    })
    const status = checks.find(c => c.status === 'error') ? 'ok' : (
      error ? 'error' :
      result === 200 ? 'ok' :
      result === 400 || result === 404 || result === 500 ? 'warn' : 'ok'
    )
    checks.push({
      name:   route.name,
      status: error ? 'error' : result === 200 ? 'ok' : 'warn',
      ms,
      detail: error ? error.slice(0, 80) : result !== 200 ? `HTTP ${result} (라우트 정상)` : undefined,
    })
  }

  const allOk = checks.every(c => c.status !== 'error')

  // detail 필드 제거 — 내부 오류 메시지/API 키 상태 외부 노출 방지
  return NextResponse.json({
    ok:        allOk,
    checkedAt: new Date().toISOString(),
    checks:    checks.map(({ name, status, ms }) => ({ name, status, ms })),
  })
}
