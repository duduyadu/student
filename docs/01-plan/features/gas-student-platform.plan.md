# GAS Student Platform Planning Document

> **Summary**: Google Apps Script 기반 베트남 유학생 통합 관리 플랫폼 (3-tier 사용자, 학생 회원가입, 다국어 UI, 보안, 알림, 개인정보 보호)
>
> **Project**: AJU E&J 학생관리프로그램
> **Version**: 2.0.0
> **Author**: AJU E&J
> **Date**: 2026-02-15
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

베트남 현지 유학원, 한국 내 관리자, 그리고 **학생 본인**이 함께 사용하는 학생 통합 관리 시스템을 구축합니다. Google Apps Script(GAS)와 Google Sheets를 활용하여 별도 서버 없이 운영 가능한 웹 플랫폼으로, **학생 회원가입**, 한국어/베트남어 실시간 전환, 권한별 데이터 격리, 자동 알림, 개인정보 보호를 핵심으로 합니다.

### 1.2 Background

- 베트남 현지 학생과 한국 내 관리자가 **동시에** 사용하는 시스템
- **학생 본인이 회원가입**하여 자기 정보 조회/수정 가능
- **개인정보보호법(PIPA) 준수**: 동의 기록, 정기 이메일 발송, ID/비밀번호 찾기
- 모든 UI와 안내 문구는 **한국어와 베트남어**로 제공 필수
- **데이터 무결성**과 **시스템 저작권 보호**가 강력하게 요구됨
- 유학원별 데이터 격리를 통한 보안 강화 필요
- 비자 만료일 등 주요 일정 자동 알림 필요

### 1.3 Related Documents

- **CLAUDE.md**: 프로젝트 설정 및 코딩 규칙 (프로젝트 루트)
- **Schema**: `docs/01-plan/schema.md` - 데이터 구조 및 용어 정의 (v2.0)
- **Conventions**: `docs/01-plan/conventions.md` - GAS 코딩 규칙
- **Design Document**: `docs/02-design/features/gas-student-platform.design.md` (예정 v2.0)
- **Complete System Plan**: `docs/01-plan/complete-system-plan.md` - v2.0 전체 시스템 계획

---

## 2. Scope

### 2.1 In Scope

- [ ] **3-tier 사용자 구조** (master, agency, student)
- [ ] **학생 회원가입 시스템**: 학생이 직접 가입하여 ID/비밀번호 생성
- [ ] **Users 시트 기반 통합 인증**: 모든 사용자 역할을 Users 시트에서 관리
- [ ] **다국어 데이터베이스 설계** (11개 시트: Students, Agencies, Users, PrivacyConsents, EmailLogs 등)
- [ ] **백엔드 로직 (GAS)**: 다국어 엔진, 인증/권한, 회원가입, 이메일 서비스, 알림, 감사 로그
- [ ] **프론트엔드 (HTML/JS)**: Signup.html, Login.html, Index.html, 언어 토글, 동적 렌더링, 반응형 폼
- [ ] **스마트 ID 체계**: YYAAASSSSS 형식 자동 생성 (학생 ID)
- [ ] **권한별 데이터 격리**: master/agency/student별 서버단 필터링
- [ ] **개인정보 동의 및 추적**: PrivacyConsents 시트에 동의 기록
- [ ] **이메일 기반 ID/비밀번호 찾기**: 이메일 인증 코드 발송
- [ ] **정기 개인정보 이용 안내 이메일**: 6개월마다 자동 발송 (GAS Trigger)
- [ ] **비자 및 학사 일정 자동 알림**: API 연동 (알림톡/SMS)
- [ ] **감사 로그**: 모든 작업의 일시, 사용자, 행위, 언어설정 기록

### 2.2 Out of Scope

