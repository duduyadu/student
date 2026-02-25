import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { DocStatus } from '@/lib/types'
import { sendDocStatusEmail } from '@/lib/email'

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
  const { data: { user } } = await getServiceClient().auth.getUser(token)
  return user
}

/**
 * PATCH /api/student-documents/[id]
 * 역할별 수정 가능 필드 제한
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role: string = (user.app_metadata?.role as string) ?? ''
  const userId = user.id

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { data: doc } = await supabase
    .from('student_documents')
    .select('id, student_id, status, reject_reason')
    .eq('id', id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Record<string, unknown> = {}

  if (role === 'student') {
    const { data: stu } = await supabase
      .from('students').select('id').eq('id', doc.student_id).eq('auth_user_id', userId).single()
    if (!stu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if ('self_checked' in body) updates.self_checked = Boolean(body.self_checked)
    if (body.self_checked)      updates.self_checked_at = new Date().toISOString()
    if (body.status === 'submitted' && doc.status === 'pending') {
      updates.status       = 'submitted'
      updates.submitted_at = new Date().toISOString()
    }
    if ('expiry_date' in body) updates.expiry_date = body.expiry_date
    if ('file_url'    in body) updates.file_url    = body.file_url
    if ('file_name'   in body) updates.file_name   = body.file_name

  } else if (role === 'agency' || role === 'master') {
    if (role === 'agency') {
      const { data: agency } = await supabase
        .from('agencies').select('id').eq('user_id', userId).single()
      if (!agency) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const { data: stu } = await supabase
        .from('students').select('id').eq('id', doc.student_id).eq('agency_id', agency.id).single()
      if (!stu) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedStatuses: DocStatus[] = ['pending','submitted','reviewing','approved','rejected']
    if ('status' in body && allowedStatuses.includes(body.status as DocStatus)) {
      updates.status      = body.status
      updates.reviewer_id = userId
      updates.reviewed_at = new Date().toISOString()
      if (body.status === 'submitted' && !doc.status.includes('submitted')) {
        updates.submitted_at = new Date().toISOString()
      }
    }
    if ('reviewer_name' in body) updates.reviewer_name = body.reviewer_name
    if ('reject_reason' in body) updates.reject_reason = body.reject_reason
    if ('notes'         in body) updates.notes         = body.notes
    if ('expiry_date'   in body) updates.expiry_date   = body.expiry_date
    if ('file_url'      in body) updates.file_url      = body.file_url
    if ('file_name'     in body) updates.file_name     = body.file_name

  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('student_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 승인/반려 시 이메일 발송 (비동기, 실패해도 무시)
  const newStatus = updates.status as DocStatus | undefined
  if (newStatus === 'approved' || newStatus === 'rejected') {
    supabase
      .from('students')
      .select('name_kr, email')
      .eq('id', doc.student_id)
      .single()
      .then(({ data: student }) => {
        if (!student?.email) return
        supabase
          .from('student_documents')
          .select('doc_type:document_types(name_kr)')
          .eq('id', id)
          .single()
          .then(({ data: docWithType }) => {
            const docName = (docWithType?.doc_type as any)?.name_kr ?? '서류'
            sendDocStatusEmail({
              to:           student.email!,
              studentName:  student.name_kr,
              docNameKr:    docName,
              status:       newStatus,
              rejectReason: updates.reject_reason as string | undefined,
            })
          })
      })
  }

  return NextResponse.json(updated)
}
