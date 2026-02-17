# 📋 학생 정보 저장 항목 분류 Plan

**Feature**: 학생 정보 필드 우선순위 분류
**Status**: Planning
**Created**: 2026-02-16
**Purpose**: MVP 개발 시 어떤 필드를 먼저 구현하고, 어떤 것을 나중에 추가할지 결정

---

## 🎯 분류 기준

### 1. 핵심 필드 (MVP 필수) ⭐⭐⭐
**목적**: 시스템이 작동하기 위한 최소 필수 정보
**구현 시점**: MVP (Day 1-3)
**특징**: 이 필드 없이는 시스템이 작동하지 않음

### 2. 중요 필드 (Phase 1 추가) ⭐⭐
**목적**: 기본 기능 완성을 위해 필요한 정보
**구현 시점**: Phase 1 (Day 4-7)
**특징**: 운영에 필요하지만, MVP에서는 선택적

### 3. 선택 필드 (Phase 2 이후) ⭐
**목적**: 부가 기능 또는 향상된 기능을 위한 정보
**구현 시점**: Phase 2 이후 (Day 8+)
**특징**: 없어도 기본 운영 가능, 향후 추가 검토

---

## 🔵 핵심 필드 (MVP 필수) ⭐⭐⭐

### students 테이블 - 기본 식별 정보

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `id` | UUID | ✅ | 학생 고유 ID | 시스템 식별자 |
| `name_kr` | VARCHAR(100) | ✅ | 한국 이름 | 학생 식별 필수 |
| `name_vn` | VARCHAR(100) | ✅ | 베트남 이름 | 다국어 지원 필수 |
| `dob` | DATE | ✅ | 생년월일 | 학생 식별, 연령 계산 |
| `gender` | CHAR(1) | ✅ | 성별 (M/F) | 기본 정보 |
| `agency_id` | UUID | ✅ | 소속 유학원 ID | 권한 제어 필수 (RLS) |

**필요성**:
- 학생을 식별하고 구별하기 위한 최소 정보
- RLS(Row Level Security) 정책에 필수 (`agency_id`)
- 다국어 UI 표시에 필수 (`name_kr`, `name_vn`)

**구현 복잡도**: ⭐ (낮음)
- 단순 텍스트/날짜 입력
- 외래 키 관계만 설정

---

### students 테이블 - 연락처 (최소)

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `phone_kr` | VARCHAR(20) | ⚠️ | 한국 전화번호 | 긴급 연락 필수 |
| `email` | VARCHAR(100) | ⚠️ | 이메일 (UNIQUE) | 로그인 ID 또는 연락 |

**필요성**:
- 최소 하나의 연락처는 필수 (phone_kr 또는 email)
- 긴급 상황 대응 및 공지 전달

**구현 복잡도**: ⭐ (낮음)
- 유효성 검증 필요 (전화번호 형식, 이메일 형식)

---

### students 테이블 - 메타데이터

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `created_by` | UUID | ✅ | 생성한 사용자 | 감사 로그 |
| `created_at` | TIMESTAMPTZ | ✅ | 생성 시각 | 감사 로그 |
| `updated_by` | UUID | ✅ | 수정한 사용자 | 감사 로그 |
| `updated_at` | TIMESTAMPTZ | ✅ | 수정 시각 | 감사 로그 |
| `is_active` | BOOLEAN | ✅ | 활성 상태 | Soft Delete |

**필요성**:
- 모든 CRUD 작업에 감사 로그 필수 (CLAUDE.md 규칙)
- Soft Delete 구현 필수

**구현 복잡도**: ⭐ (낮음)
- Supabase 자동 처리 가능 (트리거)

---

### agencies 테이블 (전체 필수)

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `id` | UUID | ✅ | 유학원 ID | 시스템 식별자 |
| `agency_code` | VARCHAR(20) | ✅ | 유학원 코드 (UNIQUE) | 로그인 ID |
| `agency_number` | INT | ✅ | 유학원 번호 (UNIQUE) | Smart ID 생성 |
| `agency_name` | VARCHAR(100) | ✅ | 유학원 이름 | 표시용 |
| `user_id` | UUID | ✅ | Supabase Auth 연동 | 인증 필수 |
| `is_active` | BOOLEAN | ✅ | 활성 상태 | Soft Delete |

**필요성**:
- 사용자 인증 및 권한 제어에 필수
- 학생-유학원 관계 설정 필수

**구현 복잡도**: ⭐ (낮음)

---

## 🟢 중요 필드 (Phase 1 추가) ⭐⭐

