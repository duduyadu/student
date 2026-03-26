# 인증 플로우 (Authentication Flow) — Design

## 1. 개요

Supabase Auth(JWT + Email/Password) 기반 인증 시스템이다.
세 가지 역할(master/agency/student)이 각각 다른 경로로 시스템에 접근한다.

- **인증 방식**: 이메일 + 비밀번호 (Supabase `signInWithPassword`)
- **세션 방식**: JWT (Access Token + Refresh Token)
- **권한 저장 위치**: `app_metadata` (서버만 수정 가능 — 보안)
- **클라이언트**: `lib/supabase.ts` (anon key, RLS 적용)
- **서버 클라이언트**: `lib/supabaseServer.ts` (service role key, RLS 우회)

---

## 2. 역할 체계 (master / agency / student)

### 역할 정의

| 역할 | 설명 | 기본 진입 경로 |
|------|------|----------------|
| `master` | 전체 시스템 접근 권한 (관리자) | `/` (대시보드) |
| `agency` | 본인 유학원 학생만 접근 가능 | `/` (대시보드) |
| `student` | 학생 포털만 접근 가능 | `/portal` |

### 역할 저장 위치

```
auth.users
  └── app_metadata.role          ← 역할 (master / agency / student)
  └── app_metadata.agency_code   ← 유학원 코드 (agency 역할만)
  └── user_metadata.name_kr      ← 표시용 이름
```

**중요**: 역할은 반드시 `app_metadata.role`에서 읽는다. `user_metadata.role`은 클라이언트가 수정 가능하므로 절대 사용 금지.

### getUserMeta 헬퍼 (`lib/auth.ts`)

```typescript
export function getUserMeta(session: Session): UserMeta {
  const app  = session.user.app_metadata  as { role?: UserRole; agency_code?: string }
  const user = session.user.user_metadata as { name_kr?: string }
  return {
    role:        app.role        ?? 'agency',
    agency_code: app.agency_code,
    name_kr:     user.name_kr ?? '',
  }
}
```

모든 컴포넌트/API에서 역할 확인 시 이 함수를 반드시 사용한다.

### RLS 정책과의 연동

PostgreSQL RLS 정책은 `auth.jwt()->'app_metadata'->>'role'`로 역할을 읽는다.
클라이언트 세션의 JWT에 `app_metadata`가 포함되어 있어 Supabase가 자동 검증한다.

---

## 3. 로그인 플로우

### 관련 파일

- `app/login/page.tsx`

### 플로우 다이어그램

```
사용자
  │
  ▼
/login 페이지
  │ 이메일 + 비밀번호 입력
  ▼
supabase.auth.signInWithPassword({ email, password })
  │
  ├── 실패 → 에러 메시지 표시 (i18n: loginError 키)
  │
  └── 성공
        │
        ├── 감사 로그 기록 (POST /api/audit, action: LOGIN)
        │
        ├── app_metadata.role === 'student' → /portal 이동
        │
        └── 그 외 (master / agency)         → / 이동 (대시보드)
```

### 감사 로그

로그인 성공 시 `/api/audit`에 비동기로 기록한다:

```typescript
await fetch('/api/audit', {
  method: 'POST',
  body: JSON.stringify({
    action:    'LOGIN',
    user_id:   data.user?.id,
    user_role: appMeta?.role,
    user_name: userMeta?.name_kr,
  }),
}).catch(() => {})  // 실패해도 로그인 흐름에 영향 없음
```

### UI 특징

- 언어 토글 (KO/VI) 지원
- i18n 키 사용: `loginEmail`, `loginPassword`, `loginBtn`, `loginError`, `forgotPassword`, `registerLink`
- 링크: 비밀번호 찾기 (`/auth/reset-password-request`), 학생 자가 등록 (`/register`)

---

## 4. 학생 자가 등록 플로우

### 관련 파일

- `app/register/page.tsx` (클라이언트 폼)
- `app/api/register/route.ts` (서버 API)

### 플로우 다이어그램

