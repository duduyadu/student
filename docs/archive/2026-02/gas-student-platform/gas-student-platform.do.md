# GAS Student Platform - Implementation Guide (Do Phase)

> **Summary**: Google Apps Script 기반 베트남 유학생 관리 플랫폼 구현 가이드
>
> **Project**: AJU E&J 학생관리프로그램
> **Phase**: Do (Implementation)
> **Started**: 2026-02-10
> **Estimated Duration**: 17 days
> **Design Doc**: [gas-student-platform.design.md](../02-design/features/gas-student-platform.design.md)

---

## 📋 Implementation Overview

### Total Implementation Plan

| Phase | Duration | Files | Key Features |
|-------|----------|-------|--------------|
| Phase 1 | 1 day | Setup | GAS 프로젝트, Spreadsheet, 8개 시트 |
| Phase 2 | 2 days | 4 files | Config, Helpers, I18n 기초 |
| Phase 3 | 2 days | 2 files | Auth 시스템, 로그인 |
| Phase 4 | 3 days | 4 files | 학생 CRUD, 감사 로그 |
| Phase 5 | 2 days | 4 files | 상담, 시험 관리 |
| Phase 6 | 2 days | 2 files | 행정 정보, 알림 |
| Phase 7 | 2 days | 4 files | UI 완성, 스타일링 |
| Phase 8 | 2 days | Testing | 통합 테스트 |
| Phase 9 | 1 day | Deploy | 배포 |
| **Total** | **17 days** | **22 files** | **Full System** |

---

## 🚀 Phase 1: 개발 환경 설정 (1일)

### 1.1 Google Apps Script 프로젝트 생성

**Steps:**

1. **Google Drive 접속**
   - https://drive.google.com 이동
   - 새로 만들기 → 더보기 → Google Apps Script 클릭

2. **프로젝트 이름 설정**
   - 프로젝트명: `AJU E&J Student Management`
   - 저장 위치: Google Drive 루트 또는 전용 폴더

3. **초기 파일 확인**
   - `Code.gs` 파일이 자동 생성됨
   - 기본 `myFunction()` 삭제

### 1.2 Google Spreadsheet 생성 및 연결

**Steps:**

1. **새 Spreadsheet 생성**
   - Google Sheets → 새로 만들기
   - 이름: `AJU E&J Student DB`

2. **Spreadsheet ID 확인**
   ```
   URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit

   예시:
   https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j/edit
   → SPREADSHEET_ID: 1a2b3c4d5e6f7g8h9i0j
   ```

3. **Script Properties에 저장**
   - GAS 프로젝트 → 프로젝트 설정 (⚙️) → 스크립트 속성
   - 속성 추가:
     - `SPREADSHEET_ID`: `{복사한 ID}`
     - `MASTER_SALT`: `{랜덤 문자열 32자 이상}` (비밀번호 해시용)

   **MASTER_SALT 생성 예시:**
   ```javascript
   // 임시로 Code.gs에서 실행
   function generateSalt() {
     const salt = Utilities.getUuid() + Utilities.getUuid();
     Logger.log('MASTER_SALT: ' + salt);
   }
   ```

### 1.3 필수 시트 생성 (8개)

**Spreadsheet에서 다음 시트 생성:**

#### 1. Students 시트

| StudentID | NameKR | NameVN | DOB | Gender | AgencyCode | ... |
|-----------|--------|--------|-----|--------|------------|-----|
| 25-AJU-001 | 홍길동 | Nguyen Van A | 2005-03-15 | M | AJU | ... |

**컬럼 (21개):**
- StudentID, NameKR, NameVN, DOB, Gender, AgencyCode
- HomeAddressVN, PhoneKR, PhoneVN, Email
- ParentNameVN, ParentPhoneVN, ParentEconomic (암호화)
- HighSchoolGPA, EnrollmentDate, Status
- CreatedBy, CreatedAt, UpdatedBy, UpdatedAt, IsActive

#### 2. Agencies 시트

| AgencyCode | AgencyName | Role | LoginID | PasswordHash | ... |
|------------|------------|------|---------|--------------|-----|
| MASTER | 마스터 관리자 | master | admin | {해시값} | ... |
| AJU | 아주대학교 유학원 | agency | aju_teacher | {해시값} | ... |

**컬럼 (8개):**
- AgencyCode, AgencyName, Role (master/agency/branch)
- LoginID, PasswordHash, IsActive, LoginAttempts, LastLogin

#### 3. AuditLogs 시트

| Timestamp | UserId | Action | TargetSheet | TargetId | Details | IP | ... |
|-----------|--------|--------|-------------|----------|---------|----|----|
| 2026-02-10 14:00:00 | admin | LOGIN | N/A | N/A | Login success | 127.0.0.1 | ... |

**컬럼 (10개):**
- Timestamp, UserId, Action, TargetSheet, TargetId
- Details, IP, SessionId, ErrorMessage, IsSuccess

#### 4. SystemConfig 시트

| ConfigKey | ConfigValue | Description |
|-----------|-------------|-------------|
| copyright_text | © 2026 AJU E&J | 저작권 표시 |
| session_timeout | 3600 | 세션 만료 시간 (초) |
| max_login_attempts | 5 | 최대 로그인 시도 횟수 |

