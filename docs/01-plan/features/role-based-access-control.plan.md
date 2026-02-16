# Role-Based Access Control (RBAC) v2.0 - 3단계 사용자 등급 + 학생 회원가입

> 작성일: 2026-02-15
> Phase: Plan
> 버전: 2.0
> 목적: Users 시트 기반 통합 인증 + 학생 회원가입 + 개인정보보호법 준수

---

## 1. 개요

### 1.1 목적
- **Users 시트 기반 통합 인증 시스템** 구축
- **3단계 사용자 등급** 시스템 (Master / Agency / Student)
- **학생 회원가입** 기능 추가
- **개인정보보호법 준수** (동의, 정기 알림, ID/비밀번호 찾기)
- 역할별 데이터 접근 제어 강화

### 1.2 기존 구조 vs 새로운 구조

| 항목 | v1.0 (기존) | v2.0 (신규) |
|------|-------------|-------------|
| **인증 방식** | Agencies 시트만 | Users 시트 통합 |
| **사용자 유형** | master, agency, branch | master, agency, student |
| **학생 로그인** | ❌ 불가 | ✅ 가능 (회원가입) |
| **개인정보 동의** | ❌ 없음 | ✅ 필수 |
| **이메일 기능** | ❌ 없음 | ✅ ID/비밀번호 찾기, 정기 알림 |
| **데이터베이스** | 8개 시트 | 11개 시트 (Users, PrivacyConsents, EmailLogs 추가) |

---

## 2. Users 시트 기반 통합 인증

### 2.1 Users 시트 구조

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| UserID | String | 사용자 고유 ID (PK) | `MASTER`, `HANOI`, `STU260010001` |
| UserType | String | 사용자 유형 | `master`, `agency`, `student` |
| LoginID | String | 로그인 ID (unique) | `admin`, `hanoi_teacher`, `student001` |
| Email | String | 이메일 (unique, ID/비밀번호 찾기용) | `student@example.com` |
| PasswordHash | String | 비밀번호 해시 (SHA-256) | `$2a$10$...` |
| AgencyCode | String | 소속 유학원 (student/agency만) | `HANOI`, `DANANG` |
| IsActive | Boolean | 활성화 상태 | `TRUE` |
| PrivacyConsentDate | DateTime | 개인정보 동의 일시 | `2026-01-15 14:30:00` |
| LastPrivacyNotice | DateTime | 마지막 개인정보 알림 | `2026-01-15` |
| LoginAttempts | Number | 로그인 시도 횟수 | `0` |
| LastLogin | DateTime | 마지막 로그인 | `2026-02-15 10:00:00` |

### 2.2 UserID 생성 규칙

| UserType | UserID 형식 | 예시 |
|----------|-------------|------|
| master | `MASTER` | `MASTER` |
| agency | `{AgencyCode}` | `HANOI`, `DANANG` |
| student | `STU{StudentID}` | `STU260010001` |

### 2.3 인증 플로우

```
1. 사용자가 LoginID + Password 입력
   ↓
2. Users 시트에서 LoginID로 검색
   ↓
3. PasswordHash 검증 (SHA-256 + MASTER_SALT)
   ↓
4. LoginAttempts 체크 (5회 이상 시 잠금)
   ↓
5. 세션 생성 (CacheService, 1시간 TTL)
   ↓
6. SessionID 반환 (클라이언트 저장)
   ↓
7. LastLogin 업데이트
```

---

## 3. 3단계 사용자 등급 시스템

### 3.1 권한 매트릭스

| Role | 한국어명 | 권한 범위 | 주요 기능 |
|------|---------|----------|----------|
| **master** | 시스템 관리자 | 전체 시스템 | - 모든 데이터 CRUD<br>- 유학원 계정 생성/수정/삭제<br>- 감사 로그 조회 |
| **agency** | 유학원 교사 | 소속 유학원 | - 소속 학생만 CRUD<br>- 학생 계정 생성<br>- 상담/시험 기록 관리 |
| **student** | 베트남 유학생 | 본인 정보만 | - 본인 정보 조회/수정<br>- 본인 상담/시험 기록 조회 (읽기 전용)<br>- 개인정보 동의 관리 |

