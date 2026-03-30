import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 브라우저: createBrowserClient → 쿠키+localStorage 동시 저장 (미들웨어 세션 인식)
// 서버(SSR): createClient → 안전한 폴백
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(url, key)
  : createClient(url, key)