- 네이티브 모바일 앱 개발 (웹 반응형으로 대체)
- 실시간 채팅/메신저 기능
- 결제/재무 관리 시스템
- 타 플랫폼(AWS, Firebase 등) 마이그레이션
- 3개 이상 언어 지원 (KO/VI만 1차 지원)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| **FR-01** | **Users 시트 기반 통합 인증**: master, agency, student 역할을 Users 시트에서 통합 관리 | High | Pending |
| **FR-02** | **학생 회원가입**: Signup.html에서 학생 정보 입력 + ID/비밀번호 생성 | High | Pending |
| **FR-03** | **이메일 인증**: 회원가입 시 이메일 인증 코드 발송 및 확인 | High | Pending |
| **FR-04** | **개인정보 동의 기록**: 회원가입 시 PrivacyConsents 시트에 동의 내역 저장 | High | Pending |
| **FR-05** | **ID/비밀번호 찾기**: 이메일로 ID 찾기, 비밀번호 재설정 링크 발송 | High | Pending |
| **FR-06** | **정기 개인정보 이용 안내**: 6개월마다 이메일 자동 발송 (EmailLogs 기록) | High | Pending |
| **FR-07** | **i18n 시트 기반 다국어 처리**: 모든 라벨, 버튼, 에러 메시지, 알림 문구를 i18n 시트에서 참조 | High | Pending |
| **FR-08** | **실시간 언어 전환**: KO/VI 토글 시 새로고침 없이 즉시 UI 변경 | High | Pending |
| **FR-09** | **스마트 ID 자동 생성**: YYAAASSSSS 형식 (예: 2601AJU0001) | High | Pending |
| **FR-10** | **역할 기반 인증**: master / agency / student 로그인 및 권한 분리 | High | Pending |
| **FR-11** | **유학원별 데이터 격리**: agency는 자기 소속 학생만 조회/수정 가능 (서버단 필터링) | High | Pending |
| **FR-12** | **학생 자기 정보 수정**: 학생은 자기 정보만 조회/수정 가능 | High | Pending |
| **FR-13** | **감사 로그 기록**: 모든 데이터 조작 시 일시, 사용자, 행위, 언어설정 자동 기록 | High | Pending |
| **FR-14** | **비자 만료 자동 알림**: 만료일 도래 시 설정 언어에 맞춰 알림톡/SMS 발송 | Medium | Pending |
| **FR-15** | **TOPIK 시험 성적 관리**: 읽기, 듣기, 쓰기 점수 및 총점/등급 | Medium | Pending |
| **FR-16** | **상담 기록 누적**: 정기/비정기 상담 내용, 상담사, 유형, 요약, 개선점 기록 | Medium | Pending |
| **FR-17** | **목표 대학/학과 변경 이력 추적** | Low | Pending |
| **FR-18** | **행정 정보 관리**: 비자 종류/만료일, 외국인등록증, 유심 개통 정보 | Medium | Pending |
| **FR-19** | **엑셀 일괄 업로드/다운로드** | Medium | Pending |
| **FR-20** | **PDF 생활기록부 생성** | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | GAS 페이지 로드 < 3초 (Google Sheets API 호출 포함) | 브라우저 Network 탭 측정 |
| Security | 서버단 권한 검증 (클라이언트 우회 불가), 민감정보 암호화 | 코드 리뷰, 침투 테스트 |
| Localization | 모든 UI 텍스트 i18n 시트 참조율 100% | 하드코딩 텍스트 검색 (0건) |
| Usability | 베트남 모바일 환경(저사양 단말) 가독성 | 실제 기기 테스트 |
| Compliance | 한국 PIPA 준수, 개인정보 동의 절차, 정기 안내 이메일 | 체크리스트 검증 |
| Auditability | 모든 데이터 변경 감사 로그 100% 기록 | 로그 누락 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 11개 시트 구조 완성 (Students, Agencies, Users, PrivacyConsents, EmailLogs, Consultations, ExamResults, TargetHistory, AuditLogs, SystemConfig, i18n)
- [ ] Code.gs: 다국어 엔진, Users 기반 인증, 회원가입, 이메일 서비스, 감사 로그, 알림 함수 구현
- [ ] Signup.html: 학생 회원가입 UI (21개 필드 + 개인정보 동의)
- [ ] FindId.html / ResetPassword.html: ID/비밀번호 찾기 UI
- [ ] EmailService.gs: 이메일 인증, ID 찾기, 비밀번호 재설정, 정기 안내 발송 구현
- [ ] PrivacyService.gs: 개인정보 동의 기록, 정기 안내 대상 조회 구현
- [ ] GAS Time-driven Trigger: 정기 개인정보 안내 이메일 자동 발송 (6개월 주기)
- [ ] master/agency/student 권한별 데이터 격리 검증 완료
- [ ] 학생 회원가입 → 로그인 → 자기 정보 수정 시나리오 테스트 통과
- [ ] ID/비밀번호 찾기 기능 정상 동작 확인
- [ ] 개인정보 동의 기록 정상 저장 확인
- [ ] 정기 이메일 발송 정상 작동 확인
- [ ] KO/VI 전환 시 모든 UI 요소 정상 변경 확인
- [ ] 감사 로그 누락 없이 기록 확인
- [ ] Setup Guide 문서 작성

