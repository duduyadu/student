# AJU E&J 학생관리 시스템 - 완전한 재설계 계획

**작성일**: 2026-02-15
**버전**: 2.0
**목표**: 3단계 사용자 등급 + 학생 회원가입 + 개인정보보호법 준수

---

## 1. 시스템 개요

### 1.1 사용자 등급 체계

| 등급 | 역할 | 권한 | 인증 방식 |
|------|------|------|-----------|
| **마스터** | 시스템 관리자 | 전체 데이터 조회/수정/삭제, 유학원 계정 생성 | 마스터 ID/비밀번호 |
| **유학원** | 유학원 교사 | 소속 학생만 조회/수정, 학생 계정 생성 | 유학원 ID/비밀번호 |
| **학생** | 베트남 유학생 | 본인 정보만 조회/수정 | 학생 ID/비밀번호 (회원가입) |

### 1.2 핵심 기능

1. **학생 회원가입 시스템**
   - 학생이 직접 회원가입
   - 모든 정보 입력 (개인정보, 학부모 정보, 목표 대학 등)
   - ID/비밀번호 생성
   - 개인정보 수집 동의 필수

2. **개인정보보호법 준수**
   - 개인정보 수집 동의서 (체크박스)
   - 정기적 이용 알림 이메일 (6개월마다)
   - 이메일 기반 ID/비밀번호 찾기

3. **역할별 대시보드**
   - 마스터: 전체 학생 목록, 유학원 관리
   - 유학원: 소속 학생 목록, 상담/시험 기록
   - 학생: 본인 정보, TOPIK 성적, 상담 기록

---

## 2. 데이터베이스 재설계

### 2.1 Users 시트 (NEW - 통합 사용자 테이블)

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| UserID | String | 사용자 고유 ID | "MASTER", "HANOI", "STU260010001" |
| UserType | String | 사용자 유형 | "master", "agency", "student" |
| LoginID | String | 로그인 ID | "admin", "hanoi_teacher", "student001" |
| Email | String | 이메일 주소 | "student@example.com" |
| PasswordHash | String | 비밀번호 해시 | SHA-256 해시값 |
| AgencyCode | String | 소속 유학원 (학생/유학원) | "HANOI", "DANANG" |
| IsActive | Boolean | 활성화 상태 | TRUE |
| PrivacyConsentDate | DateTime | 개인정보 동의 일시 | 2026-01-15 14:30:00 |
| LastPrivacyNotice | DateTime | 마지막 개인정보 알림 | 2026-01-15 |
| LoginAttempts | Number | 로그인 시도 횟수 | 0 |
| LastLogin | DateTime | 마지막 로그인 | 2026-02-15 10:00:00 |
| CreatedAt | DateTime | 생성 일시 | 2026-01-01 00:00:00 |
| UpdatedAt | DateTime | 수정 일시 | 2026-02-15 10:00:00 |

**설계 포인트**:
- UserType으로 마스터/유학원/학생 구분
- 모든 사용자가 Email 필수 (ID/비밀번호 찾기용)
- PrivacyConsentDate: 개인정보 수집 동의 일시
- LastPrivacyNotice: 정기 알림 발송 추적

### 2.2 Students 시트 (수정 - 로그인 정보 제거)

기존 Students 시트에서 **로그인 관련 컬럼 제거**, Users 시트와 UserID로 연결

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| StudentID | String | 학생 고유 ID (PK) | "260010001" |
| UserID | String | Users 시트 참조 (FK) | "STU260010001" |
| AgencyCode | String | 소속 유학원 | "HANOI" |
| NameKR | String | 한국 이름 | "박두양" |
| NameVN | String | 베트남 이름 | "Pham Du Duong" |
| DateOfBirth | Date | 생년월일 | 2008-10-15 |
| Gender | String | 성별 | "남" |
| PhoneNumber | String | 전화번호 | "010-1234-5678" |
| AddressKR | String | 한국 주소 | "서울시 강남구..." |
| AddressVN | String | 베트남 주소 | "Hanoi, Vietnam" |
| ParentNameKR | String | 학부모 이름 (한국) | "박아버지" |
| ParentNameVN | String | 학부모 이름 (베트남) | "Pham Father" |
| ParentPhone | String | 학부모 전화번호 | "84-123-456-7890" |
| ParentEconomicStatus | String | 경제 상황 (암호화) | "중상" (암호화 저장) |
| HighSchoolName | String | 고등학교명 | "Hanoi High School" |
| HighSchoolGrade | String | 고등학교 성적 | "4.2/5.0" |
| EnrollmentDate | Date | 유학원 등록일 | 2026-01-15 |
| CreatedBy | String | 생성자 | "HANOI" |
| CreatedAt | DateTime | 생성 일시 | 2026-01-15 14:30:00 |
| UpdatedBy | String | 수정자 | "STU260010001" |
| UpdatedAt | DateTime | 수정 일시 | 2026-02-15 10:00:00 |

