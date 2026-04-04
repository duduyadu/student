import { getServiceClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabaseAdmin = getServiceClient()
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }
  const role = (user.app_metadata as { role?: string })?.role
  if (role !== 'master') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const { studentIds } = await req.json() as { studentIds: string[] }
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: 'studentIds 배열이 필요합니다.' }, { status: 400 })
  }

  const now = new Date()
  const yy = now.getFullYear().toString().slice(-2)
  const yearStart = `${now.getFullYear()}-01-01`
  const yearEnd   = `${now.getFullYear()}-12-31`

  const results: { id: string; student_code: string }[] = []
  const errors: { id: string; error: string }[] = []

  for (const studentId of studentIds) {
    try {
      // 학생 + 유학원 정보 조회
      const { data: stu } = await supabaseAdmin
        .from('students')
        .select('agency_id, is_approved')
        .eq('id', studentId)
        .single()

      if (!stu) { errors.push({ id: studentId, error: '학생을 찾을 수 없습니다.' }); continue }
      if (stu.is_approved) { errors.push({ id: studentId, error: '이미 승인된 학생입니다.' }); continue }

      let agencyNum = '000'
      if (stu.agency_id) {
        const { data: ag } = await supabaseAdmin
          .from('agencies')
          .select('agency_number')
          .eq('id', stu.agency_id)
          .single()
        if (ag) agencyNum = String(ag.agency_number).padStart(3, '0')
      }

      // 해당 유학원 + 해당 연도 승인 학생 수 조회
      const { count } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', stu.agency_id ?? '')
        .eq('is_approved', true)
        .gte('created_at', yearStart)
        .lte('created_at', yearEnd)

      // 고유 코드 생성 (충돌 시 seq 증가)
      let seq = (count ?? 0) + 1
      let student_code = `${yy}${agencyNum}${String(seq).padStart(3, '0')}`
      let attempts = 0

      while (attempts < 20) {
        const { data: collision } = await supabaseAdmin
          .from('students')
          .select('id')
          .eq('student_code', student_code)
          .maybeSingle()
        if (!collision) break
        seq++
        attempts++
        student_code = `${yy}${agencyNum}${String(seq).padStart(3, '0')}`
      }

      const { error: updateErr } = await supabaseAdmin
        .from('students')
        .update({ is_approved: true, student_code })
        .eq('id', studentId)
        .eq('is_approved', false) // 레이스 컨디션 방지: 이미 승인된 경우 무시

      if (updateErr) {
        errors.push({ id: studentId, error: updateErr.message })
      } else {
        results.push({ id: studentId, student_code })
        // 감사 로그 (CUD 필수 규칙)
        await supabaseAdmin.from('audit_logs').insert({
          action: 'APPROVE_STUDENT',
          user_id: user.id,
          user_role: role,
          target_table: 'students',
          target_id: studentId,
          details: { student_code },
        })
      }
    } catch (e) {
      errors.push({ id: studentId, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({ approved: results, errors })
}
