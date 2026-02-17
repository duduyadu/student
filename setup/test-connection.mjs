// Supabase 연결 테스트
// 실행: node setup/test-connection.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://chwhvqqfcvitvwutrywe.supabase.co'
const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod2h2cXFmY3ZpdHZ3dXRyeXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzM0NTMsImV4cCI6MjA4NjgwOTQ1M30.SMWhlDNFJQXiDRDanmSftmFOsVeyW3_6szNDkXzVsq0'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function testConnection() {
  console.log('🔍 Supabase 연결 테스트...\n')

  // 1. 로그인 테스트
  console.log('1️⃣  로그인 테스트')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@ajuenj.com',
    password: 'AjuEnj2026!'
  })
  if (authError) {
    console.log('   ❌ 로그인 실패:', authError.message)
    return
  }
  console.log('   ✅ 로그인 성공 - role:', authData.user.user_metadata.role)

  // 2. 테이블 조회 테스트
  console.log('\n2️⃣  테이블 조회 테스트')

  const tables = ['agencies', 'students', 'consultations', 'exam_results',
                  'target_history', 'audit_logs', 'system_config', 'i18n']

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`)
    } else {
      console.log(`   ✅ ${table}: 접근 성공`)
    }
  }

  // 3. i18n 데이터 확인
  console.log('\n3️⃣  i18n 데이터 확인')
  const { data: i18nData, error: i18nError } = await supabase
    .from('i18n')
    .select('*')
    .eq('lang', 'ko')
    .limit(3)
  if (i18nError) {
    console.log('   ❌ i18n 오류:', i18nError.message)
  } else {
    console.log(`   ✅ i18n 데이터 ${i18nData.length}건 확인`)
    i18nData.forEach(row => console.log(`      - ${row.key}: ${row.value}`))
  }

  await supabase.auth.signOut()
  console.log('\n🎉 모든 테스트 완료!')
}

testConnection()
