# AJU E&J 학생관리 플랫폼 Schema Definition (v2.0)

> PDCA Schema Document - 3단계 사용자 등급 + 학생 회원가입 + 개인정보보호법 준수

**Version**: 2.0
**Created**: 2026-02-15
**Updated**: 2026-02-15
**Level**: Dynamic
**Platform**: Google Apps Script + Google Sheets

---

## 1. Terminology (용어 정의)

| Term (EN) | Term (KO) | Term (VI) | Definition |
|-----------|-----------|-----------|------------|
| User | 사용자 | Nguoi dung | 시스템 사용자 (마스터/유학원/학생) |
| Master | 마스터 관리자 | Quan tri vien | 시스템 전체 관리 권한 보유자 |
| Agency | 유학원 | Trung tam du hoc | 베트남 현지 유학 알선 기관 (교사) |
| Student | 학생 | Sinh vien | 관리 대상 베트남 유학생 |
| Signup | 회원가입 | Dang ky | 학생 자체 계정 생성 |
| Consent | 개인정보 동의 | Dong y thong tin ca nhan | 개인정보 수집/이용 동의 |
| Privacy Notice | 개인정보 알림 | Thong bao quyen rieng tu | 정기 개인정보 이용 알림 (6개월) |
| Password Reset | 비밀번호 재설정 | Dat lai mat khau | 이메일 기반 비밀번호 찾기 |
| Consultation | 상담 | Tu van | 학생 대상 정기/비정기 상담 기록 |
| TOPIK | TOPIK 시험 | Ky thi TOPIK | 한국어능력시험 (읽기/듣기/쓰기) |
| Audit Log | 감사 로그 | Nhat ky kiem toan | 모든 데이터 조작 기록 |
| i18n | 다국어 | Da ngon ngu | 국제화 (한국어/베트남어 전환) |
| Smart ID | 스마트 ID | ID thong minh | YYAAASSSSS 형식 자동 생성 ID |
| ARC | 외국인등록증 | The dang ky nguoi nuoc ngoai | Alien Registration Card |
| Visa | 비자 | Thi thuc | 체류 자격 증명 |
| Session | 세션 | Phien | 로그인 후 인증 상태 유지 토큰 |

---

## 2. Entity Overview

| Entity (Sheet) | Description | Key Fields | Record Count (예상) |
|----------------|-------------|------------|-------------------|
| **Users** (NEW) | 통합 사용자 인증 | UserID, LoginID, Email, UserType | 100-500 |
| **Students** | 학생 정보 (Users와 1:1) | StudentID, UserID, AgencyCode | 100-500 |
| **Agencies** | 유학원 정보 (Users와 1:1) | AgencyCode, UserID | 5-20 |
| **Consultations** | 상담 기록 | ConsultID, StudentID, ConsultDate | 500-2000 |
| **ExamResults** | TOPIK 시험 성적 | ExamID, StudentID, ExamDate | 200-1000 |
| **TargetHistory** | 목표대학 변경 이력 | HistoryID, StudentID, ChangedAt | 100-500 |
| **PrivacyConsents** (NEW) | 개인정보 동의 기록 | ConsentID, UserID, ConsentDate | 100-500 |
| **EmailLogs** (NEW) | 이메일 발송 기록 | EmailID, UserID, SentDate | 500-5000 |
| **AuditLogs** | 감사 기록 | LogID, Timestamp, UserID, Action | 1000-10000 |
| **SystemConfig** | 시스템 설정 (KR/VN) | ConfigKey, ValueKR, ValueVI | 20-50 |
| **i18n** | 다국어 사전 | Key, KO_Text, VI_Text | 100-300 |

---

## 3. Core Entity Details

### 3.1 Users (통합 사용자 인증) - NEW

**Description**: 마스터/유학원/학생 모든 사용자의 인증 정보를 통합 관리

