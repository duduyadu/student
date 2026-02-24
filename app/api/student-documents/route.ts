import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getAuthedUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
  if (!token) return null
  const supabase = getServiceClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

/**
 * GET /api/student-documents?studentId=xxx
 * 학생의 서류 체크리스트 조회. 미생성 서류는 pending으로 자동 upsert.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const studentId = searchParams.get('studentId')

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }

  const user = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role: string = (user.app_metadata?.role as string) ?? ''
  const userId = user.id
  const supabase = getServiceClient()

  // 권한 검증
  if (role === 'student') {
    const { data: stu } = await supabase
      .from('students').select('id').eq('id', studentId).eq('auth_user_id', userId).single()
    if (!stu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (role === 'agency') {
    const { data: agency } = await supabase
      .from('agencies').select('id').eq('user_id', userId).single()
    if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data: stu } = await supabase
      .from('students').select('id').eq('id', studentId).eq('agency_id', agency.id).single()
    if (!stu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (role !== 'master') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 학생 비자 타입 조회
  const { data: student } = await supabase
    .from('students').select('visa_type').eq('id', studentId).single()
  const visaType = student?.visa_type ?? ''

  // 적용 가능한 document_types 조회
  const { data: docTypes } = await supabase
    .from('document_types').select('*').eq('is_active', true).order('sort_order')

  const applicableTypes = (docTypes ?? []).filter((dt) => {
    if (!dt.visa_types || dt.visa_types.length === 0) return true
    return visaType && dt.visa_types.includes(visaType)
  })

  // 기존 서류 현황 조회
  const { data: existing } = await supabase
    .from('student_documents').select('*').eq('student_id', studentId)
  const existingMap = new Map((existing ?? []).map((d) => [d.doc_type_id, d]))

  // 없는 서류 pending으로 upsert
  const toInsert = applicableTypes
    .filter((dt) => !existingMap.has(dt.id))
    .map((dt) => ({ student_id: studentId, doc_type_id: dt.id, status: 'pending' }))

  if (toInsert.length > 0) {
    await supabase.from('student_documents').insert(toInsert)
    const { data: fresh } = await supabase
      .from('student_documents').select('*').eq('student_id', studentId)
    ;(fresh ?? []).forEach((d) => existingMap.set(d.doc_type_id, d))
  }

  const result = applicableTypes.map((dt) => ({
    ...(existingMap.get(dt.id) ?? { student_id: studentId, doc_type_id: dt.id, status: 'pending' }),
    doc_type: dt,
  }))

  return NextResponse.json(result)
}