### students 테이블 - 학부모 정보

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `parent_name_vn` | VARCHAR(100) | ❌ | 학부모 이름 (베트남어) | 긴급 연락 |
| `parent_phone_vn` | VARCHAR(20) | ❌ | 학부모 전화번호 | 긴급 연락 |
| `parent_economic` | TEXT | ❌ | 학부모 경제 상황 | 장학금, 지원 결정 |

**필요성**:
- 학부모 연락처는 운영상 중요하지만, MVP에서는 학생 연락처만으로 시작 가능
- 경제 상황은 장학금/지원 결정에 사용되므로 운영 단계에서 추가

**구현 복잡도**: ⭐⭐ (중간)
- `parent_economic`은 **암호화 필수** (민감 정보)
- Supabase 암호화 함수 또는 애플리케이션 레벨 암호화 필요

**보안 고려사항**:
```sql
-- 암호화 예시 (PostgreSQL pgcrypto)
UPDATE students
SET parent_economic = pgp_sym_encrypt('경제 상황 데이터', 'encryption-key');

-- 복호화 예시
SELECT pgp_sym_decrypt(parent_economic::bytea, 'encryption-key') FROM students;
```

---

### students 테이블 - 학업 정보

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `high_school_gpa` | DECIMAL(3,2) | ❌ | 고등학교 성적 (평점) | 대학 지원 참고 |
| `enrollment_date` | DATE | ❌ | 유학원 등록일 | 학생 관리 기간 추적 |
| `status` | VARCHAR(20) | ❌ | 학생 상태 | 현재 상태 추적 |

**필요성**:
- 등록일은 학생 관리 기간 추적에 중요 (통계, 보고서)
- 상태는 학생의 현재 상황 파악에 중요 (유학전, 유학중, 졸업 등)
- GPA는 대학 지원 시 참고 자료

**구현 복잡도**: ⭐ (낮음)
- 단순 입력 필드

**상태 값 예시**:
- `유학전`, `유학중`, `졸업`, `휴학`, `자퇴`

---

### students 테이블 - 연락처 (추가)

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `phone_vn` | VARCHAR(20) | ❌ | 베트남 전화번호 | 추가 연락 수단 |
| `home_address_vn` | TEXT | ❌ | 베트남 주소 | 우편물 발송 |

**필요성**:
- 베트남 연락처는 부모님 연락 또는 귀국 후 연락에 사용
- 주소는 우편물 발송 또는 긴급 상황 시 필요

**구현 복잡도**: ⭐ (낮음)

---

## 🟡 선택 필드 (Phase 2 이후) ⭐

### consultations 테이블 (상담 기록)

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `id` | UUID | ✅ | 상담 ID | 시스템 식별자 |
| `student_id` | UUID | ✅ | 학생 ID (FK) | 학생 연결 |
| `counselor_id` | UUID | ✅ | 상담사 ID | 상담사 추적 |
| `consult_type` | VARCHAR(20) | ✅ | 상담 유형 | 정기/비정기/긴급 |
| `summary` | TEXT | ✅ | 상담 요약 | 상담 내용 |
| `improvement` | TEXT | ❌ | 개선점 | 피드백 |
| `next_goal` | TEXT | ❌ | 다음 목표 | 액션 플랜 |
| `consult_date` | DATE | ✅ | 상담 날짜 | 일정 관리 |

**필요성**:
- 상담 기록은 학생 관리의 핵심 기능이지만, MVP에서는 생략 가능
- 학생 기본 정보만으로도 시스템 운영 시작 가능
- Phase 2에서 추가하여 상담 관리 기능 강화

**구현 복잡도**: ⭐⭐ (중간)
- 외래 키 관계 설정
- RLS 정책 필요 (자기 학생의 상담만 조회)

---

### exam_results 테이블 (TOPIK 시험 성적)

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `id` | UUID | ✅ | 시험 결과 ID | 시스템 식별자 |
| `student_id` | UUID | ✅ | 학생 ID (FK) | 학생 연결 |
| `exam_date` | DATE | ✅ | 시험 날짜 | 시험 일정 |
| `exam_type` | VARCHAR(20) | ✅ | 시험 유형 | TOPIK 등 |
| `reading_score` | INT | ❌ | 읽기 점수 | 세부 점수 |
| `listening_score` | INT | ❌ | 듣기 점수 | 세부 점수 |
| `writing_score` | INT | ❌ | 쓰기 점수 | 세부 점수 |
| `total_score` | INT | ✅ | 총점 | 필수 정보 |
| `level` | VARCHAR(10) | ✅ | 등급 | 1급~6급 |

