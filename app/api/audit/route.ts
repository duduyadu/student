import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

// POST /api/audit — 감사 로그 기록 (LOGIN/LOGOUT 등 앱 레벨 이벤트)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action: string
      user_id?: string
      user_role?: string
      user_name?: string
      target_table?: string
      target_id?: string
      details?: Record<string, unknown>
    }

    if (!body.action) {
      return NextResponse.json({ error: 'action 필드가 필요합니다' }, { status: 400 })
    }

    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

    const { error } = await serviceClient()
      .from('audit_logs')
      .insert({
        action:       body.action,
        user_id:      body.user_id      ?? null,
        user_role:    body.user_role    ?? null,
        user_name:    body.user_name    ?? null,
        target_table: body.target_table ?? null,
        target_id:    body.target_id    ?? null,
        details:      body.details      ?? null,
        ip_address:   ip,
      })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET /api/audit — 감사 로그 조회 (master 전용)
export async function GET(req: NextRequest) {
  try {
    // Bearer 토큰으로 호출자 역할 확인
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }

    // 토큰으로 사용자 정보 조회
    const { data: { user }, error: authErr } = await serviceClient().auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }
    if ((user.app_metadata as { role?: string })?.role !== 'master') {
      return NextResponse.json({ error: '권한 없음 (master 전용)' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '100'), 500)
    const offset = parseInt(searchParams.get('offset') ?? '0')
    const action = searchParams.get('action')
    const table  = searchParams.get('table')

    let query = serviceClient()
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) query = query.eq('action', action)
    if (table)  query = query.eq('target_table', table)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({ data, count })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
