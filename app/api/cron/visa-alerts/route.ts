import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  // Vercel cron 또는 수동 호출 시 CRON_SECRET으로 인증
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today    = new Date()
  const fmt      = (d: Date) => d.toISOString().split('T')[0]
  const in7      = new Date(today); in7.setDate(today.getDate() + 7)
  const in30     = new Date(today); in30.setDate(today.getDate() + 30)
  const in90     = new Date(today); in90.setDate(today.getDate() + 90)

  // 90일 이내 비자 만료 + 이메일 있는 학생 조회
  const { data: students, error } = await supabaseAdmin
    .from('students')
    .select('id, name_kr, name_vn, email, visa_expiry')
    .eq('is_active', true)
    .eq('is_approved', true)
    .gte('visa_expiry', fmt(today))
    .lte('visa_expiry', fmt(in90))
    .not('email', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!students || students.length === 0) {
    return NextResponse.json({ sent: 0, message: '알림 대상 없음' })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    // API 키 미설정 시 발송 건수만 반환 (로그 확인용)
    const counts = { d7: 0, d30: 0, d90: 0 }
    for (const s of students) {
      const d = Math.ceil((new Date(s.visa_expiry).getTime() - today.getTime()) / 86400000)
      if (d <= 7) counts.d7++
      else if (d <= 30) counts.d30++
      else counts.d90++
    }
    return NextResponse.json({
      message: 'RESEND_API_KEY 미설정 — 이메일 미발송',
      found: students.length,
      ...counts,
    })
  }

  const currentYear = today.getFullYear()
  let sent = 0
  for (const student of students) {
    const expiry   = new Date(student.visa_expiry)
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)

    // D-7, D-30, D-90 정확한 날에만 발송 (매일 중복 방지)
    if (![7, 30, 90].includes(daysLeft)) continue

    // 이미 올해 발송된 이력 확인 (중복 방지)
    const { data: existing } = await supabaseAdmin
      .from('visa_alert_logs')
      .select('id')
      .eq('student_id', student.id)
      .eq('days_before', daysLeft)
      .eq('year', currentYear)
      .maybeSingle()
    if (existing) continue

    const urgencyKo = daysLeft <= 7 ? '🚨 즉시 조치 필요' : daysLeft <= 30 ? '⚠️ 갱신 서류 준비' : '📋 갱신 준비 시작'
    const urgencyVi = daysLeft <= 7 ? '🚨 Cần xử lý ngay' : daysLeft <= 30 ? '⚠️ Chuẩn bị hồ sơ' : '📋 Bắt đầu chuẩn bị'

    const subject = `[AJU E&J] 비자 만료 D-${daysLeft} — ${urgencyKo}`
    const html = `
<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
  <div style="background:#2563eb;color:#fff;border-radius:12px;padding:16px 20px;margin-bottom:20px">
    <h2 style="margin:0;font-size:18px">AJU E&J 비자 만료 알림</h2>
  </div>

  <p style="font-size:15px;color:#1e293b">안녕하세요, <strong>${student.name_kr}</strong> 학생</p>
  <p style="font-size:15px;color:#1e293b">
    비자 만료일 <strong>${student.visa_expiry}</strong>까지
    <strong style="color:#dc2626;font-size:18px"> D-${daysLeft}</strong> 남았습니다.
  </p>
  <p style="font-size:14px;color:#64748b">${urgencyKo} — 빠른 시일 내에 비자 갱신을 준비하세요.</p>

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">

  <p style="font-size:15px;color:#1e293b">Xin chào, <strong>${student.name_vn}</strong></p>
  <p style="font-size:15px;color:#1e293b">
    Visa hết hạn ngày <strong>${student.visa_expiry}</strong> —
    còn <strong style="color:#dc2626;font-size:18px"> D-${daysLeft}</strong> ngày.
  </p>
  <p style="font-size:14px;color:#64748b">${urgencyVi} — Vui lòng chuẩn bị gia hạn visa sớm.</p>

  <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-top:20px;font-size:12px;color:#94a3b8">
    이 메일은 AJU E&J 학생관리 시스템에서 자동 발송되었습니다.
  </div>
</div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AJU E&J <onboarding@resend.dev>',
        to:   [student.email],
        subject,
        html,
      }),
    })

    if (res.ok) {
      sent++
      // 발송 이력 기록
      await supabaseAdmin.from('visa_alert_logs').insert({
        student_id: student.id,
        days_before: daysLeft,
        year: currentYear,
      })
    }
  }

  return NextResponse.json({ sent, total: students.length })
}