**필요성**:
- **TOPIK 등급은 대학 지원의 핵심 기준** (대학마다 TOPIK 3급 이상, 4급 이상 등 등급 요구)
- **TOPIK 점수도 중요** (동일 등급 내에서 점수로 우선순위 결정)
- 등급과 점수를 함께 관리하여 학생의 대학 지원 가능 여부 판단
- 학업 성취도 추적 및 목표 설정에 활용
- MVP에서는 생략 가능하지만, **Phase 1 후반 또는 Phase 2 초반에 조기 추가 권장**

**구현 복잡도**: ⭐⭐ (중간)
- 점수 → 등급 자동 계산 로직 필요
- 등급별 대학 지원 가능 여부 표시 기능 추가 가능

**등급 계산 로직**:
```typescript
// 총점 → 등급 자동 계산
function calculateLevel(totalScore: number): string {
  if (totalScore >= 230) return '6급'
  if (totalScore >= 190) return '5급'
  if (totalScore >= 150) return '4급'
  if (totalScore >= 120) return '3급'
  if (totalScore >= 80) return '2급'
  if (totalScore >= 40) return '1급'
  return '불합격'
}

// 등급별 대학 지원 가능 여부 판단
function checkUniversityEligibility(level: string, targetUniversity: string): boolean {
  const requirements = {
    '서울대': '6급',
    '연세대': '5급',
    '고려대': '5급',
    '서강대': '4급',
    // ... 대학별 요구 등급
  }

  const requiredLevel = parseInt(requirements[targetUniversity])
  const studentLevel = parseInt(level)

  return studentLevel >= requiredLevel
}
```

**Phase 분류 재고려**:
- TOPIK 등급의 중요성을 고려하여 **Phase 1 후반 또는 Phase 2 초반에 추가 권장**
- 학생이 입학하면 TOPIK 시험 준비가 시작되므로 조기 구현 권장

---

### target_history 테이블 (목표 대학 변경 이력)

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `id` | UUID | ✅ | 이력 ID | 시스템 식별자 |
| `student_id` | UUID | ✅ | 학생 ID (FK) | 학생 연결 |
| `target_university` | VARCHAR(100) | ✅ | 목표 대학 | 대학 이름 |
| `target_major` | VARCHAR(100) | ✅ | 목표 학과 | 학과 이름 |
| `changed_at` | TIMESTAMPTZ | ✅ | 변경 시각 | 이력 추적 |
| `changed_by` | UUID | ✅ | 변경한 사용자 | 감사 로그 |

**필요성**:
- 목표 대학 변경 이력은 학생의 진로 변화 추적에 유용
- 하지만 MVP에서는 현재 목표만 알면 충분 (students 테이블에 추가 가능)
- Phase 2에서 추가하여 진로 상담 시 참고 자료로 활용

**구현 복잡도**: ⭐ (낮음)
- 단순 이력 테이블

**대안 (MVP)**: students 테이블에 `current_target_university`, `current_target_major` 필드 추가

---

### 행정 정보 (Phase 3 이후 검토)

**별도 테이블 필요 (admin_info)**:

| 필드명 | 타입 | 필수 | 설명 | 이유 |
|--------|------|------|------|------|
| `student_id` | UUID | ✅ | 학생 ID (FK) | 학생 연결 |
| `visa_type` | VARCHAR(20) | ❌ | 비자 종류 | D-2, D-4 등 |
| `visa_expiry` | DATE | ❌ | 비자 만료일 | 갱신 알림 |
| `arc_number` | VARCHAR(30) | ❌ | 외국인 등록증 번호 | 신분 확인 |
| `arc_expiry` | DATE | ❌ | 외국인 등록증 만료일 | 갱신 알림 |
| `sim_carrier` | VARCHAR(50) | ❌ | 유심 통신사 | SKT, KT 등 |
| `sim_number` | VARCHAR(20) | ❌ | 유심 전화번호 | 연락처 |

**필요성**:
- 행정 정보는 학생 관리에 중요하지만, 초기 MVP에는 불필요
- 비자 만료 알림 등은 Phase 3 이후 자동화 기능으로 추가 검토

**구현 복잡도**: ⭐⭐⭐ (높음)
- 만료일 자동 알림 시스템 구축 필요 (Supabase Functions + Cron)
- 민감 정보 암호화 필요 (외국인 등록증 번호)

---

## 📊 우선순위 요약

