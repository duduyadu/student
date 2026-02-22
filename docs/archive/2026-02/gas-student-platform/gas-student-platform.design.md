# GAS Student Platform Design Document

> **Summary**: Google Apps Script 기반 베트남 유학생 통합 관리 플랫폼 상세 설계
>
> **Project**: AJU E&J 학생관리프로그램
> **Version**: 1.0.0
> **Author**: AJU E&J
> **Date**: 2026-02-10
> **Status**: Draft
> **Planning Doc**: [gas-student-platform.plan.md](../../01-plan/features/gas-student-platform.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | [Schema Definition](../../01-plan/schema.md) | ✅ |
| Phase 2 | [Coding Conventions](../../01-plan/conventions.md) | ✅ |

---

## 1. Overview

### 1.1 Design Goals

1. **서버리스 아키텍처**: Google Apps Script를 활용하여 별도 서버 없이 운영
2. **다국어 완전 지원**: 모든 UI 요소가 i18n 시트를 참조하여 하드코딩 제로
3. **보안 우선**: 모든 데이터 접근은 서버단(.gs)에서 권한 검증
4. **감사 추적**: 모든 작업을 AuditLogs에 자동 기록
5. **확장 가능**: 새 기능 추가 시 기존 코드 수정 최소화

### 1.2 Design Principles

- **Single Responsibility**: 각 .gs 파일은 하나의 도메인만 담당
- **Security by Default**: 클라이언트 입력은 절대 신뢰하지 않음
- **Convention over Configuration**: 일관된 네이밍과 패턴으로 코드 예측 가능성 향상
- **i18n First**: 모든 텍스트는 i18n 키로 관리

---

## 2. Architecture

### 2.1 GAS Project Structure

```
Google Apps Script Project
│
├── Backend (.gs files) ────────────────────────────────────
│
├── Code.gs              # 진입점: doGet(), doPost(), include()
├── Config.gs            # 상수, 시트 참조, 환경 설정
│
├── Auth.gs              # 인증/세션/권한
│   ├─ login()
│   ├─ logout()
│   ├─ _validateSession()
│   └─ _validatePermission()
│
├── StudentService.gs    # 학생 CRUD
│   ├─ getStudentList()
│   ├─ getStudentById()
│   ├─ createStudent()
│   ├─ updateStudent()
│   └─ deleteStudent()
│
├── ConsultService.gs    # 상담 기록 관리
│   ├─ getConsultationsByStudent()
│   ├─ createConsultation()
│   └─ updateConsultation()
│
├── ExamService.gs       # TOPIK 시험 성적
│   ├─ getExamResultsByStudent()
│   ├─ createExamResult()
│   └─ calculateGrade()
│
├── AdminService.gs      # 행정 정보 (비자, ARC, SIM)
│   ├─ updateVisaInfo()
│   ├─ updateARCInfo()
│   └─ updateSIMInfo()
│
├── I18nService.gs       # 다국어 엔진
│   ├─ getLocaleStrings()
│   └─ _loadI18nSheet()
│
├── NotificationService.gs # 알림 발송
│   ├─ checkVisaExpiry()
│   ├─ sendNotification()
│   └─ _sendSMS()
│
├── AuditService.gs      # 감사 로그
│   ├─ saveAuditLog()
│   └─ getAuditLogs()
│
├── Helpers.gs           # 유틸리티
│   ├─ generateSmartId()
│   ├─ hashPassword()
│   ├─ encryptData()
│   ├─ decryptData()
│   └─ formatDate()
│
│
├── Frontend (.html files) ─────────────────────────────────
│
├── Index.html           # 메인 SPA 컨테이너
├── Login.html           # 로그인 페이지
├── Stylesheet.html      # 공통 CSS (<style>)
├── JavaScript.html      # 공통 JS (<script>)
├── I18nClient.html      # 다국어 클라이언트 JS
├── Components.html      # 재사용 UI 컴포넌트
├── StudentForm.html     # 학생 정보 입력/수정 폼
├── StudentList.html     # 학생 목록 뷰
├── ConsultForm.html     # 상담 기록 입력 폼
├── ExamForm.html        # 시험 성적 입력 폼
└── ConsentModal.html    # 개인정보 동의 팝업
```

### 2.2 Data Flow: 학생 등록 예시

```
┌──────────────────────────────────────────────────────────┐
│ 1. 사용자가 "학생 등록" 폼 작성 후 "저장" 클릭            │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│ 2. [StudentForm.html] saveStudent() JS 함수 실행          │
│    - 폼 데이터 수집                                        │
│    - 클라이언트 측 간단 검증 (빈값 체크)                    │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│ 3. google.script.run.createStudent(formData)              │
│    → Google 서버로 전송                                    │
└───────────────────────┬──────────────────────────────────┘
                        │
                   ╔════╧════╗
                   ║  Google  ║ (서버 경계)
                   ║  Server  ║
                   ╚════╤════╝
                        │
┌───────────────────────▼──────────────────────────────────┐
│ 4. [StudentService.gs] createStudent(formData) 실행      │
│    ├─ [Auth.gs] _validateSession()      세션 확인         │
│    ├─ [Auth.gs] _validatePermission()   권한 확인         │
│    ├─ [Helpers.gs] generateSmartId()    ID 생성          │
│    ├─ [Helpers.gs] encryptData()        민감정보 암호화    │
│    ├─ SpreadsheetApp → Students 시트     새 행 추가        │
│    ├─ [AuditService.gs] saveAuditLog()  로그 기록         │
│    └─ return { success: true, data: {...} }               │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────┐
│ 5. [StudentForm.html] onSaveSuccess(result) 콜백          │
│    - "저장 완료!" 메시지 표시 (i18n 키 참조)                │
│    - 폼 초기화                                             │
│    - 학생 목록 새로고침 (loadStudentList() 호출)           │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Backend Design (.gs Files)

### 3.1 Code.gs (진입점)

**역할**: 웹앱 진입점, HTML include 헬퍼

```javascript
/**
 * 웹앱 URL 접속 시 실행
 */
function doGet(e) {
  // 세션 확인 → 비로그인 시 Login.html, 로그인 시 Index.html
  var session = _checkSession();
  var template = session ? 'Index' : 'Login';

  return HtmlService.createTemplateFromFile(template)
    .evaluate()
    .setTitle('AJU E&J 학생관리')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * POST 요청 처리 (현재는 사용 안 함, 향후 확장용)
 */
function doPost(e) {
  return ContentService.createTextOutput('POST not supported');
}

/**
 * HTML 파일 포함 헬퍼
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * [Private] 세션 확인 (로그인 여부)
 */
function _checkSession() {
  var cache = CacheService.getUserCache();
  var sessionData = cache.get('SESSION');
  return sessionData ? JSON.parse(sessionData) : null;
}
```

---

### 3.2 Config.gs (설정)

**역할**: 상수, 시트 접근, 환경 변수

```javascript
// 환경 설정 (GAS Script Properties에서 읽기)
var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
var MASTER_SALT = PropertiesService.getScriptProperties().getProperty('MASTER_SALT');
var ENCRYPTION_KEY = PropertiesService.getScriptProperties().getProperty('ENCRYPTION_KEY');
var NOTIFICATION_API_KEY = PropertiesService.getScriptProperties().getProperty('NOTIFICATION_API_KEY');

// 시트 이름 상수
var SHEETS = {
  STUDENTS: 'Students',
  AGENCIES: 'Agencies',
  CONSULTATIONS: 'Consultations',
  EXAM_RESULTS: 'ExamResults',
  TARGET_HISTORY: 'TargetHistory',
  AUDIT_LOGS: 'AuditLogs',
  SYSTEM_CONFIG: 'SystemConfig',
  I18N: 'i18n'
};

// 세션 타임아웃 (분)
var SESSION_TIMEOUT = 60;

// 최대 로그인 시도 횟수
var MAX_LOGIN_ATTEMPTS = 5;

/**
 * 시트 접근 헬퍼
 */
function _getSheet(sheetName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(sheetName);
}

/**
 * 모든 행을 객체 배열로 변환
 */
function _getAllRows(sheetName) {
  var sheet = _getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}
```

---

### 3.3 Auth.gs (인증/권한)

**공개 함수 (Frontend에서 호출):**

| 함수명 | 파라미터 | 반환 | 설명 |
|--------|---------|------|------|
| `login` | `(loginId, password)` | `{success, data?, errorKey?}` | 로그인 처리 |
| `logout` | `()` | `{success}` | 로그아웃 (세션 삭제) |
| `getCurrentUser` | `()` | `{success, data}` | 현재 로그인 사용자 정보 |

**비공개 함수 (내부 사용):**

| 함수명 | 파라미터 | 반환 | 설명 |
|--------|---------|------|------|
| `_validateSession` | `()` | `session 객체` | 세션 검증 (없으면 throw) |
| `_validatePermission` | `(session, action, sheet, targetId?)` | `void` | 권한 검증 (권한 없으면 throw) |
| `_createSession` | `(user)` | `sessionId` | 세션 생성 및 저장 |
| `_destroySession` | `()` | `void` | 세션 삭제 |

**상세 구현 예시:**

```javascript
/**
 * 로그인 처리
 */
function login(loginId, password) {
  try {
    // 1. Agencies 시트에서 사용자 찾기
    var agencies = _getAllRows(SHEETS.AGENCIES);
    var user = null;
    for (var i = 0; i < agencies.length; i++) {
      if (agencies[i].LoginID === loginId && agencies[i].IsActive === true) {
        user = agencies[i];
        break;
      }
    }

    if (!user) {
      return { success: false, errorKey: 'err_login_failed' };
    }

    // 2. 로그인 시도 횟수 확인
    if (user.LoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      return { success: false, errorKey: 'err_account_locked' };
    }

    // 3. 비밀번호 검증
    var hashedInput = _hashPassword(password);
    if (hashedInput !== user.PasswordHash) {
      // 실패 횟수 증가
      _updateRow(SHEETS.AGENCIES, 'LoginID', loginId, {
        LoginAttempts: user.LoginAttempts + 1
      });
      saveAuditLog('SYSTEM', 'LOGIN_FAIL', 'Agencies', loginId);
      return { success: false, errorKey: 'err_login_failed' };
    }

    // 4. 로그인 성공: 세션 생성
    var sessionId = _createSession(user);

    // 5. 로그인 성공 기록 및 시도 횟수 초기화
    _updateRow(SHEETS.AGENCIES, 'LoginID', loginId, {
      LoginAttempts: 0,
      LastLoginAt: new Date()
    });
    saveAuditLog(user.LoginID, 'LOGIN', 'Agencies', loginId);

    return {
      success: true,
      data: {
        sessionId: sessionId,
        user: {
          loginId: user.LoginID,
          agencyCode: user.AgencyCode,
          agencyName: user.AgencyName,
          role: user.Role,
          language: user.PreferredLang
        }
      }
    };

  } catch (e) {
    Logger.log('ERROR in login: ' + e.message);
    return { success: false, errorKey: 'err_unknown' };
  }
}

/**
 * [Private] 권한 검증
 */
function _validatePermission(session, action, sheet, targetId) {
  // 마스터는 모든 권한 보유
  if (session.role === 'master') return;

  // agency 역할의 권한 필터링
  if (session.role === 'agency') {
    // Students, Consultations, ExamResults는 자기 소속만 접근 가능
    if (sheet === SHEETS.STUDENTS ||
        sheet === SHEETS.CONSULTATIONS ||
        sheet === SHEETS.EXAM_RESULTS) {

      if (targetId) {
        var record = _getRecordById(sheet, targetId);
        if (record && record.AgencyCode !== session.agencyCode) {
          var error = new Error('Permission denied');
          error.errorKey = 'err_permission_denied';
          throw error;
        }
      }

      // 생성 시에는 자동으로 자기 AgencyCode 할당 (StudentService에서 처리)
    }

    // SystemConfig는 읽기 전용
    if (sheet === SHEETS.SYSTEM_CONFIG && action !== 'READ') {
      var error = new Error('Permission denied');
      error.errorKey = 'err_permission_denied';
      throw error;
    }
  }
}
```

---

### 3.4 StudentService.gs (학생 CRUD)

**공개 함수:**

| 함수명 | 파라미터 | 반환 | 설명 |
|--------|---------|------|------|
| `getStudentList` | `(filters?)` | `{success, data: []}` | 학생 목록 조회 (권한 필터링 자동) |
| `getStudentById` | `(studentId)` | `{success, data}` | 학생 상세 조회 |
| `createStudent` | `(studentData)` | `{success, data: {StudentID}}` | 학생 등록 |
| `updateStudent` | `(studentId, updates)` | `{success}` | 학생 정보 수정 |
| `deleteStudent` | `(studentId)` | `{success}` | 학생 삭제 (soft delete) |
| `searchStudents` | `(keyword)` | `{success, data: []}` | 학생 검색 (이름, ID) |

**상세 구현 예시:**

```javascript
/**
 * 학생 목록 조회 (권한 필터링 자동)
 */
function getStudentList(filters) {
  try {
    var session = _validateSession();

    var students = _getAllRows(SHEETS.STUDENTS);
    var result = [];

    for (var i = 0; i < students.length; i++) {
      var student = students[i];

      // 권한 필터링: agency는 자기 소속만
      if (session.role === 'agency' && student.AgencyCode !== session.agencyCode) {
        continue;
      }

      // 필터 적용 (옵션)
      if (filters) {
        if (filters.status && student.Status !== filters.status) continue;
        if (filters.agencyCode && student.AgencyCode !== filters.agencyCode) continue;
      }

      result.push(student);
    }

    saveAuditLog(session.userId, 'READ', SHEETS.STUDENTS, 'LIST');
    return { success: true, data: result };

  } catch (e) {
    Logger.log('ERROR in getStudentList: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

/**
 * 학생 등록
 */
function createStudent(studentData) {
  try {
    var session = _validateSession();
    _validatePermission(session, 'CREATE', SHEETS.STUDENTS);

    // agency 역할은 자기 유학원 학생만 등록 가능
    if (session.role === 'agency') {
      studentData.AgencyCode = session.agencyCode;
    }

    // 필수 필드 검증
    if (!studentData.NameKR || !studentData.NameVI || !studentData.DateOfBirth) {
      return { success: false, errorKey: 'err_required_field' };
    }

    // 스마트 ID 생성
    var studentId = generateSmartId(studentData.AgencyCode);
    studentData.StudentID = studentId;

    // 민감 정보 암호화
    if (studentData.ParentEconomic) {
      studentData.ParentEconomic = encryptData(studentData.ParentEconomic);
    }

    // 기본값 설정
    studentData.Status = studentData.Status || 'active';
    studentData.ConsentGiven = studentData.ConsentGiven || false;
    studentData.PreferredLang = studentData.PreferredLang || 'VI';
    studentData.CreatedAt = new Date();
    studentData.CreatedBy = session.userId;
    studentData.UpdatedAt = new Date();
    studentData.UpdatedBy = session.userId;

    // 시트에 추가
    _appendRow(SHEETS.STUDENTS, studentData);

    // 감사 로그
    saveAuditLog(session.userId, 'CREATE', SHEETS.STUDENTS, studentId);

    return { success: true, data: { StudentID: studentId } };

  } catch (e) {
    Logger.log('ERROR in createStudent: ' + e.message);
    saveAuditLog('SYSTEM', 'ERROR', SHEETS.STUDENTS, null, e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

---

### 3.5 I18nService.gs (다국어 엔진)

**공개 함수:**

| 함수명 | 파라미터 | 반환 | 설명 |
|--------|---------|------|------|
| `getLocaleStrings` | `(lang)` | `{success, data: {key: text}}` | 특정 언어의 모든 텍스트 반환 |

**상세 구현:**

```javascript
/**
 * 다국어 텍스트 전체 가져오기
 */
function getLocaleStrings(lang) {
  try {
    lang = lang || 'KO';  // 기본값: 한국어

    var i18nRows = _getAllRows(SHEETS.I18N);
    var result = {};
    var langColumn = lang === 'KO' ? 'KO_Text' : 'VI_Text';

    for (var i = 0; i < i18nRows.length; i++) {
      var row = i18nRows[i];
      result[row.Key] = row[langColumn] || row.Key;  // 폴백: 키 자체
    }

    return { success: true, data: result };

  } catch (e) {
    Logger.log('ERROR in getLocaleStrings: ' + e.message);
    return { success: false, errorKey: 'err_unknown' };
  }
}
```

---

### 3.6 기타 서비스 함수 목록

#### ConsultService.gs
- `getConsultationsByStudent(studentId)` - 학생별 상담 기록 조회
- `createConsultation(consultData)` - 상담 기록 생성
- `updateConsultation(consultId, updates)` - 상담 기록 수정

#### ExamService.gs
- `getExamResultsByStudent(studentId)` - 학생별 TOPIK 성적 조회
- `createExamResult(examData)` - 시험 성적 등록
- `calculateGrade(totalScore, examType)` - 총점 기반 등급 계산

#### AdminService.gs
- `updateVisaInfo(studentId, visaData)` - 비자 정보 수정
- `updateARCInfo(studentId, arcData)` - 외국인등록증 정보 수정
- `updateSIMInfo(studentId, simData)` - 유심 정보 수정

#### NotificationService.gs
- `checkVisaExpiry()` - 비자 만료 30일 전 학생 검색 (Trigger로 매일 실행)
- `sendNotification(studentId, type, message)` - 알림 발송
- `_sendSMS(phoneNumber, message)` - SMS API 호출

#### AuditService.gs
- `saveAuditLog(userId, action, targetSheet, targetId, details?)` - 감사 로그 저장
- `getAuditLogs(filters)` - 감사 로그 조회 (master만)

#### Helpers.gs
- `generateSmartId(agencyCode)` - 스마트 ID 생성 (YY-AGENCY-SEQ)
- `hashPassword(plainText)` - 비밀번호 해시 (SHA-256)
- `encryptData(plainText)` - 데이터 암호화
- `decryptData(cipherText)` - 데이터 복호화
- `formatDate(date, format)` - 날짜 포맷팅

---

## 4. Frontend Design (.html Files)

### 4.1 Index.html (메인 SPA)

**구조:**
```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <?!= include('Stylesheet'); ?>
</head>
<body>
  <!-- 상단 네비게이션 -->
  <header class="app-header">
    <div class="logo">AJU E&J</div>
    <div class="nav-menu">
      <a href="#" data-i18n="nav_dashboard" onclick="showDashboard()"></a>
      <a href="#" data-i18n="nav_students" onclick="showStudentList()"></a>
      <a href="#" data-i18n="nav_settings" onclick="showSettings()"></a>
    </div>
    <div class="user-info">
      <span id="user-name"></span>
      <button data-i18n="btn_logout" onclick="handleLogout()"></button>
      <!-- 언어 전환 -->
      <button onclick="switchLanguage('KO')">한국어</button>
      <button onclick="switchLanguage('VI')">Tiếng Việt</button>
    </div>
  </header>

  <!-- 메인 콘텐츠 영역 (SPA - 동적으로 변경) -->
  <main id="main-content">
    <!-- 여기에 StudentList, StudentForm 등이 동적으로 로드됨 -->
  </main>

  <!-- 저작권 푸터 -->
  <footer id="copyright-footer"></footer>

  <!-- 공통 JS 로드 -->
  <?!= include('JavaScript'); ?>
  <?!= include('I18nClient'); ?>

  <script>
    // 초기화
    window.onload = function() {
      initApp();
    };
  </script>
</body>
</html>
```

---

### 4.2 Login.html (로그인 페이지)

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <?!= include('Stylesheet'); ?>
</head>
<body class="login-page">
  <div class="login-container">
    <h1 data-i18n="title_login">로그인</h1>

    <!-- 언어 선택 -->
    <div class="lang-selector">
      <button onclick="switchLanguage('KO')">한국어</button>
      <button onclick="switchLanguage('VI')">Tiếng Việt</button>
    </div>

    <!-- 로그인 폼 -->
    <form id="login-form" onsubmit="handleLogin(event)">
      <div class="form-group">
        <label data-i18n="label_login_id"></label>
        <input type="text" id="login-id" required
               data-placeholder-i18n="placeholder_login_id" />
      </div>
      <div class="form-group">
        <label data-i18n="label_password"></label>
        <input type="password" id="password" required
               data-placeholder-i18n="placeholder_password" />
      </div>
      <button type="submit" data-i18n="btn_login"></button>
    </form>

    <div id="login-error" class="error-message"></div>
  </div>

  <?!= include('JavaScript'); ?>
  <?!= include('I18nClient'); ?>

  <script>
    function handleLogin(e) {
      e.preventDefault();
      var loginId = document.getElementById('login-id').value;
      var password = document.getElementById('password').value;

      showLoading(true);
      google.script.run
        .withSuccessHandler(onLoginSuccess)
        .withFailureHandler(onLoginFailure)
        .login(loginId, password);
    }

    function onLoginSuccess(result) {
      showLoading(false);
      if (result.success) {
        // 세션 정보 저장 (클라이언트 측)
        sessionStorage.setItem('user', JSON.stringify(result.data.user));
        // Index.html로 리다이렉트
        window.location.reload();
      } else {
        showError(i18n[result.errorKey]);
      }
    }
  </script>
</body>
</html>
```

---

### 4.3 JavaScript.html (공통 JS)

**주요 함수:**

```html
<script>
// 전역 변수
var currentUser = null;
var currentLang = 'KO';
var i18n = {};  // 다국어 텍스트 객체

/**
 * 앱 초기화
 */
function initApp() {
  // 1. 현재 사용자 정보 로드
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        currentUser = result.data;
        currentLang = currentUser.language || 'KO';
        loadI18nStrings(currentLang);
      }
    })
    .getCurrentUser();
}

/**
 * 다국어 텍스트 로드
 */
function loadI18nStrings(lang) {
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        i18n = result.data;
        applyLanguage();
        loadDefaultView();
      }
    })
    .getLocaleStrings(lang);
}

/**
 * 언어 적용
 */
function applyLanguage() {
  // data-i18n 속성을 가진 모든 요소 갱신
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    el.textContent = i18n[key] || key;
  });

  // placeholder 갱신
  document.querySelectorAll('[data-placeholder-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-placeholder-i18n');
    el.placeholder = i18n[key] || key;
  });

  // 저작권 푸터 갱신
  loadCopyrightFooter();
}