### 3.2 데이터 접근 제어 (Access Control Matrix)

| 기능 | master | agency | student |
|------|--------|--------|---------|
| **사용자 관리** |
| 유학원 계정 생성 | ✅ | ❌ | ❌ |
| 유학원 계정 수정 | ✅ | ❌ | ❌ |
| 학생 계정 생성 | ✅ | ✅ (소속만) | ❌ (자체 회원가입) |
| 학생 계정 수정 | ✅ | ✅ (소속만) | ✅ (본인만, 제한적) |
| 학생 계정 삭제 | ✅ | ❌ | ❌ |
| **학생 정보** |
| 전체 학생 조회 | ✅ | ❌ | ❌ |
| 소속 학생 조회 | ✅ | ✅ | ❌ |
| 본인 정보 조회 | ✅ | ✅ | ✅ |
| 학생 정보 수정 | ✅ | ✅ (소속만) | ✅ (본인만) |
| 학생 정보 삭제 | ✅ | ❌ | ❌ |
| **상담 기록** |
| 상담 기록 작성 | ✅ | ✅ (소속만) | ❌ |
| 상담 기록 조회 | ✅ | ✅ (소속만) | ✅ (본인만) |
| 상담 기록 수정 | ✅ | ✅ (소속만) | ❌ |
| **시험 성적** |
| 성적 입력 | ✅ | ✅ (소속만) | ❌ |
| 성적 조회 | ✅ | ✅ (소속만) | ✅ (본인만) |
| 성적 수정 | ✅ | ✅ (소속만) | ❌ |
| **개인정보 관리** |
| 동의 내역 조회 | ✅ | ❌ | ✅ (본인만) |
| 동의 철회 | ✅ | ❌ | ✅ (본인만) |
| 정보 다운로드 | ✅ | ✅ (소속만) | ✅ (본인만) |

---

## 4. 학생 회원가입 시스템

### 4.1 회원가입 플로우

```
1. 회원가입 페이지 접속 (Signup.html)
   ↓
2. 학생 정보 입력 폼
   - 기본 정보: 이름(한국어/베트남어), 생년월일, 성별, 전화번호
   - 주소: 한국 주소, 베트남 주소
   - 학부모 정보: 이름(한국어/베트남어), 전화번호, 경제 상황
   - 학업 정보: 고등학교명, 성적, 목표 대학
   - 소속 유학원: 드롭다운 선택 (MASTER 제외)
   ↓
3. 계정 정보 입력
   - 로그인 ID (중복 체크)
   - 이메일 (중복 체크 + 인증)
   - 비밀번호 (확인)
   ↓
4. 개인정보 수집 동의
   - 필수: 개인정보 수집 및 이용 동의
   - 필수: 제3자 정보 제공 동의 (유학원)
   - 선택: 마케팅 정보 수신 동의
   ↓
5. 이메일 인증
   - 6자리 인증 코드 발송
   - 인증 코드 입력 확인
   ↓
6. 가입 처리
   - StudentID 자동 생성 (YYAAASSSSS)
   - UserID 생성 (STU + StudentID)
   - Users 시트에 사용자 생성 (UserType: student)
   - Students 시트에 학생 정보 생성
   - PrivacyConsents 시트에 동의 기록
   - 가입 완료 이메일 발송
   ↓
7. 로그인 페이지로 리다이렉트
```

### 4.2 회원가입 UI 구성

**Signup.html 주요 섹션**:
1. **기본 정보 입력**
   - 한국 이름 (NameKR)
   - 베트남 이름 (NameVN)
   - 생년월일 (DateOfBirth)
   - 성별 (Gender)
   - 전화번호 (PhoneNumber)

2. **주소 정보**
   - 한국 주소 (AddressKR)
   - 베트남 주소 (AddressVN)

3. **학부모 정보**
   - 학부모 이름 - 한국어 (ParentNameKR)
   - 학부모 이름 - 베트남어 (ParentNameVN)
   - 학부모 전화번호 (ParentPhone)
   - 학부모 경제 상황 (ParentEconomicStatus) - 암호화 저장