**설계 포인트**:
- UserID로 Users 시트와 1:1 연결
- 로그인 정보(LoginID, PasswordHash)는 Users 시트에서 관리
- 개인정보 동의는 Users 시트에서 관리

### 2.3 Agencies 시트 (수정 - 로그인 정보 제거)

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| AgencyCode | String | 유학원 코드 (PK) | "HANOI" |
| UserID | String | Users 시트 참조 (FK) | "HANOI" |
| AgencyNumber | Number | 유학원 번호 (3자리) | 1 |
| AgencyNameKR | String | 유학원 이름 (한국어) | "하노이 유학원" |
| AgencyNameVN | String | 유학원 이름 (베트남어) | "Hanoi Study Center" |
| IsActive | Boolean | 활성화 상태 | TRUE |
| CreatedBy | String | 생성자 | "MASTER" |
| CreatedAt | DateTime | 생성 일시 | 2026-01-01 00:00:00 |
| UpdatedBy | String | 수정자 | "MASTER" |
| UpdatedAt | DateTime | 수정 일시 | 2026-02-15 10:00:00 |

**설계 포인트**:
- UserID로 Users 시트와 1:1 연결
- 로그인 정보는 Users 시트에서 관리

### 2.4 PrivacyConsents 시트 (NEW - 개인정보 동의 기록)

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| ConsentID | String | 동의 ID (PK) | "CONSENT-20260115-001" |
| UserID | String | Users 시트 참조 (FK) | "STU260010001" |
| ConsentType | String | 동의 유형 | "signup", "renewal" |
| ConsentDate | DateTime | 동의 일시 | 2026-01-15 14:30:00 |
| ConsentIP | String | 접속 IP | "123.45.67.89" |
| ConsentText | Text | 동의 내용 전문 | "개인정보 수집 및 이용에 동의합니다..." |
| IsActive | Boolean | 유효 상태 | TRUE |
| ExpiryDate | Date | 만료일 (1년 후) | 2027-01-15 |
| CreatedAt | DateTime | 생성 일시 | 2026-01-15 14:30:00 |

**설계 포인트**:
- 모든 개인정보 동의 기록 보관 (법적 증빙)
- ConsentType: signup(가입), renewal(갱신)
- ExpiryDate: 1년 후 자동 만료 → 재동의 필요

### 2.5 EmailLogs 시트 (NEW - 이메일 발송 기록)

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| EmailID | String | 이메일 ID (PK) | "EMAIL-20260115-001" |
| UserID | String | 수신자 UserID | "STU260010001" |
| EmailType | String | 이메일 유형 | "welcome", "privacy_notice", "password_reset" |
| ToEmail | String | 수신 이메일 | "student@example.com" |
| Subject | String | 제목 | "AJU E&J 가입을 환영합니다" |
| Body | Text | 본문 | "안녕하세요..." |
| SentDate | DateTime | 발송 일시 | 2026-01-15 14:35:00 |
| Status | String | 발송 상태 | "sent", "failed", "pending" |
| ErrorMessage | String | 에러 메시지 (실패 시) | "" |
| CreatedAt | DateTime | 생성 일시 | 2026-01-15 14:35:00 |

**설계 포인트**:
- 모든 이메일 발송 기록 보관
- EmailType: welcome(가입), privacy_notice(정기 알림), password_reset(비밀번호 재설정)
- Status로 발송 성공/실패 추적

---

## 3. 주요 기능 설계

### 3.1 학생 회원가입 플로우

```
1. 회원가입 페이지 접속
   ↓
2. 학생 정보 입력 폼
   - 기본 정보: 이름, 생년월일, 성별, 전화번호
   - 주소: 한국 주소, 베트남 주소
   - 학부모 정보: 이름, 전화번호, 경제 상황
   - 학업 정보: 고등학교명, 성적, 목표 대학
   ↓
3. 계정 정보 입력
   - 로그인 ID (중복 체크)
   - 이메일 (인증)
   - 비밀번호 (확인)
   ↓
4. 개인정보 수집 동의
   - 필수: 개인정보 수집 및 이용 동의
   - 필수: 제3자 정보 제공 동의 (유학원)
   - 선택: 마케팅 정보 수신 동의
   ↓
5. 이메일 인증
   - 인증 코드 발송
   - 6자리 코드 입력
   ↓
6. 가입 완료
   - Users 시트에 사용자 생성 (UserType: student)
   - Students 시트에 학생 정보 생성
   - PrivacyConsents 시트에 동의 기록
   - 가입 완료 이메일 발송
   ↓
7. 로그인 페이지로 리다이렉트
```

