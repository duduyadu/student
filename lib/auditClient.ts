'use client'

import { supabase } from '@/lib/supabase'

/**
 * 클라이언트 컴포넌트에서 감사 로그를 기록합니다.
 * 실패해도 메인 작업에 영향 없음 (fire-and-forget with error suppression).
 */
export async function logAudit(params: {
  action: string
  targetTable?: string
  targetId?: string
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action:       params.action,
        target_table: params.targetTable,
        target_id:    params.targetId,
        details:      params.details,
      }),
    })
  } catch {
    // 감사 로그 실패는 메인 작업에 영향 없음
  }
}