4. **학업 정보**
   - 고등학교명 (HighSchoolName)
   - 고등학교 성적 (HighSchoolGrade)
   - 목표 대학 (TargetUniversity)
   - 목표 학과 (TargetDepartment)

5. **소속 유학원**
   - 드롭다운 선택 (getAgencyList() 호출)
   - MASTER 제외
   - AgencyName 표시

6. **계정 정보**
   - 로그인 ID (중복 체크 버튼)
   - 이메일 (중복 체크 + 인증 코드 발송)
   - 비밀번호 (확인)

7. **개인정보 동의**
   - 필수 동의 체크박스
   - 동의 내용 전문 표시
   - 동의 IP 자동 기록

### 4.3 백엔드 함수 (StudentService.gs)

```javascript
/**
 * 학생 회원가입
 * @param {Object} signupData - 회원가입 데이터
 * @returns {Object} { success: true, data: { StudentID, UserID } }
 */
function studentSignup(signupData) {
  // 1. 필수 필드 검증
  // 2. LoginID 중복 체크 (Users 시트)
  // 3. Email 중복 체크 (Users 시트)
  // 4. 이메일 인증 코드 검증
  // 5. StudentID 생성 (YYAAASSSSS)
  // 6. UserID 생성 (STU + StudentID)
  // 7. PasswordHash 생성 (SHA-256 + MASTER_SALT)
  // 8. Users 시트에 레코드 추가
  // 9. Students 시트에 레코드 추가
  // 10. PrivacyConsents 시트에 동의 기록
  // 11. 가입 완료 이메일 발송
  // 12. AuditLogs 기록
  // 13. 결과 반환
}
```

---

## 5. 개인정보보호법 준수

### 5.1 개인정보 수집 동의 (회원가입 시)

**PrivacyConsents 시트에 기록**:
```javascript
{
  ConsentID: "CONSENT-20260115-001",
  UserID: "STU260010001",
  ConsentType: "signup",
  ConsentDate: "2026-01-15 14:30:00",
  ConsentIP: "123.45.67.89",
  ConsentText: "개인정보 수집 및 이용에 동의합니다...",
  IsActive: true,
  ExpiryDate: "2027-01-15"  // 1년 후
}
```

**동의 내용 (i18n 시트에서 로드)**:
- Key: `consent_text_signup`
- 수집 항목, 이용 목적, 보유 기간, 거부 권리 명시

### 5.2 정기적 개인정보 이용 알림 (6개월마다)

**GAS Trigger 설정**:
- 매월 1일 자동 실행
- Users.LastPrivacyNotice 체크
- 6개월 경과 사용자 필터링
- 이메일 발송 후 LastPrivacyNotice 업데이트

**이메일 내용**:
- 제목: `[중요] 개인정보 이용 현황 안내`
- 본문: 수집된 정보, 이용 목적, 보유 기간, 열람/수정/삭제 방법

**EmailLogs 시트에 기록**:
```javascript
{
  EmailID: "EMAIL-20260715-001",
  UserID: "STU260010001",
  EmailType: "privacy_notice",
  Status: "sent"
}
```

### 5.3 ID/비밀번호 찾기 (이메일 기반)

#### 5.3.1 ID 찾기

**플로우**:
```
1. "ID 찾기" 클릭
   ↓
2. 이메일 입력
   ↓
3. Users 시트에서 Email로 검색
   ↓
4. LoginID를 해당 이메일로 발송
   - EmailType: "id_recovery"
   - 제목: "AJU E&J 로그인 ID 안내"
   - 본문: "고객님의 로그인 ID는 [LoginID]입니다."
   ↓
5. EmailLogs 시트에 기록
```

#### 5.3.2 비밀번호 재설정

