# Step 4 - 학생 회원가입 시스템 Plan

> **Feature**: 통합 인증 + 학생 자체 회원가입 + 개인정보보호법 준수
> **Version**: 4.0
> **Created**: 2026-02-16
> **PDCA Phase**: Plan
> **Level**: Dynamic
> **Prerequisites**: Step 3 완료 (Match Rate: 97.4%)

---

## 1. Overview

### 1.1 Background

**현재 시스템 한계**:
- ❌ 학생은 시스템에 직접 로그인 불가
- ❌ 유학원/관리자가 모든 학생 데이터 수동 입력
- ❌ 학생 본인의 정보 조회/수정 권한 없음
- ❌ 개인정보보호법 완전 준수 미흡 (동의 관리 부재)
- ❌ 이메일 기반 ID/비밀번호 찾기 불가

**Schema v2.0 목표**:
- ✅ 학생 자체 회원가입 및 로그인
- ✅ Users 통합 인증 시트 (master/agency/student)
- ✅ Email 기반 ID/비밀번호 재설정
- ✅ 개인정보 수집/이용 동의 관리
- ✅ 정기 개인정보 이용 알림 (6개월)
- ✅ 법적 리스크 완전 제거

### 1.2 Goals

**비즈니스 목표**:
1. **학생 자율성 증가**: 본인이 직접 정보 입력 및 관리
2. **유학원 업무 감소**: 데이터 입력 자동화 (학생이 직접)
3. **법적 준수**: 개인정보보호법 완전 준수
4. **사용자 경험 개선**: 학생 중심 플랫폼으로 전환

**기술 목표**:
1. Users 통합 인증 시트 구현
2. Email 인증 시스템 구축
3. 비밀번호 재설정 플로우 구현
4. 개인정보 동의 관리 시스템 구현
5. 정기 알림 자동화 (Time-based Trigger)

---

## 2. Feature Requirements

### 2.1 Feature #1: Users 통합 인증 시스템 (2주)

**Priority**: Critical
**Complexity**: High
**Estimated Effort**: 2주 (14일)

#### 2.1.1 Requirements

**기능 요구사항**:
1. **Users 시트 생성** (NEW)
   - UserID (PK): MASTER, AGENCY_CODE, STU+StudentID
   - UserType: master, agency, student
   - LoginID, Email, PasswordHash
   - PrivacyConsentDate, LastPrivacyNotice
   - LoginAttempts, LastLogin
   - IsActive, CreatedAt, UpdatedAt

2. **기존 데이터 마이그레이션**
   - Agencies 시트 → Users 시트 (UserType: agency)
   - Students 시트 → Users 시트 (UserType: student)
   - 기존 PasswordHash 유지
   - LoginID 생성 규칙:
     - Master: "admin"
     - Agency: AgencyCode (예: "HANOI")
     - Student: Email 기반 자동 생성 또는 수동 입력

3. **AuthService.gs v2.0 리팩토링**
   - login(loginId, password) → Users 시트 조회
   - getUserInfo(sessionId) → Users 조인 Students/Agencies
   - _validateSession(sessionId) → Users 기반 검증
   - 기존 Agencies 기반 로직 완전 제거

4. **Login.html 리팩토링**
   - LoginID 입력 필드 (Email 또는 ID)
   - UserType 자동 감지 (로그인 후)
   - 역할별 리다이렉트:
     - master → Index.html (관리자 대시보드)
     - agency → Index.html (유학원 대시보드)
     - student → StudentPortal.html (학생 포털, NEW)

**비기능 요구사항**:
- **성능**: 로그인 응답 시간 <1초
- **보안**: 기존 보안 수준 유지 (SHA-256, Rate Limiting)
- **호환성**: 기존 권한 시스템과 100% 호환

#### 2.1.2 User Stories

**US-4.1.1**: 시스템 관리자 - Users 통합 인증
```
As a 시스템 개발자,
I want to 모든 사용자를 Users 시트로 통합 관리하고,
So that 일관된 인증 로직과 확장 가능한 아키텍처를 구축할 수 있다.
```

**US-4.1.2**: 유학원 담당자 - 기존 로그인 유지
```
As a 유학원 담당자,
I want to 기존과 동일하게 AgencyCode로 로그인하고,
So that 변화 없이 시스템을 계속 사용할 수 있다.
```

