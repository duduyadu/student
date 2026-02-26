import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import LifeRecordDocument from '@/components/pdf/LifeRecordDocument'
import type { LifeRecordData } from '@/components/pdf/LifeRecordDocument'
import React from 'react'
import type { ReactElement, JSXElementConstructor } from 'react'
import { getServiceClient, getAnonClient } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  // 인증 검증
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const anonClient = getAnonClient()
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const studentId = searchParams.get('studentId')
  const lang = (searchParams.get('lang') ?? 'ko') as 'ko' | 'vi'

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }

  // 역할 기반 소속 검증 (agency는 자기 학생만)
  const role = (user.app_metadata as { role?: string })?.role ?? 'agency'
  const agencyCode = (user.app_metadata as { agency_code?: string })?.agency_code
  const supabase = getServiceClient()
  if (role === 'agency' && agencyCode) {
    const { data: st } = await supabase.from('students').select('agency_code').eq('id', studentId).single()
    if (!st || st.agency_code !== agencyCode) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // 병렬 데이터 로드
  const [
    { data: student },
    { data: consultations },
    { data: evaluations },
    { data: examResults },
    { data: aspirationHistory },
    { data: templates },
  ] = await Promise.all([
    supabase.from('students').select('*').eq('id', studentId).single(),
    supabase.from('consultations').select('*')
      .eq('student_id', studentId)
      .eq('is_public', true)
      .order('consult_date', { ascending: true }),
    supabase.from('teacher_evaluations').select('*')
      .eq('student_id', studentId)
      .eq('is_public', true)
      .order('eval_date', { ascending: true }),
    supabase.from('exam_results').select('*')
      .eq('student_id', studentId)
      .order('exam_date', { ascending: true }),
    supabase.from('aspiration_history').select('*')
      .eq('student_id', studentId)
      .order('changed_date', { ascending: true }),
    supabase.from('evaluation_templates').select('field_key, label_kr, max_value')
      .eq('is_active', true)
      .eq('field_type', 'rating')
      .order('sort_order'),
  ])

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const now = new Date()
  const generatedAt = now.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const data: LifeRecordData = {
    student,
    consultations:     consultations ?? [],
    evaluations:       evaluations   ?? [],
    examResults:       examResults   ?? [],
    aspirationHistory: aspirationHistory ?? [],
    templates:         templates ?? [],
    generatedAt,
    lang,
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(LifeRecordDocument, data) as unknown as ReactElement<DocumentProps, JSXElementConstructor<DocumentProps>>
    const buffer  = await renderToBuffer(element)

    const dateSuffix = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
    const filename = lang === 'vi'
      ? `생활기록부VI_${student.name_kr}_${dateSuffix}.pdf`
      : `생활기록부_${student.name_kr}_${dateSuffix}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (err) {
    console.error('[life-record-pdf] renderToBuffer error:', err)
    return NextResponse.json({ error: 'PDF 생성 실패' }, { status: 500 })
  }
}