**Fields**:
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| UserID | String | Y | 사용자 고유 ID (PK) | `MASTER`, `HANOI`, `STU260010001` |
| UserType | String | Y | 사용자 유형 | `master`, `agency`, `student` |
| LoginID | String | Y | 로그인 ID (unique) | `admin`, `hanoi_teacher`, `student001` |
| Email | String | Y | 이메일 주소 (unique) | `student@example.com` |
| PasswordHash | String | Y | 비밀번호 해시 (SHA-256) | `$2a$10$...` |
| AgencyCode | String | N | 소속 유학원 (student/agency만) | `HANOI`, `DANANG` |
| IsActive | Boolean | Y | 활성화 상태 | `TRUE` |
| PrivacyConsentDate | DateTime | N | 개인정보 동의 일시 | `2026-01-15 14:30:00` |
| LastPrivacyNotice | DateTime | N | 마지막 개인정보 알림 | `2026-01-15` |
| LoginAttempts | Number | Y | 로그인 시도 횟수 | `0` |
| LastLogin | DateTime | N | 마지막 로그인 | `2026-02-15 10:00:00` |
| CreatedAt | DateTime | Y | 생성 일시 | `2026-01-01 00:00:00` |
| UpdatedAt | DateTime | Y | 수정 일시 | `2026-02-15 10:00:00` |

**UserType Values**:
- `master`: 시스템 관리자 (UserID = "MASTER")
- `agency`: 유학원 교사 (UserID = AgencyCode)
- `student`: 베트남 유학생 (UserID = "STU" + StudentID)

**Relationships**:
- 1:1 → Students (UserType = student)
- 1:1 → Agencies (UserType = agency)
- 1:N → PrivacyConsents (UserID)
- 1:N → EmailLogs (UserID)

**Business Rules**:
- Email은 ID/비밀번호 찾기에 필수
- PrivacyConsentDate: 학생 회원가입 시 필수
- LastPrivacyNotice: 정기 알림 발송 추적 (6개월마다)
- LoginAttempts: 5회 이상 시 계정 잠금

---

### 3.2 Students (학생 정보)

**Description**: 베트남 유학생의 모든 기본 정보 (Users와 1:1 연결)

**Fields**:
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| StudentID | String | Y | **학생 고유 ID (PK, 9자리 풀 ID)** | `260010001` (⚠️ "2611" 같은 부분 ID 아님) |
| UserID | String | Y | Users 시트 참조 (FK) | `STU260010001` |
| AgencyCode | String | Y | 소속 유학원 (FK) | `HANOI` |
| NameKR | String | Y | 한국 이름 | `박두양` |
| NameVN | String | Y | 베트남 이름 | `Pham Du Duong` |
| DateOfBirth | Date | Y | 생년월일 | `2008-10-15` |
| Gender | String | Y | 성별 (M/F) | `M` |
| PhoneNumber | String | N | 한국 연락처 | `010-1234-5678` |
| AddressKR | String | N | 한국 주소 | `서울시 강남구...` |
| AddressVN | String | N | 베트남 주소 | `Hanoi, Vietnam` |
| ParentNameKR | String | N | 학부모 이름 (한국) | `박아버지` |
| ParentNameVN | String | N | 학부모 이름 (베트남) | `Pham Father` |
| ParentPhone | String | N | 학부모 연락처 | `+84-123-456-7890` |
| ParentEconomicStatus | String(enc) | N | 경제 상황 (암호화) | `[encrypted]` |
| HighSchoolName | String | N | 고등학교명 | `Hanoi High School` |
| HighSchoolGrade | String | N | 고등학교 성적 | `4.2/5.0` |
| EnrollmentDate | Date | Y | 유학원 등록일 | `2026-01-15` |
| TargetUniversity | String | N | 현재 목표 대학 | `서울대학교` |
| TargetDepartment | String | N | 현재 목표 학과 | `컴퓨터공학과` |
| VisaType | String | N | 비자 종류 | `D-4-1` |
| VisaExpiry | Date | N | 비자 만료일 | `2027-08-31` |
| ARC_Number | String | N | 외국인등록증 번호 | `123456-1234567` |
| SIMInfo | String | N | 유심 개통 정보 | `KT / 010-9876-5432` |
| PreferredLang | String | Y | 선호 언어 | `VI` |
| Status | String | Y | 상태 | `active`, `graduated`, `withdrawn` |
| Notes | Text | N | 비고 (최대 50,000자) | `특이사항 기록...` |
| CreatedBy | String | Y | 생성자 UserID | `HANOI` |
| CreatedAt | DateTime | Y | 생성 일시 | `2026-01-15 14:30:00` |
| UpdatedBy | String | N | 수정자 UserID | `STU260010001` |
| UpdatedAt | DateTime | Y | 수정 일시 | `2026-02-15 10:00:00` |

