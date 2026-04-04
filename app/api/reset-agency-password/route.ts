import { getServiceClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabaseAdmin = getServiceClient()
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !caller || (caller.app_metadata as { role?: string })?.role !== 'master') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { user_id, new_password } = await req.json()
  if (!user_id || !new_password || new_password.length < 8) {
    return NextResponse.json({ error: '유저 ID와 8자 이상 비밀번호가 필요합니다.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
    password: new_password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 감사 로그 (CUD 필수 규칙)
  await supabaseAdmin.from('audit_logs').insert({
    action: 'RESET_AGENCY_PASSWORD',
    user_id: caller.id,
    user_role: 'master',
    target_table: 'auth.users',
    target_id: user_id,
  })

  return NextResponse.json({ success: true })
}
