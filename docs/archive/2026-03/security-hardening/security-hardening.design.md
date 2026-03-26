# Security Hardening — Design Document

**Feature**: security-hardening
**Phase**: Design
**Status**: 구현 완료
**참조 Plan**: `docs/01-plan/features/security-hardening.plan.md`

---

## 1. 개요

보안 서브에이전트 검토 결과 발견된 17개 취약점에 대한 상세 구현 설계.
Critical 5개 → High (부분) 5개 → Medium (부분) 2개 순으로 구현 완료.

---

## 2. Critical 수정 설계

### C-1: register API — app_metadata role 설정

**파일**: `app/api/register/route.ts`

**변경 전**:
```typescript
user_metadata: { role: 'student', name_kr }
```

**변경 후**:
```typescript
user_metadata: { name_kr },
app_metadata: { role: 'student' },  // 서버 전용, 사용자 변조 불가
```

**원칙**: Supabase에서 `user_metadata`는 사용자가 직접 수정 가능. `app_metadata`는 Service Role API만 수정 가능 (서버 전용). role은 반드시 `app_metadata`에만 저장.

---

### C-2: audit API POST — 인증된 사용자 정보 사용

**파일**: `app/api/audit/route.ts`

**변경 전** (취약):
```typescript
user_id:   body.user_id   ?? null,   // 클라이언트 조작 가능
user_role: body.user_role ?? null,   // 클라이언트 조작 가능
```

**변경 후** (안전):
```typescript
user_id:   user.id,                                               // 인증된 user.id
user_role: (user.app_metadata as { role?: string })?.role ?? null, // app_metadata에서 추출
user_name: body.user_name ?? null,                                 // 표시명만 허용
```

**원칙**: 감사 로그의 `user_id`와 `user_role`은 반드시 인증된 JWT에서 추출. 클라이언트 body 값 무시.

---

### C-3: .env.local 시크릿 관리

**수동 조치 사항**:
1. `git log --all -- .env.local` 실행 → 과거 커밋 노출 여부 확인
2. 노출 확인 시:
   - Supabase Dashboard → Project Settings → API → Service Role Key Rotate
   - Gemini API Console → API Key 재생성
   - Resend Dashboard → API Key 재생성
3. `.gitignore`에 `.env.local` 등재 확인 (이미 등재됨)

---

### C-4: lib/auth.ts — 기본 role 최소 권한 적용

**파일**: `lib/auth.ts`

**변경 전**:
```typescript
role: app.role ?? 'agency'
```

**변경 후**:
```typescript
role: app.role ?? 'student'  // 최소 권한 원칙 (least privilege)
```

**원칙**: 인증 실패 또는 role 미설정 시 가장 낮은 권한(`student`)으로 폴백. `'agency'`로 폴백하면 본인 유학원 학생 전체에 접근 가능해짐.

---

### C-5: student-withdraw — 감사 로그 await 누락

**파일**: `app/api/student-withdraw/route.ts`

**변경 전**:
```typescript
supabaseAdmin.from('audit_logs').insert({ ... })  // await 없음
```

**변경 후**:
```typescript
await supabaseAdmin.from('audit_logs').insert({ ... })
```

**원칙**: 감사 로그 INSERT 실패 시 에러를 감지해야 함. `await` 없이 호출하면 Promise가 무시되어 오류가 묻힘.

---

## 3. High 수정 설계

### H-1: life-record-pdf — IDOR 수정

**파일**: `app/api/life-record-pdf/route.ts`

**소유권 검증 로직**:
```typescript
const role = (user.app_metadata as { role?: string })?.role ?? 'student'

if (role === 'agency') {
  if (!agencyCode) return 403 Forbidden
  const { data: st } = await supabase.from('students').select('agency_code').eq('id', studentId).single()
  if (!st || st.agency_code !== agencyCode) return 403 Forbidden
} else if (role === 'student') {
  // 학생은 본인 레코드만
  const { data: st } = await supabase.from('students').select('auth_user_id').eq('id', studentId).single()
  if (!st || st.auth_user_id !== user.id) return 403 Forbidden
}
// master: 전체 허용
```

