# Plan: 비자 서류 체크리스트 관리 시스템

**Feature**: visa-document-checklist
**Phase**: Plan
**Created**: 2026-02-22
**Author**: AJU E&J 개발팀

---

## 1. 배경 및 목적

베트남 유학생의 비자 준비 과정에서 필수 서류 누락은 비자 거절의 주요 원인이다.
현재 시스템은 비자 만료일 알림만 제공하며, 서류 준비 상태를 추적하는 기능이 없다.

**핵심 목표**:
- 학생이 포털에서 서류 준비 상태를 직접 체크할 수 있게 한다
- 관리자(master/agency)가 서류 검토 및 상태 업데이트를 할 수 있게 한다
- 필수 서류 미준비 시 학생·관리자 모두에게 알림을 보낸다

---

## 2. 사용자 요구사항

### 명시적 요구사항 (사용자 직접 요청)
| # | 요구사항 | 우선순위 |
|---|----------|----------|
| R-01 | 학생이 포털에서 서류 준비 상태 체크 가능 | P0 |
| R-02 | 관리자가 학생 서류 상태 확인/업데이트 가능 | P0 |
| R-03 | 필수 서류 미준비 시 알림 발송 | P0 |

### 추가 발굴 요구사항 (사용자가 생각하지 못한 것)
| # | 요구사항 | 이유 |
|---|----------|------|
| R-04 | 비자 종류별 서류 목록 차별화 (D-2 vs D-4) | 비자 유형마다 필요 서류가 다름 |
| R-05 | 서류별 만료일 추적 (여권, ARC, 건강보험) | 서류도 기한이 있어 갱신 관리 필요 |
| R-06 | 서류 파일 업로드 (선택) | 관리자가 원본 확인 필요 시 유용 |
| R-07 | 서류 준비 진행률(%) 표시 | 학생의 동기 부여 및 관리자 대시보드용 |
| R-08 | 서류 카테고리 분류 (신분, 학교, 재정, 건강) | 단계별 준비 가이드 제공 |
| R-09 | 서류 상태 이력 (언제 누가 업데이트) | 감사 로그 및 분쟁 방지 |
| R-10 | 관리자가 서류 항목 추가/삭제 (템플릿 관리) | 비자 정책 변경 시 유연한 대응 |
| R-11 | 학생 포털 대시보드에 서류 현황 카드 표시 | 진입점 UX 개선 |
| R-12 | Cron 기반 자동 알림 (미제출 서류 주기적 체크) | 수동 확인 없이 자동화 |
| R-13 | 다국어 서류명 (한국어 + 베트남어) | 학생이 베트남어로 이해 가능해야 함 |

---

## 3. 기능 상세 설명

### 3-1. 서류 체크리스트 항목 관리 (Admin)
- 관리자가 글로벌 서류 템플릿 관리
  - 서류명 (KR/VI), 카테고리, 비자 타입 적용 범위, 필수/선택 여부
  - 서류 유효기간 여부 (여권: 있음, 재학증명서: 있음, 사진: 없음)
- 비자 유형별 필수 서류 세트:
  - D-4 (어학연수): 여권, ARC, 재학증명서, 건강진단서, 보증인 서류, 통장 잔액증명
  - D-2 (유학): 위 + 입학허가서, 성적증명서, 학사학위(편입 시)

### 3-2. 학생별 서류 체크리스트 (학생 포털)
- 학생 포털 새 탭 "서류" 추가
  - 카테고리별 서류 목록 표시 (아코디언 또는 탭)
  - 각 항목: 서류명, 상태, 제출일, 만료일, 파일 업로드 버튼
  - 전체 진행률 표시 (원형 차트 or 프로그레스 바)
  - 미제출/만료 서류 상단 강조 표시

### 3-3. 관리자 서류 관리 (학생 상세 페이지)
- 학생 상세 페이지에 "서류" 탭 추가
  - 서류별 상태 업데이트 (admin/agency 권한)
  - 상태: `미제출` → `제출됨` → `검토중` → `승인` / `반려`
  - 반려 시 코멘트 입력 가능
  - 파일 다운로드 (학생이 업로드한 경우)

### 3-4. 알림 시스템
- **즉시 알림**: 서류 상태가 변경될 때 (승인/반려)
- **Cron 알림**: 매일 자동 체크
  - 비자 갱신 90/30/7일 전에 미제출 필수 서류 목록과 함께 이메일
  - 서류 만료 30/7일 전 갱신 요청 알림
- **포털 인앱 알림**: 뱃지 또는 배너 형태

---

## 4. 데이터 모델 (신규 테이블)

### 4-1. `document_types` (서류 템플릿)
```sql
id              UUID PRIMARY KEY
name_kr         VARCHAR(100)  -- '여권'
name_vi         VARCHAR(100)  -- 'Hộ chiếu'
category        VARCHAR(30)   -- 'identity' | 'school' | 'financial' | 'health'
visa_types      TEXT[]        -- ['D-2', 'D-4'] (빈 배열 = 전체 적용)
is_required     BOOLEAN       -- 필수 여부
has_expiry      BOOLEAN       -- 만료일 있는 서류 여부
sort_order      INT
is_active       BOOLEAN       -- 비활성화 가능
created_at      TIMESTAMPTZ
```