### 4.2 Quality Criteria

- [ ] i18n 시트 참조율 100% (하드코딩 텍스트 0건)
- [ ] 서버단 권한 검증 테스트 통과
- [ ] 모바일 반응형 레이아웃 정상 작동
- [ ] GAS 실행 제한(6분) 이내 모든 함수 완료
- [ ] 개인정보보호법 체크리스트 100% 통과

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| GAS 실행 시간 제한 (6분) | High | Medium | 대량 데이터 처리 시 배치 분할, 캐싱 적극 활용 |
| Google Sheets API 호출 제한 | Medium | Medium | 캐시 레이어 도입, 불필요한 API 호출 최소화 |
| 베트남어 텍스트 인코딩 문제 | Medium | Low | UTF-8 일관 적용, 특수 문자(성조) 테스트 |
| 학생이 타 학생 데이터 접근 시도 | High | Medium | 모든 API에 서버단 권한 검증 필수 적용 |
| 개인정보 보호법 위반 | High | Low | PIPA 체크리스트 검증, 동의 절차 구현, 정기 안내 이메일 |
| 이메일 발송 실패 (Gmail 일일 제한) | Medium | Medium | GmailApp 일일 100명 제한 관리, 폴백: 관리자 알림 |
| 회원가입 시 중복 Email/LoginID | Medium | Medium | 서버단 중복 검증, 명확한 에러 메시지 |
| i18n 누락으로 하드코딩 텍스트 표출 | Medium | Medium | 빌드 시 i18n 키 검증 스크립트, 폴백 텍스트 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure, GAS + Sheets | 단일 시트 관리 도구 | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | 웹 앱, SaaS MVP | ☑ |
| **Enterprise** | Strict layer separation, microservices | 대규모 트래픽 시스템 | ☐ |

> **선택: Dynamic** - Google Apps Script + Google Sheets 기반이지만, **3-tier 사용자**, **학생 회원가입**, **이메일 서비스**, 다국어/보안/알림 등 복합 기능을 포함하므로 Dynamic 수준의 모듈화가 필요합니다.

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Platform | GAS / Node.js / Python | **Google Apps Script** | 서버리스, Google Sheets 직접 연동, 무료 호스팅 |
| Database | Google Sheets / Firebase / Supabase | **Google Sheets (11 시트)** | GAS와 네이티브 통합, 비개발자도 데이터 확인 가능 |
| Frontend | GAS HtmlService / React / Vue | **GAS HtmlService (HTML/JS)** | GAS 생태계 내 완결, 배포 단순화 |
| i18n | 하드코딩 / JSON 파일 / Sheets 사전 | **i18n 시트 (Key-Value)** | 비개발자도 번역 수정 가능, 실시간 반영 |
| 인증 | Google OAuth / 자체 인증 / Session | **Users 시트 기반 자체 인증** | 3-tier 사용자 구조 지원, 학생 회원가입 지원 |
| 이메일 | GmailApp / 외부 SMTP / SendGrid | **GmailApp (일일 100명 제한)** | GAS 네이티브, 무료, 학생 수 고려 시 충분 |
| 알림 | Email / 알림톡 API / SMS | **알림톡/SMS API + Email 폴백** | 베트남/한국 양국 도달률 최적화 |
| 스타일링 | Bootstrap / Tailwind / Custom CSS | **Custom CSS + 반응형** | GAS HtmlService 호환, 경량화 |