**Relationships**:
- 1:1 → Users (UserID)
- N:1 → Agencies (AgencyCode)
- 1:N → Consultations (StudentID)
- 1:N → ExamResults (StudentID)
- 1:N → TargetHistory (StudentID)

**Business Rules**:
- **StudentID**: 9자리 풀 ID (예: 260010001) → Students 시트에 저장
- **UserID**: "STU" + StudentID (예: STU260010001) → Users 시트에 저장
- **순번 관리**: Sequences 시트에 1, 2, 3, ... 형태로 저장 (풀 ID 아님)
- 학생은 Users 시트에서 로그인 정보 관리
- ParentEconomicStatus는 AES-256 암호화 저장

---

### 3.3 Agencies (유학원 정보)

**Description**: 베트남 현지 유학원 정보 (Users와 1:1 연결)

**Fields**:
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| AgencyCode | String | Y | 유학원 코드 (PK) | `HANOI` |
| UserID | String | Y | Users 시트 참조 (FK) | `HANOI` |
| AgencyNumber | Number | Y | 유학원 번호 (3자리) | `1` |
| AgencyNameKR | String | Y | 유학원명 (한국어) | `하노이 유학원` |
| AgencyNameVN | String | Y | 유학원명 (베트남어) | `Hanoi Study Center` |
| ContactPerson | String | N | 담당자 이름 | `Tran Minh` |
| ContactPhone | String | N | 담당자 연락처 | `+84-912-345-678` |
| IsActive | Boolean | Y | 활성화 상태 | `TRUE` |
| CreatedBy | String | Y | 생성자 UserID | `MASTER` |
| CreatedAt | DateTime | Y | 생성 일시 | `2026-01-01 00:00:00` |
| UpdatedBy | String | N | 수정자 UserID | `MASTER` |
| UpdatedAt | DateTime | Y | 수정 일시 | `2026-02-15 10:00:00` |

**Relationships**:
- 1:1 → Users (UserID)
- 1:N → Students (AgencyCode)

**Business Rules**:
- **UserID** = AgencyCode (예: HANOI)
- 유학원은 Users 시트에서 로그인 정보 관리
- **AgencyNumber**: 자동 할당 (1, 2, 3, ...)
  - HANOI → 001 (AgencyNumber = 1)
  - DANANG → 002 (AgencyNumber = 2)
  - MASTER → 000 (AgencyNumber = 0)
- AgencyNumber는 StudentID의 AAA 부분에 사용됨
  - 260010001 = 26(연도) + 001(HANOI) + 0001(순번)

---

### 3.4 PrivacyConsents (개인정보 동의 기록) - NEW

**Description**: 모든 개인정보 수집/이용 동의 기록 (법적 증빙)

**Fields**:
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| ConsentID | String | Y | 동의 ID (PK) | `CONSENT-20260115-001` |
| UserID | String | Y | 사용자 ID (FK) | `STU260010001` |
| ConsentType | String | Y | 동의 유형 | `signup`, `renewal` |
| ConsentDate | DateTime | Y | 동의 일시 | `2026-01-15 14:30:00` |
| ConsentIP | String | N | 접속 IP | `123.45.67.89` |
| ConsentText | Text | Y | 동의 내용 전문 | `개인정보 수집 및 이용에 동의합니다...` |
| IsActive | Boolean | Y | 유효 상태 | `TRUE` |
| ExpiryDate | Date | Y | 만료일 (1년 후) | `2027-01-15` |
| CreatedAt | DateTime | Y | 생성 일시 | `2026-01-15 14:30:00` |

**ConsentType Values**:
- `signup`: 회원가입 시 최초 동의
- `renewal`: 만료 후 재동의

**Relationships**:
- N:1 → Users (UserID)

**Business Rules**:
- ExpiryDate = ConsentDate + 1년
- 만료 30일 전부터 재동의 요청
- 모든 동의 기록은 영구 보관 (법적 증빙)

