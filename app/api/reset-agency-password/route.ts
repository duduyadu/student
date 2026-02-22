import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !caller || (caller.user_metadata as any)?.role !== 'master') {
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

  return NextResponse.json({ success: true })
}
