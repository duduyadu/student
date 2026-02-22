# v2 - 학생 자가등록 + 사진 + 이메일 알림 통합 Plan

> **Feature**: v2-student-self-registration
> **Version**: 1.0
> **Created**: 2026-02-17
> **Platform**: Next.js 14 App Router + Supabase + Vercel
> **PDCA Phase**: Plan
> **Level**: Dynamic

---

## 1. 배경 및 목표

### 1.1 현재 시스템 한계

| 항목 | 현재 상태 | 문제점 |
|------|-----------|--------|
| 학생 등록 | 관리자/유학원만 가능 | 학생이 직접 정보 입력 불가 |
| 개인정보 동의 | 없음 | 개인정보보호법 위반 위험 |
| 사진 관리 | 플레이스홀더만 존재 | 실제 사진 업로드 불가 |
| 비자 알림 | 대시보드에서만 확인 | 이메일로 자동 알림 없음 |

### 1.2 목표 (3개 기능 + 추가 검토 사항)

1. **학생 자가 등록** — 학생이 직접 `/register`에서 회원가입
2. **개인정보 동의 관리** — 가입 시 동의 필수, 기록 보존
3. **사진 첨부** — 프로필 사진 업로드 (Supabase Storage)
4. **비자 만료 이메일 알림** — 자동 이메일 발송 (Resend + Vercel Cron)

---

## 2. 기능 요구사항

### Feature A: 학생 자가 등록 (`/register`)

**Priority**: High | **Complexity**: High

#### 필수 입력 필드 (사용자 요구사항)

| 필드 | 타입 | 비고 |
|------|------|------|
| 이름 (한국어) | text | 필수 |
| 이름 (베트남어) | text | 필수 |
| 전화번호 | tel | 필수 (베트남 번호) |
| 이메일 | email | 필수 (로그인 ID) |
| 비밀번호 | password | 필수, 8자 이상 |
| **유학 단계** | select | **필수** — 유학전/어학연수/대학교/취업 |
| 유학원 | select | 선택 |
| 개인정보 동의 | checkbox | **필수** — 미체크 시 가입 불가 |

#### 선택 입력 필드

- 생년월일, 성별
- 학부모 이름/연락처 (베트남어)

#### 플로우

```
/register 페이지 접근 (공개, 로그인 불필요)
   ↓
필수 정보 입력 + 개인정보 동의 체크
   ↓
Supabase Auth → 이메일 인증 발송 (Supabase 내장)
   ↓
이메일 인증 링크 클릭
   ↓
students 테이블 레코드 자동 생성
privacy_consents 테이블에 동의 기록
   ↓
승인 대기 상태 (is_approved = false)
   ↓
관리자가 승인 → is_approved = true
   ↓
/portal 로그인 가능
```

#### 관리자 승인 시스템

- 신규 가입 학생은 `is_approved = false` 상태
- 관리자 대시보드에서 신규 가입 알림 표시
- 승인 버튼 클릭 시 `is_approved = true` + student_code 자동 생성
- **이유**: 허위 가입 방지, 유학원과 연결 확인 필요

---

### Feature B: 개인정보 동의 관리

**Priority**: Critical | **Complexity**: Low

#### DB 변경

**신규 테이블: `privacy_consents`**

```sql
CREATE TABLE privacy_consents (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id    uuid REFERENCES students(id),
  consent_date  timestamptz DEFAULT now(),
  consent_type  text,  -- 'signup', 'periodic'
  ip_address    text,
  consent_text  text,  -- 동의 문구 전문 스냅샷
  created_at    timestamptz DEFAULT now()
);
```

**students 테이블 컬럼 추가**

```sql
ALTER TABLE students
  ADD COLUMN is_approved boolean DEFAULT false,
  ADD COLUMN photo_url   text,
  ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
```

#### 개인정보처리방침 페이지 (`/privacy`)

- 수집 항목: 이름, 전화번호, 이메일, 비자 정보
- 수집 목적: 유학 관리 서비스 제공
- 보유 기간: 졸업 후 3년
- 제3자 제공: 없음
- 열람/삭제 요청 방법: 담당자 연락처

---

### Feature C: 사진 첨부 (Supabase Storage)

**Priority**: Medium | **Complexity**: Medium

#### 구현 방법

1. **Supabase Storage 버킷** `student-photos` 생성
   - Public 버킷 (이미지 URL 직접 접근)
   - 파일 크기 제한: 5MB
   - 허용 타입: image/jpeg, image/png, image/webp

2. **업로드 UI** (학생 상세 페이지 `/students/[id]`)
   - 프로필 아바타 클릭 → 파일 선택 다이얼로그
   - 업로드 후 즉시 화면에 반영
   - 기존 사진 있으면 덮어쓰기 (같은 파일명 사용)

3. **파일명 규칙**: `student-photos/{student_id}/profile.jpg`

4. **RLS 정책**
   - 본인 또는 master/agency 역할만 업로드 가능
   - 읽기: 공개

---

### Feature D: 비자 만료 이메일 알림

**Priority**: High | **Complexity**: Medium

#### 기술 스택