**플로우**:
```
1. "비밀번호 찾기" 클릭
   ↓
2. LoginID + Email 입력
   ↓
3. Users 시트에서 일치 여부 확인
   ↓
4. 임시 비밀번호 생성 (8자리 영숫자)
   ↓
5. PasswordHash 업데이트
   ↓
6. 임시 비밀번호를 이메일로 발송
   - EmailType: "password_reset"
   - 제목: "AJU E&J 임시 비밀번호 안내"
   - 본문: "임시 비밀번호: [TEMP_PASSWORD]"
   ↓
7. 로그인 후 비밀번호 변경 강제
```

---

## 6. 역할별 UI 표시/숨김

### 6.1 메뉴 및 버튼

| UI 요소 | master | agency | student |
|---------|--------|--------|---------|
| **메뉴** |
| 유학원 관리 탭 | ✅ 표시 | ❌ 숨김 | ❌ 숨김 |
| 학생 관리 탭 | ✅ 표시 | ✅ 표시 | ❌ 숨김 |
| 내 정보 탭 | ✅ 표시 | ✅ 표시 | ✅ 표시 |
| 상담 관리 탭 | ✅ 표시 | ✅ 표시 | ✅ 표시 (읽기 전용) |
| 시험 관리 탭 | ✅ 표시 | ✅ 표시 | ✅ 표시 (읽기 전용) |
| **버튼** |
| 학생 등록 버튼 | ✅ 표시 | ✅ 표시 | ❌ 숨김 |
| 학생 수정 버튼 | ✅ 표시 | ✅ 표시 (소속만) | ✅ 표시 (본인만) |
| 학생 삭제 버튼 | ✅ 표시 | ❌ 숨김 | ❌ 숨김 |
| 상담 작성 버튼 | ✅ 표시 | ✅ 표시 | ❌ 숨김 |
| 성적 입력 버튼 | ✅ 표시 | ✅ 표시 | ❌ 숨김 |
| **폼 필드** |
| 유학원 드롭다운 | ✅ 표시 | ❌ 숨김 (자동) | ❌ 숨김 (자동) |

### 6.2 학생 등록 폼 (역할별 차이)

**master**:
- 유학원 드롭다운 표시 (모든 유학원 선택 가능)
- 모든 필드 입력 가능

**agency**:
- 유학원 드롭다운 숨김 (session.agencyCode 자동 할당)
- 모든 필드 입력 가능

**student**:
- 학생 등록 버튼 자체가 숨김
- 대신 "회원가입" 링크 표시

---

## 7. 백엔드 함수 수정 범위

### 7.1 Auth.gs (수정)

**getAgencyList()**:
```javascript
// MASTER 제외 + AgencyName 반환
function getAgencyList(sessionId) {
  var session = _validateSession(sessionId);
  var agencies = _getAllRows(SHEETS.AGENCIES);

  var activeAgencies = agencies.filter(function(a) {
    return a.IsActive !== false &&
           String(a.IsActive).toUpperCase() !== 'FALSE' &&
           a.AgencyCode !== 'MASTER';  // ← MASTER 제외
  });

  var agencyList = activeAgencies.map(function(a) {
    return {
      AgencyCode: a.AgencyCode,
      AgencyName: a.AgencyName || a.AgencyCode  // ← 이름 반환
    };
  });

  return { success: true, data: agencyList };
}
```

**login()** - Users 시트 기반으로 변경:
```javascript
function login(loginId, password) {
  // 1. Users 시트에서 LoginID로 검색
  var users = _getAllRows(SHEETS.USERS);
  var user = users.find(function(u) {
    return u.LoginID === loginId && u.IsActive === true;
  });

  // 2. 로그인 시도 횟수 체크
  if (user.LoginAttempts >= 5) {
    return { success: false, errorKey: 'err_max_attempts' };
  }

  // 3. 비밀번호 검증
  var hashedInput = hashPassword(password);
  if (hashedInput !== user.PasswordHash) {
    // LoginAttempts 증가
    return { success: false, errorKey: 'err_login_failed' };
  }

  // 4. 세션 생성
  var sessionId = _createSession(user);

  // 5. LastLogin 업데이트
  _updateRow(SHEETS.USERS, 'UserID', user.UserID, {
    LoginAttempts: 0,
    LastLogin: getCurrentTimestamp()
  });

  return { success: true, data: { sessionId: sessionId, user: user } };
}
```

