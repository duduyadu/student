// 마스터 계정 생성 스크립트
// 실행: node setup/create-master-user.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://chwhvqqfcvitvwutrywe.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod2h2cXFmY3ZpdHZ3dXRyeXdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIzMzQ1MywiZXhwIjoyMDg2ODA5NDUzfQ.hC9tq7MjUpoEsg4b56o1UMIKLNlPXccrr1gfLrvObEo'

// service_role로 Admin 클라이언트 생성
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createMasterUser() {
  console.log('🚀 마스터 계정 생성 중...')

  // ⚠️ 아래 이메일/비밀번호를 원하는 값으로 변경하세요
  const EMAIL    = 'admin@ajuenj.com'
  const PASSWORD = 'AjuEnj2026!'

  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,       // 이메일 인증 없이 바로 활성화
    user_metadata: {
      role: 'master',
      agency_code: 'MASTER',
      name_kr: '관리자',
    }
  })

  if (error) {
    console.error('❌ 생성 실패:', error.message)
    return
  }

  console.log('✅ 마스터 계정 생성 완료!')
  console.log('   이메일  :', EMAIL)
  console.log('   비밀번호 :', PASSWORD)
  console.log('   user_id :', data.user.id)
  console.log('   role    :', data.user.user_metadata.role)
  console.log('')
  console.log('👉 이 정보를 안전한 곳에 저장하세요!')
}

createMasterUser()