### 3.2 ID/비밀번호 찾기 플로우

#### 3.2.1 ID 찾기
```
1. "ID 찾기" 클릭
   ↓
2. 이메일 입력
   ↓
3. Users 시트에서 Email로 검색
   ↓
4. 해당 이메일로 LoginID 발송
   - 제목: "AJU E&J 로그인 ID 안내"
   - 본문: "고객님의 로그인 ID는 [LoginID]입니다."
   ↓
5. 이메일 확인 후 로그인
```

#### 3.2.2 비밀번호 재설정
```
1. "비밀번호 찾기" 클릭
   ↓
2. LoginID + Email 입력
   ↓
3. Users 시트에서 일치 여부 확인
   ↓
4. 임시 비밀번호 생성
   ↓
5. 이메일로 임시 비밀번호 발송
   - 제목: "AJU E&J 임시 비밀번호 안내"
   - 본문: "임시 비밀번호: [TEMP_PASS]"
   ↓
6. Users 시트에서 PasswordHash 업데이트
   ↓
7. 로그인 후 비밀번호 변경 강제
```

### 3.3 정기 개인정보 이용 알림

```
1. 매월 1일 자동 실행 (GAS Trigger)
   ↓
2. Users 시트에서 LastPrivacyNotice 체크
   - 6개월 경과한 사용자 필터링
   ↓
3. 대상 사용자에게 이메일 발송
   - 제목: "[중요] 개인정보 이용 현황 안내"
   - 본문: "귀하의 개인정보를 다음과 같이 이용하고 있습니다..."
   ↓
4. 이메일 발송 후 LastPrivacyNotice 업데이트
   ↓
5. EmailLogs 시트에 발송 기록
```

### 3.4 개인정보 동의 갱신

```
1. PrivacyConsents 시트에서 ExpiryDate 체크
   - 만료 30일 전 사용자 필터링
   ↓
2. 이메일로 재동의 요청
   - 제목: "[필수] 개인정보 이용 동의 갱신 안내"
   - 본문: "동의 기간이 만료됩니다. 갱신하시겠습니까?"
   ↓
3. 사용자 로그인 시 팝업 표시
   - "개인정보 이용 동의가 만료되었습니다. 갱신해주세요."
   ↓
4. 동의 버튼 클릭 시
   - PrivacyConsents 시트에 새 레코드 추가
   - Users.PrivacyConsentDate 업데이트
```

---

## 4. 권한 체계 설계

### 4.1 권한 매트릭스

| 기능 | 마스터 | 유학원 | 학생 |
|------|--------|--------|------|
| **사용자 관리** |
| 유학원 계정 생성 | ✅ | ❌ | ❌ |
| 유학원 계정 수정 | ✅ | ❌ | ❌ |
| 학생 계정 생성 | ✅ | ✅ (소속만) | ❌ |
| 학생 계정 수정 | ✅ | ✅ (소속만) | ✅ (본인만) |
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

### 4.2 권한 검증 함수

```javascript
/**
 * 권한 검증 헬퍼
 * @param {string} userId - 요청자 UserID
 * @param {string} action - 액션 유형 (READ, CREATE, UPDATE, DELETE)
 * @param {string} targetUserId - 대상 UserID
 * @returns {boolean} 권한 여부
 */
function checkPermission(userId, action, targetUserId) {
  var user = getUserByUserId(userId);

  // 마스터는 모든 권한
  if (user.UserType === 'master') {
    return true;
  }

  // 유학원은 소속 학생만
  if (user.UserType === 'agency') {
    var targetStudent = getStudentByUserId(targetUserId);
    return targetStudent.AgencyCode === user.AgencyCode;
  }

  // 학생은 본인만
  if (user.UserType === 'student') {
    if (action === 'DELETE') {
      return false; // 학생은 삭제 불가
    }
    return userId === targetUserId;
  }

  return false;
}
```

---

## 5. 이메일 템플릿 설계

### 5.1 가입 완료 이메일

**제목**: "🎓 AJU E&J 학생관리 시스템 가입을 환영합니다!"

