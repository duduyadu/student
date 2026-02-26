import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import JSZip from 'jszip'
import LifeRecordDocument from '@/components/pdf/LifeRecordDocument'
import type { LifeRecordData } from '@/components/pdf/LifeRecordDocument'
import React from 'react'
import type { ReactElement, JSXElementConstructor } from 'react'
import { getServiceClient, getAnonClient } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchStudentData(supabase: any, studentId: string) {
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
  return { student, consultations, evaluations, examResults, aspirationHistory, templates }
}

async function generatePdfBuffer(data: LifeRecordData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(LifeRecordDocument, data) as unknown as ReactElement<DocumentProps, JSXElementConstructor<DocumentProps>>
  return renderToBuffer(element)
}

export async function POST(req: NextRequest) {
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

  let body: { studentIds?: string[]; lang?: 'ko' | 'vi' | 'both' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { studentIds, lang = 'both' } = body

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: 'studentIds is required' }, { status: 400 })
  }
  if (studentIds.length > 50) {
    return NextResponse.json({ error: '최대 50명까지 일괄 다운로드 가능합니다.' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // 역할 기반 소속 검증 (agency는 자기 학생만 필터링)
  const role = (user.app_metadata as { role?: string })?.role ?? 'agency'
  const agencyCode = (user.app_metadata as { agency_code?: string })?.agency_code
  let allowedIds = studentIds
  if (role === 'agency' && agencyCode) {
    const { data: sts } = await supabase
      .from('students').select('id').in('id', studentIds).eq('agency_code', agencyCode)
    allowedIds = (sts ?? []).map(s => s.id)
    if (allowedIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  const now = new Date()
  const generatedAt = now.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`

  const zip = new JSZip()

  for (const studentId of allowedIds) {
    const { student, consultations, evaluations, examResults, aspirationHistory, templates } =
      await fetchStudentData(supabase, studentId)

    if (!student) continue

    const baseData: Omit<LifeRecordData, 'lang'> = {
      student,
      consultations:     consultations ?? [],
      evaluations:       evaluations   ?? [],
      examResults:       examResults   ?? [],
      aspirationHistory: aspirationHistory ?? [],
      templates:         templates ?? [],
      generatedAt,
    }

    const safeName = student.name_kr.replace(/[/\\:*?"<>|]/g, '_')

    if (lang === 'ko' || lang === 'both') {
      const buf = await generatePdfBuffer({ ...baseData, lang: 'ko' })
      zip.file(`${safeName}_KO_${dateSuffix}.pdf`, buf)
    }

    if (lang === 'vi' || lang === 'both') {
      const buf = await generatePdfBuffer({ ...baseData, lang: 'vi' })
      zip.file(`${safeName}_VI_${dateSuffix}.pdf`, buf)
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const zipFilename = `생활기록부_일괄_${dateSuffix}.zip`

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(zipFilename)}`,
    },
  })
}