```
학생
  │
  ▼
/register 페이지
  │ 필수 입력: name_kr, name_vn, phone_vn, email, password, dob
  │ 선택 입력: agency_id, status, gender
  │ 개인정보 동의 체크박스 (필수)
  ▼
클라이언트 유효성 검사
  │ - 필수 항목 누락 여부
  │ - 비밀번호 8자 이상
  │ - 비밀번호 확인 일치
  │ - 개인정보 동의 여부
  ▼
POST /api/register (서버 API)
  │
  │ [1] Admin API로 auth.users 계정 생성
  │     - email_confirm: true (이메일 인증 없이 바로 사용)
  │     - user_metadata: { role: 'student', name_kr }
  │
  │ [2] students 테이블 처리
  │     ├── 기존 레코드 있음 (고아 레코드)
  │     │   ├── is_approved=true OR auth_user_id 있음 → 중복 에러 (auth 계정 삭제 후 400)
  │     │   └── auth_user_id 없음 → 기존 레코드 UPDATE + auth_user_id 연결
  │     └── 기존 레코드 없음 → 새 레코드 INSERT (is_approved: false)
  │
  │ [3] privacy_consents 테이블에 동의 기록
  │     - consent_type: 'signup'
  │     - consent_text: 개인정보 처리방침 전문
  │
  └── 성공 → 완료 화면 표시 ("관리자 승인 대기 중")
```

### 주요 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 이메일 인증 | 생략 (`email_confirm: true`) | 베트남 학생 이메일 접근성 낮음 |
| 계정 승인 | `is_approved: false` → 관리자 수동 승인 필요 | 무분별한 등록 방지 |
| 역할 부여 | 등록 시 `user_metadata.role: 'student'` (app_metadata는 추후 수동 설정) | Admin API 사용 |
| 고아 레코드 처리 | email 기준으로 기존 레코드 재활용 | 가입 실패 후 재시도 시 중복 방지 |
| 트랜잭션 롤백 | auth 계정 생성 후 students INSERT 실패 시 → auth 계정 삭제 | 데이터 정합성 유지 |

### 개인정보 동의

- 동의 내용: 수집 항목, 수집 목적, 보유 기간, 제3자 제공 여부
- 언어: KO/VI 모두 표시 (페이지 언어에 따라 전환)
- 기록: `privacy_consents` 테이블 (`consent_type: 'signup'`)
- 동의 미체크 시 제출 차단

### 클라이언트 유효성 검사

```
필수 필드: name_kr, name_vn, phone_vn, email, password, dob
비밀번호: 8자 이상
비밀번호 확인: password === password2
개인정보 동의: form.privacy === true
```

---

## 5. 비밀번호 재설정 플로우

### 관련 파일

- `app/auth/reset-password-request/page.tsx` (이메일 입력)
- `app/auth/reset-password/page.tsx` (새 비밀번호 입력)

### 플로우 다이어그램

```
사용자
  │
  ▼
/auth/reset-password-request
  │ 가입 이메일 입력
  ▼
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: '{origin}/auth/reset-password'
})
  │
  ├── 실패 → 에러 메시지 표시
  └── 성공 → "이메일을 확인하세요" 안내 화면

  [사용자 이메일 확인]
  │
  ▼ 재설정 링크 클릭 (Supabase가 URL hash에 토큰 포함)
  ▼
/auth/reset-password
  │
  │ useEffect: onAuthStateChange
  │   └── event === 'PASSWORD_RECOVERY' → ready = true
  │
  │ (ready=false이면 "링크 확인 중..." 표시)
  │
  ▼ (ready=true) 새 비밀번호 폼
  │ - 새 비밀번호 (8자 이상)
  │ - 비밀번호 확인
  ▼
supabase.auth.updateUser({ password })
  │
  ├── 실패 → 에러 메시지 표시
  └── 성공 → "변경 완료" 화면 → 2초 후 /login 이동
```

### Supabase PASSWORD_RECOVERY 이벤트

Supabase는 재설정 링크 클릭 시 URL hash에 세션 토큰을 포함시킨다.
클라이언트는 `onAuthStateChange`로 `PASSWORD_RECOVERY` 이벤트를 수신하여 폼을 활성화한다.
이 이벤트가 오기 전에는 폼이 표시되지 않아 토큰 없는 직접 접근을 차단한다.

---

## 6. JWT / 세션 관리

### 토큰 구조

