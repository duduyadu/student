# Next.js Middleware 인증 가드 Plan

**Feature**: nextjs-middleware
**Phase**: Plan
**Status**: In Progress
**Created**: 2026-03-27

---

## 1. 목표

현재 클라이언트 측에서만 이루어지는 인증 리다이렉트를 서버 측(Edge)으로 이전한다.
페이지 코드가 브라우저에 전달되기 전에 로그인 여부와 역할(role)을 검증한다.

---

## 2. 현재 상태 분석

### 현재 인증 흐름 (문제)

```
사용자 → /students 요청
    → Next.js가 페이지 JS 번들 전송 (브라우저로)
    → useAdminAuth() Hook 실행
    → supabase.auth.getSession() 호출
    → 로그인 없으면 → router.push('/login')
```

**문제점**:
- 페이지 소스(HTML/JS)가 인증 전에 브라우저에 전달됨
- 클라이언트 JS 비활성화 시 리다이렉트 우회 가능성
- 인증 지연으로 인한 화면 깜빡임(flash) 발생
- bot/크롤러가 페이지 구조 수집 가능

### 현재 인증 담당 파일
- `lib/useAdminAuth.ts` — 관리자 페이지 인증 훅 (클라이언트)
- `lib/auth.ts` — getUserMeta() 유틸 (세션에서 역할 추출)

---

## 3. 구현 범위

### 보호할 경로 (Protected Routes)

| 경로 패턴 | 허용 역할 | 미인증 시 |
|-----------|----------|-----------|
| `/` (대시보드) | master, agency | → `/login` |
| `/students/*` | master, agency | → `/login` |
| `/agencies/*` | master | → `/` (권한 없음) |
| `/reports/*` | master, agency | → `/login` |
| `/portal/*` | student | → `/login` |

### 공개 경로 (Public Routes — 미들웨어 통과)

| 경로 | 이유 |
|------|------|
| `/login` | 로그인 페이지 |
| `/register` | 학생 자가등록 |
| `/auth/*` | 비밀번호 재설정 |
| `/api/*` | API는 자체 인증 |
| `/_next/*` | Next.js 내부 |
| `/favicon.ico` | 정적 파일 |

### 역할별 접근 제어

| role | 접근 가능 |
|------|-----------|
| master | 전체 (/, /students, /agencies, /reports) |
| agency | /, /students, /reports (agencies 제외) |
| student | /portal만 |
| 없음(미인증) | /login, /register, /auth/* 만 |

---

## 4. 구현 방법

### Supabase 세션 확인 방식

```typescript
// middleware.ts — Edge Runtime에서 Supabase 세션 확인
import { createServerClient } from '@supabase/ssr'

// 쿠키 기반 세션 확인 (Edge에서 JWT 직접 검증)
```

**주의**: `@supabase/ssr` 패키지가 필요하지만 현재 미설치.
현재 프로젝트는 `@supabase/supabase-js` 직접 사용 패턴.

**대안 (현재 구조에 맞는 방법)**:
- Supabase JWT를 쿠키에서 읽어 직접 파싱
- 또는 `@supabase/ssr` 설치 후 표준 패턴 사용

---

## 5. 변경 파일 목록

| 파일 | 변경 내용 | 우선순위 |
|------|-----------|----------|
| `middleware.ts` (신규) | Edge Middleware 구현 | 최상 |
| `package.json` | `@supabase/ssr` 설치 여부 결정 | 상 |

---

## 6. 디자인 결정 사항

### 옵션 A: @supabase/ssr 설치 (권장)
- Supabase 공식 Next.js App Router 패턴
- 쿠키 기반 세션 자동 처리
- 코드 간결, 공식 지원

### 옵션 B: JWT 직접 파싱
- 추가 패키지 없음
- JWT 디코딩 직접 구현 필요
- 취약점 가능성 (직접 구현 시)

**→ 옵션 A 선택**: 공식 패턴, 유지보수 용이

---

## 7. 완료 기준

- [ ] 미인증 사용자가 `/students` 접근 시 서버에서 `/login` 리다이렉트
- [ ] student 역할이 `/` 접근 시 서버에서 `/portal` 리다이렉트
- [ ] agency 역할이 `/agencies` 접근 시 서버에서 `/` 리다이렉트
- [ ] `/login`, `/register`, `/auth/*` 는 인증 없이 접근 가능
- [ ] API 라우트는 미들웨어 영향 없음 (기존 인증 유지)
- [ ] TypeScript 오류 0개
- [ ] 기존 기능 회귀 없음 (로그인 → 대시보드 흐름 정상)