**컬럼 (5개):**
- ConfigKey, ConfigValue, Description, UpdatedBy, UpdatedAt

#### 5. i18n 시트

| Key | Korean | Vietnamese | Category |
|-----|--------|------------|----------|
| btn_save | 저장 | Lưu | btn_ |
| btn_cancel | 취소 | Hủy | btn_ |
| label_name_kr | 한국 이름 | Tên Hàn Quốc | label_ |

**컬럼 (5개):**
- Key, Korean, Vietnamese, Category, UpdatedAt

**초기 데이터 (최소 60개 키 입력 필요)** - Design 문서 Section 5 참조

#### 6. Consultations 시트

| ConsultationID | StudentID | ConsultDate | ConsultType | ConsultantId | Summary | ... |
|----------------|-----------|-------------|-------------|--------------|---------|-----|
| C-001 | 25-AJU-001 | 2026-02-10 | regular | aju_teacher | 첫 상담 | ... |

**컬럼:**
- ConsultationID, StudentID, ConsultDate, ConsultType (regular/irregular)
- ConsultantId, Summary, ImprovementArea, NextGoal
- CreatedBy, CreatedAt, UpdatedBy, UpdatedAt

#### 7. ExamResults 시트

| ExamResultID | StudentID | ExamDate | ExamType | Listening | Reading | Writing | TotalScore | Grade |
|--------------|-----------|----------|----------|-----------|---------|---------|------------|-------|
| E-001 | 25-AJU-001 | 2026-01-15 | TOPIK | 80 | 85 | 75 | 240 | 4급 |

**컬럼:**
- ExamResultID, StudentID, ExamDate, ExamType
- Listening, Reading, Writing, TotalScore, Grade
- CreatedBy, CreatedAt

#### 8. TargetHistory 시트

| HistoryID | StudentID | ChangedDate | TargetUniversityKR | TargetUniversityVN | TargetMajorKR | ... |
|-----------|-----------|-------------|--------------------|--------------------|---------------|-----|
| H-001 | 25-AJU-001 | 2026-02-01 | 서울대학교 | Seoul National Univ | 경영학과 | ... |

**컬럼:**
- HistoryID, StudentID, ChangedDate
- TargetUniversityKR, TargetUniversityVN
- TargetMajorKR, TargetMajorVN
- ChangedBy, ChangedAt

### 1.4 Phase 1 완료 체크리스트

- [ ] GAS 프로젝트 생성 완료
- [ ] Spreadsheet ID 확인 및 Script Properties 저장
- [ ] MASTER_SALT 생성 및 저장
- [ ] 8개 시트 생성 (Students, Agencies, AuditLogs, SystemConfig, i18n, Consultations, ExamResults, TargetHistory)
- [ ] 각 시트의 컬럼명이 Design 문서와 일치하는지 확인
- [ ] Agencies 시트에 MASTER 계정 1개 추가 (비밀번호: 임시값)

---

## 🔧 Phase 2: 기초 모듈 구현 (2일)

### 2.1 Config.gs 구현

**File**: `Config.gs`

**주요 함수:**

```javascript
// 상수 정의
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
const MASTER_SALT = PropertiesService.getScriptProperties().getProperty('MASTER_SALT');
const SESSION_TIMEOUT = 3600; // 1시간 (초)
const CACHE_TTL = 300; // 5분 (초)

// 시트 이름 상수
const SHEETS = {
  STUDENTS: 'Students',
  AGENCIES: 'Agencies',
  AUDIT_LOGS: 'AuditLogs',
  SYSTEM_CONFIG: 'SystemConfig',
  I18N: 'i18n',
  CONSULTATIONS: 'Consultations',
  EXAM_RESULTS: 'ExamResults',
  TARGET_HISTORY: 'TargetHistory'
};

/**
 * 시트 객체 가져오기
 * @param {string} sheetName - 시트 이름
 * @returns {Sheet} Sheet 객체
 */
function _getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  return sheet;
}

/**
 * 시트의 모든 데이터를 객체 배열로 변환
 * @param {string} sheetName - 시트 이름
 * @returns {Array<Object>} 데이터 배열
 */
function _getAllRows(sheetName) {
  const sheet = _getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return []; // 헤더만 있거나 빈 시트

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * 단일 행 추가
 * @param {string} sheetName - 시트 이름
 * @param {Object} rowData - 행 데이터 객체
 */
function _appendRow(sheetName, rowData) {
  const sheet = _getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const row = headers.map(header => rowData[header] || '');
  sheet.appendRow(row);
}

/**
 * 특정 조건의 행 업데이트
 * @param {string} sheetName - 시트 이름
 * @param {string} keyColumn - 검색 컬럼명
 * @param {*} keyValue - 검색 값
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {boolean} 성공 여부
 */
function _updateRow(sheetName, keyColumn, keyValue, updateData) {
  const sheet = _getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) return false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIndex] === keyValue) {
      // 업데이트할 컬럼들 적용
      Object.keys(updateData).forEach(col => {
        const colIndex = headers.indexOf(col);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(updateData[col]);
        }
      });
      return true;
    }
  }
  return false;
}

/**
 * 특정 조건의 행 삭제 (IsActive = false로 설정)
 * @param {string} sheetName - 시트 이름
 * @param {string} keyColumn - 검색 컬럼명
 * @param {*} keyValue - 검색 값
 * @returns {boolean} 성공 여부
 */
function _softDeleteRow(sheetName, keyColumn, keyValue) {
  return _updateRow(sheetName, keyColumn, keyValue, { IsActive: false });
}
```