### MVP (Day 1-3) - 핵심 필드만 구현

**students 테이블**:
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_kr VARCHAR(100) NOT NULL,
  name_vn VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender CHAR(1) CHECK (gender IN ('M', 'F')),
  phone_kr VARCHAR(20),
  email VARCHAR(100) UNIQUE,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);
```

**agencies 테이블**:
```sql
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_code VARCHAR(20) UNIQUE NOT NULL,
  agency_number INT UNIQUE NOT NULL,
  agency_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**총 구현 시간**: 8-12시간

---

### Phase 1 (Day 4-7) - 중요 필드 추가

**students 테이블에 추가**:
```sql
ALTER TABLE students
  ADD COLUMN parent_name_vn VARCHAR(100),
  ADD COLUMN parent_phone_vn VARCHAR(20),
  ADD COLUMN parent_economic TEXT,  -- 암호화 필요
  ADD COLUMN high_school_gpa DECIMAL(3,2),
  ADD COLUMN enrollment_date DATE,
  ADD COLUMN status VARCHAR(20) DEFAULT '유학전',
  ADD COLUMN phone_vn VARCHAR(20),
  ADD COLUMN home_address_vn TEXT;
```

**총 구현 시간**: 4-6시간 (암호화 설정 포함)

---

### Phase 2 (Day 8+) - 선택 필드 추가

**새 테이블 생성**:
- `consultations` (상담 기록) - 6-8시간
- `exam_results` (TOPIK 성적) - 6-8시간
- `target_history` (목표 대학 이력) - 2-4시간

**총 구현 시간**: 14-20시간

---

### Phase 3 (Future) - 행정 정보

**새 테이블 생성**:
- `admin_info` (행정 정보) - 8-12시간
- 만료일 알림 시스템 - 12-16시간

**총 구현 시간**: 20-28시간

---

## ✅ 권장 개발 순서

1. **MVP (Day 1-3)**:
   - ✅ agencies 테이블 생성
   - ✅ students 테이블 생성 (핵심 필드만)
   - ✅ RLS 정책 설정
   - ✅ 학생 CRUD 기능 구현

2. **Phase 1 (Day 4-7)**:
   - ✅ students 테이블에 학부모 정보 추가
   - ✅ students 테이블에 학업 정보 추가
   - ✅ 암호화 기능 구현 (parent_economic)

3. **Phase 2 (Day 8-14)**:
   - ✅ consultations 테이블 생성
   - ✅ 상담 기록 CRUD 구현
   - ✅ exam_results 테이블 생성
   - ✅ TOPIK 성적 CRUD 구현

4. **Phase 3 (Day 15+)**:
   - ✅ target_history 테이블 생성
   - ✅ admin_info 테이블 생성
   - ✅ 만료일 알림 시스템 구현

---

## 🎯 의사결정 가이드

### 언제 추가해야 할까?

#### 핵심 필드 (즉시 구현)
- 시스템 작동에 필수
- 권한 제어에 필요
- 학생 식별에 필요

#### 중요 필드 (1주일 내 구현)
- 운영에 필요하지만 MVP는 가능
- 사용자 피드백 후 추가
- 데이터 마이그레이션 용이

#### 선택 필드 (1개월 이후 검토)
- 향상된 기능을 위한 것
- 사용자 요청 시 추가
- 자동화 기능 필요

---

## 📌 최종 추천

### 사용자의 선택을 위한 체크리스트

#### MVP 단계 (반드시 포함)
- [x] 학생 이름 (한국어/베트남어)
- [x] 생년월일, 성별
- [x] 연락처 (전화 또는 이메일 최소 1개)
- [x] 소속 유학원
- [x] 메타데이터 (생성자, 생성일 등)

#### Phase 1 단계 (강력 추천)
- [ ] 학부모 이름/전화번호
- [ ] 학부모 경제 상황 (암호화)
- [ ] 고등학교 성적
- [ ] 유학원 등록일
- [ ] 학생 상태 (유학전/유학중/졸업 등)

#### Phase 2 단계 (선택적 추가)
- [ ] 상담 기록 (consultations 테이블)
- [ ] TOPIK 시험 성적 (exam_results 테이블)
- [ ] 목표 대학 변경 이력 (target_history 테이블)

#### Phase 3 단계 (향후 검토)
- [ ] 비자 정보
- [ ] 외국인 등록증 정보
- [ ] 유심 정보
- [ ] 만료일 자동 알림 시스템

---

**다음 단계**: 사용자의 피드백에 따라 Design 문서 업데이트!