### 7.2 StudentService.gs (신규/수정)

**신규 함수**:
- `studentSignup(signupData)` - 학생 회원가입
- `checkLoginIdAvailable(loginId)` - LoginID 중복 체크
- `checkEmailAvailable(email)` - Email 중복 체크
- `sendEmailVerification(email)` - 이메일 인증 코드 발송
- `verifyEmailCode(email, code)` - 인증 코드 검증
- `getMyProfile(sessionId)` - 학생 본인 정보 조회
- `updateMyProfile(sessionId, updates)` - 학생 본인 정보 수정 (제한적)

**수정 함수**:
- `getStudentList(sessionId, filters)` - student role 필터링 추가
- `createStudent(sessionId, studentData)` - Users 시트 연동
- `updateStudent(sessionId, studentId, updates)` - Users 시트 연동
- `deleteStudent(sessionId, studentId)` - master 전용으로 변경

### 7.3 EmailService.gs (신규)

```javascript
/**
 * 이메일 발송 공통 함수
 */
function sendEmail(userId, emailType, subject, body) {
  // 1. Users 시트에서 Email 조회
  // 2. GmailApp.sendEmail() 호출
  // 3. EmailLogs 시트에 기록
  // 4. Status 업데이트 (sent/failed)
}

/**
 * 가입 완료 이메일
 */
function sendWelcomeEmail(userId, loginId) {
  // i18n에서 템플릿 로드
  // sendEmail() 호출
}

/**
 * 정기 개인정보 알림 이메일 (Trigger)
 */
function sendPrivacyNoticeEmails() {
  // Users 시트에서 LastPrivacyNotice 체크
  // 6개월 경과 사용자 필터링
  // 일괄 발송
}

/**
 * ID 찾기 이메일
 */
function sendIdRecoveryEmail(email) {
  // Users 시트에서 LoginID 조회
  // sendEmail() 호출
}

/**
 * 비밀번호 재설정 이메일
 */
function sendPasswordResetEmail(userId, tempPassword) {
  // sendEmail() 호출
}
```

### 7.4 PrivacyService.gs (신규)

```javascript
/**
 * 개인정보 동의 기록
 */
function savePrivacyConsent(userId, consentType, consentText, consentIp) {
  // PrivacyConsents 시트에 레코드 추가
  // Users.PrivacyConsentDate 업데이트
}

/**
 * 개인정보 동의 내역 조회
 */
function getPrivacyConsents(sessionId) {
  // student는 본인만, master는 전체 조회
}

/**
 * 개인정보 동의 갱신
 */
function renewPrivacyConsent(sessionId) {
  // 기존 동의 IsActive = false
  // 새 동의 레코드 추가
}
```

---

## 8. 프론트엔드 수정 범위

### 8.1 Login.html (수정)

**showAppView() 함수**:
```javascript
function showAppView(user) {
  // student role일 때 UI 제한
  if (user.role === 'student') {
    document.getElementById('agency-management-tab').style.display = 'none';
    document.getElementById('student-register-btn').style.display = 'none';
    // ... 기타 UI 숨김 처리
  }
}
```

**loadAgencyList() 함수**:
```javascript
// AgencyName 표시 (기존 AgencyCode 대신)
option.textContent = agency.AgencyName;
option.value = agency.AgencyCode;
```

### 8.2 Signup.html (신규)

**주요 섹션**:
1. 기본 정보 입력 폼
2. 주소 정보 입력 폼
3. 학부모 정보 입력 폼
4. 학업 정보 입력 폼
5. 소속 유학원 드롭다운
6. 계정 정보 입력 폼
7. 개인정보 동의 체크박스
8. 이메일 인증 섹션
9. 회원가입 버튼

