# API 보안 강화 Plan

**Feature**: health-api-fix
**Phase**: Plan
**Status**: In Progress
**Created**: 2026-03-27

---

## 1. 목표

서브에이전트 분석에서 발견된 API 보안 취약점 4건을 수정한다.
- Gemini API 비용 남용 가능성 차단
- 서버 측 입력 검증 추가
- 역할 기반 접근 제어 강화
- 미사용 패키지 제거

---

## 2. 수정 범위

### 🔴 즉시 수정 (보안/비용)

| # | 파일 | 문제 | 조치 |
|---|------|------|------|
| 1 | `app/api/health/route.ts` | 인증 없이 Gemini API 호출 → 비용 남용 | CRON_SECRET 인증 추가 |
| 2 | `app/api/register/route.ts` | 서버 측 입력 검증 없음 | email/password/name 서버 검증 추가 |
| 3 | `app/api/student-withdraw/route.ts` | role 검증 없음 (student만 가능해야 함) | `role === 'student'` 체크 추가 |

### 🟢 정리 (선택)

| # | 파일 | 문제 | 조치 |
|---|------|------|------|
| 4 | `package.json` | `@supabase/auth-helpers-nextjs` 미사용 | `npm uninstall` |

---

## 3. 수정하지 않는 항목

- `/api/document-types` GET: 의도적으로 공개 (RLS SELECT 전체 허용, register 페이지에서 목록 조회에 사용)
- 학생 승인 레이스 컨디션(`app/page.tsx`): 범위 별도 분리 (복잡도 높음)
- 대시보드 N+1 쿼리: 성능 이슈, 별도 피처로 분리

---

## 4. 완료 기준

- [ ] `/api/health` — 인증 없는 요청 401 반환
- [ ] `/api/health` — `CRON_SECRET` 헤더 있는 요청 정상 동작
- [ ] `/api/register` — email 형식 오류 시 400 반환
- [ ] `/api/register` — password 8자 미만 시 400 반환
- [ ] `/api/register` — name_kr 누락 시 400 반환
- [ ] `/api/student-withdraw` — student 아닌 역할 403 반환
- [ ] `@supabase/auth-helpers-nextjs` 패키지 제거
- [ ] TypeScript 오류 0개
