# Step 4 - Student Signup System Design

> **Feature**: 학생 회원가입 시스템 + 통합 인증 + 개인정보보호법 준수
> **Version**: 1.0
> **Created**: 2026-02-16
> **PDCA Phase**: Design
> **Level**: Dynamic
> **Plan Document**: [step4-student-signup-system.plan.md](../../01-plan/features/step4-student-signup-system.plan.md)

---

## 1. Feature Overview

### 1.1 Design Goals

**3개 Core Features**:
1. **Users 통합 인증 시스템** (2주) - master/agency/student 통합 관리
2. **학생 회원가입 시스템** (2주) - 이메일 인증 + 비밀번호 재설정
3. **개인정보보호법 준수** (1주) - 동의 관리 + 정기 알림

**Background**:
- 현재 시스템: Agencies 시트 기반 인증 (master, agency만 지원)
- Schema v2.0: Users 시트 기반 통합 인증 (student 추가)
- 법적 요구사항: 개인정보보호법 완전 준수

### 1.2 Implementation Scope

**Refactored Service** (1개):
- AuthService.gs v2.0 (Users 기반 인증으로 전면 리팩토링)

**New Services** (3개):
- SignUpService.gs (회원가입, 이메일 인증, 비밀번호 재설정)
- PrivacyService.gs (동의 관리, 정기 알림, 데이터 삭제)
- EmailService.gs (Gmail API 이메일 발송)

**New Sheets** (3개):
- Users (통합 인증 - UserID, UserType, LoginID, Email, PasswordHash 등)
- PrivacyConsents (개인정보 동의 기록 - ConsentID, UserID, ConsentType 등)
- EmailLogs (이메일 발송 기록 - EmailID, UserID, EmailType, Status 등)

**New Frontend** (4개):
- SignUp.html (회원가입 폼 - 10개 필드)
- ForgotPassword.html (비밀번호 찾기)
- ResetPassword.html (비밀번호 재설정)
- PrivacyPolicy.html (개인정보 처리방침 동의)

**Refactored Frontend** (1개):
- Login.html v2.0 (Users 기반 로그인으로 전환)

**External APIs**:
- Gmail API (이메일 발송)

---

## 2. API Design

### 2.1 AuthService.gs v2.0 (Refactored)

> **Major Change**: Agencies 시트 → Users 시트 기반 인증으로 전환

#### `login(loginId, password, userType)`

**Purpose**: 사용자 로그인 (Users 기반)

**Parameters**:
```javascript
{
  loginId: string,      // LoginID (이메일 형식)
  password: string,     // 평문 비밀번호
  userType: string      // "master" | "agency" | "student"
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    userId: string,           // UserID (예: STU260010001)
    userType: string,         // "master" | "agency" | "student"
    agencyCode: string,       // (agency만) "HANOI" 등
    sessionToken: string,     // 세션 토큰 (1시간 TTL)
    sessionExpiry: number     // Unix timestamp
  },
  error: string,              // 에러 메시지
  errorKey: string            // i18n 키 (err_invalid_credentials, err_account_locked 등)
}
```

**Logic Flow**:
```
1. LoginAttempts 확인 (5회 초과 시 계정 잠금)
2. Users 시트에서 LoginID + UserType 조회
3. IsActive = false 시 에러 (err_account_inactive)
4. PasswordHash 검증 (SHA-256 + MASTER_SALT)
5. 비밀번호 불일치 시:
   - LoginAttempts++
   - 5회 초과 시 IsActive = false
   - 에러 반환 (err_invalid_credentials)
6. 로그인 성공 시:
   - LoginAttempts = 0
   - LastLogin = now()
   - Session 생성 (CacheService, 1시간 TTL)
   - AuditLog 기록 (Action: LOGIN)
7. sessionToken 반환
```

**Error Cases**:
| Error | ErrorKey | HTTP Status |
|-------|----------|-------------|
| LoginID 없음 | `err_invalid_credentials` | 401 |
| 비밀번호 불일치 | `err_invalid_credentials` | 401 |
| 계정 잠금 (5회 실패) | `err_account_locked` | 403 |
| 계정 비활성 | `err_account_inactive` | 403 |

**Migration Note**:
- 기존 Agencies.LoginID → Users.LoginID
- 기존 Agencies.PasswordHash → Users.PasswordHash
- AgencyCode는 Users.AgencyCode에 보관 (agency, student만)

---

#### `logout(sessionToken)`

**Purpose**: 세션 종료

**Parameters**:
```javascript
{
  sessionToken: string    // 현재 세션 토큰
}
```

**Returns**:
```javascript
{
  success: boolean,
  error: string
}
```

**Logic Flow**:
```
1. CacheService에서 세션 삭제
2. AuditLog 기록 (Action: LOGOUT)
3. success: true 반환
```

---

#### `validateSession(sessionToken)`

**Purpose**: 세션 유효성 검증 (내부 함수, 모든 API에서 호출)

**Parameters**:
```javascript
{
  sessionToken: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    userId: string,
    userType: string,
    agencyCode: string
  },
  error: string,
  errorKey: string
}
```

**Logic Flow**:
```
1. CacheService에서 세션 조회
2. 없으면 에러 (err_session_expired)
3. 있으면 data 반환
```

---

#### `changePassword(userId, oldPassword, newPassword)`

**Purpose**: 비밀번호 변경

**Parameters**:
```javascript
{
  userId: string,         // UserID
  oldPassword: string,    // 현재 비밀번호
  newPassword: string     // 새 비밀번호
}
```

**Returns**:
```javascript
{
  success: boolean,
  error: string,
  errorKey: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. Users 시트에서 userId 조회
3. oldPassword 검증 (SHA-256)
4. newPassword 유효성 검증:
   - 최소 8자
   - 영문 + 숫자 + 특수문자 조합
5. 새 PasswordHash 생성 (SHA-256 + MASTER_SALT)
6. Users 시트 업데이트
7. AuditLog 기록 (Action: PASSWORD_CHANGE)
8. 모든 세션 무효화 (재로그인 필요)
```

**Validation Rules**:
```javascript
// 비밀번호 정책
const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 50,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?"
};
```

---

### 2.2 SignUpService.gs (New)

#### `registerStudent(signupData)`

**Purpose**: 학생 회원가입 (이메일 인증 전 임시 등록)

**Parameters**:
```javascript
{
  email: string,              // 이메일 (LoginID로 사용)
  password: string,           // 비밀번호 (8자 이상)
  nameKR: string,             // 한국 이름
  nameVN: string,             // 베트남 이름
  dob: string,                // 생년월일 (YYYY-MM-DD)
  gender: string,             // "M" | "F"
  nationality: string,        // "Vietnam"
  phoneKR: string,            // 한국 전화번호
  phoneVN: string,            // 베트남 전화번호
  agencyCode: string,         // 소속 유학원 (드롭다운 선택)
  privacyConsent: boolean     // 개인정보 동의 (필수)
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    userId: string,           // 임시 UserID (예: STU260010001)
    verificationCode: string, // 6자리 인증 코드
    expiryTime: number        // 인증 코드 만료 시간 (10분 후)
  },
  error: string,
  errorKey: string
}
```

**Logic Flow**:
```
1. 입력 유효성 검증:
   - 이메일 형식 (RFC 5322)
   - 비밀번호 정책 (PASSWORD_POLICY)
   - 필수 필드 (nameKR, nameVN, dob, agencyCode)
   - 개인정보 동의 = true (필수)
2. Users 시트에서 email 중복 확인
   - 이미 존재 시 에러 (err_email_already_exists)
3. AgencyCode 유효성 검증 (Agencies 시트)
   - 존재하지 않으면 에러 (err_invalid_agency)
4. 임시 UserID 생성 (generateStudentID 사용)
   - 형식: STU + YY + AGENCY_SEQ + STUDENT_SEQ
   - 예: STU260010001 (26년도, 유학원001, 학생0001)
5. PasswordHash 생성 (SHA-256 + MASTER_SALT)
6. Users 시트에 임시 등록:
   - IsActive = false (이메일 인증 전까지)
   - EmailVerified = false
7. 6자리 인증 코드 생성 (난수)
8. CacheService에 코드 저장 (TTL: 10분)
   - Key: `verify_${email}`
   - Value: { code, userId, createdAt }
9. 이메일 발송 (EmailService.sendVerificationEmail)
10. PrivacyConsents 시트에 동의 기록
11. AuditLog 기록 (Action: SIGNUP_PENDING)
12. { userId, verificationCode, expiryTime } 반환
```

**Validation Rules**:
```javascript
// 이메일 정규식 (RFC 5322 Simple)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 전화번호 정규식
const PHONE_KR_REGEX = /^01[0-9]-[0-9]{4}-[0-9]{4}$/;
const PHONE_VN_REGEX = /^0[0-9]{9}$/;
```

---

#### `verifyEmail(email, verificationCode)`

**Purpose**: 이메일 인증 코드 검증

**Parameters**:
```javascript
{
  email: string,              // 등록한 이메일
  verificationCode: string    // 6자리 인증 코드
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    userId: string,
    message: string           // "이메일 인증이 완료되었습니다"
  },
  error: string,
  errorKey: string
}
```

**Logic Flow**:
```
1. CacheService에서 verify_${email} 조회
2. 없으면 에러 (err_verification_code_expired)
3. code 불일치 시 에러 (err_invalid_verification_code)
4. Users 시트 업데이트:
   - IsActive = true
   - EmailVerified = true
5. CacheService에서 코드 삭제
6. Welcome 이메일 발송 (EmailService.sendWelcomeEmail)
7. AuditLog 기록 (Action: EMAIL_VERIFIED)
8. success: true 반환
```

**Error Cases**:
| Error | ErrorKey | Description |
|-------|----------|-------------|
| 인증 코드 만료 (10분) | `err_verification_code_expired` | CacheService에 없음 |
| 인증 코드 불일치 | `err_invalid_verification_code` | 잘못된 코드 입력 |
| 이메일 없음 | `err_email_not_found` | Users 시트에 없음 |