### 2.2 Helpers.gs 구현

**File**: `Helpers.gs`

**주요 함수:**

```javascript
/**
 * Smart ID 생성 (YY-AGENCY-SEQ)
 * @param {string} agencyCode - 유학원 코드
 * @returns {string} Smart ID (예: 25-AJU-001)
 */
function generateSmartId(agencyCode) {
  const year = new Date().getFullYear().toString().slice(-2); // 26

  // 같은 유학원의 학생 수 조회
  const students = _getAllRows(SHEETS.STUDENTS);
  const sameAgency = students.filter(s => s.AgencyCode === agencyCode);
  const seq = (sameAgency.length + 1).toString().padStart(3, '0'); // 001, 002, ...

  return `${year}-${agencyCode}-${seq}`;
}

/**
 * 비밀번호 해시 (SHA-256 + Salt)
 * @param {string} password - 평문 비밀번호
 * @returns {string} 해시값
 */
function hashPassword(password) {
  const saltedPassword = password + MASTER_SALT;
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    saltedPassword,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64Encode(hash);
}

/**
 * 민감 데이터 암호화 (AES)
 * @param {string} plainText - 평문
 * @returns {string} Base64 인코딩된 암호문
 */
function encryptData(plainText) {
  if (!plainText) return '';

  // MASTER_SALT를 암호화 키로 사용 (32바이트)
  const keyBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    MASTER_SALT,
    Utilities.Charset.UTF_8
  );

  // AES 암호화 (GAS는 기본 AES 지원하지 않으므로 간단한 XOR 방식 사용)
  // 실제 운영에서는 외부 라이브러리 사용 권장
  const encrypted = _simpleEncrypt(plainText, keyBytes);
  return Utilities.base64Encode(encrypted);
}

/**
 * 민감 데이터 복호화
 * @param {string} cipherText - Base64 암호문
 * @returns {string} 평문
 */
function decryptData(cipherText) {
  if (!cipherText) return '';

  const keyBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    MASTER_SALT,
    Utilities.Charset.UTF_8
  );

  const encrypted = Utilities.base64Decode(cipherText);
  return _simpleDecrypt(encrypted, keyBytes);
}

/**
 * 간단한 XOR 암호화 (내부 함수)
 */
function _simpleEncrypt(text, keyBytes) {
  const textBytes = Utilities.newBlob(text).getBytes();
  const result = [];

  for (let i = 0; i < textBytes.length; i++) {
    result.push(textBytes[i] ^ keyBytes[i % keyBytes.length]);
  }

  return result;
}

/**
 * 간단한 XOR 복호화 (내부 함수)
 */
function _simpleDecrypt(encryptedBytes, keyBytes) {
  const result = [];

  for (let i = 0; i < encryptedBytes.length; i++) {
    result.push(encryptedBytes[i] ^ keyBytes[i % keyBytes.length]);
  }

  return Utilities.newBlob(result).getDataAsString();
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD HH:mm:ss)
 * @param {Date} date - Date 객체
 * @returns {string} 포맷된 문자열
 */
function formatDate(date) {
  if (!date) return '';

  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}

/**
 * 현재 시간 반환 (KST)
 * @returns {string} YYYY-MM-DD HH:mm:ss
 */
function getCurrentTimestamp() {
  return formatDate(new Date());
}

/**
 * UUID 생성
 * @returns {string} UUID
 */
function generateUUID() {
  return Utilities.getUuid();
}
```

### 2.3 I18nService.gs 구현

**File**: `I18nService.gs`

**주요 함수:**

```javascript
/**
 * 특정 언어의 모든 i18n 문자열 가져오기
 * @param {string} locale - 'ko' 또는 'vi'
 * @returns {Object} {success: boolean, data?: Object, error?: string}
 */
function getLocaleStrings(locale) {
  try {
    if (locale !== 'ko' && locale !== 'vi') {
      return { success: false, errorKey: 'err_invalid_locale' };
    }

    // 캐시 확인
    const cache = CacheService.getScriptCache();
    const cacheKey = 'i18n_' + locale;
    const cached = cache.get(cacheKey);

    if (cached) {
      return { success: true, data: JSON.parse(cached) };
    }

    // i18n 시트 읽기
    const i18nData = _loadI18nSheet(locale);

    // 캐시 저장 (5분)
    cache.put(cacheKey, JSON.stringify(i18nData), CACHE_TTL);

    return { success: true, data: i18nData };

  } catch (e) {
    Logger.log('ERROR in getLocaleStrings: ' + e.message);
    return { success: false, errorKey: 'err_i18n_load' };
  }
}

/**
 * i18n 시트 로드 (Private)
 * @param {string} locale - 'ko' 또는 'vi'
 * @returns {Object} Key-Value 객체
 */
function _loadI18nSheet(locale) {
  const sheet = _getSheet(SHEETS.I18N);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return {};

  const headers = data[0]; // ['Key', 'Korean', 'Vietnamese', 'Category', 'UpdatedAt']
  const keyIndex = headers.indexOf('Key');
  const langIndex = locale === 'ko' ? headers.indexOf('Korean') : headers.indexOf('Vietnamese');

  const result = {};

  for (let i = 1; i < data.length; i++) {
    const key = data[i][keyIndex];
    const value = data[i][langIndex];
    if (key && value) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * i18n 캐시 무효화
 */
function invalidateI18nCache() {
  const cache = CacheService.getScriptCache();
  cache.remove('i18n_ko');
  cache.remove('i18n_vi');
}
```