---

### 3.5 EmailLogs (이메일 발송 기록) - NEW

**Description**: 모든 이메일 발송 기록 (감사 추적)

**Fields**:
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| EmailID | String | Y | 이메일 ID (PK) | `EMAIL-20260115-001` |
| UserID | String | Y | 수신자 UserID (FK) | `STU260010001` |
| EmailType | String | Y | 이메일 유형 | `welcome`, `privacy_notice`, `password_reset` |
| ToEmail | String | Y | 수신 이메일 | `student@example.com` |
| Subject | String | Y | 제목 | `AJU E&J 가입을 환영합니다` |
| Body | Text | Y | 본문 | `안녕하세요...` |
| SentDate | DateTime | Y | 발송 일시 | `2026-01-15 14:35:00` |
| Status | String | Y | 발송 상태 | `sent`, `failed`, `pending` |
| ErrorMessage | String | N | 에러 메시지 (실패 시) | `` |
| CreatedAt | DateTime | Y | 생성 일시 | `2026-01-15 14:35:00` |

**EmailType Values**:
- `welcome`: 가입 완료 이메일
- `privacy_notice`: 정기 개인정보 이용 알림 (6개월마다)
- `password_reset`: 임시 비밀번호 발송
- `id_recovery`: ID 찾기 이메일
- `consent_renewal`: 개인정보 동의 갱신 요청

**Relationships**:
- N:1 → Users (UserID)

**Business Rules**:
- 모든 이메일은 GmailApp으로 발송
- Status = failed 시 ErrorMessage 필수
- 발송 실패 시 3회까지 재시도

---

### 3.6 Consultations (상담 기록)

**Description**: 학생 대상 정기/비정기 상담 내용 누적 기록

**Fields**: (변경 없음 - 기존 schema.md와 동일)

**New Fields (v2.1)**:
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| PrivateNotes | Text | N | 상담 비공개 메모 (최대 50,000자) | `내부용 메모...` |

**Access Control (v2.1)**:
- PrivateNotes: Master, Agency만 접근 가능 (Student ❌)

---

### 3.7 ExamResults (TOPIK 시험 성적)

**Description**: 학생별 TOPIK 시험 성적 이력

**Fields**: (변경 없음 - 기존 schema.md와 동일)

---

### 3.8 TargetHistory (목표대학 변경 이력)

**Description**: 학생의 목표 대학/학과 변경 이력 추적

**Fields**: (변경 없음 - 기존 schema.md와 동일)

---

### 3.9 AuditLogs (감사 기록)

**Description**: 모든 데이터 조작 행위의 감사 추적 기록

**Fields**: (변경 없음 - 기존 schema.md와 동일)

**Action Types**: `CREATE`, `READ`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `LOGIN_FAIL`, `SIGNUP`, `PASSWORD_RESET`, `CONSENT`, `EXPORT`, `ERROR`

---

### 3.10 SystemConfig (시스템 설정)

**Description**: 시스템 설정값, 저작권, 이용약관, 개인정보처리방침

**Pre-defined Keys** (추가):
| ConfigKey | Category | Description |
|-----------|----------|-------------|
| `privacy_policy` | legal | 개인정보처리방침 본문 |
| `consent_text_signup` | legal | 회원가입 시 동의 문구 |
| `consent_text_renewal` | legal | 재동의 시 문구 |
| `privacy_notice_interval_days` | notification | 정기 알림 주기 (기본: 180일 = 6개월) |
| `consent_expiry_days` | security | 동의 유효 기간 (기본: 365일 = 1년) |
| `password_reset_expiry_minutes` | security | 임시 비밀번호 유효 기간 (기본: 60분) |

---

### 3.11 i18n (다국어 사전)

**Description**: 모든 UI 텍스트의 다국어 사전 (변경 없음)

---

## 4. Entity Relationships (v2.0)

