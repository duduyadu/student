/**
 * 서버 전용 Supabase 클라이언트 팩토리
 * API Route 에서만 사용 - 클라이언트 컴포넌트에서 임포트 금지
 */
import { createClient } from '@supabase/supabase-js'

/** Service Role 클라이언트 (RLS 우회, 관리자 전용 작업에 사용) */
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/** Anon 클라이언트 (사용자 JWT 검증 등에 사용) */
export function getAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
