# 이메일 알림 시스템 (Email Notifications) — Design

## 1. 개요

서류 상태 변경 시 학생에게 자동으로 이메일을 발송하는 알림 시스템이다.
관리자(master/agency)가 서류를 승인(`approved`) 또는 반려(`rejected`)하면 해당 학생의 이메일로 결과를 통보한다.

- **발송 주체**: 서버 (Next.js API Route)
- **수신 대상**: 학생 (`students.email`)
- **발송 시점**: `PATCH /api/student-documents/[id]` — 상태가 `approved` 또는 `rejected`로 변경될 때
- **비동기 처리**: 이메일 발송은 API 응답을 블로킹하지 않는다 (fire-and-forget)

---

## 2. 사용 라이브러리 (Resend)

| 항목 | 값 |
|------|-----|
| 라이브러리 | `resend` (npm) |
| 공식 문서 | https://resend.com/docs |
| 유틸리티 파일 | `lib/email.ts` |
| 핵심 함수 | `sendDocStatusEmail(params)` |

### 클라이언트 초기화

```typescript
// lib/email.ts
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null
```

`RESEND_API_KEY`가 없으면 `resend` 인스턴스가 `null`이 되어 발송이 자동 스킵된다.
로컬 개발 환경에서 API 키 없이도 기존 기능은 정상 동작한다.

---

## 3. 알림 트리거 조건

### 트리거 위치

`app/api/student-documents/[id]/route.ts` — `PATCH` 핸들러 내부

### 트리거 조건

```
newStatus === 'approved' || newStatus === 'rejected'
```

상태 전이표:

| 이전 상태 | 새 상태 | 이메일 발송 |
|-----------|---------|:-----------:|
| 어떤 상태 | `approved` | O |
| 어떤 상태 | `rejected` | O |
| 어떤 상태 | `pending` / `submitted` / `reviewing` | X |

### 데이터 조회 순서

1. `student_documents` 테이블에서 `student_id` 조회
2. `students` 테이블에서 `name_kr`, `email` 조회
3. `student_documents` JOIN `document_types`에서 `name_kr`(서류명) 조회
4. `sendDocStatusEmail()` 호출

### 비동기 처리 패턴

```typescript
// API 응답 반환 후 비동기로 이메일 발송 (블로킹 없음)
supabase.from('students')
  .select('name_kr, email')
  .eq('id', doc.student_id)
  .single()
  .then(({ data: student }) => {
    if (!student?.email) return
    // ... document_types 조회 후 sendDocStatusEmail() 호출
  })
```

---

## 4. 이메일 템플릿

### 공통 구조

- **발신자**: `RESEND_FROM_EMAIL` 환경변수 (미설정 시 `AJU E&J <noreply@aju-ej.com>`)
- **언어**: 한국어 고정 (학생 이메일)
- **형식**: HTML (인라인 스타일)
- **최대 너비**: 480px

### 승인 템플릿 (`approved`)

| 요소 | 내용 |
|------|------|
| 제목 | `[AJU E&J] 서류 승인 완료 — {서류명}` |
| 헤더 색상 | 파란색 (`#1e40af`) |
| 아이콘 | ✅ |
| 상태 표시 색상 | 초록색 (`#16a34a`) |
| 내용 | "{학생명}님, {서류명} 서류가 승인되었습니다." |

### 반려 템플릿 (`rejected`)

| 요소 | 내용 |
|------|------|
| 제목 | `[AJU E&J] 서류 반려 안내 — {서류명}` |
| 헤더 색상 | 빨간색 (`#dc2626`) |
| 아이콘 | ❌ |
| 상태 표시 색상 | 빨간색 (`#dc2626`) |
| 내용 | "{학생명}님, {서류명} 서류가 반려되었습니다." |
| 반려 사유 박스 | `reject_reason` 있을 때만 표시 (연한 빨간 배경) |
| 안내 문구 | "서류를 다시 확인 후 재제출해 주세요." |

### 함수 시그니처

```typescript
sendDocStatusEmail(params: {
  to: string            // 수신 이메일 (students.email)
  studentName: string   // 학생 이름 (students.name_kr)
  docNameKr: string     // 서류명 (document_types.name_kr)
  status: 'approved' | 'rejected'
  rejectReason?: string // 반려 사유 (student_documents.reject_reason)
}): Promise<void>
```

---

## 5. 환경변수 설정

| 변수명 | 필수 | 설명 | 예시 |
|--------|:----:|------|------|
| `RESEND_API_KEY` | 선택 | Resend API 인증 키. 없으면 발송 스킵 | `re_xxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | 선택 | 발신자 표시 이름 + 이메일 | `AJU E&J <noreply@aju-ej.com>` |

### 설정 위치

```
# .env.local (로컬 개발)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=AJU E&J <noreply@aju-ej.com>

# Vercel Dashboard → Settings → Environment Variables
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=AJU E&J <noreply@aju-ej.com>
```

### 도메인 인증 상태

- **현재**: `onboarding@resend.dev` (Resend 기본 도메인, 테스트용)
- **운영 목표**: 커스텀 도메인 인증 후 `RESEND_FROM_EMAIL` 교체
  - Resend Dashboard → Domains → 도메인 추가 → DNS TXT/MX 레코드 등록

---

## 6. 에러 처리 (API 키 없을 때 스킵)

### 스킵 조건

```typescript
// lib/email.ts
if (!resend) return  // RESEND_API_KEY 없으면 즉시 반환
```

### 발송 실패 처리

```typescript
try {
  await resend.emails.send({ from: FROM, to, subject, html: body })
} catch (err) {
  // 이메일 실패해도 메인 작업(서류 상태 변경)은 유지됨
  console.error('[email] send failed:', err)
}
```

### 에러 격리 원칙

- 이메일 발송 실패는 `PATCH` API의 성공 응답에 영향을 주지 않는다.
- 학생의 이메일 주소(`students.email`)가 없으면 발송을 건너뛴다.
- 모든 에러는 서버 콘솔에 기록된다 (`console.error`).

### 에러 시나리오별 동작

| 시나리오 | 동작 |
|----------|------|
| `RESEND_API_KEY` 미설정 | 발송 스킵 (정상 동작) |
| `students.email` 없음 | 발송 스킵 (정상 동작) |
| Resend API 오류 | 콘솔 에러 기록 후 무시 |
| `document_types` 조회 실패 | 서류명 `'서류'` 기본값 사용 후 발송 |

---

## 7. 향후 확장 계획

### 단기

- **비자 만료 알림 이메일화**: 현재 콘솔/크론 알림을 이메일로도 발송
- **이메일 언어 다국어 지원**: 학생의 `preferred_lang`(`ko`/`vi`) 에 따라 한국어/베트남어 템플릿 분기
- **서류 제출 확인 이메일**: 학생이 서류를 제출(`submitted`)하면 확인 메일 발송

### 중기

- **이메일 발송 이력 테이블**: `email_logs` 테이블 추가로 발송 이력 추적
- **재시도 메커니즘**: 발송 실패 시 최대 3회 재시도 (지수 백오프)
- **커스텀 도메인 인증**: `@aju-ej.com` 도메인 Resend 인증 완료

### 장기

- **이메일 템플릿 관리 UI**: 관리자가 템플릿을 직접 편집할 수 있는 인터페이스
- **알림 수신 설정**: 학생별로 이메일 수신 동의 여부 관리
- **알림톡/SMS 대체 발송**: 이메일 실패 시 알림톡으로 폴백
