# Plan: v3 권한구조 정비 + 학생 자기정보 수정 + 보안 강화

- **Feature**: v3-roles-security
- **Date**: 2026-02-17
- **Status**: Plan

---

## 1. 요구사항 정리

### 1.1 학생 자기정보 수정 (Student Self-Edit)
- 현재 `/portal` 은 **읽기 전용** → 학생이 직접 일부 정보 수정 가능하도록
- 수정 가능 필드 (학생 자율): 전화번호, 비자 정보, 주소
- 수정 불가 필드 (관리자만): 이름, 학생코드, 유학원, 상태, is_approved

### 1.2 3계층 권한 구조 정비

| 역할 | 조회 범위 | 수정 범위 | 삭제 |
|------|-----------|-----------|------|
| master | 전체 | 전체 | ✅ 가능 |
| agency | 본인 유학원 학생만 | 본인 유학원 학생만 | ❌ 불가 |
| student | 본인 정보만 | 본인 일부 필드만 | ❌ 불가 |

**현재 문제점:**
- students RLS: student_self_read 만 있고, master/agency 분리 정책 없음
- consultations, exam_results: RLS 정책 **전혀 없음** → 보안 취약
- storage: 인증된 모든 사용자가 타인 사진 삭제 가능
- 앱 코드 레벨에서만 role 체크 → DB 레벨 강제 없음

### 1.3 개인정보보호 동의 갱신 정책

**한국 개인정보보호법(PIPA) 기준:**
- 동의 자체의 "1년 유효" 규정은 **없음**
- 단, 1년 이상 서비스 미이용 시 → **휴면 계정 처리 의무** (방문 30일 전 사전 안내 필요)
- 정보 수집 목적 변경 시 → 재동의 필요
- **권장사항**: 연 1회 개인정보 처리방침 안내 이메일 발송

**결론**: 매년 자동 재동의 팝업은 법적 의무 아님.
다만 1년 이상 미접속 학생에 대한 휴면 안내 기능은 추후 추가 권장.

### 1.4 전반적 보안 점검 결과

| 항목 | 현황 | 위험도 | 조치 필요 |
|------|------|--------|-----------|
| consultations RLS 없음 | ❌ 없음 | 높음 | ✅ 즉시 추가 |
| exam_results RLS 없음 | ❌ 없음 | 높음 | ✅ 즉시 추가 |
| storage 삭제 권한 과다 | 인증자 전체 삭제 가능 | 중간 | ✅ 본인만 가능하도록 |
| agency-student RLS 없음 | 앱 레벨만 체크 | 중간 | ✅ DB RLS 추가 |
| service_role key 노출 | Vercel env에만 있음 | 낮음 | ✅ 정상 (서버사이드만) |
| 비밀번호 정책 | 8자 이상만 체크 | 낮음 | 추후 강화 가능 |
| HTTPS | Vercel 기본 제공 | - | ✅ 정상 |
| SQL Injection | Supabase ORM 사용 | - | ✅ 보호됨 |
| XSS | React JSX 자동 escaping | - | ✅ 보호됨 |

---

## 2. 구현 범위 (4개 Phase)

### Phase 1: DB 레벨 RLS 정비 (SQL)
**우선순위: 높음 — 즉시 실행 필요**

```sql
-- 1. students 테이블: master/agency/student 3계층 분리
-- 2. consultations: master 전체, agency 해당 학생만, student 본인만
-- 3. exam_results: 위와 동일
-- 4. storage: 본인 사진만 수정/삭제 가능하도록 제한
-- 5. students 수정 권한: student는 특정 필드만 (RLS + trigger 방식)
```

### Phase 2: 학생 포털 자기정보 수정 기능
- `/portal/edit` 페이지 (또는 인라인 편집)
- 수정 가능: 전화번호(VN/KR), 비자 정보(type/expiry), 현주소
- 수정 후 저장 → 관리자에게 변경 알림 (옵션)
- 사진 업로드는 이미 구현됨

### Phase 3: Agency 권한 검증 강화
- `/students` 페이지: agency 유저는 본인 유학원 학생만 조회
  - 현재: `if (meta?.role === 'agency') { where agency_id = meta.agency_id }`
  - 보완: DB RLS로 이중 강제
- 학생 상세/수정: agency 유저가 타 유학원 학생 URL 직접 접근 시 차단

### Phase 4: 개인정보 동의 이력 관리 UI
- 관리자 화면에서 학생별 동의 이력 조회 가능
- 동의 날짜, 동의 내용 확인
- (옵션) 정책 변경 시 재동의 요청 플래그 기능

---

## 3. 구현 우선순위

```
Phase 1 (SQL만, 즉시 가능)    → consultations/exam_results RLS 추가
Phase 2 (포털 수정 기능)       → 학생 자기 편집
Phase 3 (Agency 강화)          → URL 직접 접근 차단
Phase 4 (동의 이력 UI)         → 추후 검토
```

---

## 4. 수정 가능 필드 정의 (Phase 2 상세)

### 학생이 직접 수정 가능
| 필드 | 이유 |
|------|------|
| phone_vn | 본인 연락처 |
| phone_kr | 본인 연락처 |
| home_address_vn | 본인 주소 |
| visa_type | 비자 변경 시 직접 입력 |
| visa_expiry | 비자 연장 시 직접 입력 |

### 관리자/유학원만 수정 가능 (학생 불가)
| 필드 | 이유 |
|------|------|
| name_kr, name_vn | 공식 이름, 임의 변경 불가 |
| student_code | 자동 부여 |
| agency_id | 관리자가 배정 |
| status | 유학 단계 관리자 확인 필요 |
| is_approved | 관리자 전용 |
| dob, gender | 공식 정보 |

---

## 5. 예상 작업량

| Phase | 작업 | 예상 난이도 |
|-------|------|-------------|
| Phase 1 | SQL 작성 + Supabase 실행 | 쉬움 |
| Phase 2 | 포털 수정 폼 추가 | 보통 |
| Phase 3 | URL 접근 제어 + RLS | 보통 |
| Phase 4 | 동의 이력 UI | 쉬움 |
