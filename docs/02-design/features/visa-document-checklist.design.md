# Design: 비자 서류 체크리스트 관리 시스템

**Feature**: visa-document-checklist
**Phase**: Design
**Created**: 2026-02-22
**Reference Plan**: `docs/01-plan/features/visa-document-checklist.plan.md`

---

## 1. DB 스키마 설계

### 1-1. `document_types` 테이블

```sql
CREATE TABLE document_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_kr     VARCHAR(100) NOT NULL,           -- '여권'
  name_vi     VARCHAR(100) NOT NULL,           -- 'Hộ chiếu'
  category    VARCHAR(30)  NOT NULL            -- 'identity' | 'school' | 'financial' | 'health'
              CHECK (category IN ('identity','school','financial','health')),
  visa_types  TEXT[]       NOT NULL DEFAULT '{}', -- '{}' = 전체, '{D-2,D-4}' = 해당 비자만
  is_required BOOLEAN      NOT NULL DEFAULT true,
  has_expiry  BOOLEAN      NOT NULL DEFAULT false, -- 서류 자체의 만료일 존재 여부
  sort_order  INT          NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
-- 전체 읽기 (student/agency/master 모두)
CREATE POLICY "document_types_read" ON document_types
  FOR SELECT USING (true);
-- 쓰기는 master만
CREATE POLICY "document_types_write" ON document_types
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'master'
  );
```

### 1-2. `student_documents` 테이블

```sql
CREATE TABLE student_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_type_id    UUID NOT NULL REFERENCES document_types(id),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','submitted','reviewing','approved','rejected')),
  -- 학생 자가 체크 (submitted 전환)
  self_checked   BOOLEAN NOT NULL DEFAULT false,
  self_checked_at TIMESTAMPTZ,
  -- 제출 정보
  submitted_at   TIMESTAMPTZ,
  expiry_date    DATE,              -- 서류 자체 만료일 (has_expiry=true일 때)
  -- 파일 업로드
  file_url       TEXT,              -- Supabase Storage URL
  file_name      VARCHAR(255),      -- 원본 파일명
  -- 관리자 검토
  reviewer_id    UUID,              -- auth.users.id
  reviewer_name  VARCHAR(100),      -- 검토자 이름 (denormalized)
  reviewed_at    TIMESTAMPTZ,
  reject_reason  TEXT,              -- 반려 사유
  notes          TEXT,              -- 관리자 메모 (학생에게 미노출)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, doc_type_id)  -- 학생+서류유형 중복 방지
);

-- 자동 updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER student_documents_updated_at
  BEFORE UPDATE ON student_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

-- 학생: 본인 서류만 SELECT + 자가 체크 UPDATE
CREATE POLICY "student_docs_student_read" ON student_documents
  FOR SELECT USING (
    student_id = (
      SELECT id FROM students WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );
CREATE POLICY "student_docs_student_update" ON student_documents
  FOR UPDATE USING (
    student_id = (
      SELECT id FROM students WHERE auth_user_id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    -- 학생은 self_checked, submitted_at, expiry_date, file_url, file_name만 수정 가능
    -- status는 'pending' → 'submitted'만 허용 (reviewer 컬럼 변경 불가)
    reviewer_id IS NOT DISTINCT FROM OLD.reviewer_id
  );

-- agency: 자기 학생 서류 SELECT + UPDATE (status 변경)
CREATE POLICY "student_docs_agency_select" ON student_documents
  FOR SELECT USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students
      WHERE agency_id = (
        SELECT id FROM agencies WHERE user_id = auth.uid() LIMIT 1
      )
    )
  );
CREATE POLICY "student_docs_agency_update" ON student_documents
  FOR UPDATE USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students
      WHERE agency_id = (
        SELECT id FROM agencies WHERE user_id = auth.uid() LIMIT 1
      )
    )
  );

-- master: 전체 CRUD
CREATE POLICY "student_docs_master" ON student_documents
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'master'
  );
```

### 1-3. `document_alert_logs` 테이블

```sql
CREATE TABLE document_alert_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_type_id  UUID REFERENCES document_types(id),  -- NULL = 전체 서류 종합 알림
  alert_type   VARCHAR(30) NOT NULL
               CHECK (alert_type IN ('missing','expiry_warning','status_changed')),
  days_before  INT,        -- expiry_warning 시 서류 만료까지 남은 일수
  channel      VARCHAR(20) NOT NULL DEFAULT 'email'
               CHECK (channel IN ('email','in_app')),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: service_role만 INSERT, master는 SELECT
ALTER TABLE document_alert_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_alert_logs_master_read" ON document_alert_logs
  FOR SELECT USING (
    (auth.jwt()->'app_metadata'->>'role') = 'master'
  );
```