**본문**:
```
안녕하세요, [학생 이름]님!

AJU E&J 학생관리 시스템에 가입해주셔서 감사합니다.

■ 로그인 정보
- 로그인 ID: [LoginID]
- 이메일: [Email]

아래 링크에서 로그인하실 수 있습니다:
[웹앱 URL]

■ 주요 기능
- 본인 정보 조회 및 수정
- TOPIK 시험 성적 확인
- 상담 기록 확인
- 목표 대학 관리

문의사항이 있으시면 [관리자 이메일]로 연락주세요.

감사합니다.
AJU E&J 드림
```

### 5.2 정기 개인정보 이용 알림

**제목**: "[중요] 개인정보 이용 현황 안내"

**본문**:
```
안녕하세요, [학생 이름]님!

「개인정보보호법」에 따라 귀하의 개인정보 이용 현황을 안내드립니다.

■ 수집된 개인정보 항목
- 필수: 이름, 생년월일, 성별, 전화번호, 이메일, 주소
- 선택: 학부모 정보, 학업 정보

■ 개인정보 이용 목적
- 학생 학업 관리 및 지원
- 상담 및 진로 지도
- TOPIK 시험 성적 관리
- 유학 행정 업무 지원

■ 개인정보 보유 기간
- 회원 탈퇴 시까지 또는 법령에 따른 보존 기간

■ 개인정보 열람 및 수정
[웹앱 URL]에서 언제든지 열람 및 수정하실 수 있습니다.

■ 개인정보 이용 동의 철회
더 이상 개인정보 이용을 원하지 않으시면 [관리자 이메일]로 연락주세요.

감사합니다.
AJU E&J 드림

---
본 메일은 개인정보보호법 제39조의8에 따라 발송되었습니다.
```

### 5.3 비밀번호 재설정 이메일

**제목**: "🔒 AJU E&J 임시 비밀번호 안내"

**본문**:
```
안녕하세요, [학생 이름]님!

비밀번호 재설정 요청에 따라 임시 비밀번호를 발급해드립니다.

■ 임시 비밀번호
[TEMP_PASSWORD]

아래 링크에서 로그인하신 후 반드시 비밀번호를 변경해주세요:
[웹앱 URL]

본인이 요청하지 않은 경우 즉시 [관리자 이메일]로 연락주세요.

감사합니다.
AJU E&J 드림
```

---

## 6. 개인정보보호법 준수 체크리스트

### 6.1 필수 준수 사항

- [x] **개인정보 수집 동의** (회원가입 시)
  - 수집 항목 명시
  - 이용 목적 명시
  - 보유 기간 명시
  - 동의 거부 권리 및 불이익 안내

- [x] **정기적 이용 알림** (6개월마다)
  - 수집된 정보 항목
  - 이용 목적
  - 보유 기간
  - 열람/수정/삭제 방법

- [x] **개인정보 열람/수정 권리**
  - 학생이 본인 정보 조회 가능
  - 학생이 본인 정보 수정 가능
  - 정보 다운로드 가능 (Excel)

- [x] **개인정보 삭제 요구권**
  - 회원 탈퇴 시 즉시 삭제 (또는 별도 보관)
  - 법령에 따른 보존 기간 준수

- [x] **개인정보 암호화**
  - 비밀번호: SHA-256 해시
  - 학부모 경제 상황: AES-256 암호화

- [x] **개인정보 유출 방지**
  - 역할별 권한 제한
  - 감사 로그 기록
  - HTTPS 암호화 통신

### 6.2 법적 근거

- 「개인정보보호법」 제15조 (개인정보의 수집·이용)
- 「개인정보보호법」 제17조 (개인정보의 제공)
- 「개인정보보호법」 제35조 (개인정보의 열람)
- 「개인정보보호법」 제36조 (개인정보의 정정·삭제)
- 「개인정보보호법」 제39조의8 (개인정보 이용내역의 통지)

---

## 7. 기술 스택 (변경 없음)

| 항목 | 선택 | 이유 |
|------|------|------|
| Backend | Google Apps Script (JavaScript) | 서버리스, 무료, Sheets 네이티브 |
| Database | Google Sheets | 무료, 실시간 동기화, Excel 호환 |
| Frontend | HTML5 + CSS + Vanilla JS | GAS HtmlService 네이티브 |
| 이메일 | GmailApp (GAS 내장) | 무료, 별도 SMTP 불필요 |
| 암호화 | Utilities.computeDigest (GAS 내장) | SHA-256 해시 |
| 트리거 | GAS Time-driven Trigger | 정기 알림 자동화 |

