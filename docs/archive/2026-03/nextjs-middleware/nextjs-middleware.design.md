# Next.js Middleware 인증 가드 Design

**Feature**: nextjs-middleware
**Phase**: Design
**Status**: In Progress
**Created**: 2026-03-27

---

## 1. 아키텍처 개요

```
사용자 요청
    ↓
[middleware.ts] — Edge Runtime
    ├── 공개 경로? → 통과
    ├── 세션 없음? → /login 리다이렉트
    ├── student → /portal 외 접근? → /portal 리다이렉트
    ├── agency → /agencies 접근? → / 리다이렉트
    └── 인증 OK → 요청 통과
         ↓
    [Next.js 페이지]
```

---

## 2. 패키지 결정

### 현재 설치 현황
- `@supabase/auth-helpers-nextjs` v0.10.0 — 설치됨 (미사용)
- `@supabase/supabase-js` v2 — 설치됨, 전체 사용 중
- `@supabase/ssr` — 미설치

### 선택: `@supabase/ssr` 설치

`@supabase/auth-helpers-nextjs`는 deprecated 예정 패키지.
`@supabase/ssr`이 App Router + middleware 공식 권장 패키지.

```bash
npm install @supabase/ssr
```

---

## 3. 구현 상세 설계

### 3-1. middleware.ts (신규, 프로젝트 루트)

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 공개 경로 (인증 불필요)
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/auth',          // /auth/* 전체
]

// 정적 리소스 패턴 (미들웨어 제외)
const SKIP_PATTERNS = [
  '/_next',
  '/favicon.ico',
  '/api',           // API는 자체 인증
]

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

  // Supabase 세션 확인 (쿠키 기반)
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 3-2. 리다이렉트 로직 흐름

```
pathname = /students
    ↓
SKIP? (_next, /api) → NO
    ↓
PUBLIC? (/login, /register, /auth) → NO
    ↓
user = supabase.auth.getUser()
    ↓
user 없음 → redirect /login?redirectTo=/students
    ↓
role = user.app_metadata.role
    ↓
role = 'master' → PASS ✅
role = 'agency' → PASS ✅ (students는 허용)
role = 'student' → redirect /portal ❌
```

---

## 4. 환경 변수

미들웨어는 Edge Runtime에서 실행 → 서버 전용 변수(`SUPABASE_SERVICE_ROLE_KEY`) 사용 불가.
`NEXT_PUBLIC_*` 변수만 사용 가능. → `NEXT_PUBLIC_SUPABASE_ANON_KEY` 사용 (이미 설정됨).

| 변수 | 위치 | 비고 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | .env.local | 기존 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | .env.local | 기존 |

---

## 5. 기존 코드 영향도

| 파일 | 영향 | 조치 |
|------|------|------|
| `lib/useAdminAuth.ts` | 중복 인증이 되지만 유지 | 유지 (클라이언트 UX용) |
| 각 페이지 `useAdminAuth()` | 미들웨어 통과 후 2차 검증 | 유지 (defense in depth) |
| `app/api/*` | 미들웨어 skip | 변경 없음 |
| `app/portal/*` | 미들웨어가 student만 허용 | 변경 없음 |

**설계 원칙**: 미들웨어 추가 후에도 기존 클라이언트 인증 코드는 제거하지 않는다.
→ 이중 보안 (서버 + 클라이언트 양쪽 검증)

---

## 6. 엣지 케이스 처리

| 케이스 | 처리 방법 |
|--------|-----------|
| 쿠키 만료 세션 | `getUser()` null 반환 → /login 리다이렉트 |
| 로그인 후 원래 페이지 복귀 | `?redirectTo=` 쿼리 파라미터로 전달 (useAdminAuth에서 처리 가능) |
| master가 /portal 접근 | 허용 (현재 정책상 제한 없음) |
| 알 수 없는 role | 'student'로 기본값 처리 → /portal만 허용 |
| Supabase 연결 오류 | try-catch로 감싸 → 오류 시 /login 리다이렉트 |

---

## 7. 완료 기준

- [ ] `npm install @supabase/ssr` 완료
- [ ] `middleware.ts` 프로젝트 루트에 생성
- [ ] 미인증 사용자 `/students` → `/login` 서버 리다이렉트 확인
- [ ] student 역할 `/` → `/portal` 서버 리다이렉트 확인
- [ ] agency 역할 `/agencies` → `/` 서버 리다이렉트 확인
- [ ] `/login`, `/register`, `/auth/*`, `/api/*` 통과 확인
- [ ] TypeScript 오류 0개
- [ ] 로그인 → 대시보드 → 학생 목록 정상 흐름 확인
