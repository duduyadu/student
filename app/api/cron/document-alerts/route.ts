import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aju-ej.vercel.app'

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'AJU E&J <onboarding@resend.dev>', to: [to], subject, html }),
  })
  return res.ok
}

async function alreadySent(studentId: string, alertType: string, docTypeId?: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]
  const query = supabaseAdmin
    .from('document_alert_logs')
    .select('id')
    .eq('student_id', studentId)
    .eq('alert_type', alertType)
    .gte('sent_at', `${today}T00:00:00Z`)

  if (docTypeId) query.eq('doc_type_id', docTypeId)

  const { data } = await query.maybeSingle()
  return !!data
}

async function logAlert(studentId: string, alertType: string, docTypeId?: string, daysBefore?: number) {
  await supabaseAdmin.from('document_alert_logs').insert({
    student_id: studentId,
    doc_type_id: docTypeId ?? null,
    alert_type: alertType,
    days_before: daysBefore ?? null,
    channel: 'email',
  })
}

/**
 * GET /api/cron/document-alerts
 * 매일 01:10 KST 실행 (vercel.json cron)
 * 1. 비자 갱신 90/30/7일 전 학생의 미제출 필수 서류 알림
 * 2. 서류 만료 30/7일 전 갱신 요청 알림
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today  = new Date()
  const fmt    = (d: Date) => d.toISOString().split('T')[0]
  const in7    = new Date(today); in7.setDate(today.getDate() + 7)
  const in30   = new Date(today); in30.setDate(today.getDate() + 30)
  const in90   = new Date(today); in90.setDate(today.getDate() + 90)

  let missingSent  = 0
  let expirySent   = 0

  // ----------------------------------------------------------------
  // 1. 비자 갱신 90/30/7일 전 학생 → 미제출 필수 서류 알림
  // ----------------------------------------------------------------
  const { data: visaStudents } = await supabaseAdmin
    .from('students')
    .select('id, name_kr, name_vn, email, visa_type, visa_expiry')
    .eq('is_active', true)
    .eq('is_approved', true)
    .gte('visa_expiry', fmt(today))
    .lte('visa_expiry', fmt(in90))
    .not('email', 'is', null)

  for (const student of visaStudents ?? []) {
    if (!student.email) continue
    const daysLeft = Math.ceil((new Date(student.visa_expiry).getTime() - today.getTime()) / 86400000)

    // D-7, D-30, D-90 날에만 발송
    if (![7, 30, 90].includes(daysLeft)) continue

    // 오늘 이미 발송됐으면 skip
    if (await alreadySent(student.id, 'missing')) continue

    // 미제출 필수 서류 조회
    const { data: studentDocs } = await supabaseAdmin
      .from('student_documents')
      .select('*, doc_type:document_types(name_kr, name_vi, is_required, visa_types)')
      .eq('student_id', student.id)
      .in('status', ['pending', 'rejected'])

    const missingDocs = (studentDocs ?? []).filter(d => {
      const dt = d.doc_type
      if (!dt?.is_required) return false
      if (dt.visa_types && dt.visa_types.length > 0 && !dt.visa_types.includes(student.visa_type)) return false
      return true
    })

    if (missingDocs.length === 0) continue

    const docListKo = missingDocs.map(d => `❌ ${d.doc_type.name_kr}${d.status === 'rejected' ? ' (반려됨)' : ' (미제출)'}`).join('<br>')
    const docListVi = missingDocs.map(d => `❌ ${d.doc_type.name_vi}${d.status === 'rejected' ? ' (bị từ chối)' : ' (chưa nộp)'}`).join('<br>')

    const subject = `[AJU E&J] 비자 갱신 D-${daysLeft} — 미제출 서류 ${missingDocs.length}건`
    const html = `
<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
  <div style="background:#2563eb;color:#fff;border-radius:12px;padding:16px 20px;margin-bottom:20px">
    <h2 style="margin:0;font-size:18px">AJU E&J 서류 준비 알림</h2>
  </div>

  <p style="font-size:15px;color:#1e293b">안녕하세요, <strong>${student.name_kr}</strong> 학생</p>
  <p style="font-size:15px;color:#1e293b">
    비자 만료까지 <strong style="color:#dc2626">D-${daysLeft}</strong>일 남았습니다.
    비자 갱신 전 아래 서류를 준비해 주세요.
  </p>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:14px;color:#1e293b;line-height:2">
    ${docListKo}
  </div>
  <a href="${BASE_URL}/portal" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;margin-bottom:20px">
    포털에서 서류 확인하기 →
  </a>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">

  <p style="font-size:15px;color:#1e293b">Xin chào, <strong>${student.name_vn}</strong></p>
  <p style="font-size:15px;color:#1e293b">
    Còn <strong style="color:#dc2626">D-${daysLeft}</strong> ngày đến hạn visa.
    Vui lòng chuẩn bị các giấy tờ sau:
  </p>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:14px;color:#1e293b;line-height:2">
    ${docListVi}
  </div>

  <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:12px;color:#94a3b8">
    이 메일은 AJU E&J 학생관리 시스템에서 자동 발송되었습니다.
  </div>
</div>`

    const ok = await sendEmail(student.email, subject, html)
    if (ok) {
      missingSent++
      await logAlert(student.id, 'missing', undefined, daysLeft)
    }
  }

  // ----------------------------------------------------------------
  // 2. 서류 만료 30/7일 전 갱신 알림
  // ----------------------------------------------------------------
  const { data: expiringDocs } = await supabaseAdmin
    .from('student_documents')
    .select(`
      id, student_id, expiry_date, doc_type_id,
      doc_type:document_types(name_kr, name_vi),
      student:students(id, name_kr, name_vn, email)
    `)
    .not('expiry_date', 'is', null)
    .gte('expiry_date', fmt(today))
    .lte('expiry_date', fmt(in30))

  for (const doc of expiringDocs ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = (doc as any).student
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dt      = (doc as any).doc_type

    if (!student?.email) continue
    const daysLeft = Math.ceil((new Date(doc.expiry_date).getTime() - today.getTime()) / 86400000)
    if (![7, 30].includes(daysLeft)) continue
    if (await alreadySent(student.id, 'expiry_warning', doc.doc_type_id)) continue

    const subject = `[AJU E&J] 서류 갱신 필요 — ${dt?.name_kr} 만료 D-${daysLeft}`
    const html = `
<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
  <div style="background:#f59e0b;color:#fff;border-radius:12px;padding:16px 20px;margin-bottom:20px">
    <h2 style="margin:0;font-size:18px">AJU E&J 서류 만료 알림</h2>
  </div>
  <p style="font-size:15px;color:#1e293b">안녕하세요, <strong>${student.name_kr}</strong> 학생</p>
  <p style="font-size:15px;color:#1e293b">
    <strong>${dt?.name_kr}</strong>이(가) <strong style="color:#dc2626">D-${daysLeft}</strong>일 후 만료됩니다.
    서류를 갱신하고 포털에서 업로드해 주세요.
  </p>
  <a href="${BASE_URL}/portal" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;margin:16px 0">
    포털에서 서류 업데이트 →
  </a>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">

  <p style="font-size:15px;color:#1e293b">Xin chào, <strong>${student.name_vn}</strong></p>
  <p style="font-size:15px;color:#1e293b">
    <strong>${dt?.name_vi}</strong> sẽ hết hạn sau <strong style="color:#dc2626">D-${daysLeft}</strong> ngày.
    Vui lòng gia hạn và tải lên cổng thông tin.
  </p>

  <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:12px;color:#94a3b8">
    이 메일은 AJU E&J 학생관리 시스템에서 자동 발송되었습니다.
  </div>
</div>`

    const ok = await sendEmail(student.email, subject, html)
    if (ok) {
      expirySent++
      await logAlert(student.id, 'expiry_warning', doc.doc_type_id, daysLeft)
    }
  }

  return NextResponse.json({
    missing_sent: missingSent,
    expiry_sent:  expirySent,
    total_sent:   missingSent + expirySent,
    resend_configured: !!RESEND_API_KEY,
  })
}
