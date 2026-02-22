import type { Session } from '@supabase/supabase-js'
import type { UserMeta, UserRole } from './types'

/**
 * 세션에서 UserMeta를 안전하게 추출합니다.
 * - role, agency_code: app_metadata (서버만 수정 가능 — 보안)
 * - name_kr: user_metadata (표시용 이름)
 */
export function getUserMeta(session: Session): UserMeta {
  const app  = (session.user.app_metadata  ?? {}) as { role?: UserRole; agency_code?: string }
  const user = (session.user.user_metadata ?? {}) as { name_kr?: string }
  return {
    role:         app.role         ?? 'agency',
    agency_code:  app.agency_code,
    name_kr:      user.name_kr ?? '',
  }
}