---

#### `resendVerificationCode(email)`

**Purpose**: 인증 코드 재발송

**Parameters**:
```javascript
{
  email: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    expiryTime: number      // 새 만료 시간 (10분 후)
  },
  error: string,
  errorKey: string
}
```

**Logic Flow**:
```
1. Users 시트에서 email 조회
2. 이미 EmailVerified = true 시 에러 (err_email_already_verified)
3. 새 6자리 인증 코드 생성
4. CacheService 업데이트 (TTL: 10분)
5. 이메일 재발송
6. AuditLog 기록 (Action: VERIFICATION_CODE_RESENT)
```

---

#### `forgotPassword(email, userType)`

**Purpose**: 비밀번호 찾기 - 재설정 링크 이메일 발송

**Parameters**:
```javascript
{
  email: string,        // LoginID (이메일)
  userType: string      // "master" | "agency" | "student"
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    message: string     // "비밀번호 재설정 링크가 이메일로 발송되었습니다"
  },
  error: string,
  errorKey: string
}
```

**Logic Flow**:
```
1. Users 시트에서 email + userType 조회
2. 없으면 에러 (err_email_not_found)
3. 재설정 토큰 생성 (UUID 랜덤 문자열 32자)
4. CacheService에 토큰 저장 (TTL: 1시간)
   - Key: `reset_${token}`
   - Value: { userId, email, createdAt }
5. 재설정 URL 생성:
   - https://script.google.com/.../exec?page=resetPassword&token={token}
6. 이메일 발송 (EmailService.sendPasswordResetEmail)
7. AuditLog 기록 (Action: PASSWORD_RESET_REQUESTED)
8. success: true 반환
```

**Security Notes**:
- 토큰은 1회용 (사용 시 즉시 삭제)
- 1시간 후 자동 만료
- 이메일 존재 여부 노출 방지 (항상 성공 메시지)

---

#### `resetPassword(token, newPassword)`

**Purpose**: 재설정 토큰으로 새 비밀번호 설정

**Parameters**:
```javascript
{
  token: string,          // 재설정 토큰 (32자)
  newPassword: string     // 새 비밀번호
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    message: string       // "비밀번호가 성공적으로 변경되었습니다"
  },
  error: string,
  errorKey: string
}
```

**Logic Flow**:
```
1. CacheService에서 reset_${token} 조회
2. 없으면 에러 (err_invalid_reset_token)
3. newPassword 유효성 검증 (PASSWORD_POLICY)
4. PasswordHash 생성 (SHA-256 + MASTER_SALT)
5. Users 시트 업데이트
6. CacheService에서 토큰 삭제
7. 모든 세션 무효화 (해당 userId)
8. 비밀번호 변경 알림 이메일 발송
9. AuditLog 기록 (Action: PASSWORD_RESET_COMPLETED)
10. success: true 반환
```

---

### 2.3 PrivacyService.gs (New)

#### `recordConsent(userId, consentType, ipAddress, userAgent)`

**Purpose**: 개인정보 동의 기록 (회원가입 시 자동 호출)

**Parameters**:
```javascript
{
  userId: string,         // UserID
  consentType: string,    // "signup" | "renewal"
  ipAddress: string,      // 사용자 IP (법적 증빙)
  userAgent: string       // 브라우저 정보
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    consentId: string,    // ConsentID
    expiryDate: string    // 만료일 (1년 후)
  },
  error: string
}
```

**Logic Flow**:
```
1. ConsentID 생성 (generateConsentID)
   - 형식: CONSENT-YYYYMMDD-XXXXX
2. ConsentDate = now()
3. ExpiryDate = ConsentDate + 1년
4. ConsentText = SystemConfig에서 "PRIVACY_POLICY_KR" 조회
5. PrivacyConsents 시트에 기록
6. Users 시트 업데이트:
   - PrivacyConsentDate = ConsentDate
   - LastPrivacyNotice = ConsentDate
7. AuditLog 기록 (Action: CONSENT)
8. { consentId, expiryDate } 반환
```

---

#### `checkConsentExpiry(userId)`

**Purpose**: 개인정보 동의 만료 확인

**Parameters**:
```javascript
{
  userId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    isExpired: boolean,       // 만료 여부
    expiryDate: string,       // 만료일
    daysRemaining: number     // 남은 일수
  },
  error: string
}
```

**Logic Flow**:
```
1. Users 시트에서 PrivacyConsentDate 조회
2. ExpiryDate = PrivacyConsentDate + 1년
3. daysRemaining = ExpiryDate - now()
4. isExpired = (daysRemaining < 0)
5. { isExpired, expiryDate, daysRemaining } 반환
```

---

#### `sendPrivacyNotice(userId)`

**Purpose**: 개인정보 이용 알림 발송 (6개월마다 자동)

**Parameters**:
```javascript
{
  userId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    emailSent: boolean
  },
  error: string
}
```

**Logic Flow**:
```
1. Users 시트에서 사용자 정보 조회
2. LastPrivacyNotice 확인
   - 6개월 미경과 시 skip
3. 알림 이메일 발송 (EmailService.sendPrivacyNoticeEmail)
4. Users.LastPrivacyNotice = now()
5. EmailLogs에 기록
6. AuditLog 기록 (Action: PRIVACY_NOTICE_SENT)
```

**Time Trigger**:
```javascript
// 매월 1일 00:00에 실행
function setupPrivacyNoticeTrigger() {
  ScriptApp.newTrigger('sendAllPrivacyNotices')
    .timeBased()
    .onMonthDay(1)
    .atHour(0)
    .create();
}

function sendAllPrivacyNotices() {
  // 모든 Users 대상으로 sendPrivacyNotice 호출
}
```

---

#### `deleteExpiredStudentData()`

**Purpose**: 졸업생 데이터 삭제 (졸업 후 5년)

**Parameters**: None

**Returns**:
```javascript
{
  success: boolean,
  data: {
    deletedCount: number,     // 삭제된 학생 수
    deletedUserIds: string[]  // 삭제된 UserID 목록
  },
  error: string
}
```

**Logic Flow**:
```
1. Students 시트에서 Status = "졸업" AND GraduationDate < (now() - 5년) 조회
2. 각 학생별로:
   - Students 행 삭제
   - Users 행 삭제
   - PrivacyConsents 행 삭제
   - Consultations 행 삭제
   - ExamResults 행 삭제
   - TargetHistory 행 삭제
   - Files 메타데이터 삭제 (파일은 Google Drive에서 수동 삭제)
3. AuditLog 기록 (Action: DATA_DELETED, Reason: "5년 경과 졸업생")
4. { deletedCount, deletedUserIds } 반환
```

**Time Trigger**:
```javascript
// 매년 1월 1일 00:00에 실행
function setupDataDeletionTrigger() {
  ScriptApp.newTrigger('deleteExpiredStudentData')
    .timeBased()
    .onMonthDay(1)
    .atHour(0)
    .create();
}
```

**Legal Compliance**:
- 개인정보보호법 제21조 (보유기간 경과 시 파기)
- 졸업 후 5년: 학적부 보존기간 (교육관련기관의 정보공개에 관한 특례법 시행령 제3조)

---

### 2.4 EmailService.gs (New)

#### `sendVerificationEmail(email, verificationCode, nameKR, lang)`

**Purpose**: 이메일 인증 코드 발송

**Parameters**:
```javascript
{
  email: string,
  verificationCode: string,   // 6자리 코드
  nameKR: string,             // 수신자 이름
  lang: string                // "ko" | "vi"
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    emailId: string
  },
  error: string
}
```

**Logic Flow**:
```
1. i18n에서 제목/본문 템플릿 조회
   - Subject: i18n["email_verification_subject_{lang}"]
   - Body: i18n["email_verification_body_{lang}"]
2. 템플릿 변수 치환:
   - {nameKR} → nameKR
   - {verificationCode} → verificationCode
3. GmailApp.sendEmail() 호출
4. EmailID 생성 (generateEmailID)
5. EmailLogs 시트에 기록
   - EmailType = "verification"
   - Status = "sent" | "failed"
6. { emailId } 반환
```

**Email Template (KO)**:
```
제목: [AJU E&J] 이메일 인증 코드

안녕하세요, {nameKR}님.

AJU E&J 학생관리 시스템에 가입해 주셔서 감사합니다.

아래 인증 코드를 입력하여 이메일을 인증해 주세요:

인증 코드: {verificationCode}

이 코드는 10분 후 만료됩니다.

감사합니다.
AJU E&J 관리자
```

---

#### `sendWelcomeEmail(userId, email, nameKR, lang)`

**Purpose**: 가입 완료 환영 이메일

**Parameters**:
```javascript
{
  userId: string,
  email: string,
  nameKR: string,
  lang: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    emailId: string
  },
  error: string
}
```

**Email Template (KO)**:
```
제목: [AJU E&J] 가입을 환영합니다

{nameKR}님, 안녕하세요.

AJU E&J 학생관리 시스템에 가입하신 것을 환영합니다.

회원 정보:
- 학생 ID: {userId}
- 이메일: {email}

로그인 페이지: [URL]

궁금한 사항이 있으시면 언제든지 문의해 주세요.

감사합니다.
AJU E&J 관리자
```

---

#### `sendPasswordResetEmail(email, resetUrl, nameKR, lang)`

**Purpose**: 비밀번호 재설정 링크 이메일

**Parameters**:
```javascript
{
  email: string,
  resetUrl: string,     // 재설정 페이지 URL + token
  nameKR: string,
  lang: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    emailId: string
  },
  error: string
}
```

**Email Template (KO)**:
```
제목: [AJU E&J] 비밀번호 재설정 요청

{nameKR}님, 안녕하세요.

비밀번호 재설정 요청을 받았습니다.

아래 링크를 클릭하여 새 비밀번호를 설정해 주세요:

[비밀번호 재설정하기]({resetUrl})

이 링크는 1시간 후 만료됩니다.
본인이 요청하지 않았다면 이 이메일을 무시해 주세요.

감사합니다.
AJU E&J 관리자
```