### 2.4 i18n 시트 초기 데이터 입력

**최소 60개 키 입력 (Design 문서 Section 5 참조)**

예시:
```
Key                    | Korean         | Vietnamese        | Category
-----------------------|----------------|-------------------|----------
btn_save               | 저장           | Lưu               | btn_
btn_cancel             | 취소           | Hủy               | btn_
btn_delete             | 삭제           | Xóa               | btn_
btn_edit               | 수정           | Sửa               | btn_
btn_add                | 추가           | Thêm              | btn_
btn_search             | 검색           | Tìm kiếm          | btn_
btn_export             | 엑셀 다운로드  | Tải xuống Excel   | btn_
btn_login              | 로그인         | Đăng nhập         | btn_
btn_logout             | 로그아웃       | Đăng xuất         | btn_
label_name_kr          | 한국 이름      | Tên Hàn Quốc      | label_
label_name_vn          | 베트남 이름    | Tên Việt Nam      | label_
label_dob              | 생년월일       | Ngày sinh         | label_
label_gender           | 성별           | Giới tính         | label_
label_agency           | 소속 유학원    | Văn phòng         | label_
err_required_field     | 필수 입력 항목 | Trường bắt buộc   | err_
err_login_failed       | 로그인 실패    | Đăng nhập thất bại| err_
err_session_expired    | 세션 만료      | Phiên hết hạn     | err_
err_permission_denied  | 권한 없음      | Không có quyền    | err_
msg_save_success       | 저장 완료      | Lưu thành công    | msg_
msg_delete_confirm     | 삭제하시겠습니까? | Bạn có chắc xóa? | msg_
... (총 60개 이상)
```

### 2.5 Phase 2 완료 체크리스트

- [ ] `Config.gs` 구현 완료
- [ ] `_getSheet()`, `_getAllRows()`, `_appendRow()`, `_updateRow()` 테스트
- [ ] `Helpers.gs` 구현 완료
- [ ] `generateSmartId()` 테스트 (예: 26-AJU-001)
- [ ] `hashPassword()` 테스트 (같은 비밀번호 → 같은 해시)
- [ ] `encryptData()`, `decryptData()` 테스트
- [ ] `I18nService.gs` 구현 완료
- [ ] `getLocaleStrings('ko')` 테스트 (캐시 확인)
- [ ] i18n 시트에 최소 60개 키 입력 완료

---

## 🔐 Phase 3: 인증 시스템 (2일)

### 3.1 Auth.gs 구현

**File**: `Auth.gs`

**주요 함수:**