**US-4.1.3**: 학생 - 새로운 로그인
```
As a 베트남 유학생,
I want to 내 Email 주소로 로그인하고,
So that 내 정보를 직접 확인하고 관리할 수 있다.
```

#### 2.1.3 Acceptance Criteria

- [ ] Users 시트 생성 및 컬럼 정의 완료
- [ ] 기존 Agencies/Students 데이터 100% 마이그레이션
- [ ] AuthService.gs v2.0 리팩토링 완료
- [ ] Login.html UserType별 리다이렉트 구현
- [ ] 기존 권한 시스템 100% 호환
- [ ] 성능: 로그인 <1초
- [ ] 보안: 기존 수준 유지 (Rate Limiting, SHA-256)

---

### 2.2 Feature #2: 학생 회원가입 시스템 (2주)

**Priority**: High
**Complexity**: High
**Estimated Effort**: 2주 (14일)

#### 2.2.1 Requirements

**기능 요구사항**:
1. **SignUp.html (회원가입 페이지)**
   - 학생 기본 정보 입력:
     - Email (ID 겸용, unique 검증)
     - Password (8자 이상, 영문+숫자 필수)
     - NameKR, NameVN
     - Gender (M/F)
     - DOB (생년월일)
     - Phone
     - AgencyCode (드롭다운 선택)
   - 이메일 인증 버튼 (6자리 코드 발송)
   - 개인정보 수집/이용 동의 체크박스 (필수)
   - 회원가입 버튼

2. **Email 인증 시스템**
   - 6자리 랜덤 코드 생성
   - Gmail API로 인증 코드 이메일 발송
   - EmailLogs 시트 기록 (발송 이력)
   - 코드 유효 시간: 10분
   - 인증 완료 시 PrivacyConsents 시트 기록

3. **SignUpService.gs (회원가입 로직)**
   - registerStudent(signUpData)
     - Email 중복 체크 (Users 시트)
     - StudentID 자동 생성 (YY-AGENCY-SEQ)
     - PasswordHash 생성 (SHA-256 + MASTER_SALT)
     - Users 시트 삽입 (UserType: student)
     - Students 시트 삽입 (기본 정보)
     - PrivacyConsents 시트 삽입
     - 감사 로그 기록
   - sendEmailVerification(email)
     - 6자리 코드 생성
     - CacheService 저장 (10분 TTL)
     - Gmail API 발송
     - EmailLogs 기록
   - verifyEmailCode(email, code)
     - CacheService 조회
     - 코드 일치 여부 검증
     - 성공 시 캐시 삭제

4. **비밀번호 재설정 플로우**
   - ForgotPassword.html (비밀번호 찾기 페이지)
   - Email 입력 → 재설정 링크 발송
   - 재설정 토큰 (UUID, 1시간 유효)
   - ResetPassword.html (새 비밀번호 입력)
   - resetPassword(token, newPassword)
     - 토큰 검증
     - PasswordHash 업데이트
     - EmailLogs 기록

**비기능 요구사항**:
- **보안**: Email 인증 필수 (봇 가입 방지)
- **사용성**: 10분 이내 회원가입 완료 가능
- **신뢰성**: Email 발송 성공률 >95%

#### 2.2.2 User Stories

**US-4.2.1**: 학생 - 회원가입
```
As a 베트남 유학생,
I want to 내 Email 주소로 회원가입하고,
So that 내 정보를 직접 관리할 수 있다.
```

**US-4.2.2**: 학생 - Email 인증
```
As a 회원가입 중인 학생,
I want to Email로 받은 인증 코드를 입력하고,
So that 내 Email 주소가 유효함을 증명할 수 있다.
```

**US-4.2.3**: 학생 - 비밀번호 재설정
```
As a 비밀번호를 잊은 학생,
I want to Email로 재설정 링크를 받고,
So that 새 비밀번호를 설정할 수 있다.
```

#### 2.2.3 Acceptance Criteria

- [ ] SignUp.html 회원가입 폼 구현 (10개 필드)
- [ ] Email 인증 시스템 (6자리 코드, 10분 유효)
- [ ] 개인정보 동의 체크박스 (필수)
- [ ] SignUpService.registerStudent() 구현
- [ ] 비밀번호 재설정 플로우 (ForgotPassword.html, ResetPassword.html)
- [ ] Email 발송 성공률 >95%
- [ ] 사용성: 10분 이내 가입 완료