/**
 * 언어 전환
 */
function switchLanguage(lang) {
  currentLang = lang;
  loadI18nStrings(lang);
}

/**
 * 로딩 표시
 */
function showLoading(show) {
  // 로딩 스피너 표시/숨김
  var loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = show ? 'block' : 'none';
  }
}

/**
 * 메시지 표시
 */
function showMessage(message, type) {
  // type: 'success', 'error', 'info'
  alert(message);  // 추후 토스트 메시지로 개선
}

/**
 * 에러 표시
 */
function showError(errorKey) {
  showMessage(i18n[errorKey] || errorKey, 'error');
}

/**
 * 로그아웃
 */
function handleLogout() {
  google.script.run
    .withSuccessHandler(function() {
      sessionStorage.clear();
      window.location.reload();
    })
    .logout();
}
</script>
```

---

### 4.4 StudentList.html (학생 목록)

```html
<div class="student-list-view">
  <div class="view-header">
    <h2 data-i18n="title_student_list"></h2>
    <button data-i18n="btn_add_student" onclick="showStudentForm()"></button>
  </div>

  <!-- 검색 -->
  <div class="search-bar">
    <input type="text" id="search-keyword"
           data-placeholder-i18n="placeholder_search" />
    <button data-i18n="btn_search" onclick="searchStudents()"></button>
  </div>

  <!-- 학생 테이블 -->
  <table id="student-table" class="data-table">
    <thead>
      <tr>
        <th data-i18n="col_student_id"></th>
        <th data-i18n="col_name_kr"></th>
        <th data-i18n="col_name_vi"></th>
        <th data-i18n="col_agency"></th>
        <th data-i18n="col_status"></th>
        <th data-i18n="col_actions"></th>
      </tr>
    </thead>
    <tbody id="student-tbody">
      <!-- 동적으로 채워짐 -->
    </tbody>
  </table>