```javascript
/**
 * 로그인
 * @param {string} loginId - 로그인 ID
 * @param {string} password - 비밀번호
 * @returns {Object} {success: boolean, data?: {sessionId, user}, error?: string}
 */
function login(loginId, password) {
  try {
    // 1. 사용자 조회
    const agencies = _getAllRows(SHEETS.AGENCIES);
    let user = null;

    for (let i = 0; i < agencies.length; i++) {
      if (agencies[i].LoginID === loginId && agencies[i].IsActive === true) {
        user = agencies[i];
        break;
      }
    }

    if (!user) {
      _saveAuditLog('SYSTEM', 'LOGIN_FAIL', 'Agencies', loginId, 'User not found');
      return { success: false, errorKey: 'err_login_failed' };
    }

    // 2. 비밀번호 검증
    const hashedInput = hashPassword(password);

    if (hashedInput !== user.PasswordHash) {
      // 로그인 시도 횟수 증가
      _updateRow(SHEETS.AGENCIES, 'LoginID', loginId, {
        LoginAttempts: user.LoginAttempts + 1
      });

      _saveAuditLog(loginId, 'LOGIN_FAIL', 'Agencies', loginId, 'Invalid password');
      return { success: false, errorKey: 'err_login_failed' };
    }

    // 3. 로그인 시도 횟수 초과 확인
    if (user.LoginAttempts >= 5) {
      _saveAuditLog(loginId, 'LOGIN_FAIL', 'Agencies', loginId, 'Max attempts exceeded');
      return { success: false, errorKey: 'err_max_attempts' };
    }

    // 4. 세션 생성
    const sessionId = _createSession(user);

    // 5. 로그인 성공 처리
    _updateRow(SHEETS.AGENCIES, 'LoginID', loginId, {
      LoginAttempts: 0,
      LastLogin: getCurrentTimestamp()
    });

    _saveAuditLog(loginId, 'LOGIN', 'Agencies', loginId, 'Login success');

    return {
      success: true,
      data: {
        sessionId: sessionId,
        user: {
          loginId: user.LoginID,
          agencyCode: user.AgencyCode,
          agencyName: user.AgencyNameKR,
          role: user.Role
        }
      }
    };

  } catch (e) {
    Logger.log('ERROR in login: ' + e.message);
    return { success: false, errorKey: 'err_unknown' };
  }
}

/**
 * 로그아웃
 * @returns {Object} {success: boolean}
 */
function logout() {
  try {
    const session = _validateSession();

    // 세션 삭제
    const cache = CacheService.getUserCache();
    cache.remove('SESSION');

    _saveAuditLog(session.loginId, 'LOGOUT', 'N/A', 'N/A', 'Logout success');

    return { success: true };

  } catch (e) {
    return { success: false, errorKey: 'err_session_expired' };
  }
}

/**
 * 세션 생성 (Private)
 * @param {Object} user - 사용자 정보
 * @returns {string} sessionId
 */
function _createSession(user) {
  const sessionId = generateUUID();

  const sessionData = {
    sessionId: sessionId,
    loginId: user.LoginID,
    agencyCode: user.AgencyCode,
    role: user.Role,
    createdAt: new Date().getTime()
  };

  const cache = CacheService.getUserCache();
  cache.put('SESSION', JSON.stringify(sessionData), SESSION_TIMEOUT);

  return sessionId;
}

/**
 * 세션 검증 (Private)
 * @returns {Object} session 객체
 * @throws {Error} 세션 없거나 만료 시
 */
function _validateSession() {
  const cache = CacheService.getUserCache();
  const sessionData = cache.get('SESSION');

  if (!sessionData) {
    const error = new Error('Session expired');
    error.errorKey = 'err_session_expired';
    throw error;
  }

  return JSON.parse(sessionData);
}

/**
 * 권한 검증 (Private)
 * @param {Object} session - 세션 객체
 * @param {string} action - 'READ', 'CREATE', 'UPDATE', 'DELETE'
 * @param {string} sheet - 시트 이름
 * @param {string} targetId - 대상 ID (optional)
 * @throws {Error} 권한 없을 시
 */
function _validatePermission(session, action, sheet, targetId) {
  // master는 모든 권한 허용
  if (session.role === 'master') return;

  // branch는 모든 시트 READ/CREATE/UPDATE 가능 (DELETE 제외)
  if (session.role === 'branch') {
    if (action === 'DELETE') {
      const error = new Error('Permission denied');
      error.errorKey = 'err_permission_denied';
      throw error;
    }
    return;
  }

  // agency는 자기 소속 학생만 접근 가능
  if (session.role === 'agency') {
    if (sheet === SHEETS.STUDENTS || sheet === SHEETS.CONSULTATIONS || sheet === SHEETS.EXAM_RESULTS) {
      if (targetId) {
        // targetId가 자기 소속 학생인지 확인
        const record = _getRecordById(sheet, targetId);
        if (record && record.AgencyCode !== session.agencyCode) {
          const error = new Error('Permission denied');
          error.errorKey = 'err_permission_denied';
          throw error;
        }
      }
    } else if (sheet === SHEETS.AGENCIES) {
      // 자기 정보만 READ/UPDATE 가능
      if (action !== 'READ' && action !== 'UPDATE') {
        const error = new Error('Permission denied');
        error.errorKey = 'err_permission_denied';
        throw error;
      }
    } else {
      // 다른 시트 접근 불가
      const error = new Error('Permission denied');
      error.errorKey = 'err_permission_denied';
      throw error;
    }
  }
}

/**
 * 특정 ID로 레코드 조회 (Private)
 * @param {string} sheet - 시트 이름
 * @param {string} targetId - 대상 ID
 * @returns {Object|null} 레코드 객체 또는 null
 */
function _getRecordById(sheet, targetId) {
  const rows = _getAllRows(sheet);

  // StudentID, ConsultationID, ExamResultID 등 ID 컬럼 찾기
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.StudentID === targetId ||
        row.ConsultationID === targetId ||
        row.ExamResultID === targetId) {
      return row;
    }
  }

  return null;
}
```

### 3.2 AuditService.gs 구현

**File**: `AuditService.gs`

**주요 함수:**