---

## 8. 개발 로드맵 (10단계)

### Phase 1: 데이터베이스 재설계 (1-2일)
- [ ] Users 시트 생성 및 스키마 정의
- [ ] PrivacyConsents 시트 생성
- [ ] EmailLogs 시트 생성
- [ ] Students/Agencies 시트 수정 (UserID FK 추가)
- [ ] 기존 데이터 마이그레이션 스크립트 작성

### Phase 2: 인증 시스템 구축 (2-3일)
- [ ] Users 기반 로그인 함수 (login, logout, checkSession)
- [ ] 역할별 권한 검증 함수 (checkPermission)
- [ ] 비밀번호 해시/검증 함수
- [ ] 세션 관리 (CacheService)

### Phase 3: 학생 회원가입 시스템 (3-4일)
- [ ] 회원가입 UI (Signup.html)
  - 학생 정보 입력 폼
  - 계정 정보 입력 (ID/Email/비밀번호)
  - 개인정보 동의 체크박스
  - 이메일 인증 (6자리 코드)
- [ ] 회원가입 API (StudentService.gs)
  - 중복 체크 (LoginID, Email)
  - Users/Students 시트 데이터 생성
  - PrivacyConsents 기록
  - 가입 완료 이메일 발송

### Phase 4: ID/비밀번호 찾기 (1-2일)
- [ ] ID 찾기 UI (FindId.html)
- [ ] 비밀번호 재설정 UI (ResetPassword.html)
- [ ] ID 찾기 API (findLoginId)
- [ ] 비밀번호 재설정 API (resetPassword)
- [ ] 임시 비밀번호 생성 함수

### Phase 5: 이메일 시스템 (2-3일)
- [ ] 이메일 발송 함수 (sendEmail)
- [ ] 이메일 템플릿 관리 (EmailTemplates.gs)
  - 가입 완료
  - 정기 개인정보 알림
  - 비밀번호 재설정
  - ID 찾기
- [ ] EmailLogs 기록 함수
- [ ] 이메일 발송 실패 재시도 로직

### Phase 6: 정기 알림 시스템 (1-2일)
- [ ] 정기 개인정보 알림 함수 (sendPrivacyNotice)
- [ ] 동의 만료 알림 함수 (sendConsentRenewal)
- [ ] GAS Time-driven Trigger 설정 (매월 1일)
- [ ] 대량 발송 최적화 (Batch 처리)

### Phase 7: 역할별 대시보드 UI (3-4일)
- [ ] 마스터 대시보드 (Master.html)
  - 전체 학생 목록
  - 유학원 관리
  - 통계 대시보드
- [ ] 유학원 대시보드 (Agency.html)
  - 소속 학생 목록
  - 상담 기록 관리
  - 시험 성적 관리
- [ ] 학생 대시보드 (Student.html)
  - 본인 정보 조회/수정
  - TOPIK 성적 확인
  - 상담 기록 확인

### Phase 8: 개인정보 관리 기능 (2-3일)
- [ ] 개인정보 동의 내역 조회
- [ ] 개인정보 다운로드 (Excel)
- [ ] 개인정보 수정 이력 조회
- [ ] 개인정보 이용 동의 갱신
- [ ] 회원 탈퇴 기능

### Phase 9: 테스트 및 검증 (2-3일)
- [ ] 단위 테스트 (각 함수별)
- [ ] 통합 테스트 (전체 플로우)
- [ ] 권한 테스트 (역할별)
- [ ] 이메일 발송 테스트
- [ ] 개인정보보호법 준수 검증

### Phase 10: 배포 및 문서화 (1-2일)
- [ ] 사용자 매뉴얼 작성 (학생/유학원/마스터)
- [ ] 개인정보 처리방침 작성
- [ ] 이용약관 작성
- [ ] GAS 웹앱 배포
- [ ] 최종 테스트 및 사용자 교육

**총 예상 기간**: 18-28일 (약 1개월)

---

## 9. 다음 단계

1. **데이터베이스 스키마 최종 확인**
   - Users 시트 구조 검토
   - PrivacyConsents 시트 구조 검토
   - 기존 데이터 마이그레이션 계획 수립

2. **개인정보 처리방침 작성**
   - 법무 검토 필요
   - 변호사 자문 권장

3. **개발 착수**
   - Phase 1부터 순차적으로 진행
   - 각 Phase 완료 시 검증 후 다음 Phase 진행

---

**작성자**: Claude AI
**검토자**: 사용자 (duyang22@gmail.com)
**승인 상태**: 검토 대기