</div>

<script>
function loadStudentList() {
  showLoading(true);
  google.script.run
    .withSuccessHandler(function(result) {
      showLoading(false);
      if (result.success) {
        renderStudentTable(result.data);
      }
    })
    .getStudentList();
}

function renderStudentTable(students) {
  var tbody = document.getElementById('student-tbody');
  tbody.innerHTML = '';

  students.forEach(function(student) {
    var row = tbody.insertRow();
    row.innerHTML =
      '<td>' + student.StudentID + '</td>' +
      '<td>' + student.NameKR + '</td>' +
      '<td>' + student.NameVI + '</td>' +
      '<td>' + student.AgencyCode + '</td>' +
      '<td data-i18n="status_' + student.Status + '"></td>' +
      '<td>' +
        '<button onclick="viewStudent(\'' + student.StudentID + '\')" data-i18n="btn_view"></button> ' +
        '<button onclick="editStudent(\'' + student.StudentID + '\')" data-i18n="btn_edit"></button>' +
      '</td>';
  });

  applyLanguage();  // i18n 적용
}
</script>
```

---

### 4.5 StudentForm.html (학생 등록/수정 폼)

```html
<div class="student-form-view">
  <h2 data-i18n="title_student_form"></h2>

  <form id="student-form" onsubmit="saveStudent(event)">
    <!-- 기본 정보 -->
    <fieldset>
      <legend data-i18n="section_basic_info"></legend>

      <div class="form-group">
        <label data-i18n="label_name_kr"></label>
        <input type="text" id="name-kr" required />
      </div>

      <div class="form-group">
        <label data-i18n="label_name_vi"></label>
        <input type="text" id="name-vi" required />
      </div>

      <div class="form-group">
        <label data-i18n="label_dob"></label>
        <input type="date" id="dob" required />
      </div>

      <div class="form-group">
        <label data-i18n="label_gender"></label>
        <select id="gender">
          <option value="M" data-i18n="opt_male"></option>
          <option value="F" data-i18n="opt_female"></option>
        </select>
      </div>
    </fieldset>

    <!-- 학부모 정보 -->
    <fieldset>
      <legend data-i18n="section_parent_info"></legend>

      <div class="form-group">
        <label data-i18n="label_parent_name"></label>
        <input type="text" id="parent-name" />
      </div>

      <div class="form-group">
        <label data-i18n="label_parent_phone"></label>
        <input type="tel" id="parent-phone" />
      </div>
    </fieldset>

    <!-- 개인정보 동의 -->
    <div class="form-group">
      <label>
        <input type="checkbox" id="consent" required />
        <span data-i18n="label_consent"></span>
        <a href="#" onclick="showConsentModal()" data-i18n="link_view_terms"></a>
      </label>
    </div>

    <!-- 버튼 -->
    <div class="form-actions">
      <button type="submit" data-i18n="btn_save"></button>
      <button type="button" data-i18n="btn_cancel" onclick="cancelForm()"></button>
    </div>
  </form>