---

### 2.3 Feature #3: 개인정보보호법 준수 (1주)

**Priority**: Critical
**Complexity**: Medium
**Estimated Effort**: 1주 (7일)

#### 2.3.1 Requirements

**기능 요구사항**:
1. **PrivacyConsents 시트 생성**
   - ConsentID (PK)
   - UserID (FK → Users)
   - ConsentDate (동의 일시)
   - ConsentType (signup, periodic_notice)
   - IPAddress (선택)
   - UserAgent (선택)
   - ConsentText (동의 문구 전문)

2. **EmailLogs 시트 생성**
   - EmailID (PK)
   - UserID (FK → Users)
   - EmailType (verification, password_reset, privacy_notice)
   - SentDate (발송 일시)
   - Status (sent, failed)
   - ErrorMessage (실패 시)
   - Subject, Body

3. **개인정보 수집/이용 동의 화면**
   - PrivacyPolicy.html (개인정보처리방침)
   - 회원가입 시 동의 체크박스 (필수)
   - 동의 문구 전문 표시
   - 동의 시 PrivacyConsents 시트 기록

4. **정기 개인정보 이용 알림 (6개월)**
   - Time-based Trigger (매월 1일 오전 9시)
   - sendPrivacyNotice() 함수
     - Users 시트 조회 (LastPrivacyNotice < 6개월 전)
     - Gmail API 알림 이메일 발송
     - EmailLogs 기록
     - LastPrivacyNotice 업데이트
   - 알림 내용:
     - 개인정보 보유 현황
     - 개인정보 삭제 요청 방법
     - 개인정보처리방침 링크

5. **졸업생 데이터 보관 정책**
   - 졸업 후 3년 보관
   - 3년 경과 시 자동 삭제 (Soft Delete → Hard Delete)
   - 삭제 30일 전 이메일 알림
   - deleteExpiredStudents() 함수 (월 1회 실행)

**비기능 요구사항**:
- **법적 준수**: 개인정보보호법 완전 준수
- **투명성**: 모든 개인정보 수집/이용 명시
- **감사 가능성**: 모든 동의/알림 기록 보관

#### 2.3.2 User Stories

**US-4.3.1**: 학생 - 개인정보 동의
```
As a 회원가입 중인 학생,
I want to 개인정보 수집/이용 동의 내용을 확인하고,
So that 안심하고 내 정보를 제공할 수 있다.
```

**US-4.3.2**: 학생 - 정기 알림 수신
```
As a 등록된 학생,
I want to 6개월마다 개인정보 이용 현황 알림을 받고,
So that 내 정보가 어떻게 사용되는지 알 수 있다.
```

**US-4.3.3**: 관리자 - 법적 준수 확인
```
As a 시스템 관리자,
I want to 모든 개인정보 동의 기록을 조회하고,
So that 법적 감사 시 증빙 자료로 제출할 수 있다.
```

#### 2.3.3 Acceptance Criteria

- [ ] PrivacyConsents 시트 생성 및 컬럼 정의
- [ ] EmailLogs 시트 생성 및 컬럼 정의
- [ ] 회원가입 시 개인정보 동의 체크박스 (필수)
- [ ] PrivacyPolicy.html 개인정보처리방침 페이지
- [ ] 정기 알림 Trigger 설정 (매월 1일)
- [ ] 졸업생 데이터 자동 삭제 정책 구현
- [ ] 법적 준수: 개인정보보호법 100% 준수

---

## 3. Technical Design

### 3.1 Architecture

**새로운 Service 파일** (2개):
1. **AuthService.gs v2.0** (리팩토링)
   - login(loginId, password) → Users 기반
   - getUserInfo(sessionId)
   - _validateSession(sessionId)
   - _migrateToUsers() (일회성 마이그레이션 함수)

2. **SignUpService.gs** (NEW)
   - registerStudent(signUpData)
   - sendEmailVerification(email)
   - verifyEmailCode(email, code)
   - sendPasswordResetEmail(email)
   - resetPassword(token, newPassword)

3. **PrivacyService.gs** (NEW)
   - recordConsent(userId, consentType, consentText)
   - sendPrivacyNotice() (정기 알림)
   - deleteExpiredStudents() (졸업생 삭제)
   - getConsentHistory(userId)

