import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabaseServer'

const adminClient = getServiceClient()

const PRIVACY_TEXT = `AJU E&J는 유학 관리 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.

■ 수집 항목: 이름(한국어/베트남어), 전화번호, 이메일, 비자 정보, 유학 단계
■ 수집 목적: 유학생 관리, 비자 만료 안내, 상담 서비스 제공
■ 보유 기간: 서비스 탈퇴 또는 졸업 후 3년
■ 제3자 제공: 없음

위 내용에 동의하지 않을 경우 서비스 이용이 제한될 수 있습니다.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name_kr, name_vn, phone_vn, email, password, dob, gender, status, agency_id } = body

    // 1. Admin API로 계정 생성 (Rate Limit 없음, 이메일 인증 불필요)
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // 이메일 인증 없이 바로 사용 가능
      user_metadata: { role: 'student', name_kr },
    })

    if (authErr) {
      const msg = authErr.message
      if (msg.includes('already been registered') || msg.includes('already exists')) {
        return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 400 })
      }
      return NextResponse.json({ error: '계정 생성 실패: ' + msg }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. 기존 students 레코드 확인 (이전 가입 실패로 남은 고아 레코드 처리)
    const { data: existing } = await adminClient
      .from('students')
      .select('id, is_approved, auth_user_id')
      .eq('email', email)
      .maybeSingle()

    let studentId: string

    if (existing) {
      // 이미 승인됐거나 다른 auth 계정이 연결된 경우 → 진짜 중복
      if (existing.is_approved || existing.auth_user_id) {
        await adminClient.auth.admin.deleteUser(userId)
        return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 400 })
      }
      // auth_user_id 없는 미완성 레코드 → 업데이트로 재활용
      const { error: updErr } = await adminClient.from('students').update({
        name_kr, name_vn,
        phone_vn:     phone_vn || null,
        dob:          dob || null,
        gender, status,
        agency_id:    agency_id || null,
        auth_user_id: userId,
        is_approved:  false,
        preferred_lang: 'vi',
      }).eq('id', existing.id)

      if (updErr) {
        await adminClient.auth.admin.deleteUser(userId)
        return NextResponse.json({ error: '학생 정보 업데이트 실패: ' + updErr.message }, { status: 500 })
      }
      studentId = existing.id
    } else {
      // 새 레코드 생성
      const { data: studentData, error: stuErr } = await adminClient.from('students').insert({
        name_kr, name_vn,
        phone_vn:     phone_vn || null,
        email,
        dob:          dob || null,
        gender, status,
        agency_id:    agency_id || null,
        is_approved:  false,
        auth_user_id: userId,
        preferred_lang: 'vi',
      }).select('id').single()

      if (stuErr || !studentData) {
        await adminClient.auth.admin.deleteUser(userId)
        return NextResponse.json({ error: '학생 정보 저장 실패: ' + stuErr?.message }, { status: 500 })
      }
      studentId = studentData.id
    }

    // 3. 개인정보 동의 기록
    await adminClient.from('privacy_consents').insert({
      student_id:   studentId,
      consent_type: 'signup',
      consent_text: PRIVACY_TEXT,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: '서버 오류: ' + e.message }, { status: 500 })
  }
}