### 1-4. 초기 데이터 (document_types SEED)

```sql
INSERT INTO document_types (name_kr, name_vi, category, visa_types, is_required, has_expiry, sort_order) VALUES
('여권',                'Hộ chiếu',                      'identity',  '{}',          true,  true,  1),
('외국인등록증 (ARC)',  'Thẻ cư trú ngoại quốc',         'identity',  '{}',          true,  true,  2),
('증명사진 (3x4)',      'Ảnh thẻ (3×4)',                 'identity',  '{}',          true,  false, 3),
('건강진단서',          'Giấy khám sức khỏe',            'health',    '{}',          true,  true,  4),
('건강보험 카드',       'Thẻ bảo hiểm y tế',             'health',    '{}',          true,  true,  5),
('재학증명서',          'Giấy xác nhận đang học',        'school',    '{D-4}',       true,  true,  6),
('입학허가서',          'Thư chấp nhận nhập học',        'school',    '{D-2}',       true,  true,  7),
('성적증명서',          'Bảng điểm học tập',             'school',    '{D-2}',       true,  false, 8),
('통장 잔액증명',       'Sao kê tài khoản ngân hàng',    'financial', '{}',          true,  false, 9),
('보증인 서류',         'Giấy bảo lãnh',                 'financial', '{}',          false, false, 10);
```

---

## 2. TypeScript 타입 설계

`lib/types.ts`에 추가:

```typescript
export type DocCategory = 'identity' | 'school' | 'financial' | 'health'
export type DocStatus   = 'pending' | 'submitted' | 'reviewing' | 'approved' | 'rejected'

export interface DocumentType {
  id:          string
  name_kr:     string
  name_vi:     string
  category:    DocCategory
  visa_types:  string[]      // [] = 전체, ['D-2'] = D-2만
  is_required: boolean
  has_expiry:  boolean
  sort_order:  number
  is_active:   boolean
  created_at:  string
}

export interface StudentDocument {
  id:               string
  student_id:       string
  doc_type_id:      string
  status:           DocStatus
  self_checked:     boolean
  self_checked_at?: string
  submitted_at?:    string
  expiry_date?:     string   // 서류 자체 만료일
  file_url?:        string
  file_name?:       string
  reviewer_id?:     string
  reviewer_name?:   string
  reviewed_at?:     string
  reject_reason?:   string
  notes?:           string
  created_at:       string
  updated_at:       string
  // JOIN
  doc_type?:        DocumentType
}
```

---

## 3. API 설계

### 3-1. `GET /api/student-documents?studentId=xxx`

**권한**: master (전체), agency (자기 학생), student (본인)

**응답**:
```json
[
  {
    "id": "uuid",
    "student_id": "uuid",
    "doc_type_id": "uuid",
    "status": "pending",
    "self_checked": false,
    "expiry_date": null,
    "file_url": null,
    "doc_type": {
      "name_kr": "여권",
      "name_vi": "Hộ chiếu",
      "category": "identity",
      "is_required": true,
      "has_expiry": true
    }
  }
]
```

**구현 로직**:
1. 학생의 비자 타입에 맞는 `document_types` 조회
2. 해당 학생의 `student_documents` 조회 (없으면 pending 레코드 자동 생성)
3. JOIN하여 반환

### 3-2. `PATCH /api/student-documents/[id]`

**권한별 수정 가능 필드**:

| 필드 | student | agency | master |
|------|:-------:|:------:|:------:|
| self_checked | ✅ | - | - |
| status (→submitted) | ✅ | - | - |
| expiry_date | ✅ | ✅ | ✅ |
| file_url / file_name | ✅ | ✅ | ✅ |
| status (→reviewing/approved/rejected) | - | ✅ | ✅ |
| reviewer_name, reviewed_at | - | ✅ | ✅ |
| reject_reason, notes | - | ✅ | ✅ |

**Request Body** (학생):
```json
{ "self_checked": true, "status": "submitted", "expiry_date": "2027-03-01" }
```

**Request Body** (관리자):
```json
{ "status": "rejected", "reject_reason": "서류가 만료됨", "reviewer_name": "홍길동" }
```