4. **EmailService.gs** (NEW)
   - sendEmail(to, subject, body, emailType)
   - generateVerificationCode() (6자리)
   - generateResetToken() (UUID)
   - logEmailSent(userId, emailType, status)

**새로운 Sheet** (3개):
1. **Users**: 통합 사용자 인증
   - UserID, UserType, LoginID, Email, PasswordHash
   - AgencyCode, PrivacyConsentDate, LastPrivacyNotice
   - LoginAttempts, LastLogin, IsActive
   - CreatedAt, UpdatedAt

2. **PrivacyConsents**: 개인정보 동의 기록
   - ConsentID, UserID, ConsentDate, ConsentType
   - IPAddress, UserAgent, ConsentText

3. **EmailLogs**: 이메일 발송 기록
   - EmailID, UserID, EmailType, SentDate
   - Status, ErrorMessage, Subject, Body

**새로운 Frontend** (4개):
1. **SignUp.html**: 회원가입 페이지
2. **ForgotPassword.html**: 비밀번호 찾기 페이지
3. **ResetPassword.html**: 비밀번호 재설정 페이지
4. **PrivacyPolicy.html**: 개인정보처리방침 페이지

### 3.2 Data Flow

**회원가입 플로우**:
```
1. SignUp.html (학생 정보 입력)
   ↓
2. 이메일 인증 버튼 클릭
   → sendEmailVerification(email)
   → Gmail API 발송 (6자리 코드)
   → EmailLogs 기록
   ↓
3. 인증 코드 입력
   → verifyEmailCode(email, code)
   → 검증 성공
   ↓
4. 개인정보 동의 체크
   → recordConsent(userId, 'signup', consentText)
   → PrivacyConsents 기록
   ↓
5. 회원가입 버튼 클릭
   → registerStudent(signUpData)
   → Users 시트 삽입
   → Students 시트 삽입
   → 감사 로그
   ↓
6. 로그인 페이지로 리다이렉트
```

**비밀번호 재설정 플로우**:
```
1. ForgotPassword.html (Email 입력)
   ↓
2. sendPasswordResetEmail(email)
   → 재설정 토큰 생성 (UUID)
   → CacheService 저장 (1시간 TTL)
   → Gmail API 발송 (재설정 링크)
   → EmailLogs 기록
   ↓
3. Email에서 링크 클릭
   → ResetPassword.html?token=XXX
   ↓
4. 새 비밀번호 입력
   → resetPassword(token, newPassword)
   → 토큰 검증
   → PasswordHash 업데이트
   → 감사 로그
   ↓
5. 로그인 페이지로 리다이렉트
```

---

## 4. Implementation Roadmap

### 4.1 Week 9-10: 통합 인증 시스템 (Day 50-63, 14일)

**Day 50-52: Users 시트 및 마이그레이션** (3일)
- [ ] Users 시트 생성 (11개 컬럼)
- [ ] _migrateToUsers() 함수 작성
  - Agencies → Users (UserType: agency)
  - Students → Users (UserType: student)
- [ ] 마이그레이션 실행 및 검증

**Day 53-56: AuthService.gs v2.0 리팩토링** (4일)
- [ ] login() 함수 리팩토링 (Users 기반)
- [ ] getUserInfo() 함수 리팩토링
- [ ] _validateSession() 함수 리팩토링
- [ ] 기존 Agencies 로직 제거
- [ ] 테스트 함수 작성 (testLogin, testGetUserInfo)

**Day 57-59: Login.html 리팩토링** (3일)
- [ ] LoginID 입력 필드 (Email 또는 ID)
- [ ] UserType 자동 감지 로직
- [ ] 역할별 리다이렉트:
  - master → Index.html
  - agency → Index.html
  - student → StudentPortal.html (임시 페이지)
- [ ] i18n 키 추가 (5개)

**Day 60-63: Integration & Testing** (4일)
- [ ] Code.gs 진입점 확인
- [ ] 전체 권한 시스템 호환성 테스트
- [ ] 성능 테스트 (로그인 <1초)
- [ ] 배포 가이드 작성

**산출물 (Week 9-10)**:
- ✅ Users 시트 (11개 컬럼, 100-500 rows)
- ✅ AuthService.gs v2.0 (~300 lines)
- ✅ Login.html 리팩토링 (~100 lines 수정)
- ✅ 마이그레이션 스크립트
- ✅ 테스트 함수 (3개)

