import { getServiceClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = getServiceClient()

// GET /api/agency-accounts?user_ids=id1,id2,...
// master 전용 — 유학원 계정 이메일 목록 반환
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !caller || (caller.app_metadata as any)?.role !== 'master') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const ids = req.nextUrl.searchParams.get('user_ids')
  if (!ids) return NextResponse.json({})

  const userIds = ids.split(',').filter(Boolean)
  const emailMap: Record<string, string> = {}

  await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid)
      if (data?.user?.email) emailMap[uid] = data.user.email
    })
  )

  return NextResponse.json(emailMap)
}
