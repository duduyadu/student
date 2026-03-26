# Security Hardening Plan

**Feature**: security-hardening
**Phase**: Plan
**Status**: In Progress
**Created**: 2026-03-26

---

## 1. 개요

보안 서브에이전트 3팀의 종합 검토 결과 발견된 취약점들을 체계적으로 수정한다.
Critical → High → Medium 순으로 우선순위를 적용하며, 각 수정은 기능 영향 최소화를 원칙으로 한다.

---

## 2. 발견된 이슈 목록

### Critical (즉시 수정)

| ID | 위치 | 설명 |
|----|------|------|
| C-1 | `app/api/register/route.ts` | `user_metadata`에 role 저장 → 사용자가 직접 변조 가능. `app_metadata`로 이전 필요 |
| C-2 | `app/api/audit/route.ts` POST | `body.user_id`, `body.user_role` 신뢰 → 인증된 사용자 정보로 교체 필요 |
| C-3 | `.env.local` | 실제 프로덕션 시크릿(Service Role, Gemini, Resend) 노출 — `.gitignore` 확인 필요 |
| C-4 | `lib/auth.ts` | `getUserMeta()` 기본 role이 `'agency'` → 최소 권한 원칙에 따라 `'student'`로 변경 |
| C-5 | `app/api/student-withdraw/route.ts` | 감사 로그 INSERT에 `await` 누락 → 비동기 오류 미처리 |

### High (이번 스프린트 내 수정)

| ID | 위치 | 설명 |
|----|------|------|
| H-1 | `app/api/life-record-pdf/route.ts` | student_id 소유권 검증 없음 (IDOR) |
| H-2 | `app/api/life-record-pdf-bulk/route.ts` | student_ids 소유권 검증 없음 (IDOR) |
| H-3 | `app/api/exam-ai-analysis/route.ts` | student_id 소유권 검증 없음 (IDOR) |
| H-4 | `app/api/document-types/route.ts` GET | 인증 없이 Service Role 사용, 미인증 접근 허용 |
| H-5 | (없음) `middleware.ts` 미존재 | 서버 레벨 라우트 보호 없음 |
| H-6 | `app/api/exam-ai-analysis/route.ts` | 사용자 입력 미이스케이프 → AI 프롬프트 인젝션 위험 |
| H-7 | `student_documents.file_url` 필드 | URL 검증 없음 → Stored XSS / SSRF 위험 |

### Medium (다음 스프린트)

| ID | 위치 | 설명 |
|----|------|------|
| M-1 | 모든 API 라우트 | 에러 메시지에 DB 내부 정보 노출 |
| M-2 | `next.config.ts` | 보안 헤더 미설정 (CSP, X-Frame-Options 등) |
| M-3 | 모든 API 라우트 | Rate Limiting 없음 |
| M-4 | `package.json` | `flatted` HIGH, `ajv` MODERATE 취약점 (`npm audit`) |
| M-5 | `vercel.json` | `CRON_SECRET` Vercel 환경변수 등록 여부 미확인 |

---

## 3. 구현 계획

### Phase 1 — Critical 수정 (우선순위 최상)

#### C-1: register API → app_metadata
- `app/api/register/route.ts` 수정
- `supabase.auth.admin.updateUserById()` 로 `app_metadata.role` 설정
- `user_metadata.role` 의존 코드 제거

#### C-2: audit API POST → 인증 사용자 정보
- `app/api/audit/route.ts` POST 핸들러 수정
- `getUser(token)` 로 인증된 user_id, user_role 사용
- `body.user_id`, `body.user_role` 파라미터 무시

#### C-3: .env.local 시크릿 관리
- `.gitignore`에 `.env.local` 등재 확인
- `git log --all -- .env.local` 로 과거 커밋 노출 여부 확인
- 노출 확인 시 Supabase / Gemini / Resend 시크릿 즉시 Rotate

#### C-4: lib/auth.ts 기본 role 변경
- `getUserMeta()` 의 fallback role: `'agency'` → `'student'`
- 영향 범위: 인증 실패 시 최소 권한 적용

#### C-5: student-withdraw await 추가
- `app/api/student-withdraw/route.ts` 감사 로그 INSERT에 `await` 추가
- 에러 핸들링 보완

### Phase 2 — High 수정