- **이메일 서비스**: [Resend](https://resend.com) (무료: 3,000 emails/월)
- **스케줄링**: Vercel Cron Jobs (`vercel.json`)
- **API 라우트**: `/api/cron/visa-expiry`

#### 알림 시나리오

| 단계 | 조건 | 수신자 | 내용 |
|------|------|--------|------|
| D-90 | 비자 만료 90일 전 | 학생 이메일 | 비자 갱신 준비 안내 |
| D-30 | 비자 만료 30일 전 | 학생 + 관리자 | 갱신 서류 준비 촉구 |
| D-7 | 비자 만료 7일 전 | 학생 + 관리자 | 긴급 조치 필요 경고 |

#### 구현

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/visa-expiry",
      "schedule": "0 9 * * *"
    }
  ]
}
```

```typescript
// app/api/cron/visa-expiry/route.ts
// 매일 오전 9시 (KST: 00:00 UTC)
// 1. Supabase에서 D-7, D-30, D-90 해당 학생 조회
// 2. 각 학생 이메일로 Resend API 발송
// 3. email_logs 테이블에 기록
```

#### 이메일 로그 테이블

```sql
CREATE TABLE email_logs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   uuid REFERENCES students(id),
  email_type   text,  -- 'visa_d90', 'visa_d30', 'visa_d7'
  sent_to      text,
  sent_at      timestamptz DEFAULT now(),
  status       text,  -- 'sent', 'failed'
  error_msg    text
);
```

---

## 3. 추가 검토 사항 (권장)

### 3.1 학생 포털 (`/portal`) — 추천 ⭐

학생이 직접 자기 정보 조회하는 페이지.
- 자신의 기본정보, 비자 만료일 확인
- 상담 신청 (관리자에게 메시지)
- 시험 성적 확인

**판단**: 학생 자가 등록을 구현하면 포털도 함께 만들어야 의미가 있음.

### 3.2 관리자 승인 알림

신규 가입 학생 있을 때 관리자 이메일 알림.
- 매일 오전 9시 미승인 학생 수 발송 (비자 알림 cron과 통합 가능)

### 3.3 비밀번호 재설정 (`/auth/reset-password`)

Supabase Auth 내장 기능으로 쉽게 구현 가능.
- 로그인 페이지에 "비밀번호 찾기" 링크 추가

### 3.4 알림 발송 중복 방지

같은 날 D-30 이메일이 이미 발송된 학생에게 중복 발송 방지.
- `email_logs` 테이블 조회: 최근 7일 내 동일 유형 발송 여부 확인

---

## 4. DB 마이그레이션 목록

```sql
-- 1. students 테이블 컬럼 추가
ALTER TABLE students
  ADD COLUMN is_approved  boolean  DEFAULT false,
  ADD COLUMN photo_url    text,
  ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);

-- 2. privacy_consents 테이블 생성
CREATE TABLE privacy_consents ( ... );

-- 3. email_logs 테이블 생성
CREATE TABLE email_logs ( ... );

-- 4. Supabase Storage 버킷 생성
-- (Supabase 대시보드 또는 supabase-js로 생성)
```

---

## 5. 구현 순서 (권장)

```
Phase 1 (DB + Storage 준비)
  → Supabase 마이그레이션 실행
  → Storage 버킷 생성 + RLS 정책
  → 개인정보처리방침 페이지 (/privacy)

Phase 2 (사진 첨부)
  → 학생 상세 페이지 사진 업로드 UI
  → 프로필 아바타 표시

Phase 3 (이메일 알림)
  → Resend API 키 발급 + 환경변수 설정
  → /api/cron/visa-expiry 구현
  → vercel.json 크론 설정
  → 테스트 (수동 API 호출)

Phase 4 (학생 자가 등록)
  → /register 페이지 구현
  → 관리자 승인 UI (대시보드에 추가)
  → 학생 포털 (/portal) 기본 페이지

Phase 5 (마무리)
  → 비밀번호 재설정 (/auth/reset-password)
  → 전체 테스트
```

---

## 6. 예상 작업량

| Phase | 작업 내용 | 예상 |
|-------|-----------|------|
| Phase 1 | DB 마이그레이션 + Storage | 0.5일 |
| Phase 2 | 사진 첨부 UI | 1일 |
| Phase 3 | 이메일 알림 | 1일 |
| Phase 4 | 학생 자가 등록 + 승인 | 2일 |
| Phase 5 | 포털 + 비밀번호 재설정 | 1일 |
| **합계** | | **~5.5일** |

---

## 7. 외부 서비스 필요 목록

| 서비스 | 용도 | 가격 | 비고 |
|--------|------|------|------|
| **Resend** | 이메일 발송 | 무료 3,000건/월 | resend.com 가입 필요 |
| **Supabase Storage** | 사진 보관 | 무료 1GB | 이미 Supabase 사용 중 |
| **Vercel Cron** | 매일 알림 발송 | 무료 (Hobby) | vercel.json 설정만 |

---

## 8. 성공 기준

- [ ] 학생이 직접 `/register`에서 가입 가능 (필수 필드 검증 포함)
- [ ] 개인정보 동의 체크 없으면 가입 불가
- [ ] 동의 내용이 `privacy_consents` 테이블에 기록됨
- [ ] 관리자가 신규 가입 학생 승인/거부 가능
- [ ] 학생 사진 업로드 및 프로필 표시 작동
- [ ] D-7/D-30/D-90 이메일 자동 발송 (중복 없음)
- [ ] 이메일 발송 기록이 `email_logs`에 남음

---

**Generated by**: bkit PDCA Planning System
**Date**: 2026-02-17
**Project**: AJU E&J 학생관리 프로그램
**PDCA Feature**: v2-student-self-registration