---

#### `sendPrivacyNoticeEmail(userId, email, nameKR, lang)`

**Purpose**: 개인정보 이용 알림 (6개월마다)

**Email Template (KO)**:
```
제목: [AJU E&J] 개인정보 이용 안내

{nameKR}님, 안녕하세요.

개인정보보호법에 따라 6개월마다 개인정보 이용 현황을 안내드립니다.

현재 저희가 보유하고 있는 귀하의 개인정보:
- 성명, 생년월일, 연락처
- 학업 정보 (TOPIK 성적, 목표 대학 등)
- 상담 기록

개인정보 이용 목적: 유학 관리 및 상담 서비스 제공

동의 만료일: {expiryDate}

개인정보 열람, 수정, 삭제를 원하시면 언제든지 연락주세요.

감사합니다.
AJU E&J 관리자
```

---

## 3. Database Schema

### 3.1 Users (New)

**Description**: 통합 인증 시트 (master/agency/student)

**Fields**:
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| UserID | String | Y | 사용자 ID (PK) | `MASTER`, `AGE001`, `STU260010001` |
| UserType | String | Y | 사용자 유형 | `master`, `agency`, `student` |
| LoginID | String | Y | 로그인 ID (이메일 형식) | `admin@aju.com` |
| Email | String | Y | 이메일 주소 | `student@example.com` |
| PasswordHash | String | Y | SHA-256 해시 | `abc123...` |
| AgencyCode | String | N | 소속 유학원 (agency/student만) | `HANOI` |
| PrivacyConsentDate | DateTime | N | 개인정보 동의일 (student만) | `2026-01-15 14:30:00` |
| LastPrivacyNotice | DateTime | N | 마지막 개인정보 알림일 | `2026-07-15 00:00:00` |
| LoginAttempts | Number | Y | 로그인 실패 횟수 (5회 시 잠금) | `0` |
| LastLogin | DateTime | N | 마지막 로그인 일시 | `2026-02-16 10:00:00` |
| IsActive | Boolean | Y | 활성 상태 | `TRUE` |
| EmailVerified | Boolean | Y | 이메일 인증 여부 (student만) | `TRUE` |
| CreatedAt | DateTime | Y | 생성 일시 | `2026-01-15 14:30:00` |
| UpdatedAt | DateTime | Y | 수정 일시 | `2026-02-16 10:00:00` |

**Relationships**:
- 1:N → PrivacyConsents (UserID)
- 1:N → EmailLogs (UserID)
- 1:1 → Students (StudentID = UserID, student만)

**Business Rules**:
- UserType = "master": UserID = "MASTER"
- UserType = "agency": UserID = AgencyCode
- UserType = "student": UserID = StudentID (STU + YY + AgencySeq + StudentSeq)
- LoginAttempts ≥ 5 → IsActive = false (계정 잠금)
- student 타입은 EmailVerified = true 후 IsActive = true

**Index**: LoginID + UserType (복합 인덱스)

---

### 3.2 PrivacyConsents (New)

**Description**: 개인정보 수집/이용 동의 기록

**Fields**:
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| ConsentID | String | Y | 동의 ID (PK) | `CONSENT-20260115-001` |
| UserID | String | Y | 사용자 ID (FK) | `STU260010001` |
| ConsentDate | DateTime | Y | 동의 일시 | `2026-01-15 14:30:00` |
| ConsentType | String | Y | 동의 유형 | `signup`, `renewal` |
| IPAddress | String | Y | 동의 시 IP 주소 | `123.456.78.90` |
| UserAgent | String | Y | 브라우저 정보 | `Mozilla/5.0...` |
| ConsentText | Text | Y | 동의한 약관 전문 (법적 증빙) | `개인정보처리방침...` |
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

### 3.3 EmailLogs (New)

**Description**: 모든 이메일 발송 기록 (감사 추적)

**Fields**:
| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| EmailID | String | Y | 이메일 ID (PK) | `EMAIL-20260115-001` |
| UserID | String | Y | 수신자 UserID (FK) | `STU260010001` |
| EmailType | String | Y | 이메일 유형 | `verification`, `welcome` |
| ToEmail | String | Y | 수신 이메일 | `student@example.com` |
| Subject | String | Y | 제목 | `[AJU E&J] 이메일 인증 코드` |
| Body | Text | Y | 본문 | `안녕하세요...` |
| SentDate | DateTime | Y | 발송 일시 | `2026-01-15 14:35:00` |
| Status | String | Y | 발송 상태 | `sent`, `failed`, `pending` |
| ErrorMessage | String | N | 에러 메시지 (실패 시) | `` |
| CreatedAt | DateTime | Y | 생성 일시 | `2026-01-15 14:35:00` |

**EmailType Values**:
- `verification`: 이메일 인증 코드
- `welcome`: 가입 완료 환영
- `password_reset`: 비밀번호 재설정
- `privacy_notice`: 정기 개인정보 이용 알림 (6개월)
- `consent_renewal`: 개인정보 동의 갱신 요청

**Relationships**:
- N:1 → Users (UserID)

**Business Rules**:
- 모든 이메일은 GmailApp으로 발송
- Status = failed 시 ErrorMessage 필수
- 발송 실패 시 3회까지 재시도

---

## 4. Frontend Design

### 4.1 SignUp.html

**Purpose**: 학생 회원가입 폼

**Page Structure**:
```html
<div class="signup-container">
  <h1 id="signup-title">학생 회원가입</h1>

  <!-- Step Indicator -->
  <div class="steps">
    <div class="step active">1. 정보 입력</div>
    <div class="step">2. 이메일 인증</div>
    <div class="step">3. 완료</div>
  </div>

  <!-- Step 1: 정보 입력 -->
  <form id="signup-form">
    <div class="form-group">
      <label for="email">이메일 (LoginID)</label>
      <input type="email" id="email" required>
      <span class="error-msg" id="email-error"></span>
    </div>

    <div class="form-group">
      <label for="password">비밀번호</label>
      <input type="password" id="password" required>
      <div class="password-strength" id="password-strength"></div>
      <span class="hint">8자 이상, 영문+숫자+특수문자 조합</span>
      <span class="error-msg" id="password-error"></span>
    </div>

    <div class="form-group">
      <label for="password-confirm">비밀번호 확인</label>
      <input type="password" id="password-confirm" required>
      <span class="error-msg" id="password-confirm-error"></span>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="name-kr">이름 (한글)</label>
        <input type="text" id="name-kr" required>
      </div>
      <div class="form-group">
        <label for="name-vn">Tên (Tiếng Việt)</label>
        <input type="text" id="name-vn" required>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="dob">생년월일</label>
        <input type="date" id="dob" required>
      </div>
      <div class="form-group">
        <label for="gender">성별</label>
        <select id="gender" required>
          <option value="">선택</option>
          <option value="M">남성</option>
          <option value="F">여성</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="agency">소속 유학원</label>
      <select id="agency" required>
        <option value="">선택하세요</option>
        <!-- dynamically loaded from Agencies -->
      </select>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="phone-kr">한국 전화번호</label>
        <input type="tel" id="phone-kr" placeholder="010-1234-5678" required>
      </div>
      <div class="form-group">
        <label for="phone-vn">베트남 전화번호</label>
        <input type="tel" id="phone-vn" placeholder="0901234567" required>
      </div>
    </div>

    <div class="form-group privacy-consent">
      <label>
        <input type="checkbox" id="privacy-consent" required>
        <span>개인정보 수집 및 이용에 동의합니다 (필수)</span>
        <a href="#" id="view-privacy-policy" target="_blank">전문 보기</a>
      </label>
    </div>

    <button type="submit" id="submit-btn" class="btn-primary">회원가입</button>
  </form>

  <!-- Step 2: 이메일 인증 (hidden initially) -->
  <div id="verification-step" class="hidden">
    <p>입력하신 이메일로 인증 코드를 발송했습니다.</p>
    <p class="email-display" id="verification-email"></p>

    <div class="form-group">
      <label for="verification-code">인증 코드 (6자리)</label>
      <input type="text" id="verification-code" maxlength="6" pattern="[0-9]{6}" required>
      <span class="timer" id="verification-timer">10:00</span>
      <span class="error-msg" id="verification-error"></span>
    </div>

    <button id="verify-btn" class="btn-primary">인증하기</button>
    <button id="resend-btn" class="btn-secondary">인증 코드 재발송</button>
  </div>

  <!-- Step 3: 완료 (hidden initially) -->
  <div id="success-step" class="hidden">
    <div class="success-icon">✓</div>
    <h2>회원가입이 완료되었습니다!</h2>
    <p>학생 ID: <strong id="student-id"></strong></p>
    <p>이제 로그인하여 서비스를 이용하실 수 있습니다.</p>
    <a href="Login.html" class="btn-primary">로그인하기</a>
  </div>
</div>
```

**Client-side Validation**:
```javascript
// 실시간 유효성 검증
const VALIDATION_RULES = {
  email: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorKey: 'err_invalid_email'
  },
  password: {
    regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    errorKey: 'err_weak_password',
    strengthLevels: {
      weak: 'password_strength_weak',
      medium: 'password_strength_medium',
      strong: 'password_strength_strong'
    }
  },
  phoneKR: {
    regex: /^01[0-9]-[0-9]{4}-[0-9]{4}$/,
    errorKey: 'err_invalid_phone_kr'
  },
  phoneVN: {
    regex: /^0[0-9]{9}$/,
    errorKey: 'err_invalid_phone_vn'
  }
};

// 비밀번호 강도 계산
function calculatePasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
}
```