### 6.3 System Architecture (v2.0)

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 (브라우저)                       │
│      Master / Agency / Student (회원가입 가능)            │
│                  KO / VI 전환                             │
├─────────────────────────────────────────────────────────┤
│              Frontend (HTML)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Signup   │ │ Login    │ │ FindId   │ │ Reset     │  │
│  │ (학생용)  │ │ (공통)    │ │ (공통)    │ │ Password  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Index    │ │ Student  │ │ Consult  │ │ Privacy   │  │
│  │ (메인)    │ │ List/Form│ │ Record   │ │ Modal     │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
├─────────────────────────────────────────────────────────┤
│            google.script.run (GAS API)                   │
├─────────────────────────────────────────────────────────┤
│                Backend (GAS .gs Files)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ i18n     │ │ Auth &   │ │ Email    │ │ Privacy   │  │
│  │ Engine   │ │ Users    │ │ Service  │ │ Service   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Student  │ │ Consult  │ │ Exam     │ │ Audit     │  │
│  │ Service  │ │ Service  │ │ Service  │ │ Service   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
├─────────────────────────────────────────────────────────┤
│              Google Sheets (Database - 11 시트)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Users    │ │ Students │ │ Agencies │ │ Privacy   │  │
│  │ (통합인증)│ │          │ │          │ │ Consents  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Email    │ │ Consult  │ │ Exam     │ │ Target    │  │
│  │ Logs     │ │ -ations  │ │ Results  │ │ History   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ Audit    │ │ System   │ │ i18n     │                │
│  │ Logs     │ │ Config   │ │          │                │
│  └──────────┘ └──────────┘ └──────────┘                │
├─────────────────────────────────────────────────────────┤
│  GAS Time-driven Triggers (자동화)                        │
│  - 정기 개인정보 이용 안내 이메일 (6개월 주기)              │
│  - 비자 만료 알림 (30일 전)                               │
├─────────────────────────────────────────────────────────┤
│          외부 API (알림톡/SMS, Email SMTP)                │
└─────────────────────────────────────────────────────────┘
```

### 6.4 시트 구조 미리보기 (v2.0 - 11 Sheets)

#### NEW Sheet 1: Users (통합 인증)
| Column | Type | Description |
|--------|------|-------------|
| UserID | String | PK (MASTER, AgencyCode, STU+StudentID) |
| UserType | String | master / agency / student |
| LoginID | String | 로그인 아이디 (Unique) |
| Email | String | 이메일 (Unique) |
| PasswordHash | String | SHA-256 해시 |
| PrivacyConsentDate | DateTime | 개인정보 동의 일시 |
| LastPrivacyNotice | DateTime | 마지막 개인정보 안내 이메일 발송일 |
| IsActive | Boolean | 활성 여부 |
| CreatedAt | DateTime | 생성일시 |
| UpdatedAt | DateTime | 수정일시 |

#### NEW Sheet 2: PrivacyConsents (개인정보 동의 기록)
| Column | Type | Description |
|--------|------|-------------|
| ConsentID | String | PK (UUID) |
| UserID | String | FK → Users.UserID |
| ConsentType | String | signup / privacy_notice |
| ConsentDate | DateTime | 동의 일시 |
| ConsentIP | String | 동의 시 IP 주소 |
| ConsentText | String | 동의 문구 전문 |
| ExpiryDate | DateTime | 다음 안내일 (6개월 후) |
| CreatedAt | DateTime | 기록 생성일 |

#### NEW Sheet 3: EmailLogs (이메일 발송 기록)
| Column | Type | Description |
|--------|------|-------------|
| EmailID | String | PK (UUID) |
| UserID | String | FK → Users.UserID |
| EmailType | String | verification / find_id / reset_password / privacy_notice |
| ToEmail | String | 수신 이메일 |
| Subject | String | 제목 |
| Body | String | 본문 |
| Status | String | sent / failed |
| SentAt | DateTime | 발송일시 |
| CreatedAt | DateTime | 기록 생성일 |

#### Sheet 4: Students (기존 + UserID FK 추가)
| Column | Type | Description |
|--------|------|-------------|
| StudentID | String | YYAAASSSSS (PK) |
| **UserID** | **String** | **FK → Users.UserID (NEW)** |
| NameKR | String | 한국 이름 |
| NameVN | String | 베트남 이름 |
| DateOfBirth | Date | 생년월일 |
| Gender | String | M / F |
| AgencyCode | String | FK → Agencies.AgencyCode |
| ... | ... | (기존 21개 컬럼 유지) |

#### Sheet 5: Agencies (기존 + UserID FK 추가)
| Column | Type | Description |
|--------|------|-------------|
| AgencyCode | String | PK |
| **UserID** | **String** | **FK → Users.UserID (NEW)** |
| AgencyName | String | 유학원명 |
| ContactPerson | String | 담당자 이름 |
| ~~LoginID~~ | ~~String~~ | ~~(Users 시트로 이동)~~ |
| ~~PasswordHash~~ | ~~String~~ | ~~(Users 시트로 이동)~~ |
| IsActive | Boolean | 활성 여부 |
| CreatedAt | DateTime | 생성일시 |
| UpdatedAt | DateTime | 수정일시 |

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [ ] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists (Phase 2 output)
- [x] GAS 프로젝트 구조 (Code.gs + Signup.html + Login.html + Index.html)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | partial | 함수: camelCase, 시트 컬럼: PascalCase, i18n 키: snake_case | High |
| **Folder structure** | partial | Users 관련 .gs 추가 (AuthService, EmailService, PrivacyService) | High |
| **i18n Key Naming** | defined | `{category}_{element}_{action}` + 회원가입/이메일 관련 키 | High |
| **Error handling** | defined | try-catch 패턴, 다국어 에러 메시지 반환 | Medium |
| **Audit logging** | defined | 모든 CRUD + 회원가입/로그인/이메일 발송 감사 로그 필수 | High |

### 7.3 Environment Variables / Config

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `SPREADSHEET_ID` | 메인 스프레드시트 ID | Server (GAS) | ☑ |
| `MASTER_SALT` | 비밀번호 해시용 솔트 | Server (GAS) | ☑ |
| `NOTIFICATION_API_KEY` | 알림톡/SMS API 키 | Server (GAS) | ☑ |
| `ENCRYPTION_KEY` | 민감정보 암호화 키 | Server (GAS) | ☑ |
| `MAX_LOGIN_ATTEMPTS` | 최대 로그인 시도 횟수 | Config | ☑ |
| **`EMAIL_VERIFICATION_EXPIRE`** | **이메일 인증 코드 만료 시간 (분)** | **Config** | **☑ (NEW)** |
| **`PRIVACY_NOTICE_INTERVAL`** | **개인정보 안내 주기 (일)** | **Config** | **☑ (NEW, 180일)** |

### 7.4 Pipeline Integration

| Phase | Status | Document Location | Action |
|-------|:------:|-------------------|--------|
| Phase 1 (Schema) | ☑ v2.0 | `docs/01-plan/schema.md` | 완료 (11개 Entity, ER 다이어그램, Users/PrivacyConsents/EmailLogs 추가) |
| Phase 2 (Convention) | ☑ | `docs/01-plan/conventions.md` | 완료 (GAS 코딩 규칙 전체) |

---

## 8. Constraints & Rules

### 8.1 Must Do

| ID | Constraint | Description |
|----|-----------|-------------|
| C-01 | **Localization** | 모든 라벨, 버튼, 에러 메시지, 알림 문구는 i18n 시트 참조 (하드코딩 금지) |
| C-02 | **Security** | 서버단 권한 검증 (클라이언트 우회 불가), 학생은 자기 정보만 접근 |
| C-03 | **Privacy** | 회원가입 시 PrivacyConsents 기록 필수, 6개월마다 이메일 발송 |
| C-04 | **Audit** | 모든 데이터 조작 + 회원가입/로그인/이메일 발송 시 AuditLogs 기록 |
| C-05 | **Encryption** | 학부모 경제상황 등 민감 정보 암호화 저장 |
| C-06 | **Email Verification** | 회원가입 시 이메일 인증 코드 검증 필수 |
| C-07 | **Unique LoginID/Email** | Users 시트에서 LoginID, Email 중복 불가 |

### 8.2 Must NOT Do

| ID | Constraint | Description |
|----|-----------|-------------|
| N-01 | 구글 시트 원본 공유를 통한 데이터 접근 허용 **금지** |
| N-02 | 하드코딩된 UI 텍스트 사용 **금지** (반드시 i18n 시트 참조) |
| N-03 | 클라이언트 측에서만 권한 검증하는 것 **금지** (서버단 필수) |
| N-04 | 학생이 타 학생 정보 접근 **금지** (서버단 필터링 필수) |
| N-05 | 개인정보 동의 없이 회원가입 완료 **금지** |

---

## 9. Implementation Roadmap (High-Level v2.0)

| Phase | Description | Estimated Effort |
|-------|-------------|-----------------|
| **1** | 개발 환경 설정 & 11개 시트 구조 생성 | 1일 |
| **2** | i18n 엔진 & 다국어 사전 구축 (회원가입/이메일 키 추가) | 1-2일 |
| **3** | Users 시트 기반 인증 시스템 (로그인/권한/세션) | 2일 |
| **4** | 학생 회원가입 시스템 (Signup.html + SignupService.gs) | 2-3일 |
| **5** | 이메일 서비스 (EmailService.gs, 인증/ID찾기/비밀번호재설정) | 2일 |
| **6** | 개인정보 서비스 (PrivacyService.gs, 동의 기록/정기 안내) | 1일 |
| **7** | ID/비밀번호 찾기 UI (FindId.html, ResetPassword.html) | 1일 |
| **8** | 학생 CRUD + 자기 정보 수정 | 3-4일 |
| **9** | 감사 로그 시스템 (회원가입/이메일 발송 기록 추가) | 1일 |
| **10** | 프론트엔드 UI (언어 토글, 반응형 폼) | 2-3일 |
| **11** | 상담 기록 & TOPIK 성적 관리 | 2일 |
| **12** | 비자/행정 관리 & 자동 알림 | 2일 |
| **13** | GAS Time-driven Trigger 설정 (정기 이메일 자동 발송) | 1일 |
| **14** | 통합 테스트 & 배포 | 3일 |

**Total**: 약 24-30일 (기존 17-19일 → 7-11일 추가)

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`gas-student-platform.design.md` v2.0)
   - [ ] Users 시트 설계
   - [ ] PrivacyConsents 시트 설계
   - [ ] EmailLogs 시트 설계
   - [ ] 학생 회원가입 흐름도
   - [ ] 이메일 서비스 상세 설계
   - [ ] 개인정보 동의 및 정기 안내 설계

2. [ ] 시트 구조 상세 설계 (11개 시트, 컬럼별 데이터 타입, 제약조건)

3. [ ] GAS 모듈 분리 설계
   - [ ] AuthService.gs (Users 기반 인증)
   - [ ] SignupService.gs (학생 회원가입)
   - [ ] EmailService.gs (이메일 발송)
   - [ ] PrivacyService.gs (개인정보 관리)

4. [ ] UI 와이어프레임 설계
   - [ ] Signup.html
   - [ ] FindId.html
   - [ ] ResetPassword.html

5. [ ] 구현 시작 (`/pdca do gas-student-platform`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-10 | Initial draft - 전체 요구사항 분석 및 Plan 작성 | AJU E&J |
| 1.1 | 2026-02-10 | GAS 플랫폼 작동 원리 가이드 추가 (프론트엔드/백엔드/통신/시트DB) | AJU E&J |
| **2.0** | **2026-02-15** | **v2.0 구조로 전면 개편: 3-tier 사용자, 학생 회원가입, Users/PrivacyConsents/EmailLogs 시트 추가, 이메일 기능, 개인정보 보호 강화** | **AJU E&J** |
