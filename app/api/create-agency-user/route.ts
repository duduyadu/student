import { getServiceClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = getServiceClient()

export async function POST(req: NextRequest) {
  // ── 1. 호출자 인증 확인 ─────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !caller) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }
  const callerRole = (caller.app_metadata as { role?: string })?.role
  if (callerRole !== 'master') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  // ── 2. 유학원 계정 생성 ─────────────────────────────────────────
  const { email, password, agency_code, agency_name_kr } = await req.json()

  if (!email || !password || !agency_code) {
    return NextResponse.json({ error: '이메일, 비밀번호, 유학원 코드는 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name_kr: agency_name_kr ?? agency_code },
    app_metadata:  { role: 'agency', agency_code },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user_id: data.user.id })
}