**User Flow**:
```
1. 페이지 로드
   → 유학원 드롭다운 로드 (google.script.run.getActiveAgencies)
   → i18n 로드 (현재 언어)

2. 사용자 입력 (Step 1)
   → 실시간 유효성 검증
   → 비밀번호 강도 표시

3. 회원가입 버튼 클릭
   → 클라이언트 유효성 재검증
   → google.script.run.registerStudent(data)
   → 성공 시 Step 2로 전환
   → 실패 시 에러 메시지 표시

4. 이메일 인증 코드 입력 (Step 2)
   → 10분 타이머 시작
   → google.script.run.verifyEmail(email, code)
   → 성공 시 Step 3으로 전환
   → 실패 시 에러 메시지 표시

5. 인증 코드 재발송 버튼 클릭
   → google.script.run.resendVerificationCode(email)
   → 타이머 리셋

6. 완료 (Step 3)
   → 학생 ID 표시
   → 로그인 페이지로 이동 버튼
```

**Responsive Design**:
```css
/* Mobile: < 600px */
.form-row {
  flex-direction: column;
}

/* Tablet: 600px ~ 1024px */
.form-row {
  flex-direction: row;
  gap: 1rem;
}

/* Desktop: > 1024px */
.signup-container {
  max-width: 600px;
  margin: 2rem auto;
}
```

---

### 4.2 ForgotPassword.html

**Purpose**: 비밀번호 찾기 (재설정 링크 이메일 발송)

**Page Structure**:
```html
<div class="forgot-password-container">
  <h1 id="forgot-password-title">비밀번호 찾기</h1>

  <form id="forgot-password-form">
    <div class="form-group">
      <label for="email">이메일 (LoginID)</label>
      <input type="email" id="email" required>
      <span class="error-msg" id="email-error"></span>
    </div>

    <div class="form-group">
      <label for="user-type">사용자 유형</label>
      <select id="user-type" required>
        <option value="">선택하세요</option>
        <option value="student">학생</option>
        <option value="agency">유학원 관리자</option>
        <option value="master">시스템 관리자</option>
      </select>
    </div>

    <button type="submit" id="submit-btn" class="btn-primary">재설정 링크 발송</button>
  </form>

  <div id="success-msg" class="hidden">
    <p>비밀번호 재설정 링크가 이메일로 발송되었습니다.</p>
    <p>이메일을 확인하여 새 비밀번호를 설정해 주세요.</p>
    <p class="hint">링크는 1시간 후 만료됩니다.</p>
  </div>

  <a href="Login.html" class="back-link">← 로그인으로 돌아가기</a>
</div>
```

**User Flow**:
```
1. 이메일 + 사용자 유형 입력
2. "재설정 링크 발송" 버튼 클릭
   → google.script.run.forgotPassword(email, userType)
   → 성공 메시지 표시 (실제 이메일 존재 여부와 무관)
3. 이메일에서 링크 클릭
   → ResetPassword.html?token={token}로 이동
```

---

### 4.3 ResetPassword.html

**Purpose**: 재설정 토큰으로 새 비밀번호 설정

**Page Structure**:
```html
<div class="reset-password-container">
  <h1 id="reset-password-title">비밀번호 재설정</h1>

  <form id="reset-password-form">
    <input type="hidden" id="token" value="">

    <div class="form-group">
      <label for="new-password">새 비밀번호</label>
      <input type="password" id="new-password" required>
      <div class="password-strength" id="password-strength"></div>
      <span class="hint">8자 이상, 영문+숫자+특수문자 조합</span>
      <span class="error-msg" id="password-error"></span>
    </div>

    <div class="form-group">
      <label for="confirm-password">새 비밀번호 확인</label>
      <input type="password" id="confirm-password" required>
      <span class="error-msg" id="confirm-error"></span>
    </div>

    <button type="submit" id="submit-btn" class="btn-primary">비밀번호 변경</button>
  </form>

  <div id="success-msg" class="hidden">
    <p>비밀번호가 성공적으로 변경되었습니다.</p>
    <p>새 비밀번호로 로그인해 주세요.</p>
    <a href="Login.html" class="btn-primary">로그인하기</a>
  </div>

  <div id="error-msg" class="hidden">
    <p>재설정 링크가 만료되었거나 유효하지 않습니다.</p>
    <a href="ForgotPassword.html" class="btn-secondary">다시 시도하기</a>
  </div>
</div>
```

**User Flow**:
```
1. URL에서 token 파라미터 추출
   → const urlParams = new URLSearchParams(window.location.search);
   → const token = urlParams.get('token');
2. 새 비밀번호 입력
3. "비밀번호 변경" 버튼 클릭
   → 비밀번호 정책 검증
   → google.script.run.resetPassword(token, newPassword)
   → 성공 시 성공 메시지 + 로그인 버튼
   → 실패 시 (토큰 만료) 에러 메시지 + 재시도 버튼
```

---

### 4.4 PrivacyPolicy.html

**Purpose**: 개인정보 처리방침 전문 표시

**Page Structure**:
```html
<div class="privacy-policy-container">
  <h1 id="privacy-policy-title">개인정보 처리방침</h1>

  <div class="policy-content" id="policy-content">
    <!-- SystemConfig.PRIVACY_POLICY_KR 동적 로드 -->
  </div>

  <div class="policy-meta">
    <p>최종 수정일: <span id="last-updated"></span></p>
    <p>유효기간: <span id="valid-until"></span></p>
  </div>

  <div class="actions">
    <button id="agree-btn" class="btn-primary">동의하고 돌아가기</button>
    <button id="print-btn" class="btn-secondary">인쇄하기</button>
  </div>
</div>
```

**Content (Sample)**:
```
개인정보 처리방침

AJU E&J 학생관리 시스템(이하 "시스템")은 「개인정보 보호법」 제30조에 따라
정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수
있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

제1조(개인정보의 처리 목적)
시스템은 다음의 목적을 위하여 개인정보를 처리합니다.
1. 회원 가입 및 관리
2. 유학 상담 서비스 제공
3. TOPIK 시험 성적 관리
4. 대학 진학 상담 및 지원

제2조(개인정보의 처리 및 보유 기간)
1. 재학생: 졸업 후 5년
2. 유학원 관리자: 계약 종료 후 3년

제3조(개인정보의 제3자 제공)
시스템은 원칙적으로 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서
명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등
「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.

제4조(정보주체의 권리·의무 및 그 행사방법)
정보주체는 시스템에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
1. 개인정보 열람요구
2. 오류 등이 있을 경우 정정 요구
3. 삭제요구
4. 처리정지 요구

...
```

**Data Loading**:
```javascript
function loadPrivacyPolicy() {
  google.script.run
    .withSuccessHandler(function(config) {
      const lang = getCurrentLanguage(); // 'ko' or 'vi'
      const policyKey = `PRIVACY_POLICY_${lang.toUpperCase()}`;
      const policyContent = config[policyKey];

      document.getElementById('policy-content').innerHTML = policyContent;
      document.getElementById('last-updated').textContent = config.PRIVACY_POLICY_LAST_UPDATED;
    })
    .getSystemConfig();
}
```

---

### 4.5 Login.html v2.0 (Refactored)

**Changes from v1.0**:
1. **UserType 선택 추가**:
```html
<div class="form-group">
  <label for="user-type">사용자 유형</label>
  <select id="user-type" required>
    <option value="student">학생</option>
    <option value="agency">유학원 관리자</option>
    <option value="master">시스템 관리자</option>
  </select>
</div>
```

2. **회원가입 링크 추가** (student만):
```html
<div class="signup-link">
  <p>아직 계정이 없으신가요? <a href="SignUp.html">회원가입</a></p>
</div>
```

3. **비밀번호 찾기 링크**:
```html
<div class="forgot-password-link">
  <a href="ForgotPassword.html">비밀번호를 잊으셨나요?</a>
</div>
```

4. **API 호출 변경**:
```javascript
// Before (v1.0)
google.script.run.login(loginId, password);

// After (v2.0)
google.script.run.login(loginId, password, userType);
```

---

## 5. Data Flow Diagrams

### 5.1 회원가입 플로우

```
[Student] → SignUp.html
              ↓
         입력 폼 작성 (10 fields)
              ↓
         클라이언트 유효성 검증
              ↓
         google.script.run.registerStudent(data)
              ↓
         [SignUpService.registerStudent]
              ↓
         ┌─ 이메일 중복 확인 (Users 시트)
         ├─ AgencyCode 유효성 확인 (Agencies 시트)
         ├─ 임시 UserID 생성 (STU260010001)
         ├─ PasswordHash 생성 (SHA-256)
         ├─ Users 시트 INSERT (IsActive=false)
         ├─ 6자리 인증 코드 생성
         ├─ CacheService 저장 (TTL: 10분)
         ├─ EmailService.sendVerificationEmail
         └─ PrivacyConsents 시트 INSERT
              ↓
         { userId, verificationCode } 반환
              ↓
         SignUp.html Step 2로 전환
              ↓
         [Student] 이메일에서 코드 확인
              ↓
         인증 코드 입력
              ↓
         google.script.run.verifyEmail(email, code)
              ↓
         [SignUpService.verifyEmail]
              ↓
         ┌─ CacheService 조회
         ├─ 코드 검증
         ├─ Users 업데이트 (IsActive=true, EmailVerified=true)
         ├─ CacheService 삭제
         └─ EmailService.sendWelcomeEmail
              ↓
         SignUp.html Step 3로 전환
              ↓
         회원가입 완료!
```

---

### 5.2 이메일 인증 플로우

