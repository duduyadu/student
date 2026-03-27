# API 보안 강화 완료 보고서

**Feature**: health-api-fix
**Phase**: Report
**Date**: 2026-03-27
**Match Rate**: 100%

---

## 요약

서브에이전트 전체 프로젝트 분석에서 발견된 API 보안 취약점 4건을 수정 완료.
Gemini API 비용 남용 가능성 차단, 서버 측 입력 검증 추가, 역할 기반 접근 제어 강화, 미사용 패키지 제거.

---

## 수정 내역

### 1. `/api/health` — CRON_SECRET 인증 추가

**파일**: `app/api/health/route.ts`

**문제**: 인증 없이 Gemini API `generateContent('ping')` 호출 → 외부에서 반복 호출 시 Gemini API 크레딧 무한 소모

**수정**:
```typescript
const secret = process.env.CRON_SECRET
const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
if (!secret || token !== secret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**결과**: 미인증 요청 → 401, `Authorization: Bearer {CRON_SECRET}` 헤더 필요

---

### 2. `/api/register` — 서버 측 입력 검증 추가

**파일**: `app/api/register/route.ts`

**문제**: body 추출 후 바로 Supabase 호출 → 클라이언트 우회 시 비정상 데이터 저장 가능

**수정**:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!email || !emailRegex.test(String(email))) {
  return NextResponse.json({ error: '유효한 이메일을 입력해주세요.' }, { status: 400 })
}
if (!password || String(password).length < 8) {
  return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
}
if (!name_kr || !name_vn) {
  return NextResponse.json({ error: 'name_kr, name_vn은 필수입니다.' }, { status: 400 })
}
```

**결과**: email 형식 오류/password 8자 미만/name 누락 → 각 400 반환

---

### 3. `/api/student-withdraw` — 역할 검증 추가

**파일**: `app/api/student-withdraw/route.ts`

**문제**: 인증된 모든 역할이 호출 가능 → master/agency가 실수로 호출 시 본인 auth_user_id 연결 학생 비활성화

**수정**:
```typescript
const role = (user.app_metadata?.role as string) ?? ''
if (role !== 'student') {
  return NextResponse.json({ error: '학생만 탈퇴할 수 있습니다.' }, { status: 403 })
}
```

**결과**: student 아닌 역할 → 403

---

### 4. 미사용 패키지 제거

**패키지**: `@supabase/auth-helpers-nextjs`

**문제**: 설치되어 있으나 코드 어디에서도 import 없음, `@supabase/ssr`로 대체됨

**수정**: `npm uninstall @supabase/auth-helpers-nextjs` (4개 패키지 제거)

---

## 검증 결과

| 항목 | 결과 |
|------|:----:|
| TypeScript 오류 | 0개 |
| Match Rate | 100% |
| 완료 기준 | 8/8 PASS |

---

## 남은 보안 개선 항목 (별도 피처)

| 항목 | 파일 | 우선순위 |
|------|------|----------|
| 학생 승인 로직 서버 이동 (레이스 컨디션) | `app/page.tsx:101-128` | 중간 |
| 대시보드 N+1 쿼리 개선 | `app/page.tsx:211-226` | 중간 |
| Cron N+1 쿼리 개선 | `app/api/cron/` | 중간 |
| TypeScript `any` 7건 정리 | 여러 파일 | 낮음 |