```javascript
/**
 * 감사 로그 저장
 * @param {string} userId - 사용자 ID
 * @param {string} action - 액션 (LOGIN, CREATE, READ, UPDATE, DELETE 등)
 * @param {string} targetSheet - 대상 시트
 * @param {string} targetId - 대상 ID
 * @param {string} details - 상세 정보 (optional)
 */
function _saveAuditLog(userId, action, targetSheet, targetId, details) {
  try {
    const logData = {
      Timestamp: getCurrentTimestamp(),
      UserId: userId || 'SYSTEM',
      Action: action,
      TargetSheet: targetSheet || 'N/A',
      TargetId: targetId || 'N/A',
      Details: details || '',
      IP: Session.getActiveUser().getEmail() || 'N/A', // GAS에서는 IP 직접 가져올 수 없음
      SessionId: _getSessionId(),
      ErrorMessage: '',
      IsSuccess: true
    };

    _appendRow(SHEETS.AUDIT_LOGS, logData);

  } catch (e) {
    Logger.log('ERROR in _saveAuditLog: ' + e.message);
    // 감사 로그 저장 실패는 무시 (무한 루프 방지)
  }
}

/**
 * 현재 세션 ID 가져오기 (Private)
 * @returns {string} sessionId 또는 'N/A'
 */
function _getSessionId() {
  try {
    const cache = CacheService.getUserCache();
    const sessionData = cache.get('SESSION');
    if (sessionData) {
      return JSON.parse(sessionData).sessionId;
    }
  } catch (e) {
    // ignore
  }
  return 'N/A';
}

/**
 * 감사 로그 조회
 * @param {Object} filters - {userId?, action?, startDate?, endDate?}
 * @returns {Object} {success: boolean, data?: Array, error?: string}
 */
function getAuditLogs(filters) {
  try {
    const session = _validateSession();
    _validatePermission(session, 'READ', SHEETS.AUDIT_LOGS);

    let logs = _getAllRows(SHEETS.AUDIT_LOGS);

    // 필터 적용
    if (filters.userId) {
      logs = logs.filter(log => log.UserId === filters.userId);
    }
    if (filters.action) {
      logs = logs.filter(log => log.Action === filters.action);
    }
    if (filters.startDate) {
      logs = logs.filter(log => log.Timestamp >= filters.startDate);
    }
    if (filters.endDate) {
      logs = logs.filter(log => log.Timestamp <= filters.endDate);
    }

    // 최신순 정렬
    logs.sort((a, b) => b.Timestamp.localeCompare(a.Timestamp));

    // 최대 1000개로 제한
    logs = logs.slice(0, 1000);

    return { success: true, data: logs };

  } catch (e) {
    Logger.log('ERROR in getAuditLogs: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

### 3.3 Login.html 구현

**File**: `Login.html`

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('Stylesheet'); ?>
  <style>
    .login-container {
      max-width: 400px;
      margin: 100px auto;
      padding: 40px;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .login-title {
      text-align: center;
      margin-bottom: 30px;
      font-size: 24px;
      font-weight: bold;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .form-input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .btn-login {
      width: 100%;
      padding: 12px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
    }
    .btn-login:hover {
      background-color: #45a049;
    }
    .error-message {
      color: red;
      text-align: center;
      margin-top: 10px;
      display: none;
    }
    .lang-toggle {
      text-align: right;
      margin-bottom: 20px;
    }
    .lang-btn {
      background: none;
      border: none;
      color: #2196F3;
      cursor: pointer;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="lang-toggle">
      <button class="lang-btn" onclick="switchLanguage('ko')">한국어</button> |
      <button class="lang-btn" onclick="switchLanguage('vi')">Tiếng Việt</button>
    </div>

    <h1 class="login-title" data-i18n="title_login">로그인</h1>

    <form id="login-form" onsubmit="handleLogin(event)">
      <div class="form-group">
        <label class="form-label" data-i18n="label_login_id">로그인 ID</label>
        <input type="text" id="login-id" class="form-input" data-placeholder-i18n="placeholder_login_id" required>
      </div>

      <div class="form-group">
        <label class="form-label" data-i18n="label_password">비밀번호</label>
        <input type="password" id="password" class="form-input" data-placeholder-i18n="placeholder_password" required>
      </div>

      <button type="submit" class="btn-login" data-i18n="btn_login">로그인</button>
    </form>

    <div class="error-message" id="error-message"></div>
  </div>

  <?!= include('JavaScript'); ?>
  <?!= include('I18nClient'); ?>

  <script>
    let currentLang = 'ko';
    let i18nStrings = {};

    // 페이지 로드 시 i18n 로드
    window.onload = function() {
      loadI18n('ko');
    };

    // 언어 전환
    function switchLanguage(lang) {
      currentLang = lang;
      loadI18n(lang);
    }

    // i18n 로드
    function loadI18n(lang) {
      google.script.run
        .withSuccessHandler(function(response) {
          if (response.success) {
            i18nStrings = response.data;
            applyLanguage();
          }
        })
        .withFailureHandler(function(error) {
          console.error('i18n load error:', error);
        })
        .getLocaleStrings(lang);
    }

    // 언어 적용
    function applyLanguage() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = i18nStrings[key] || key;
      });

      document.querySelectorAll('[data-placeholder-i18n]').forEach(el => {
        const key = el.getAttribute('data-placeholder-i18n');
        el.placeholder = i18nStrings[key] || key;
      });
    }

    // 로그인 처리
    function handleLogin(event) {
      event.preventDefault();

      const loginId = document.getElementById('login-id').value;
      const password = document.getElementById('password').value;

      document.getElementById('error-message').style.display = 'none';

      google.script.run
        .withSuccessHandler(function(response) {
          if (response.success) {
            // 로그인 성공 → Index.html로 이동
            window.location.href = '<?= ScriptApp.getService().getUrl() ?>';
          } else {
            // 로그인 실패 → 에러 메시지 표시
            const errorKey = response.errorKey || 'err_unknown';
            const errorMessage = i18nStrings[errorKey] || 'Login failed';
            document.getElementById('error-message').textContent = errorMessage;
            document.getElementById('error-message').style.display = 'block';
          }
        })
        .withFailureHandler(function(error) {
          console.error('Login error:', error);
          document.getElementById('error-message').textContent = 'Network error';
          document.getElementById('error-message').style.display = 'block';
        })
        .login(loginId, password);
    }
  </script>
</body>
</html>
```