#### H-1~H-3: IDOR 수정 (PDF, AI Analysis)
- `agency` role 사용자의 경우, 요청된 student_id가 본인 유학원 소속인지 DB 검증 추가
- `master` role은 전체 허용
- 공통 헬퍼 함수 `validateStudentOwnership(studentId, userId, role)` 작성

#### H-4: document-types GET 인증 추가
- `app/api/document-types/route.ts` GET에 Bearer 토큰 인증 추가
- `getUser(token)` 검증 후 데이터 반환
- Service Role → anon key 또는 인증된 사용자 권한으로 교체

#### H-5: middleware.ts 생성
- Next.js `middleware.ts` 생성 (프로젝트 루트)
- `/api/*` 라우트 → Authorization 헤더 확인
- `/portal`, `/students`, `/agencies`, `/reports` → 인증 쿠키 확인
- 미인증 시 `/login` 리다이렉트

#### H-6: AI 프롬프트 인젝션 방어
- `app/api/exam-ai-analysis/route.ts` 에서 사용자 입력값 이스케이프
- 프롬프트에 삽입 전 특수 문자 sanitize
- 시스템/유저 역할 분리 명확화

#### H-7: file_url 검증
- `student_documents.file_url` 저장 전 URL 형식 검증
- `https://` 로 시작하는 Supabase Storage URL만 허용
- 허용 도메인 화이트리스트 적용 (`*.supabase.co`)

### Phase 3 — Medium 수정

#### M-1: 에러 메시지 정제
- API 라우트의 catch 블록에서 DB 에러 직접 노출 제거
- 클라이언트에는 generic 메시지 반환, 서버 로그에만 상세 기록

#### M-2: 보안 헤더 추가 (next.config.ts)
```javascript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
]
```

#### M-3: Rate Limiting
- Vercel Edge Middleware 기반 Rate Limiting 구현
- `/api/login`, `/api/register` — 분당 10회 제한
- 일반 API — 분당 100회 제한

#### M-4: npm audit 수정
- `npm audit fix` 실행
- Breaking change 발생 시 수동 패키지 업그레이드 검토

#### M-5: CRON_SECRET 환경변수 확인
- Vercel Dashboard에서 `CRON_SECRET` 환경변수 존재 여부 확인
- `vercel.json`의 cron 설정과 일치 확인

---

## 4. 파일 변경 대상

| 파일 | 변경 유형 | 우선순위 |
|------|-----------|----------|
| `app/api/register/route.ts` | 수정 | Critical |
| `app/api/audit/route.ts` | 수정 | Critical |
| `lib/auth.ts` | 수정 | Critical |
| `app/api/student-withdraw/route.ts` | 수정 | Critical |
| `app/api/life-record-pdf/route.ts` | 수정 | High |
| `app/api/life-record-pdf-bulk/route.ts` | 수정 | High |
| `app/api/exam-ai-analysis/route.ts` | 수정 | High |
| `app/api/document-types/route.ts` | 수정 | High |
| `middleware.ts` | 신규 생성 | High |
| `next.config.ts` | 수정 | Medium |
| `lib/validateOwnership.ts` | 신규 생성 | High |

---

## 5. 예상 작업량

| Phase | 이슈 수 | 예상 시간 |
|-------|---------|-----------|
| Phase 1 (Critical) | 5개 | ~60분 |
| Phase 2 (High) | 7개 | ~90분 |
| Phase 3 (Medium) | 5개 | ~60분 |
| **합계** | **17개** | **~210분** |

---

## 6. 리스크 및 주의사항

- **C-1 수정 시**: 기존 `user_metadata`에 role이 저장된 계정은 `app_metadata` 동기화 필요 → Supabase Admin API로 마이그레이션 스크립트 실행
- **H-5 middleware.ts**: Next.js App Router에서 middleware는 edge runtime 제약이 있음 → Supabase `@supabase/ssr` 미설치 프로젝트이므로 JWT 직접 파싱
- **M-2 CSP**: 잘못된 CSP 정책은 앱 기능 차단 가능 → 단계적 적용 (Report-Only 모드 먼저)

---

## 7. 완료 기준

- [ ] Critical 5개 이슈 모두 수정 완료
- [ ] High 7개 이슈 모두 수정 완료
- [ ] Medium 5개 이슈 중 M-1, M-2, M-5 수정 완료
- [ ] 기존 기능 회귀 없음 (수동 테스트)
- [ ] Design 문서 작성 완료
- [ ] Gap Analysis ≥ 90%