**기존 버그**: `role ?? 'agency'` 기본값으로 인해 `student` 역할이 `agency` 검증을 건너뜀 → IDOR

---

### H-2: life-record-pdf-bulk — student 역할 차단

**파일**: `app/api/life-record-pdf-bulk/route.ts`

```typescript
if (role === 'student') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**설계 원칙**: 일괄 다운로드는 agency/master 전용 기능. student는 단일 PDF만 허용.

---

### H-3: exam-ai-analysis — 소유권 검증 추가

**파일**: `app/api/exam-ai-analysis/route.ts`

**추가 위치**: API key 확인 후, 시험 데이터 로드 전

```typescript
// 소유권 검증 (IDOR 방지)
const supabase = getServiceClient()
const role = ... // app_metadata에서 추출

if (role === 'agency') {
  // agency_code 일치 검증
} else if (role === 'student') {
  // auth_user_id 일치 검증
}
// master: 전체 허용
```

**에러 메시지 정제**: `'GEMINI_API_KEY 미설정'` → `'AI 분석을 사용할 수 없습니다.'` (내부 환경변수명 노출 방지)

---

### H-4: document-types GET — Service Role → Anon Client

**파일**: `app/api/document-types/route.ts`

**변경 전**:
```typescript
export async function GET(_req: NextRequest) {
  const supabase = getServiceClient()  // RLS 우회, 불필요한 권한
```

**변경 후**:
```typescript
export async function GET(_req: NextRequest) {
  const supabase = getAnonClient()  // RLS 적용, 최소 권한
```

`getAuthedUser()` 내부도 `getServiceClient()` → `getAnonClient()` 교체.

**에러 메시지**: DB 내부 메시지 노출 제거.

---

### H-5: middleware.ts (미구현 — 향후 스프린트)

**이유**: `@supabase/ssr` 미설치 환경에서 Next.js edge middleware로 JWT 파싱 구현 복잡도 높음.
**대안**: 각 API Route에서 개별 인증 검증 (현재 방식 유지).

---

## 4. Medium 수정 설계

### M-2: next.config.ts — 보안 헤더

```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },             // Clickjacking 방지
  { key: 'X-Content-Type-Options', value: 'nosniff' },   // MIME sniffing 방지
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]
```

**미적용 헤더**: CSP(Content-Security-Policy) — 잘못된 정책으로 앱 기능 차단 가능성. Report-Only 모드 단계적 적용 권고.

---

## 5. 구현 완료 파일 목록

| 파일 | 변경 유형 | 이슈 |
|------|-----------|------|
| `lib/auth.ts` | 수정 | C-4 |
| `app/api/register/route.ts` | 수정 | C-1 |
| `app/api/audit/route.ts` | 수정 | C-2 |
| `app/api/student-withdraw/route.ts` | 수정 | C-5 |
| `app/api/life-record-pdf/route.ts` | 수정 | H-1 |
| `app/api/life-record-pdf-bulk/route.ts` | 수정 | H-2 |
| `app/api/exam-ai-analysis/route.ts` | 수정 | H-3 |
| `app/api/document-types/route.ts` | 수정 | H-4 |
| `next.config.ts` | 수정 | M-2 |

---

## 6. 보안 패턴 원칙 (이 프로젝트)

| 원칙 | 구현 방식 |
|------|-----------|
| Role은 app_metadata에만 | `user.app_metadata.role` (서버 전용) |
| 감사 로그 user 정보 | 인증된 JWT에서 추출, body 무시 |
| 기본 권한 | `'student'` (최소 권한) |
| IDOR 방지 | agency: agency_code 일치, student: auth_user_id 일치 |
| Service Role 최소화 | 인증 검증은 anon client, 데이터 조작만 service client |
| 에러 메시지 | 내부 정보 노출 금지, generic 메시지 반환 |