### 3-3. `GET /api/document-types` (관리자 전용)
- 전체 서류 유형 목록 반환 (is_active 포함)

### 3-4. `POST /api/document-types` (master 전용)
- 서류 유형 추가

### 3-5. `PATCH /api/document-types/[id]` (master 전용)
- 서류 유형 수정 (is_active 토글 포함)

### 3-6. `GET /api/cron/document-alerts` (Cron)
- **인증**: `Authorization: Bearer {CRON_SECRET}`
- **실행 시간**: 매일 01:10 KST (비자 알림 5분 후)
- **로직**:
  1. 미제출 필수 서류 있는 학생 조회 → 비자 갱신 90/30/7일 내 학생에게만 이메일
  2. 서류 만료일 30/7일 전인 서류 보유 학생 조회 → 갱신 알림
  3. `document_alert_logs`에 중복 체크 후 발송

---

## 4. UI 설계

### 4-1. 학생 포털 (`app/portal/page.tsx`)

#### 탭 추가
```
기존: info | consult | exam | account
변경: info | docs | consult | exam | account
```

#### 포털 Info 탭 상단 — 서류 현황 요약 카드
```
┌─────────────────────────────────────────┐
│  서류 준비 현황                          │
│  ████████░░  7/10 완료 (70%)           │
│  미제출 3건  ⚠️ 만료 임박 1건           │
│  [서류 탭으로 이동 →]                   │
└─────────────────────────────────────────┘
```

#### 서류 탭 (DocumentTab.tsx)
```
카테고리 탭: [신분서류] [학교서류] [재정서류] [건강서류]

신분서류 (3/3)
  ✅ 여권           승인   만료: 2028-01-15   [파일보기]
  ⏳ 외국인등록증   제출됨  만료: 2027-03-01   [파일보기]
  ❌ 증명사진       미제출                      [체크하기] [파일업로드]

학교서류 (1/2)
  ✅ 재학증명서     승인   만료: 2026-08-31   [파일보기]
  ❌ 입학허가서     미제출                      [체크하기] [파일업로드]
```

**각 서류 항목 동작**:
- **[체크하기]**: `self_checked = true`, `status = submitted` 업데이트
- **[파일업로드]**: Supabase Storage 업로드 → URL 저장 → status submitted
- **상태 배지**: pending(회색), submitted(파랑), reviewing(노랑), approved(초록), rejected(빨강)
- **만료 임박**: expiry_date까지 30일 이내 → 주황 경고, 7일 이내 → 빨강 경고
- **반려 시**: reject_reason 표시 (관리자 메모 notes는 미노출)

### 4-2. 관리자 학생 상세 (`app/students/[id]/_components/DocumentChecklist.tsx`)

```
탭 추가: info | consult | exam | evaluation | docs | consent

서류 체크리스트 (8/10 완료 — 80%)
────────────────────────────────────
[identity] [school] [financial] [health]

신분서류
  여권           ✅ 승인  2026-02-10  만료: 2028-01-15  [파일]
  외국인등록증   ⏳ 검토중 2026-02-15  만료: 2027-03-01  [승인] [반려]
  증명사진       ❌ 미제출                               [직접체크]

상태변경 드롭다운: pending | submitted | reviewing | approved | rejected
반려 시: textarea로 반려사유 입력
직접체크: 관리자가 대신 submitted 처리
```

### 4-3. 서류 유형 관리 페이지 (`app/admin/document-types/page.tsx`)
- master role 전용
- 서류 유형 목록 테이블 (이름, 카테고리, 비자타입, 필수여부, 활성화)
- 토글로 활성/비활성 전환
- "추가" 버튼 → 모달로 입력

---

## 5. 파일 업로드 설계

### Supabase Storage 버킷: `student-documents`

**경로 규칙**: `{student_id}/{doc_type_id}/{timestamp}_{원본파일명}`

**예시**: `2e0bc937.../d4f1a8.../1740200000_여권사본.pdf`

**버킷 정책**:
```sql
-- 학생: 본인 폴더만 업로드/조회
-- agency: 자기 학생 폴더 조회
-- master: 전체 조회
```

**파일 제한**:
- 최대 크기: 10MB
- 허용 형식: PDF, JPG, PNG, HEIC

---

## 6. 알림 이메일 설계

### 6-1. 미제출 서류 알림 (비자 갱신 D-90/30/7)