```
[SignUpService.registerStudent]
         ↓
    6자리 코드 생성 (예: 123456)
         ↓
    CacheService.put('verify_student@example.com', {
      code: '123456',
      userId: 'STU260010001',
      createdAt: now()
    }, 600) // 10분 TTL
         ↓
    [EmailService.sendVerificationEmail]
         ↓
    i18n에서 템플릿 조회
         ↓
    변수 치환 ({nameKR}, {verificationCode})
         ↓
    GmailApp.sendEmail(email, subject, body)
         ↓
    EmailLogs INSERT
         ↓
    이메일 발송 완료

---

[Student] 이메일 확인
         ↓
    인증 코드 입력 (123456)
         ↓
    [SignUpService.verifyEmail]
         ↓
    CacheService.get('verify_student@example.com')
         ↓
    code === '123456' ? (Yes)
         ↓
    Users UPDATE (IsActive=true, EmailVerified=true)
         ↓
    CacheService.remove('verify_student@example.com')
         ↓
    [EmailService.sendWelcomeEmail]
         ↓
    인증 완료!
```

---

### 5.3 비밀번호 재설정 플로우

```
[Student] → ForgotPassword.html
              ↓
         이메일 + UserType 입력
              ↓
         google.script.run.forgotPassword(email, userType)
              ↓
         [SignUpService.forgotPassword]
              ↓
         ┌─ Users 시트에서 email + userType 조회
         ├─ 재설정 토큰 생성 (UUID 32자)
         ├─ CacheService 저장 (TTL: 1시간)
         │     Key: 'reset_abc123...'
         │     Value: { userId, email, createdAt }
         ├─ 재설정 URL 생성
         │     https://.../exec?page=resetPassword&token=abc123...
         └─ EmailService.sendPasswordResetEmail
              ↓
         성공 메시지 표시 (이메일 존재 여부 무관)

---

[Student] 이메일에서 링크 클릭
              ↓
         ResetPassword.html?token=abc123...
              ↓
         새 비밀번호 입력
              ↓
         google.script.run.resetPassword(token, newPassword)
              ↓
         [SignUpService.resetPassword]
              ↓
         ┌─ CacheService.get('reset_abc123...')
         ├─ 비밀번호 정책 검증
         ├─ 새 PasswordHash 생성
         ├─ Users UPDATE
         ├─ CacheService 삭제 (토큰 1회용)
         ├─ 모든 세션 무효화 (해당 userId)
         └─ 비밀번호 변경 알림 이메일 발송
              ↓
         비밀번호 재설정 완료!
              ↓
         Login.html로 이동
```

---

### 5.4 로그인 플로우 (v2.0)

```
[User] → Login.html
            ↓
       LoginID + Password + UserType 입력
            ↓
       google.script.run.login(loginId, password, userType)
            ↓
       [AuthService.login]
            ↓
       ┌─ Users 시트에서 LoginID + UserType 조회
       ├─ LoginAttempts 확인 (≥5 시 계정 잠금)
       ├─ IsActive 확인 (false 시 에러)
       ├─ PasswordHash 검증
       │     ↓ (실패 시)
       │     LoginAttempts++
       │     ≥5 회 시 IsActive = false
       │     에러 반환
       │     ↓ (성공 시)
       ├─ LoginAttempts = 0
       ├─ LastLogin = now()
       ├─ Session 생성 (CacheService, TTL: 1시간)
       │     Key: sessionToken (UUID)
       │     Value: { userId, userType, agencyCode }
       └─ AuditLog INSERT (Action: LOGIN)
            ↓
       { sessionToken, userId, userType } 반환
            ↓
       메인 페이지로 이동
```

---

## 6. Migration Strategy

### 6.1 Agencies → Users 마이그레이션

**목적**: 기존 Agencies 시트 데이터를 Users 시트로 이관

**Migration Script** (`MigrationService.gs`):
```javascript
function migrateAgenciesToUsers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const agenciesSheet = ss.getSheetByName('Agencies');
  const usersSheet = ss.getSheetByName('Users');

  const agenciesData = agenciesSheet.getDataRange().getValues();
  const headers = agenciesData[0];

  // Find column indices
  const agencyCodeIdx = headers.indexOf('AgencyCode');
  const loginIdIdx = headers.indexOf('LoginID');
  const passwordHashIdx = headers.indexOf('PasswordHash');
  const isActiveIdx = headers.indexOf('IsActive');

  const migrationLog = [];

  // Migrate each agency (skip header row)
  for (let i = 1; i < agenciesData.length; i++) {
    const row = agenciesData[i];
    const agencyCode = row[agencyCodeIdx];
    const loginId = row[loginIdIdx];
    const passwordHash = row[passwordHashIdx];
    const isActive = row[isActiveIdx];

    // Skip MASTER (already in Users)
    if (agencyCode === 'MASTER') continue;

    const newUserRow = [
      agencyCode,              // UserID = AgencyCode
      'agency',                // UserType
      loginId,                 // LoginID
      loginId,                 // Email (same as LoginID)
      passwordHash,            // PasswordHash
      agencyCode,              // AgencyCode
      '',                      // PrivacyConsentDate (N/A for agency)
      '',                      // LastPrivacyNotice (N/A)
      0,                       // LoginAttempts
      '',                      // LastLogin
      isActive,                // IsActive
      'TRUE',                  // EmailVerified (N/A for agency)
      new Date(),              // CreatedAt
      new Date()               // UpdatedAt
    ];

    usersSheet.appendRow(newUserRow);

    migrationLog.push({
      agencyCode: agencyCode,
      loginId: loginId,
      status: 'migrated'
    });
  }

  Logger.log('Migration completed:');
  Logger.log(JSON.stringify(migrationLog, null, 2));

  return {
    success: true,
    migratedCount: migrationLog.length,
    log: migrationLog
  };
}
```

**Migration Steps**:
```
1. Users 시트 생성 (schema.md 참조)
2. MASTER 계정 수동 추가 (UserID='MASTER', UserType='master')
3. MigrationService.migrateAgenciesToUsers() 실행
4. 마이그레이션 로그 확인
5. Auth.gs v2.0 배포 (Users 기반 인증)
6. 테스트 (master, agency 로그인)
7. Agencies 시트 백업 후 삭제 (선택적)
```

---

### 6.2 Login.html v1.0 → v2.0 리팩토링

**변경 사항**:
1. UserType 선택 UI 추가
2. 회원가입 링크 추가 (student용)
3. 비밀번호 찾기 링크 추가
4. API 호출 파라미터 추가 (userType)

**리팩토링 Script**:
```javascript
// Before (v1.0)
function handleLogin() {
  const loginId = document.getElementById('login-id').value;
  const password = document.getElementById('password').value;

  google.script.run
    .withSuccessHandler(onLoginSuccess)
    .withFailureHandler(onLoginFailure)
    .login(loginId, password);
}

// After (v2.0)
function handleLogin() {
  const loginId = document.getElementById('login-id').value;
  const password = document.getElementById('password').value;
  const userType = document.getElementById('user-type').value;

  google.script.run
    .withSuccessHandler(onLoginSuccess)
    .withFailureHandler(onLoginFailure)
    .login(loginId, password, userType);
}
```

**Backward Compatibility**:
- Auth.gs v2.0은 기존 Agencies 기반 로그인도 지원 (마이그레이션 완료 전)
- 마이그레이션 완료 후 Agencies 폴백 로직 제거

---

### 6.3 배포 순서

```
Week 9-10: Users 통합 인증
  Day 50-52: Users 시트 생성 + 마이그레이션
  Day 53-56: AuthService v2.0 구현
  Day 57-59: Login.html v2.0 리팩토링
  Day 60-63: 통합 테스트 및 버그 수정

Week 11-12: 학생 회원가입
  Day 64-67: SignUpService, EmailService 구현
  Day 68-71: SignUp.html, ForgotPassword.html, ResetPassword.html 구현
  Day 72-74: 이메일 인증 플로우 테스트
  Day 75-77: 비밀번호 재설정 플로우 테스트

Week 13: 개인정보보호법 준수
  Day 78-80: PrivacyService 구현 + PrivacyPolicy.html
  Day 81-82: 정기 알림 Time Trigger 설정
  Day 83-84: 데이터 삭제 정책 테스트
```

---

## 7. i18n Keys

### 7.1 SignUp.html Keys (20개)

| Key | Category | KO | VI |
|-----|----------|----|----|
| `signup_title` | title_ | 학생 회원가입 | Đăng ký sinh viên |
| `signup_step1` | label_ | 정보 입력 | Nhập thông tin |
| `signup_step2` | label_ | 이메일 인증 | Xác thực email |
| `signup_step3` | label_ | 완료 | Hoàn thành |
| `signup_email_label` | label_ | 이메일 (LoginID) | Email (LoginID) |
| `signup_password_label` | label_ | 비밀번호 | Mật khẩu |
| `signup_password_confirm_label` | label_ | 비밀번호 확인 | Xác nhận mật khẩu |
| `signup_password_hint` | msg_ | 8자 이상, 영문+숫자+특수문자 조합 | Ít nhất 8 ký tự, chữ+số+ký tự đặc biệt |
| `signup_name_kr_label` | label_ | 이름 (한글) | Tên (Tiếng Hàn) |
| `signup_name_vn_label` | label_ | Tên (Tiếng Việt) | Tên (Tiếng Việt) |
| `signup_dob_label` | label_ | 생년월일 | Ngày sinh |
| `signup_gender_label` | label_ | 성별 | Giới tính |
| `signup_gender_male` | label_ | 남성 | Nam |
| `signup_gender_female` | label_ | 여성 | Nữ |
| `signup_agency_label` | label_ | 소속 유학원 | Trung tâm du học |
| `signup_phone_kr_label` | label_ | 한국 전화번호 | Số điện thoại Hàn Quốc |
| `signup_phone_vn_label` | label_ | 베트남 전화번호 | Số điện thoại Việt Nam |
| `signup_privacy_consent` | label_ | 개인정보 수집 및 이용에 동의합니다 (필수) | Đồng ý thu thập và sử dụng thông tin cá nhân (Bắt buộc) |
| `signup_privacy_view` | btn_ | 전문 보기 | Xem toàn văn |
| `signup_submit_btn` | btn_ | 회원가입 | Đăng ký |

### 7.2 Verification Keys (10개)