---

### 4.2 Week 11-12: 학생 회원가입 (Day 64-77, 14일)

**Day 64-67: SignUp.html 프론트엔드** (4일)
- [ ] 회원가입 폼 (10개 필드)
- [ ] Email 인증 버튼 및 코드 입력
- [ ] 개인정보 동의 체크박스
- [ ] 비밀번호 강도 표시 (실시간)
- [ ] AgencyCode 드롭다운 (getAgencyList API)
- [ ] 반응형 디자인
- [ ] i18n 지원 (20개 키)

**Day 68-71: SignUpService.gs & EmailService.gs** (4일)
- [ ] EmailService.gs 작성 (~200 lines)
  - sendEmail(to, subject, body, emailType)
  - generateVerificationCode() (6자리)
  - generateResetToken() (UUID)
  - logEmailSent()
- [ ] SignUpService.gs 작성 (~300 lines)
  - registerStudent(signUpData)
  - sendEmailVerification(email)
  - verifyEmailCode(email, code)
  - sendPasswordResetEmail(email)
  - resetPassword(token, newPassword)
- [ ] 테스트 함수 (5개)

**Day 72-74: 비밀번호 재설정 UI** (3일)
- [ ] ForgotPassword.html (~200 lines)
  - Email 입력 폼
  - 재설정 링크 발송 버튼
- [ ] ResetPassword.html (~200 lines)
  - 토큰 검증
  - 새 비밀번호 입력
  - 비밀번호 확인 (일치 검증)
- [ ] i18n 키 추가 (10개)

**Day 75-77: Integration & Testing** (3일)
- [ ] Code.gs 진입점 추가
- [ ] Email 발송 테스트 (Gmail API)
- [ ] 회원가입 플로우 E2E 테스트
- [ ] 비밀번호 재설정 플로우 E2E 테스트

**산출물 (Week 11-12)**:
- ✅ SignUp.html (~600 lines)
- ✅ ForgotPassword.html (~200 lines)
- ✅ ResetPassword.html (~200 lines)
- ✅ SignUpService.gs (~300 lines)
- ✅ EmailService.gs (~200 lines)
- ✅ 테스트 함수 (5개)
- ✅ i18n 키 (30개)

---

### 4.3 Week 13: 개인정보보호법 준수 (Day 78-84, 7일)

**Day 78-80: PrivacyConsents & EmailLogs 시트** (3일)
- [ ] PrivacyConsents 시트 생성 (7개 컬럼)
- [ ] EmailLogs 시트 생성 (8개 컬럼)
- [ ] PrivacyService.gs 작성 (~250 lines)
  - recordConsent(userId, consentType, consentText)
  - sendPrivacyNotice() (정기 알림)
  - deleteExpiredStudents() (졸업생 삭제)
  - getConsentHistory(userId)
- [ ] 테스트 함수 (3개)

**Day 81-82: 개인정보처리방침 페이지** (2일)
- [ ] PrivacyPolicy.html (~400 lines)
  - 개인정보 수집/이용 항목
  - 보유 및 이용 기간
  - 제3자 제공 (없음 명시)
  - 개인정보 삭제 요청 방법
  - 문의처
- [ ] SignUp.html에 동의 체크박스 연동
- [ ] recordConsent() 호출 (회원가입 시)

**Day 83-84: 정기 알림 Trigger 설정** (2일)
- [ ] setupPrivacyNoticeTrigger() 함수
  - Time-based Trigger (매월 1일 오전 9시)
  - sendPrivacyNotice() 호출
- [ ] testPrivacyNotice() 테스트 함수
- [ ] 배포 가이드 업데이트

**산출물 (Week 13)**:
- ✅ PrivacyConsents 시트 (7개 컬럼)
- ✅ EmailLogs 시트 (8개 컬럼)
- ✅ PrivacyService.gs (~250 lines)
- ✅ PrivacyPolicy.html (~400 lines)
- ✅ 정기 알림 Trigger 설정
- ✅ 테스트 함수 (3개)

---

## 5. Success Criteria

### 5.1 Functional Requirements

