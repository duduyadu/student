import { getServiceClient, getAnonClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authErr } = await getAnonClient().auth.getUser(token)
  const supabaseAdmin = getServiceClient()
  if (authErr || !user) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  // 본인 학생 레코드 비활성화
  const { data: student, error } = await supabaseAdmin
    .from('students')
    .update({ is_active: false })
    .eq('auth_user_id', user.id)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  }

  // 감사 로그 기록 (CLAUDE.md: 모든 CUD 작업 필수)
  supabaseAdmin.from('audit_logs').insert({
    action: 'WITHDRAW',
    user_id: user.id,
    user_role: 'student',
    target_table: 'students',
    target_id: student?.id ?? null,
    details: { reason: 'self_withdrawal' },
  })

  return NextResponse.json({ success: true })
}