```
┌──────────────┐
│    Users     │ ← 통합 인증 (마스터/유학원/학생)
│  (인증 정보)  │
└──────┬───────┘
       │
       ├── 1:1 ──→ ┌──────────────┐       1:N      ┌─────────────────┐
       │           │   Students   │───────────────→│ Consultations   │
       │           │  (학생 정보)  │               │ (상담 기록)       │
       │           └──────┬───────┘               └─────────────────┘
       │                  │
       │                  ├── 1:N ──→ ┌─────────────────┐
       │                  │           │  ExamResults    │
       │                  │           │ (TOPIK 성적)     │
       │                  │           └─────────────────┘
       │                  │
       │                  └── 1:N ──→ ┌─────────────────┐
       │                              │ TargetHistory   │
       │                              │ (목표대학 이력)   │
       │                              └─────────────────┘
       │
       ├── 1:1 ──→ ┌──────────────┐
       │           │   Agencies   │
       │           │  (유학원 정보) │
       │           └──────────────┘
       │
       ├── 1:N ──→ ┌─────────────────┐
       │           │ PrivacyConsents │
       │           │ (개인정보 동의)   │
       │           └─────────────────┘
       │
       └── 1:N ──→ ┌─────────────────┐
                   │   EmailLogs     │
                   │ (이메일 발송)     │
                   └─────────────────┘

┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  AuditLogs   │   │ SystemConfig │   │     i18n     │
│ (감사 기록)    │   │ (시스템 설정)  │   │ (다국어 사전)  │
└──────────────┘   └──────────────┘   └──────────────┘
  (독립 - 모든       (독립 - 설정값)    (독립 - UI 텍스트)
   시트에서 기록)
```

---

## 5. Smart ID Generation Rules

### StudentID Format: `YYAAASSSSS` (총 9자리)

**중요**: StudentID는 총 **9자리 풀 ID**입니다.

```
Format: YYAAASSSSS (9자리)
        └┬┘└─┬─┘└──┬──┘
         │   │     └─ SSSS: 순번 4자리 (0001, 0002, 0003, ...)
         │   └─────── AAA: 유학원 번호 3자리 (001, 002, 003, ...)
         └─────────── YY: 연도 2자리 (26, 27, 28, ...)
```

| Part | Length | Description | Example |
|------|--------|-------------|---------|
| YY | 2자리 | 등록 연도 (뒤 2자리) | `26` (2026년) |
| AAA | 3자리 | 유학원 번호 (001부터) | `001` (HANOI), `002` (DANANG) |
| SSSS | 4자리 | 해당 유학원 내 순번 (0001부터) | `0001` (첫 번째), `0002` (두 번째) |

**Full Examples** (9자리 풀 ID):
- `260010001` = 26(연도) + 001(HANOI) + 0001(첫 번째 학생)
- `260010002` = 26(연도) + 001(HANOI) + 0002(두 번째 학생)
- `260010003` = 26(연도) + 001(HANOI) + 0003(세 번째 학생)
- `260020001` = 26(연도) + 002(DANANG) + 0001(첫 번째 학생)

**시트 저장 방식** (매우 중요):
1. **Sequences 시트**: 순번만 저장 (1, 2, 3, ...)
   - EntityType: `StudentID_26001`
   - LastSequence: `1`, `2`, `3`, ... (순번만)

2. **Students 시트**: 9자리 풀 ID 저장
   - StudentID 컬럼: `260010001`, `260010002`, `260010003`, ...
   - ⚠️ 주의: "2611" 같은 부분 ID는 절대 저장되지 않음

**생성 로직**:
```
1. 연도 추출: 2026 → 26
2. 유학원 번호: HANOI → 001
3. Sequences 시트에서 순번 조회 (없으면 0)
4. 순번 + 1 (예: 0 + 1 = 1)
5. 순번을 4자리로 패딩: 1 → 0001
6. 조합: 26 + 001 + 0001 = 260010001 (9자리)
7. Students 시트에 풀 ID 저장: 260010001
   (Sequences 시트는 순번 1만 저장)
```

### UserID Format (NEW)

| UserType | Format | Example | 설명 |
|----------|--------|---------|------|
| master | `MASTER` | `MASTER` | 고정 문자열 |
| agency | `{AgencyCode}` | `HANOI`, `DANANG` | 유학원 코드 그대로 |
| student | `STU{StudentID}` | `STU260010001` | "STU" + 9자리 StudentID |