| Key | Category | KO | VI |
|-----|----------|----|----|
| `signup_verification_sent` | msg_ | 입력하신 이메일로 인증 코드를 발송했습니다 | Mã xác thực đã được gửi đến email của bạn |
| `signup_verification_code_label` | label_ | 인증 코드 (6자리) | Mã xác thực (6 số) |
| `signup_verify_btn` | btn_ | 인증하기 | Xác thực |
| `signup_resend_btn` | btn_ | 인증 코드 재발송 | Gửi lại mã |
| `signup_success_title` | title_ | 회원가입이 완료되었습니다! | Đăng ký thành công! |
| `signup_success_msg` | msg_ | 이제 로그인하여 서비스를 이용하실 수 있습니다 | Bây giờ bạn có thể đăng nhập để sử dụng dịch vụ |
| `signup_student_id` | label_ | 학생 ID | Mã sinh viên |
| `signup_login_btn` | btn_ | 로그인하기 | Đăng nhập |
| `signup_timer` | label_ | 남은 시간 | Thời gian còn lại |
| `signup_timer_expired` | msg_ | 인증 시간이 만료되었습니다 | Thời gian xác thực đã hết |

### 7.3 ForgotPassword.html Keys (8개)

| Key | Category | KO | VI |
|-----|----------|----|----|
| `forgotpw_title` | title_ | 비밀번호 찾기 | Tìm lại mật khẩu |
| `forgotpw_email_label` | label_ | 이메일 (LoginID) | Email (LoginID) |
| `forgotpw_usertype_label` | label_ | 사용자 유형 | Loại người dùng |
| `forgotpw_usertype_student` | label_ | 학생 | Sinh viên |
| `forgotpw_usertype_agency` | label_ | 유학원 관리자 | Quản trị trung tâm |
| `forgotpw_usertype_master` | label_ | 시스템 관리자 | Quản trị hệ thống |
| `forgotpw_submit_btn` | btn_ | 재설정 링크 발송 | Gửi link đặt lại |
| `forgotpw_success_msg` | msg_ | 비밀번호 재설정 링크가 이메일로 발송되었습니다 | Link đặt lại mật khẩu đã được gửi đến email |

### 7.4 ResetPassword.html Keys (7개)

| Key | Category | KO | VI |
|-----|----------|----|----|
| `resetpw_title` | title_ | 비밀번호 재설정 | Đặt lại mật khẩu |
| `resetpw_new_password_label` | label_ | 새 비밀번호 | Mật khẩu mới |
| `resetpw_confirm_label` | label_ | 새 비밀번호 확인 | Xác nhận mật khẩu mới |
| `resetpw_submit_btn` | btn_ | 비밀번호 변경 | Đổi mật khẩu |
| `resetpw_success_msg` | msg_ | 비밀번호가 성공적으로 변경되었습니다 | Mật khẩu đã được thay đổi thành công |
| `resetpw_error_msg` | msg_ | 재설정 링크가 만료되었거나 유효하지 않습니다 | Link đặt lại đã hết hạn hoặc không hợp lệ |
| `resetpw_retry_btn` | btn_ | 다시 시도하기 | Thử lại |

### 7.5 PrivacyPolicy.html Keys (5개)

| Key | Category | KO | VI |
|-----|----------|----|----|
| `privacy_title` | title_ | 개인정보 처리방침 | Chính sách xử lý thông tin cá nhân |
| `privacy_last_updated` | label_ | 최종 수정일 | Ngày cập nhật cuối |
| `privacy_valid_until` | label_ | 유효기간 | Hiệu lực đến |
| `privacy_agree_btn` | btn_ | 동의하고 돌아가기 | Đồng ý và quay lại |
| `privacy_print_btn` | btn_ | 인쇄하기 | In |

### 7.6 Login.html v2.0 Keys (추가분 3개)

| Key | Category | KO | VI |
|-----|----------|----|----|
| `login_usertype_label` | label_ | 사용자 유형 | Loại người dùng |
| `login_signup_link` | msg_ | 아직 계정이 없으신가요? | Chưa có tài khoản? |
| `login_forgot_password_link` | btn_ | 비밀번호를 잊으셨나요? | Quên mật khẩu? |

### 7.7 Error Messages (15개)

| Key | Category | KO | VI |
|-----|----------|----|----|
| `err_invalid_email` | err_ | 이메일 형식이 올바르지 않습니다 | Định dạng email không hợp lệ |
| `err_weak_password` | err_ | 비밀번호가 너무 약합니다 | Mật khẩu quá yếu |
| `err_password_mismatch` | err_ | 비밀번호가 일치하지 않습니다 | Mật khẩu không khớp |
| `err_invalid_phone_kr` | err_ | 한국 전화번호 형식이 올바르지 않습니다 | Định dạng số điện thoại Hàn Quốc không hợp lệ |
| `err_invalid_phone_vn` | err_ | 베트남 전화번호 형식이 올바르지 않습니다 | Định dạng số điện thoại Việt Nam không hợp lệ |
| `err_email_already_exists` | err_ | 이미 등록된 이메일입니다 | Email đã được đăng ký |
| `err_invalid_agency` | err_ | 유효하지 않은 유학원입니다 | Trung tâm du học không hợp lệ |
| `err_verification_code_expired` | err_ | 인증 코드가 만료되었습니다 | Mã xác thực đã hết hạn |
| `err_invalid_verification_code` | err_ | 인증 코드가 올바르지 않습니다 | Mã xác thực không đúng |
| `err_email_already_verified` | err_ | 이미 인증된 이메일입니다 | Email đã được xác thực |
| `err_email_not_found` | err_ | 이메일을 찾을 수 없습니다 | Không tìm thấy email |
| `err_invalid_reset_token` | err_ | 재설정 토큰이 유효하지 않습니다 | Token đặt lại không hợp lệ |
| `err_account_locked` | err_ | 계정이 잠겼습니다. 관리자에게 문의하세요 | Tài khoản đã bị khóa. Liên hệ quản trị viên |
| `err_account_inactive` | err_ | 비활성 계정입니다 | Tài khoản không hoạt động |
| `err_session_expired` | err_ | 세션이 만료되었습니다. 다시 로그인해주세요 | Phiên đã hết hạn. Vui lòng đăng nhập lại |

### 7.8 Email Templates Keys (6개)

| Key | Category | KO | VI |
|-----|----------|----|----|
| `email_verification_subject` | email_ | [AJU E&J] 이메일 인증 코드 | [AJU E&J] Mã xác thực email |
| `email_verification_body` | email_ | (템플릿 본문) | (Nội dung template) |
| `email_welcome_subject` | email_ | [AJU E&J] 가입을 환영합니다 | [AJU E&J] Chào mừng bạn |
| `email_welcome_body` | email_ | (템플릿 본문) | (Nội dung template) |
| `email_password_reset_subject` | email_ | [AJU E&J] 비밀번호 재설정 요청 | [AJU E&J] Yêu cầu đặt lại mật khẩu |
| `email_password_reset_body` | email_ | (템플릿 본문) | (Nội dung template) |

**Total i18n Keys**: 74개 (signup 20 + verification 10 + forgotpw 8 + resetpw 7 + privacy 5 + login 3 + errors 15 + email 6)

---

## 8. Quality Criteria

### 8.1 API Quality Standards

**모든 API 함수**:
- ✅ 세션 검증 포함 (validateSession)
- ✅ 권한 검증 포함 (master/agency/student)
- ✅ 입력 유효성 검증 (정규식, 길이, 필수 여부)
- ✅ 에러 핸들링 (try-catch, errorKey 반환)
- ✅ 감사 로그 기록 (AuditService)
- ✅ 성공/실패 반환 형식 통일 ({ success, data, error, errorKey })

**성능 목표**:
- 회원가입: <3초 (이메일 발송 포함)
- 이메일 인증: <1초
- 로그인: <1초
- 비밀번호 재설정: <2초

### 8.2 Frontend Quality Standards

**모든 HTML 페이지**:
- ✅ 반응형 디자인 (Mobile/Tablet/Desktop)
- ✅ i18n 완전 지원 (하드코딩 텍스트 0개)
- ✅ 클라이언트 유효성 검증 (정규식, 실시간 피드백)
- ✅ 에러 메시지 표시 (errorKey 기반)
- ✅ Loading Spinner (비동기 작업 중)
- ✅ 접근성 준수 (WCAG 2.1 AA)

**UX 목표**:
- 회원가입 완료율: >80%
- 이메일 인증 성공률: >95%
- 비밀번호 재설정 성공률: >90%

### 8.3 Security Standards

**인증/인가**:
- ✅ SHA-256 + MASTER_SALT (비밀번호 해싱)
- ✅ 세션 토큰 (CacheService, 1시간 TTL)
- ✅ 계정 잠금 (5회 로그인 실패 시)
- ✅ 이메일 인증 (회원가입 시 필수)
- ✅ 재설정 토큰 1회용 (사용 후 즉시 삭제)

**개인정보보호**:
- ✅ 동의 기록 영구 보관 (PrivacyConsents)
- ✅ 6개월마다 정기 알림 (Time Trigger)
- ✅ 졸업 후 5년 자동 삭제 (Time Trigger)
- ✅ 이메일 발송 기록 (EmailLogs)

**입력 검증**:
- ✅ 이메일 RFC 5322 준수
- ✅ 비밀번호 정책 강제 (8자, 영문+숫자+특수문자)
- ✅ XSS 방지 (HTML 이스케이프)
- ✅ SQL Injection 방지 (Sheets API 사용, 직접 쿼리 없음)

### 8.4 Legal Compliance

**개인정보보호법**:
- ✅ 제21조: 보유기간 경과 시 파기 (졸업 후 5년)
- ✅ 제22조: 동의 획득 (회원가입 시 필수)
- ✅ 제24조: 고유식별정보 처리 제한 (암호화)
- ✅ 제27조: 정기적 개인정보 이용 알림 (6개월)

