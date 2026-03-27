import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 공개 경로 (인증 불필요)
const PUBLIC_PATHS = ['/login', '/register', '/auth']

// 미들웨어 제외 경로
const SKIP_PATTERNS = ['/_next', '/favicon.ico', '/api']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 정적 리소스 & API 제외
  if (SKIP_PATTERNS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 공개 경로 통과
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // 미인증 → /login
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // 역할 확인 (app_metadata — 서버 전용, 변조 불가)
    const role = (user.app_metadata as { role?: string })?.role ?? 'student'

    // student → /portal만 허용
    if (role === 'student' && !pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }

    // agency → /agencies 접근 차단
    if (role === 'agency' && pathname.startsWith('/agencies')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  } catch {
    // Supabase 연결 오류 시 /login으로
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