- [ ] **Users 통합 인증**: master/agency/student 모두 Users 시트 기반 로그인
- [ ] **학생 회원가입**: Email 인증 후 자체 계정 생성 가능
- [ ] **Email 인증**: 6자리 코드 발송/검증 성공률 >95%
- [ ] **비밀번호 재설정**: Email 링크로 비밀번호 재설정 가능
- [ ] **개인정보 동의**: 회원가입 시 필수 동의 및 기록
- [ ] **정기 알림**: 6개월마다 자동 발송
- [ ] **졸업생 삭제**: 졸업 후 3년 자동 삭제

### 5.2 Non-Functional Requirements

- [ ] **성능**: 로그인 <1초, 회원가입 <5초
- [ ] **보안**: 기존 보안 수준 유지 (SHA-256, Rate Limiting)
- [ ] **법적 준수**: 개인정보보호법 100% 준수
- [ ] **호환성**: 기존 권한 시스템 100% 호환
- [ ] **사용성**: 10분 이내 회원가입 완료
- [ ] **신뢰성**: Email 발송 성공률 >95%

### 5.3 Quality Metrics

- [ ] **Code Quality**: Excellent (JSDoc, 에러 처리, 테스트 함수)
- [ ] **Match Rate**: ≥90% (Plan vs Implementation)
- [ ] **i18n Coverage**: 100% (모든 UI 텍스트)
- [ ] **Test Coverage**: 11개 이상 테스트 함수

---

## 6. Risks & Mitigation

### 6.1 Technical Risks

**Risk 1: 기존 데이터 마이그레이션 실패**
- **Impact**: High
- **Mitigation**:
  - 백업 생성 (마이그레이션 전)
  - 단계별 검증 (Users → Students 1:1 매핑)
  - Rollback 스크립트 준비

**Risk 2: Email 발송 실패**
- **Impact**: High
- **Mitigation**:
  - Gmail API 할당량 확인 (일일 100건)
  - 발송 실패 시 재시도 로직
  - EmailLogs 기록으로 추적

**Risk 3: 성능 저하 (Users 조회)**
- **Impact**: Medium
- **Mitigation**:
  - CacheService 활용 (세션 정보)
  - 인덱싱 전략 (Email, LoginID 조회 최적화)

### 6.2 Legal Risks

**Risk 1: 개인정보보호법 미준수**
- **Impact**: Critical
- **Mitigation**:
  - 법률 전문가 검토 (선택)
  - 개인정보처리방침 명확화
  - 모든 동의/알림 기록 보관

---

## 7. Dependencies

### 7.1 External Dependencies

- **Gmail API**: Email 발송 (인증 코드, 비밀번호 재설정, 정기 알림)
- **CacheService**: 인증 코드, 재설정 토큰 임시 저장
- **Time-based Trigger**: 정기 알림 자동 발송

### 7.2 Internal Dependencies

- **Step 3 완료**: 기존 시스템 안정화 필요
- **Helpers.gs**: 기존 유틸리티 함수 활용
- **I18nService.gs**: 다국어 키 추가

---

## 8. Estimated Effort

### 8.1 Total Effort

| Week | Days | Backend | Frontend | Testing | Total Lines |
|------|------|---------|----------|---------|-------------|
| Week 9-10 | 14 | 300 | 100 | - | 400 |
| Week 11-12 | 14 | 500 | 1,000 | - | 1,500 |
| Week 13 | 7 | 250 | 400 | - | 650 |
| **Total** | **35** | **1,050** | **1,500** | **150** | **2,700** |

### 8.2 Team Effort

- **개발**: 1명 × 3주 = 21일 (실제 작업 시간 ~8시간, AI 지원)
- **테스트**: 자동 포함 (각 Week 마지막 2-3일)
- **배포**: 1일 (Week 13 종료 후)

---

## 9. Next Steps

1. ✅ Plan 문서 완료
2. ⏳ Design 문서 작성 (API 상세 설계, DB 스키마)
3. ⏳ Week 9-10 구현 시작 (Users 통합 인증)
4. ⏳ Week 11-12 구현 (학생 회원가입)
5. ⏳ Week 13 구현 (개인정보보호법 준수)
6. ⏳ Gap Analysis (PDCA Check)
7. ⏳ Completion Report (PDCA Report)

---

**Generated by**: bkit PDCA Planning System
**Date**: 2026-02-16
**Project**: AJU E&J 학생관리 프로그램
**Level**: Dynamic
**PDCA Cycle**: step4-student-signup-system (Plan Phase)