### 3.4 Code.gs doGet() 수정

**File**: `Code.gs`

```javascript
/**
 * 웹앱 진입점
 * @param {Object} e - 요청 파라미터
 * @returns {HtmlOutput} HTML 페이지
 */
function doGet(e) {
  // 세션 확인
  try {
    const session = _validateSession();
    // 세션 있음 → Index.html
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('AJU E&J 학생관리')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    // 세션 없음 → Login.html
    return HtmlService.createTemplateFromFile('Login')
      .evaluate()
      .setTitle('AJU E&J 로그인')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * HTML 파일 include 헬퍼
 * @param {string} filename - 파일명 (확장자 제외)
 * @returns {string} HTML 내용
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

### 3.5 Agencies 시트에 테스트 계정 추가

**테스트 계정 3개 추가:**

| AgencyCode | AgencyName | Role | LoginID | PasswordHash | IsActive | LoginAttempts | LastLogin |
|------------|------------|------|---------|--------------|----------|---------------|-----------|
| MASTER | 마스터 관리자 | master | admin | {해시값} | TRUE | 0 | |
| AJU | 아주대 유학원 | agency | aju_teacher | {해시값} | TRUE | 0 | |
| BRANCH | 한국 지점 | branch | korea_branch | {해시값} | TRUE | 0 | |

**PasswordHash 생성 방법:**

```javascript
// Code.gs에 임시 함수 추가
function generateTestPasswords() {
  Logger.log('admin password: ' + hashPassword('admin123'));
  Logger.log('aju_teacher password: ' + hashPassword('aju123'));
  Logger.log('korea_branch password: ' + hashPassword('branch123'));
}

// 실행 → 로그 확인 → 해시값 복사 → Agencies 시트에 붙여넣기
```

### 3.6 Phase 3 완료 체크리스트

- [ ] `Auth.gs` 구현 완료
- [ ] `login()` 함수 테스트 (성공/실패 케이스)
- [ ] `logout()` 함수 테스트
- [ ] `_validateSession()` 테스트 (세션 만료 확인)
- [ ] `_validatePermission()` 테스트 (master/agency/branch 권한)
- [ ] `AuditService.gs` 구현 완료
- [ ] AuditLogs 시트에 로그 자동 기록 확인
- [ ] `Login.html` 구현 완료
- [ ] 로그인 페이지 UI 테스트 (한국어/베트남어 전환)
- [ ] Code.gs `doGet()` 수정 완료
- [ ] Agencies 시트에 테스트 계정 3개 추가
- [ ] 테스트 계정으로 로그인 성공 확인

---

## 📚 Phase 4: 학생 CRUD (3일)

### 4.1 StudentService.gs 구현

**Design 문서 Section 3.1 참조**

**주요 함수:**
- `getStudentList(filters)` - 학생 목록 조회 (권한별 필터링)
- `getStudentById(studentId)` - 학생 상세 조회
- `createStudent(studentData)` - 학생 등록
- `updateStudent(studentId, updateData)` - 학생 정보 수정
- `deleteStudent(studentId)` - 학생 삭제 (soft delete)

**구현 포인트:**
- Smart ID 자동 생성 (`generateSmartId()` 사용)
- `ParentEconomic` 필드 암호화 (`encryptData()` 사용)
- 권한별 필터링 (agency는 자기 소속만, branch는 전체)
- 모든 함수에 감사 로그 기록

### 4.2 Index.html 구현

**메인 SPA 컨테이너**

**구조:**
- 상단 네비게이션 (로고, 메뉴, 언어 전환, 로그아웃)
- 사이드바 (학생 관리, 상담 관리, 시험 관리, 행정 정보, 감사 로그)
- 메인 콘텐츠 영역 (동적 로드)

**기능:**
- SPA 라우팅 (해시 기반: `#students`, `#consultations` 등)
- 권한별 메뉴 표시/숨김
- 언어 전환 (한국어/베트남어)

### 4.3 StudentList.html 구현

**학생 목록 뷰**

**기능:**
- 학생 목록 테이블 (페이지네이션)
- 검색 (이름, 유학원, 상태)
- 필터링 (유학원, 상태)
- 정렬 (등록일, 이름)
- "학생 추가" 버튼
- 각 행에 "수정", "삭제" 버튼

### 4.4 StudentForm.html 구현

**학생 정보 입력/수정 폼**