**전자상거래법**:
- ✅ 개인정보 처리방침 공개 (PrivacyPolicy.html)
- ✅ 이용약관 명시 (SystemConfig)

### 8.5 Match Rate Goal

**Step 4 완료 시 목표 Match Rate: ≥90%**

**Gap Analysis 기준**:
- Backend API: 100% (12/12 APIs)
- Frontend UI: ≥95% (모든 필수 컴포넌트)
- i18n Coverage: 100% (74/74 keys)
- Security: 100% (모든 보안 요구사항)
- Legal: 100% (모든 법적 요구사항)

---

## 9. Success Metrics

### 9.1 Implementation Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Backend Lines | ~1,500 lines | AuthService v2.0 (200) + SignUpService (400) + PrivacyService (300) + EmailService (200) + MigrationService (100) + Helpers (300) |
| Frontend Lines | ~1,200 lines | SignUp (350) + ForgotPassword (150) + ResetPassword (150) + PrivacyPolicy (150) + Login v2.0 (400) |
| New Sheets | 3 | Users, PrivacyConsents, EmailLogs |
| New APIs | 12 | 각 Service별 상세 설계 참조 |
| i18n Keys | 74+ | signup, verification, forgotpw, resetpw, privacy, errors, email |
| Test Functions | 10+ | 각 API별 테스트 함수 |

### 9.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | <3초 | performanceTestSignUp() |
| Frontend Load Time | <2초 | Google PageSpeed Insights |
| Email Delivery Rate | >98% | EmailLogs.Status = 'sent' 비율 |
| Verification Success Rate | >95% | verifyEmail 성공 비율 |
| Password Reset Success Rate | >90% | resetPassword 성공 비율 |
| Match Rate (Gap Analysis) | ≥90% | Design vs Implementation 비교 |

### 9.3 Security Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Account Lockout Rate | <1% | LoginAttempts ≥ 5 비율 |
| Session Hijacking | 0건 | AuditLogs.Action = 'UNAUTHORIZED_ACCESS' |
| Brute Force Attempts | 0건 | Rate Limiting 효과 검증 |
| Data Breach | 0건 | PasswordHash 암호화 검증 |

### 9.4 Legal Compliance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Consent Coverage | 100% | 모든 student에 PrivacyConsents 기록 |
| Privacy Notice Sent | >98% | 6개월마다 자동 발송 성공률 |
| Data Deletion Compliance | 100% | 졸업 후 5년 경과 데이터 100% 삭제 |
| Audit Log Completeness | 100% | 모든 민감 작업 기록 |

---

## 10. Risk Assessment

### 10.1 High Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Gmail API 발송 실패 | High | Medium | 3회 재시도 + 수동 발송 폴백 |
| MASTER_SALT 유출 | Critical | Low | 환경 변수 저장 + 접근 제어 |
| 대량 회원가입 공격 | High | Medium | Rate Limiting (IP당 10회/일) |
| 이메일 인증 우회 | High | Low | CacheService TTL 10분 + 1회용 코드 |

### 10.2 Medium Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| CacheService 데이터 손실 | Medium | Low | 인증 코드 재발송 기능 |
| 마이그레이션 실패 | Medium | Low | Agencies 시트 백업 + 롤백 계획 |
| 비밀번호 정책 거부감 | Low | Medium | 비밀번호 강도 표시 + 힌트 제공 |

### 10.3 Mitigation Strategies

**Gmail API 발송 실패 대응**:
```javascript
function sendEmailWithRetry(email, subject, body, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      GmailApp.sendEmail(email, subject, body);
      return { success: true };
    } catch (e) {
      Logger.log(`Email send attempt ${i+1} failed: ${e.message}`);
      if (i === maxRetries - 1) {
        return { success: false, error: e.message };
      }
      Utilities.sleep(1000 * (i + 1)); // 지수 백오프
    }
  }
}
```

**Rate Limiting**:
```javascript
function checkSignUpRateLimit(ipAddress) {
  const key = `signup_rate_${ipAddress}`;
  const cache = CacheService.getScriptCache();
  const count = parseInt(cache.get(key) || '0');

  if (count >= 10) {
    throw new Error('일일 회원가입 제한을 초과했습니다 (10회)');
  }

  cache.put(key, (count + 1).toString(), 86400); // 24시간 TTL
}
```

---

## 11. Full Code Summary

### 11.1 Backend (예상 ~1,500 lines)

#### AuthService.gs v2.0 (~200 lines)
```javascript
// Refactored: Agencies → Users 기반 인증

function login(loginId, password, userType) {
  // 1. LoginAttempts 확인 (≥5 시 계정 잠금)
  // 2. Users 시트 조회 (LoginID + UserType)
  // 3. IsActive 검증
  // 4. PasswordHash 검증 (SHA-256 + MASTER_SALT)
  // 5. 성공 시: LoginAttempts=0, LastLogin=now(), Session 생성
  // 6. 실패 시: LoginAttempts++, ≥5 시 IsActive=false
  // 7. AuditLog 기록
}

function logout(sessionToken) {
  // CacheService 세션 삭제 + AuditLog
}

function validateSession(sessionToken) {
  // CacheService 조회 → { userId, userType, agencyCode }
}

function changePassword(userId, oldPassword, newPassword) {
  // 1. oldPassword 검증
  // 2. newPassword 정책 검증
  // 3. PasswordHash 업데이트
  // 4. 모든 세션 무효화
}
```

#### SignUpService.gs (~400 lines)
```javascript
function registerStudent(signupData) {
  // 1. 입력 유효성 검증 (이메일, 비밀번호, 필수 필드)
  // 2. 이메일 중복 확인
  // 3. AgencyCode 유효성 확인
  // 4. UserID 생성 (STU + YY + AgencySeq + StudentSeq)
  // 5. PasswordHash 생성
  // 6. Users INSERT (IsActive=false)
  // 7. 6자리 인증 코드 생성
  // 8. CacheService 저장 (TTL: 10분)
  // 9. EmailService.sendVerificationEmail
  // 10. PrivacyConsents INSERT
  // 11. AuditLog 기록
}

function verifyEmail(email, verificationCode) {
  // 1. CacheService 조회
  // 2. 코드 검증
  // 3. Users UPDATE (IsActive=true, EmailVerified=true)
  // 4. CacheService 삭제
  // 5. EmailService.sendWelcomeEmail
  // 6. AuditLog 기록
}

function resendVerificationCode(email) {
  // 1. EmailVerified 확인 (이미 인증 시 에러)
  // 2. 새 인증 코드 생성
  // 3. CacheService 업데이트
  // 4. 이메일 재발송
}

function forgotPassword(email, userType) {
  // 1. Users 조회 (email + userType)
  // 2. 재설정 토큰 생성 (UUID 32자)
  // 3. CacheService 저장 (TTL: 1시간)
  // 4. 재설정 URL 생성
  // 5. EmailService.sendPasswordResetEmail
  // 6. AuditLog 기록
}

function resetPassword(token, newPassword) {
  // 1. CacheService 조회 (토큰 검증)
  // 2. newPassword 정책 검증
  // 3. PasswordHash 생성
  // 4. Users UPDATE
  // 5. CacheService 삭제 (토큰 1회용)
  // 6. 모든 세션 무효화
  // 7. 비밀번호 변경 알림 이메일 발송
  // 8. AuditLog 기록
}
```

#### PrivacyService.gs (~300 lines)
```javascript
function recordConsent(userId, consentType, ipAddress, userAgent) {
  // 1. ConsentID 생성 (CONSENT-YYYYMMDD-XXXXX)
  // 2. ConsentDate = now()
  // 3. ExpiryDate = ConsentDate + 1년
  // 4. ConsentText = SystemConfig.PRIVACY_POLICY_KR
  // 5. PrivacyConsents INSERT
  // 6. Users UPDATE (PrivacyConsentDate, LastPrivacyNotice)
  // 7. AuditLog 기록
}

function checkConsentExpiry(userId) {
  // 1. Users.PrivacyConsentDate 조회
  // 2. ExpiryDate = PrivacyConsentDate + 1년
  // 3. daysRemaining 계산
  // 4. { isExpired, expiryDate, daysRemaining } 반환
}

function sendPrivacyNotice(userId) {
  // 1. Users 조회
  // 2. LastPrivacyNotice 확인 (6개월 미경과 시 skip)
  // 3. EmailService.sendPrivacyNoticeEmail
  // 4. Users.LastPrivacyNotice = now()
  // 5. EmailLogs INSERT
  // 6. AuditLog 기록
}

function sendAllPrivacyNotices() {
  // Time Trigger 함수 (매월 1일 00:00)
  // 모든 Users 대상으로 sendPrivacyNotice 호출
}

function deleteExpiredStudentData() {
  // Time Trigger 함수 (매년 1월 1일 00:00)
  // 1. Students 조회 (Status='졸업' AND GraduationDate < now()-5년)
  // 2. 각 학생별로:
  //    - Students, Users, PrivacyConsents, Consultations,
  //      ExamResults, TargetHistory 행 삭제
  // 3. AuditLog 기록 (Action: DATA_DELETED)
}
```

#### EmailService.gs (~200 lines)
```javascript
function sendVerificationEmail(email, verificationCode, nameKR, lang) {
  // 1. i18n 템플릿 조회 (email_verification_subject, email_verification_body)
  // 2. 변수 치환 ({nameKR}, {verificationCode})
  // 3. GmailApp.sendEmail
  // 4. EmailID 생성
  // 5. EmailLogs INSERT
  // 6. { emailId } 반환
}

function sendWelcomeEmail(userId, email, nameKR, lang) {
  // Welcome 이메일 발송 (가입 완료)
}

function sendPasswordResetEmail(email, resetUrl, nameKR, lang) {
  // 비밀번호 재설정 링크 이메일 발송
}

function sendPrivacyNoticeEmail(userId, email, nameKR, lang) {
  // 정기 개인정보 이용 알림 이메일 발송
}

// Helper: 이메일 발송 재시도 로직
function sendEmailWithRetry(email, subject, body, maxRetries = 3) {
  // 최대 3회 재시도 + 지수 백오프
}
```