**주요 함수**:
```javascript
// LoginID 중복 체크
function checkLoginId() {
  google.script.run
    .withSuccessHandler(handleCheckResult)
    .checkLoginIdAvailable(loginId);
}

// Email 중복 체크 + 인증 코드 발송
function sendVerificationCode() {
  google.script.run
    .withSuccessHandler(handleCodeSent)
    .sendEmailVerification(email);
}

// 인증 코드 검증
function verifyCode() {
  google.script.run
    .withSuccessHandler(handleVerified)
    .verifyEmailCode(email, code);
}

// 회원가입 제출
function submitSignup() {
  google.script.run
    .withSuccessHandler(handleSignupSuccess)
    .studentSignup(signupData);
}
```

### 8.3 FindId.html (신규)

**기능**:
- 이메일 입력
- ID 찾기 버튼
- 결과 메시지 표시 ("입력하신 이메일로 ID를 발송했습니다.")

### 8.4 ResetPassword.html (신규)

**기능**:
- LoginID + Email 입력
- 비밀번호 재설정 버튼
- 결과 메시지 표시 ("입력하신 이메일로 임시 비밀번호를 발송했습니다.")

---

## 9. i18n 추가 키

### 9.1 역할 관련

| Key | Korean | Vietnamese |
|-----|--------|-----------|
| `role_master` | 관리자 | Quản trị viên |
| `role_agency` | 유학원 관리자 | Quản lý cơ sở |
| `role_student` | 학생 | Sinh viên |

### 9.2 회원가입 관련

| Key | Korean | Vietnamese |
|-----|--------|-----------|
| `signup_title` | 학생 회원가입 | Đăng ký sinh viên |
| `signup_basic_info` | 기본 정보 | Thông tin cơ bản |
| `signup_address_info` | 주소 정보 | Thông tin địa chỉ |
| `signup_parent_info` | 학부모 정보 | Thông tin phụ huynh |
| `signup_academic_info` | 학업 정보 | Thông tin học tập |
| `signup_account_info` | 계정 정보 | Thông tin tài khoản |
| `signup_consent` | 개인정보 동의 | Đồng ý thông tin |
| `signup_email_verify` | 이메일 인증 | Xác thực email |
| `btn_signup` | 회원가입 | Đăng ký |
| `msg_signup_success` | 회원가입이 완료되었습니다. | Đăng ký thành công. |

### 9.3 ID/비밀번호 찾기 관련

| Key | Korean | Vietnamese |
|-----|--------|-----------|
| `find_id_title` | ID 찾기 | Tìm ID |
| `find_password_title` | 비밀번호 찾기 | Tìm mật khẩu |
| `btn_find_id` | ID 찾기 | Tìm ID |
| `btn_reset_password` | 비밀번호 재설정 | Đặt lại mật khẩu |
| `msg_id_sent` | 입력하신 이메일로 ID를 발송했습니다. | ID đã được gửi đến email. |
| `msg_password_sent` | 입력하신 이메일로 임시 비밀번호를 발송했습니다. | Mật khẩu tạm thời đã được gửi. |

### 9.4 개인정보 관련

| Key | Korean | Vietnamese |
|-----|--------|-----------|
| `consent_text_signup` | 개인정보 수집 및 이용에 동의합니다. | Tôi đồng ý thu thập và sử dụng thông tin. |
| `consent_required` | 개인정보 동의는 필수입니다. | Đồng ý thông tin là bắt buộc. |
| `privacy_notice_title` | 개인정보 이용 현황 안내 | Thông báo sử dụng thông tin |

---

## 10. 구현 우선순위

### Phase 1: Users 시트 기반 인증 (1-2일)
- [ ] Users 시트 생성
- [ ] Auth.gs → login() 수정 (Users 기반)
- [ ] Auth.gs → getAgencyList() 수정 (MASTER 제외)
- [ ] 기존 Agencies 데이터 → Users 마이그레이션
- [ ] 테스트 (master, agency 로그인)

### Phase 2: 학생 회원가입 (3-4일)
- [ ] Signup.html 생성
- [ ] StudentService.gs → studentSignup() 구현
- [ ] EmailService.gs → 이메일 발송 함수 구현
- [ ] PrivacyService.gs → 동의 기록 함수 구현
- [ ] 테스트 (회원가입 플로우)