</div>

<script>
function saveStudent(e) {
  e.preventDefault();

  var formData = {
    NameKR: document.getElementById('name-kr').value,
    NameVI: document.getElementById('name-vi').value,
    DateOfBirth: document.getElementById('dob').value,
    Gender: document.getElementById('gender').value,
    ParentName: document.getElementById('parent-name').value,
    ParentPhone: document.getElementById('parent-phone').value,
    ConsentGiven: document.getElementById('consent').checked,
    ConsentDate: new Date(),
    PreferredLang: currentLang
  };

  showLoading(true);
  google.script.run
    .withSuccessHandler(function(result) {
      showLoading(false);
      if (result.success) {
        showMessage(i18n['msg_save_success'], 'success');
        showStudentList();  // 목록으로 돌아가기
      } else {
        showError(result.errorKey);
      }
    })
    .createStudent(formData);
}
</script>
```

---

## 5. i18n Key List (초기 필수 키 목록)

### 5.1 버튼 (btn_)

| Key | KO | VI |
|-----|----|----|
| `btn_login` | 로그인 | Đăng nhập |
| `btn_logout` | 로그아웃 | Đăng xuất |
| `btn_save` | 저장 | Lưu |
| `btn_cancel` | 취소 | Hủy |
| `btn_edit` | 수정 | Sửa |
| `btn_delete` | 삭제 | Xóa |
| `btn_view` | 보기 | Xem |
| `btn_search` | 검색 | Tìm kiếm |
| `btn_add_student` | 학생 추가 | Thêm sinh viên |
| `btn_export` | 내보내기 | Xuất |

### 5.2 라벨 (label_)

| Key | KO | VI |
|-----|----|----|
| `label_login_id` | 로그인 아이디 | ID đăng nhập |
| `label_password` | 비밀번호 | Mật khẩu |
| `label_name_kr` | 한국 이름 | Tên Hàn Quốc |
| `label_name_vi` | 베트남 이름 | Tên Việt Nam |
| `label_dob` | 생년월일 | Ngày sinh |
| `label_gender` | 성별 | Giới tính |
| `label_phone` | 연락처 | Điện thoại |
| `label_address` | 주소 | Địa chỉ |
| `label_parent_name` | 학부모 이름 | Tên phụ huynh |
| `label_parent_phone` | 학부모 연락처 | Điện thoại phụ huynh |
| `label_agency` | 유학원 | Trung tâm |
| `label_consent` | 개인정보 수집 및 이용 동의 | Đồng ý thu thập thông tin cá nhân |

### 5.3 에러 메시지 (err_)

| Key | KO | VI |
|-----|----|----|
| `err_required_field` | 필수 항목을 입력해주세요 | Vui lòng nhập trường bắt buộc |
| `err_login_failed` | 로그인 실패. 아이디/비밀번호를 확인하세요 | Đăng nhập thất bại. Kiểm tra ID/mật khẩu |
| `err_session_expired` | 세션이 만료되었습니다. 다시 로그인하세요 | Phiên hết hạn. Đăng nhập lại |
| `err_permission_denied` | 권한이 없습니다 | Không có quyền |
| `err_not_found` | 데이터를 찾을 수 없습니다 | Không tìm thấy dữ liệu |
| `err_unknown` | 알 수 없는 오류가 발생했습니다 | Đã xảy ra lỗi không xác định |
| `err_account_locked` | 계정이 잠겼습니다. 관리자에게 문의하세요 | Tài khoản bị khóa. Liên hệ quản trị viên |

### 5.4 메시지 (msg_)

| Key | KO | VI |
|-----|----|----|
| `msg_save_success` | 저장되었습니다 | Đã lưu thành công |
| `msg_delete_confirm` | 정말 삭제하시겠습니까? | Bạn có chắc muốn xóa? |
| `msg_loading` | 로딩 중... | Đang tải... |

### 5.5 네비게이션 (nav_)

| Key | KO | VI |
|-----|----|----|
| `nav_dashboard` | 대시보드 | Trang chủ |
| `nav_students` | 학생 관리 | Quản lý sinh viên |
| `nav_consultations` | 상담 기록 | Tư vấn |
| `nav_settings` | 설정 | Cài đặt |

### 5.6 제목 (title_)

| Key | KO | VI |
|-----|----|----|
| `title_login` | 로그인 | Đăng nhập |
| `title_student_list` | 학생 목록 | Danh sách sinh viên |
| `title_student_form` | 학생 정보 등록 | Đăng ký thông tin sinh viên |

---

## 6. Implementation Order (구현 순서)

### Phase 1: 개발 환경 설정 (1일)

- [ ] Google Apps Script 프로젝트 생성
- [ ] Google Spreadsheet 생성 및 ID 저장
- [ ] 8개 시트 생성 (Students, Agencies, AuditLogs, SystemConfig, i18n 등)
- [ ] Script Properties 설정 (SPREADSHEET_ID, MASTER_SALT 등)
- [ ] clasp CLI 설치 (로컬 개발용, 선택사항)

### Phase 2: 기초 모듈 구현 (2일)

- [ ] `Config.gs` - 시트 접근 헬퍼, 상수
- [ ] `Helpers.gs` - 유틸리티 함수 (ID 생성, 해시, 암호화)
- [ ] `i18n` 시트에 초기 키 100개 입력
- [ ] `I18nService.gs` - 다국어 엔진

### Phase 3: 인증 시스템 (2일)

- [ ] `Auth.gs` - login, logout, session 관리
- [ ] `Login.html` - 로그인 페이지
- [ ] `Agencies` 시트에 테스트 계정 생성 (master 1개, agency 2개)

### Phase 4: 학생 CRUD (3일)

- [ ] `StudentService.gs` - 학생 CRUD 함수
- [ ] `AuditService.gs` - 감사 로그
- [ ] `Index.html` - 메인 레이아웃
- [ ] `StudentList.html` - 학생 목록
- [ ] `StudentForm.html` - 학생 등록/수정

### Phase 5: 상담 & 시험 관리 (2일)

- [ ] `ConsultService.gs` - 상담 기록 CRUD
- [ ] `ExamService.gs` - 시험 성적 CRUD
- [ ] `ConsultForm.html` - 상담 기록 폼
- [ ] `ExamForm.html` - 시험 성적 폼

### Phase 6: 행정 정보 & 알림 (2일)

- [ ] `AdminService.gs` - 비자, ARC, SIM 정보 관리
- [ ] `NotificationService.gs` - 알림 발송
- [ ] 비자 만료 자동 체크 Trigger 설정

### Phase 7: UI 완성 (2일)

- [ ] `Stylesheet.html` - CSS 스타일링
- [ ] `Components.html` - 재사용 컴포넌트
- [ ] `ConsentModal.html` - 개인정보 동의 팝업
- [ ] 반응형 레이아웃 (모바일 대응)

### Phase 8: 통합 테스트 (2일)

- [ ] 권한별 시나리오 테스트 (master/agency)
- [ ] 다국어 전환 테스트
- [ ] 감사 로그 누락 확인
- [ ] 베트남어 특수문자 인코딩 테스트

### Phase 9: 배포 (1일)

- [ ] GAS 웹앱 배포 (누구나 접근 가능)
- [ ] URL 획득 및 공유
- [ ] 사용자 매뉴얼 작성

---

## 7. Testing Strategy

### 7.1 단위 테스트 (GAS 에디터에서 실행)

```javascript
// Code.gs에 테스트 함수 추가
function test_generateSmartId() {
  var id1 = generateSmartId('AJU');
  Logger.log('Generated ID: ' + id1);  // 25-AJU-001

  var id2 = generateSmartId('AJU');
  Logger.log('Generated ID: ' + id2);  // 25-AJU-002
}

function test_hashPassword() {
  var hash = hashPassword('test123');
  Logger.log('Hash: ' + hash);
}

function test_i18n() {
  var result = getLocaleStrings('KO');
  Logger.log(JSON.stringify(result));
}
```

### 7.2 통합 테스트 시나리오

| 시나리오 | 테스트 케이스 |
|---------|-------------|
| **로그인** | ✓ 올바른 계정 로그인 성공<br>✓ 틀린 비밀번호 5회 시도 → 계정 잠금<br>✓ 세션 만료 후 재로그인 |
| **권한** | ✓ master: 모든 학생 조회 가능<br>✓ agency: 자기 소속만 조회<br>✓ agency: 타 유학원 학생 수정 시도 → 에러 |
| **다국어** | ✓ KO/VI 전환 시 모든 라벨 변경<br>✓ 베트남어 성조 문자 정상 표시<br>✓ 에러 메시지도 다국어 |
| **감사 로그** | ✓ 모든 CREATE/UPDATE/DELETE 기록됨<br>✓ 로그인/로그아웃 기록됨<br>✓ 언어 설정 포함 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-10 | Initial design - GAS 모듈, API, 프론트엔드, i18n 설계 | AJU E&J |