#### MigrationService.gs (~100 lines)
```javascript
function migrateAgenciesToUsers() {
  // 1. Agencies 시트 읽기
  // 2. MASTER 제외 (이미 Users에 있음)
  // 3. 각 agency별로:
  //    - UserID = AgencyCode
  //    - UserType = 'agency'
  //    - LoginID, PasswordHash, IsActive 복사
  //    - Users INSERT
  // 4. migrationLog 반환
}

function rollbackMigration() {
  // Users 시트에서 UserType='agency' 행 삭제
  // (비상 롤백용)
}
```

#### Helpers.gs 확장 (~300 lines)
```javascript
// 기존 함수들...

function generateStudentID(agencyCode) {
  // STU + YY + AgencySeq + StudentSeq
  // 예: STU260010001
}

function generateConsentID() {
  // CONSENT-YYYYMMDD-XXXXX
}

function generateEmailID() {
  // EMAIL-YYYYMMDD-XXXXX
}

function generateVerificationCode() {
  // 6자리 난수 (100000 ~ 999999)
}

function generateResetToken() {
  // UUID 랜덤 문자열 32자
}

function validateEmail(email) {
  // RFC 5322 Simple 검증
}

function validatePassword(password) {
  // 비밀번호 정책 검증 (8자, 영문+숫자+특수문자)
}

function validatePhoneKR(phone) {
  // 010-1234-5678 형식 검증
}

function validatePhoneVN(phone) {
  // 0901234567 형식 검증
}

function hashPassword(password) {
  // SHA-256 + MASTER_SALT
}
```

---

### 11.2 Frontend (예상 ~1,200 lines)

#### SignUp.html (~350 lines)
```html
<!-- Step 1: 정보 입력 폼 (10 필드) -->
<!-- Step 2: 이메일 인증 (6자리 코드 + 타이머) -->
<!-- Step 3: 완료 (학생 ID 표시 + 로그인 버튼) -->
<!-- 클라이언트 유효성 검증 JavaScript -->
<!-- 비밀번호 강도 계산 -->
<!-- 유학원 드롭다운 동적 로드 -->
<!-- i18n 적용 -->
```

#### ForgotPassword.html (~150 lines)
```html
<!-- 이메일 + UserType 입력 폼 -->
<!-- 재설정 링크 발송 버튼 -->
<!-- 성공 메시지 표시 -->
<!-- 로그인으로 돌아가기 링크 -->
<!-- i18n 적용 -->
```

#### ResetPassword.html (~150 lines)
```html
<!-- URL에서 token 파라미터 추출 -->
<!-- 새 비밀번호 + 확인 입력 폼 -->
<!-- 비밀번호 강도 표시 -->
<!-- 성공 메시지 + 로그인 버튼 -->
<!-- 에러 메시지 (토큰 만료 시) -->
<!-- i18n 적용 -->
```

#### PrivacyPolicy.html (~150 lines)
```html
<!-- 개인정보 처리방침 전문 (SystemConfig에서 동적 로드) -->
<!-- 최종 수정일, 유효기간 표시 -->
<!-- 동의하고 돌아가기 버튼 -->
<!-- 인쇄하기 버튼 -->
<!-- i18n 적용 -->
```

#### Login.html v2.0 (~400 lines)
```html
<!-- 기존 v1.0 기능 유지 -->
<!-- 추가: UserType 선택 드롭다운 -->
<!-- 추가: 회원가입 링크 (student용) -->
<!-- 추가: 비밀번호 찾기 링크 -->
<!-- API 호출: login(loginId, password, userType) -->
<!-- i18n 적용 -->
```

---

### 11.3 i18n Keys (74개)

```javascript
function setupSignUpI18n() {
  // SignUp.html: 20개
  // Verification: 10개
  // ForgotPassword.html: 8개
  // ResetPassword.html: 7개
  // PrivacyPolicy.html: 5개
  // Login.html v2.0: 3개 (추가분)
  // Error Messages: 15개
  // Email Templates: 6개
  // 총 74개 키 추가
}
```

---

### 11.4 Test Functions (10개)

```javascript
// AuthService 테스트
function testLoginWithUsers() {
  // Users 기반 로그인 테스트 (master, agency, student)
}

function testAccountLockout() {
  // 5회 로그인 실패 시 계정 잠금 테스트
}

// SignUpService 테스트
function testRegisterStudent() {
  // 회원가입 플로우 테스트
}

function testEmailVerification() {
  // 이메일 인증 플로우 테스트
}

function testPasswordReset() {
  // 비밀번호 재설정 플로우 테스트
}

// PrivacyService 테스트
function testConsentRecording() {
  // 개인정보 동의 기록 테스트
}

function testPrivacyNotice() {
  // 정기 알림 발송 테스트
}

function testDataDeletion() {
  // 졸업생 데이터 삭제 테스트
}

// EmailService 테스트
function testEmailSending() {
  // 이메일 발송 테스트 (4가지 유형)
}

// Migration 테스트
function testAgenciesMigration() {
  // Agencies → Users 마이그레이션 테스트
}
```

---

## 12. Deployment Checklist

### Week 9-10 (Users 통합 인증)

**Day 50-52**: Users 시트 생성 + 마이그레이션
- [ ] Users 시트 생성 (schema.md 참조)
- [ ] MASTER 계정 수동 추가
- [ ] MigrationService.migrateAgenciesToUsers() 실행
- [ ] 마이그레이션 로그 확인

**Day 53-56**: AuthService v2.0 구현
- [ ] AuthService.gs v2.0 작성 (Users 기반)
- [ ] login, logout, validateSession, changePassword 함수 구현
- [ ] Helpers.gs에 generateStudentID 추가
- [ ] testLoginWithUsers, testAccountLockout 함수 작성

**Day 57-59**: Login.html v2.0 리팩토링
- [ ] UserType 선택 UI 추가
- [ ] 회원가입 링크 추가
- [ ] 비밀번호 찾기 링크 추가
- [ ] API 호출 파라미터 추가 (userType)
- [ ] i18n 3개 키 추가

**Day 60-63**: 통합 테스트
- [ ] clasp push
- [ ] setupSignUpI18n() 실행 (일부)
- [ ] 웹앱 재배포
- [ ] 테스트: master, agency, student 로그인
- [ ] 테스트: 계정 잠금 (5회 실패)
- [ ] 버그 수정

---

### Week 11-12 (학생 회원가입)

**Day 64-67**: SignUpService, EmailService 구현
- [ ] SignUpService.gs 작성 (5개 함수)
- [ ] EmailService.gs 작성 (4개 함수)
- [ ] PrivacyConsents, EmailLogs 시트 생성
- [ ] Helpers.gs에 generateConsentID, generateEmailID, generateVerificationCode, generateResetToken 추가
- [ ] testRegisterStudent, testEmailVerification, testPasswordReset 함수 작성

**Day 68-71**: Frontend 구현
- [ ] SignUp.html 작성 (3 Steps)
- [ ] ForgotPassword.html 작성
- [ ] ResetPassword.html 작성
- [ ] Code.gs 진입점 추가 (getSignUpContent, getForgotPasswordContent, getResetPasswordContent)

**Day 72-74**: 이메일 인증 플로우 테스트
- [ ] clasp push
- [ ] setupSignUpI18n() 실행 (전체)
- [ ] 웹앱 재배포
- [ ] 테스트: 회원가입 전체 플로우
- [ ] 테스트: 이메일 인증 코드 검증
- [ ] 테스트: 인증 코드 재발송
- [ ] 테스트: 10분 타이머 만료

**Day 75-77**: 비밀번호 재설정 플로우 테스트
- [ ] 테스트: 비밀번호 찾기 이메일 발송
- [ ] 테스트: 재설정 링크 클릭
- [ ] 테스트: 새 비밀번호 설정
- [ ] 테스트: 1시간 후 토큰 만료
- [ ] 버그 수정

---

### Week 13 (개인정보보호법 준수)

**Day 78-80**: PrivacyService 구현
- [ ] PrivacyService.gs 작성 (5개 함수)
- [ ] PrivacyPolicy.html 작성
- [ ] SystemConfig에 PRIVACY_POLICY_KR, PRIVACY_POLICY_VI 추가
- [ ] testConsentRecording, testPrivacyNotice, testDataDeletion 함수 작성

**Day 81-82**: Time Trigger 설정
- [ ] setupPrivacyNoticeTrigger() 실행 (매월 1일 00:00)
- [ ] setupDataDeletionTrigger() 실행 (매년 1월 1일 00:00)
- [ ] Time Trigger 동작 확인 (로그)

**Day 83-84**: 최종 테스트
- [ ] clasp push
- [ ] 웹앱 재배포
- [ ] 테스트: 개인정보 동의 기록
- [ ] 테스트: 6개월 후 정기 알림 발송 (수동 실행)
- [ ] 테스트: 졸업 후 5년 데이터 삭제 (수동 실행)
- [ ] Step 4 Gap Analysis 준비

---

**End of Design Document**

**Total Estimated Code**:
- Backend: ~1,500 lines (AuthService 200 + SignUpService 400 + PrivacyService 300 + EmailService 200 + MigrationService 100 + Helpers 300)
- Frontend: ~1,200 lines (SignUp 350 + ForgotPassword 150 + ResetPassword 150 + PrivacyPolicy 150 + Login v2.0 400)
- **Grand Total**: ~2,700 lines

**Quality Assurance**:
- Match Rate Goal: ≥90%
- Test Coverage: 10+ test functions
- i18n Coverage: 100% (74 keys)
- Legal Compliance: 100% (개인정보보호법 완전 준수)

---

**Generated by**: bkit PDCA System
**Document Type**: Design
**Feature**: Step 4 - Student Signup System
**Version**: 1.0
**Created**: 2026-02-16
**Level**: Dynamic