**필드 (21개):**
- StudentID (자동 생성, 읽기 전용)
- 기본 정보 (NameKR, NameVN, DOB, Gender, AgencyCode)
- 연락처 (HomeAddressVN, PhoneKR, PhoneVN, Email)
- 학부모 (ParentNameVN, ParentPhoneVN, ParentEconomic)
- 학업 (HighSchoolGPA, EnrollmentDate, Status)

**기능:**
- 신규 등록 / 수정 모드
- 클라이언트 측 검증 (필수 필드, 형식)
- 서버 측 검증 (createStudent/updateStudent)

### 4.5 Phase 4 완료 체크리스트

- [ ] `StudentService.gs` 구현 완료
- [ ] `getStudentList()` 테스트 (권한별 필터링)
- [ ] `createStudent()` 테스트 (Smart ID 생성, 암호화)
- [ ] `updateStudent()` 테스트
- [ ] `deleteStudent()` 테스트 (soft delete 확인)
- [ ] `Index.html` 구현 완료
- [ ] 네비게이션, 사이드바, 라우팅 동작 확인
- [ ] `StudentList.html` 구현 완료
- [ ] 학생 목록 표시, 검색, 필터링, 정렬 테스트
- [ ] `StudentForm.html` 구현 완료
- [ ] 학생 등록/수정 폼 테스트 (암호화 확인)

---

## 📝 Phase 5-9 (간략)

### Phase 5: 상담 & 시험 관리 (2일)
- ConsultService.gs, ExamService.gs 구현
- ConsultForm.html, ExamForm.html 구현
- Design 문서 Section 3.2, 3.3 참조

### Phase 6: 행정 정보 & 알림 (2일)
- AdminService.gs, NotificationService.gs 구현
- 비자 만료 자동 체크 Trigger 설정
- Design 문서 Section 3.4, 3.5 참조

### Phase 7: UI 완성 (2일)
- Stylesheet.html, Components.html, ConsentModal.html 구현
- 반응형 디자인 (모바일 대응)
- Design 문서 Section 4 참조

### Phase 8: 통합 테스트 (2일)
- 권한별 시나리오 테스트 (master/agency/branch)
- 다국어 전환 테스트 (한국어/베트남어)
- 감사 로그 누락 확인
- 베트남어 특수문자 인코딩 테스트
- Design 문서 Section 7 참조

### Phase 9: 배포 (1일)
- GAS 웹앱 배포 (누구나 접근 가능)
- URL 획득 및 공유
- 사용자 매뉴얼 작성
- Design 문서 Section 8 참조

---

## 🧪 테스트 전략

### Unit Test (각 함수)
- Config.gs: `_getAllRows()`, `_appendRow()`, `_updateRow()`
- Helpers.gs: `generateSmartId()`, `hashPassword()`, `encryptData()`
- Auth.gs: `login()`, `_validatePermission()`
- StudentService.gs: `createStudent()`, `getStudentList()`

### Integration Test (시나리오)
1. **로그인 → 학생 등록 → 조회 → 수정 → 삭제**
2. **agency 계정으로 로그인 → 타 유학원 학생 접근 시도 → 권한 에러 확인**
3. **branch 계정으로 로그인 → 모든 학생 조회 → 상담 기록 추가**
4. **다국어 전환 → 모든 텍스트가 i18n 키로 변경되는지 확인**

### Performance Test
- 학생 1000명 데이터 입력 후 목록 로드 시간 측정 (목표: <3초)
- 감사 로그 10000개 누적 후 조회 시간 측정 (목표: <5초)

---

## 📦 Dependencies (없음)

Google Apps Script는 외부 라이브러리 없이 순수 GAS API만 사용합니다.

**사용 가능한 GAS API:**
- SpreadsheetApp (Sheets 접근)
- CacheService (세션 관리)
- PropertiesService (설정 저장)
- Utilities (해시, 암호화, UUID)
- HtmlService (웹앱 렌더링)
- Logger (로그 출력)
- Session (사용자 정보)

---

## 🎯 Next Steps

### After Implementation

1. **Check Phase (Gap Analysis)**
   ```
   /pdca analyze gas-student-platform
   ```

2. **If Match Rate < 90%**
   ```
   /pdca iterate gas-student-platform
   ```

3. **If Match Rate >= 90%**
   ```
   /pdca report gas-student-platform
   ```

### Development Tips

- **자주 저장**: GAS는 자동 저장이 느리므로 `Ctrl+S` 자주 누르기
- **로그 확인**: `Logger.log()` 사용 후 실행 → 로그 보기 (`Ctrl+Enter`)
- **디버깅**: `console.log()`는 클라이언트(HTML)에서만, `Logger.log()`는 서버(.gs)에서만 작동
- **캐시 초기화**: 세션이 이상하면 `CacheService.getUserCache().removeAll()` 실행

---

## 📚 Reference Documents

- [Plan Document](../01-plan/features/gas-student-platform.plan.md)
- [Design Document](../02-design/features/gas-student-platform.design.md)
- [Schema Definition](../01-plan/schema.md)
- [Coding Conventions](../01-plan/conventions.md)
- [CLAUDE.md](../../CLAUDE.md)

---

*Generated by bkit PDCA System - Do Phase*