비자 알림과 통합하거나 별도 Cron으로 실행.
**subject**: `[AJU E&J] 비자 갱신 D-{N} — 미제출 서류 {M}건`

```html
비자 만료가 D-{N}일 남았습니다.
비자 갱신 전 준비가 필요한 서류:

❌ 재학증명서 (미제출)
❌ 통장 잔액증명 (미제출)
⚠️ 건강보험 카드 (만료 임박: 2026-03-01)

[포털에서 서류 확인하기 →]
```

### 6-2. 서류 만료 임박 알림 (D-30/7)

**subject**: `[AJU E&J] 서류 갱신 필요 — {서류명} 만료 D-{N}`

### 6-3. 상태 변경 알림 (승인/반려)

관리자가 status를 approved/rejected로 변경 시 즉시 발송.

**subject**: `[AJU E&J] 서류 검토 완료 — {서류명} {승인/반려}`

---

## 7. 구현 순서 (상세)

```
Step 1. DB 마이그레이션
  - supabase-document-checklist.sql 작성
  - Supabase에 SQL 실행 (curl로 실행)
  - Storage 버킷 생성

Step 2. TypeScript 타입 추가
  - lib/types.ts: DocumentType, StudentDocument

Step 3. API 구현
  - app/api/student-documents/route.ts (GET, POST upsert)
  - app/api/student-documents/[id]/route.ts (PATCH)
  - app/api/document-types/route.ts (GET, POST)
  - app/api/document-types/[id]/route.ts (PATCH)

Step 4. 관리자 UI
  - app/students/[id]/_components/DocumentChecklist.tsx
  - app/students/[id]/page.tsx 탭 추가 ('docs')

Step 5. 학생 포털 UI
  - app/portal/_components/DocumentTab.tsx
  - app/portal/page.tsx: 탭 추가 + Info 탭 요약 카드

Step 6. 알림 Cron
  - app/api/cron/document-alerts/route.ts
  - vercel.json: cron 추가

Step 7. (선택) 서류 유형 관리 페이지
  - app/admin/document-types/page.tsx
```

---

## 8. 상태 전환 다이어그램

```
pending
  ↓ (학생 자가 체크 or 파일 업로드)
submitted
  ↓ (관리자 검토 시작)
reviewing
  ↓ (관리자 판단)
approved ✅  /  rejected ❌
  ↑ (반려 후 재제출 가능)
submitted (다시 재시작)
```

---

## 9. 완료 기준 체크리스트

### DB/백엔드
- [ ] `document_types` 테이블 + RLS 생성됨
- [ ] `student_documents` 테이블 + RLS + trigger 생성됨
- [ ] `document_alert_logs` 테이블 + RLS 생성됨
- [ ] 초기 서류 데이터 10건 INSERT됨
- [ ] `GET /api/student-documents` 동작 (학생 비자타입 기반 필터)
- [ ] `PATCH /api/student-documents/[id]` 동작 (권한별 필드 제한)
- [ ] `GET/POST /api/document-types` 동작 (master 전용)
- [ ] `PATCH /api/document-types/[id]` 동작
- [ ] `GET /api/cron/document-alerts` Cron 동작

### 학생 포털
- [ ] 포털 탭에 '서류' 탭 추가됨
- [ ] 카테고리별 서류 목록 표시됨
- [ ] 학생이 self_checked (자가 체크) 가능
- [ ] 파일 업로드 가능 (Supabase Storage)
- [ ] 서류 상태 배지 표시됨
- [ ] 만료 임박 서류 색상 경고 표시됨
- [ ] 반려 시 reject_reason 표시됨
- [ ] Info 탭 상단 서류 현황 요약 카드 표시됨

### 관리자 UI
- [ ] 학생 상세에 '서류' 탭 추가됨
- [ ] 관리자가 status 변경 가능
- [ ] 반려 사유 입력 가능
- [ ] 파일 다운로드 가능
- [ ] 관리자 직접 체크 가능

### 알림
- [ ] 미제출 서류 이메일 알림 발송 (비자 D-90/30/7)
- [ ] 서류 만료 임박 알림 발송 (D-30/7)
- [ ] `document_alert_logs`에 이력 기록됨
- [ ] 중복 발송 방지 로직 동작

### 품질
- [ ] `npx tsc --noEmit` 타입 오류 없음
- [ ] 모든 텍스트 KR/VI 다국어 처리
- [ ] RLS 정책 학생/agency/master 권한 분리 확인
