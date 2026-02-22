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
  if (authErr || !caller || (caller.app_metadata as any)?.role !== 'master') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { email, password, agency_id, agency_code, agency_name_kr } = await req.json()

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

  // 첫 번째 계정이면 agencies.user_id 업데이트
  if (agency_id) {
    const { data: ag } = await supabaseAdmin
      .from('agencies')
      .select('user_id')
      .eq('id', agency_id)
      .single()
    if (!ag?.user_id) {
      await supabaseAdmin.from('agencies').update({ user_id: data.user.id }).eq('id', agency_id)
    }
  }

  return NextResponse.json({ user_id: data.user.id })
}
