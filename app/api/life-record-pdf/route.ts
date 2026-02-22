import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import LifeRecordDocument from '@/components/pdf/LifeRecordDocument'
import type { LifeRecordData } from '@/components/pdf/LifeRecordDocument'
import React from 'react'
import type { ReactElement, JSXElementConstructor } from 'react'

// 서버 전용 Supabase 클라이언트 (RLS 우회, 서버에서만 사용)
function getServiceClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const studentId = searchParams.get('studentId')

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }

  const supabase = getServiceClient()

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
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(LifeRecordDocument, data) as unknown as ReactElement<DocumentProps, JSXElementConstructor<DocumentProps>>
    const buffer  = await renderToBuffer(element)

    const filename = `생활기록부_${student.name_kr}_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (err) {
    console.error('[life-record-pdf] renderToBuffer error:', err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    )
  }
}