### Phase 3: ID/비밀번호 찾기 (1-2일)
- [ ] FindId.html 생성
- [ ] ResetPassword.html 생성
- [ ] EmailService.gs → ID 찾기/비밀번호 재설정 함수
- [ ] 테스트

### Phase 4: 정기 개인정보 알림 (1일)
- [ ] EmailService.gs → sendPrivacyNoticeEmails() 구현
- [ ] GAS Trigger 설정 (매월 1일)
- [ ] 테스트

### Phase 5: 학생 대시보드 (2-3일)
- [ ] StudentDashboard.html 생성
- [ ] getMyProfile() / updateMyProfile() 구현
- [ ] 본인 상담/시험 기록 조회 UI
- [ ] 테스트

---

## 11. 테스트 시나리오

### 11.1 회원가입 테스트

**시나리오 1**: 정상 회원가입
1. Signup.html 접속
2. 모든 필수 정보 입력
3. LoginID 중복 체크 (사용 가능)
4. Email 중복 체크 + 인증 코드 발송
5. 인증 코드 입력 및 검증
6. 개인정보 동의 체크
7. 회원가입 버튼 클릭
8. 성공 메시지 확인
9. 가입 완료 이메일 수신 확인
10. 로그인 가능 확인

**시나리오 2**: LoginID 중복
1. 기존 LoginID 입력
2. 중복 체크 → 에러 메시지 확인

**시나리오 3**: Email 중복
1. 기존 Email 입력
2. 중복 체크 → 에러 메시지 확인

### 11.2 ID/비밀번호 찾기 테스트

**시나리오 4**: ID 찾기
1. FindId.html 접속
2. 등록된 Email 입력
3. ID 찾기 버튼 클릭
4. 이메일 발송 확인
5. 이메일 수신 및 LoginID 확인

**시나리오 5**: 비밀번호 재설정
1. ResetPassword.html 접속
2. LoginID + Email 입력
3. 비밀번호 재설정 버튼 클릭
4. 이메일 발송 확인
5. 임시 비밀번호로 로그인
6. 비밀번호 변경 강제 확인

### 11.3 역할별 권한 테스트

**시나리오 6**: student - 본인 정보만 조회
1. student 계정 로그인
2. 학생 목록 확인 → 본인만 표시
3. 타 학생 정보 조회 시도 → 거부

**시나리오 7**: agency - 소속 학생만 관리
1. HANOI 계정 로그인
2. 학생 목록 → HANOI 학생만 표시
3. DANANG 학생 수정 시도 → 거부

**시나리오 8**: master - 전체 관리
1. master 계정 로그인
2. 모든 학생 조회 가능
3. 모든 학생 수정/삭제 가능

---

## 12. 최종 체크리스트

### Users 시트 기반 인증
- [ ] Users 시트 생성 완료
- [ ] Agencies → Users 마이그레이션 완료
- [ ] login() 함수 Users 기반으로 수정
- [ ] getAgencyList() MASTER 제외 확인
- [ ] 테스트 완료

### 학생 회원가입
- [ ] Signup.html UI 완성
- [ ] studentSignup() 함수 구현
- [ ] 이메일 인증 기능 구현
- [ ] 개인정보 동의 기록 구현
- [ ] 가입 완료 이메일 발송 확인
- [ ] 테스트 완료

### ID/비밀번호 찾기
- [ ] FindId.html / ResetPassword.html 완성
- [ ] 이메일 발송 함수 구현
- [ ] 임시 비밀번호 생성 로직 구현
- [ ] 테스트 완료

### 개인정보보호법 준수
- [ ] PrivacyConsents 시트 생성
- [ ] EmailLogs 시트 생성
- [ ] 정기 알림 Trigger 설정
- [ ] 동의 갱신 기능 구현
- [ ] 테스트 완료

---

**작성자**: Claude (PDCA Plan Phase v2.0)
**다음 단계**: `/pdca design role-based-access-control`
**참고 문서**: `schema.md v2.0`, `complete-system-plan.md`
