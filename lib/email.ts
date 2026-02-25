import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM_EMAIL ?? 'AJU E&J <noreply@aju-ej.com>'

export async function sendDocStatusEmail(params: {
  to: string
  studentName: string
  docNameKr: string
  status: 'approved' | 'rejected'
  rejectReason?: string
}) {
  if (!resend) return  // API 키 없으면 무시

  const { to, studentName, docNameKr, status, rejectReason } = params

  const isApproved = status === 'approved'
  const subject = isApproved
    ? `[AJU E&J] 서류 승인 완료 — ${docNameKr}`
    : `[AJU E&J] 서류 반려 안내 — ${docNameKr}`

  const body = isApproved
    ? `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <h2 style="color:#1e40af;margin-bottom:8px">✅ 서류 승인 완료</h2>
        <p style="color:#334155;line-height:1.7">
          안녕하세요, <strong>${studentName}</strong>님<br/>
          <strong>${docNameKr}</strong> 서류가 <strong style="color:#16a34a">승인</strong>되었습니다.
        </p>
        <p style="color:#64748b;font-size:13px;margin-top:24px">AJU E&J 베트남 유학생 관리 시스템</p>
      </div>
    `
    : `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <h2 style="color:#dc2626;margin-bottom:8px">❌ 서류 반려 안내</h2>
        <p style="color:#334155;line-height:1.7">
          안녕하세요, <strong>${studentName}</strong>님<br/>
          <strong>${docNameKr}</strong> 서류가 <strong style="color:#dc2626">반려</strong>되었습니다.
        </p>
        ${rejectReason ? `
        <div style="background:#fff1f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0">
          <p style="color:#dc2626;font-weight:600;margin:0 0 4px">반려 사유</p>
          <p style="color:#334155;margin:0">${rejectReason}</p>
        </div>
        ` : ''}
        <p style="color:#334155;line-height:1.7">서류를 다시 확인 후 재제출해 주세요.</p>
        <p style="color:#64748b;font-size:13px;margin-top:24px">AJU E&J 베트남 유학생 관리 시스템</p>
      </div>
    `

  try {
    await resend.emails.send({ from: FROM, to, subject, html: body })
  } catch (err) {
    // 이메일 실패해도 메인 작업은 유지
    console.error('[email] send failed:', err)
  }
}