| 토큰 | 유효 기간 | 용도 |
|------|----------|------|
| Access Token | 1시간 (Supabase 기본값) | API 인증 |
| Refresh Token | 30일 | Access Token 갱신 |

### 클라이언트 세션

Supabase JS SDK가 localStorage에 세션을 자동 저장 및 갱신한다.

### API Route 인증 패턴

클라이언트가 Bearer 토큰을 헤더에 포함하여 전송하고, API Route에서 검증한다:

```typescript
// API Route 공통 패턴
async function getAuthedUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await getServiceClient().auth.getUser(token)
  return user
}
```

**주의**: `@supabase/ssr` 패키지는 미설치 상태. 절대 import 금지.

### 역할 기반 라우팅

```typescript
// 로그인 후 역할에 따른 분기 (app/login/page.tsx)
if (appMeta?.role === 'student') {
  router.push('/portal')
} else {
  router.push('/')
}
```

---

## 7. 보안 고려사항

### app_metadata vs user_metadata

| 항목 | 수정 주체 | 사용 목적 |
|------|----------|----------|
| `app_metadata.role` | 서버(Admin API)만 수정 가능 | 역할 검증 (신뢰 가능) |
| `app_metadata.agency_code` | 서버(Admin API)만 수정 가능 | 유학원 코드 검증 |
| `user_metadata.name_kr` | 클라이언트도 수정 가능 | 표시용 이름만 (권한 판단 금지) |

### Service Role Key 보안

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 (`lib/supabaseServer.ts`)
- 클라이언트 번들에 절대 포함 금지
- Vercel 환경변수에서 `NEXT_PUBLIC_` 접두사 없이 설정

### 학생 자가 등록 보안

- 등록 API (`/api/register`)는 Service Role Key를 사용하여 Admin API로 계정 생성
- 신규 학생은 `is_approved: false`로 생성되어 관리자 승인 전까지 실질적 접근 제한
- 중복 이메일 등록 시 기존 auth 계정 삭제 후 400 에러 반환

### RLS 정책

- `students`: agency는 `agency_id` 일치하는 학생만 조회/수정
- `consultations`, `exam_results`, `student_documents`: 소유 학생 레코드만 접근
- master는 전체 접근 허용

---

## 8. API 명세

### POST /api/register

**설명**: 학생 자가 등록

**인증**: 불필요 (공개 엔드포인트)

**요청 바디**:

```typescript
{
  name_kr:   string          // 한국어 이름 (필수)
  name_vn:   string          // 베트남어 이름 (필수)
  phone_vn:  string | null   // 베트남 전화번호
  email:     string          // 이메일 (필수, 중복 불가)
  password:  string          // 비밀번호 (8자 이상)
  dob:       string | null   // 생년월일 (YYYY-MM-DD)
  gender:    'M' | 'F'       // 성별
  status:    string          // 유학 단계 (예: '유학전', '어학연수')
  agency_id: string | null   // 유학원 ID (선택)
}
```

**응답**:

```typescript
// 성공 (200)
{ success: true }

// 실패 (400)
{ error: '이미 등록된 이메일입니다.' }
{ error: '계정 생성 실패: ...' }

// 서버 오류 (500)
{ error: '서버 오류: ...' }
```

**처리 순서**:
1. Supabase Admin API로 `auth.users` 계정 생성
2. `students` 테이블 INSERT (또는 고아 레코드 UPDATE)
3. `privacy_consents` 테이블 INSERT
4. 실패 시 생성된 auth 계정 롤백 삭제

### PATCH /api/student-documents/[id]

**설명**: 서류 상태 변경 (승인/반려 포함)

**인증**: Bearer Token 필수

**역할별 수정 가능 필드**:

| 필드 | student | agency | master |
|------|:-------:|:------:|:------:|
| `self_checked` | O | - | - |
| `status: submitted` | O (pending일 때만) | O | O |
| `status: approved/rejected` | - | O | O |
| `reject_reason` | - | O | O |
| `reviewer_name` | - | O | O |
| `file_url`, `file_name` | O | O | O |
| `expiry_date` | O | O | O |

**이메일 발송**: `status`가 `approved` 또는 `rejected`로 변경 시 자동 발송 (비동기)