### 4-2. `student_documents` (학생별 서류 현황)
```sql
id              UUID PRIMARY KEY
student_id      UUID REFERENCES students(id)
doc_type_id     UUID REFERENCES document_types(id)
status          VARCHAR(20)   -- 'pending' | 'submitted' | 'reviewing' | 'approved' | 'rejected'
submitted_at    TIMESTAMPTZ   -- 제출 일시
expiry_date     DATE          -- 서류 만료일 (has_expiry = true인 경우)
file_url        TEXT          -- 업로드 파일 URL (Supabase Storage)
file_name       VARCHAR(255)  -- 원본 파일명
reviewer_id     UUID          -- 검토한 관리자 user ID
reviewed_at     TIMESTAMPTZ
reject_reason   TEXT          -- 반려 사유
notes           TEXT          -- 관리자 메모
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### 4-3. `document_alert_logs` (서류 알림 이력)
```sql
id              UUID PRIMARY KEY
student_id      UUID REFERENCES students(id)
doc_type_id     UUID REFERENCES document_types(id)  -- null이면 전체 서류 알림
alert_type      VARCHAR(30)   -- 'missing' | 'expiry_warning' | 'status_changed'
sent_at         TIMESTAMPTZ
channel         VARCHAR(20)   -- 'email' | 'in_app'
```

---

## 5. 기술 스택 및 구현 전략

| 항목 | 선택 | 이유 |
|------|------|------|
| 파일 업로드 | Supabase Storage `student-documents` 버킷 | 이미 학생 사진에 Storage 사용 중 |
| 알림 | Resend API (기존) + in-app badge | 비자 알림과 동일한 패턴 |
| 권한 | RLS 기반 학생/관리자 분리 | 기존 패턴 유지 |
| Cron | Vercel Cron (기존) | 비자 알림 Cron과 동일 경로 |

---

## 6. 구현 파일 목록

### 신규 파일
| 파일 | 역할 |
|------|------|
| `supabase-document-checklist.sql` | DB 마이그레이션 (3개 테이블 + RLS) |
| `lib/services/documentService.ts` | 서류 CRUD 서비스 레이어 |
| `app/api/student-documents/route.ts` | GET/POST/PATCH API |
| `app/api/document-types/route.ts` | 서류 유형 관리 API (admin) |
| `app/api/cron/document-alerts/route.ts` | 서류 미제출 알림 Cron |
| `app/students/[id]/_components/DocumentChecklist.tsx` | 관리자 서류 관리 UI |
| `app/portal/_components/DocumentTab.tsx` | 학생 포털 서류 탭 |
| `app/admin/document-types/page.tsx` | 서류 유형 관리 페이지 (관리자) |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `app/students/[id]/page.tsx` | "서류" 탭 추가 |
| `app/portal/page.tsx` | "서류" 탭 추가 + 대시보드 현황 카드 |
| `lib/types.ts` | DocumentType, StudentDocument 타입 추가 |
| `vercel.json` | document-alerts Cron 등록 |

---

## 7. 구현 순서 (권장)

```
1단계: DB 마이그레이션 (document_types, student_documents, document_alert_logs)
2단계: 서류 유형 초기 데이터 삽입 (D-2/D-4 필수 서류)
3단계: API 구현 (student-documents CRUD + document-types)
4단계: 관리자 UI (학생 상세 > 서류 탭)
5단계: 학생 포털 UI (서류 탭 + 대시보드 카드)
6단계: 알림 Cron 구현
7단계: 파일 업로드 연동 (Storage)
```

---

## 8. 비자 종류별 필수 서류 초기 데이터 (D-4 기준)

| 서류명 (KR) | 서류명 (VI) | 카테고리 | 만료일 | 비자 |
|-------------|-------------|----------|--------|------|
| 여권 | Hộ chiếu | identity | ✅ | 전체 |
| 외국인등록증 (ARC) | Thẻ cư trú | identity | ✅ | 전체 |
| 재학증명서 | Giấy xác nhận học tập | school | ✅ | D-4 |
| 입학허가서 | Thư nhập học | school | ✅ | D-2 |
| 건강진단서 | Giấy khám sức khỏe | health | ✅ | 전체 |
| 건강보험 카드 | Thẻ bảo hiểm y tế | health | ✅ | 전체 |
| 통장 잔액증명 | Sao kê tài khoản | financial | ❌ | 전체 |
| 보증인 서류 | Giấy bảo lãnh | financial | ❌ | 전체 |
| 성적증명서 | Bảng điểm | school | ❌ | D-2 |
| 증명사진 (3x4) | Ảnh thẻ (3x4) | identity | ❌ | 전체 |

---

## 9. 예상 공수

| 단계 | 예상 작업량 |
|------|-------------|
| DB + 초기 데이터 | 중 |
| API | 중 |
| 관리자 UI | 중-대 |
| 학생 포털 UI | 중 |
| 알림 Cron | 소 |
| 파일 업로드 | 소 |
| **합계** | **약 대형 기능 1개** |

---

## 10. 완료 기준 (Definition of Done)

- [ ] D-2/D-4 필수 서류 목록이 DB에 존재
- [ ] 학생이 포털에서 서류 체크리스트 조회 및 자가 체크 가능
- [ ] 관리자가 학생 상세에서 서류 상태 업데이트 가능
- [ ] 파일 업로드 및 다운로드 동작
- [ ] 미제출 서류 알림 이메일 발송 동작
- [ ] 서류 만료 임박 알림 동작
- [ ] 모든 텍스트 i18n (KR/VI)
- [ ] RLS 정책 학생/관리자 권한 분리
- [ ] TypeScript 타입 오류 없음