**예시**:
- Master 계정: `MASTER`
- HANOI 유학원 계정: `HANOI`
- DANANG 유학원 계정: `DANANG`
- 첫 번째 학생 계정: `STU260010001` (STU + 260010001)
- 두 번째 학생 계정: `STU260010002` (STU + 260010002)

### Other ID Formats

| Entity | Format | Example |
|--------|--------|---------|
| ConsentID | `CONSENT-YYYYMMDD-SEQ` | `CONSENT-20260115-001` |
| EmailID | `EMAIL-YYYYMMDD-SEQ` | `EMAIL-20260115-001` |
| ConsultID | `C-YY-SEQ` | `C-25-001` |
| ExamID | `E-YY-SEQ` | `E-25-001` |
| HistoryID | `TH-YY-SEQ` | `TH-25-001` |
| LogID | `LOG-YYYYMMDD-SEQ` | `LOG-20260615-001` |

---

## 6. Data Security Rules

### Encryption
| Data | Method | Notes |
|------|--------|-------|
| 비밀번호 (PasswordHash) | SHA-256 + MASTER_SALT | GAS의 Utilities.computeDigest() 사용 |
| 학부모 경제상황 (ParentEconomicStatus) | AES-256 | ENCRYPTION_KEY로 암호화/복호화 |

### Access Control Matrix (v2.0)

| Role | Users | Students | Agencies | Consultations | ExamResults | PrivacyConsents | EmailLogs |
|------|-------|----------|----------|---------------|-------------|-----------------|-----------|
| **master** | 전체 CRUD | 전체 CRUD | 전체 CRUD | 전체 CRUD | 전체 CRUD | 전체 R | 전체 R |
| **agency** | 본인만 R**U** | 소속만 CR**U** | 본인만 R**U** | 소속만 CR**U** | 소속만 CR**U** | ❌ | ❌ |
| **student** | 본인만 R**U** | 본인만 R**U** | ❌ | 본인만 R | 본인만 R | 본인만 R | 본인만 R |

**Legend**:
- C: Create
- R: Read
- U: Update
- D: Delete
- ❌: No Access

**권한 검증 함수**: `checkPermission(userId, action, targetUserId)`

---

## 7. 개인정보보호법 준수

### 필수 구현 사항

1. **개인정보 수집 동의** (회원가입 시)
   - PrivacyConsents 시트에 기록
   - ConsentText 전문 저장
   - 동의 IP 주소 기록

2. **정기적 이용 알림** (6개월마다)
   - Users.LastPrivacyNotice 추적
   - 이메일 자동 발송 (GAS Trigger)
   - EmailLogs 시트에 기록

3. **개인정보 열람/수정 권리**
   - 학생이 본인 정보 조회 가능
   - 학생이 본인 정보 수정 가능
   - Excel 다운로드 기능

4. **개인정보 삭제 요구권**
   - 회원 탈퇴 시 즉시 삭제
   - AuditLogs는 법령에 따라 보존

5. **개인정보 암호화**
   - 비밀번호: SHA-256
   - 경제 상황: AES-256

---

## Validation Checklist (v2.0)

- [x] 모든 주요 용어 정의됨 (16개, KO/VI/EN)
- [x] 핵심 Entity 11개 정의됨 (Users, PrivacyConsents, EmailLogs 추가)
- [x] Entity 관계 명확함 (ER 다이어그램 v2.0)
- [x] Smart ID 생성 규칙 정의됨 (UserID 추가)
- [x] 보안/암호화 규칙 정의됨
- [x] 접근 제어 매트릭스 정의됨 (3단계 사용자)
- [x] 개인정보보호법 준수 사항 정의됨

---

**Major Changes from v1.0**:
- Users 시트 추가 (통합 인증)
- PrivacyConsents 시트 추가 (개인정보 동의)
- EmailLogs 시트 추가 (이메일 감사 추적)
- Students/Agencies 시트에 UserID FK 추가
- 3단계 사용자 등급 시스템 (master/agency/student)
- 학생 회원가입 기능 추가
- 개인정보보호법 준수 기능 추가

---

*Generated by bkit PDCA System v2.0*
