# AJU E&J 학생관리 플랫폼 Coding Conventions

> PDCA Convention Document - Google Apps Script 코드 작성 규칙 정의

**Version**: 1.0
**Created**: 2026-02-10
**Level**: Dynamic
**Platform**: Google Apps Script

---

## 1. Naming Conventions

### Files (GAS 프로젝트)
| Target | Rule | Example |
|--------|------|---------|
| GAS 서비스 파일 | PascalCase + Service | `StudentService.gs`, `AuthService.gs` |
| GAS 헬퍼 파일 | PascalCase | `Helpers.gs`, `Config.gs` |
| GAS 메인 파일 | PascalCase | `Code.gs` |
| HTML 페이지 | PascalCase | `Index.html`, `Login.html` |
| HTML 부분 (include) | PascalCase | `Stylesheet.html`, `JavaScript.html` |

### Code (Backend - GAS)
| Target | Rule | Example |
|--------|------|---------|
| Public 함수 | camelCase | `getStudentById()`, `saveConsultation()` |
| Private 함수 | _camelCase | `_validatePermission()`, `_hashPassword()` |
| 상수 | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS`, `CACHE_TTL` |
| 시트 이름 참조 | PascalCase (문자열) | `'Students'`, `'AuditLogs'` |

### Code (Frontend - HTML/JS)
| Target | Rule | Example |
|--------|------|---------|
| JS 함수 | camelCase | `handleLogin()`, `switchLanguage()` |
| JS 변수 | camelCase | `currentLang`, `studentList` |
| HTML id | kebab-case | `student-form`, `lang-toggle` |
| HTML class | kebab-case | `form-input`, `btn-primary` |
| CSS class | kebab-case | `.card-header`, `.nav-item` |

### Data (Sheets & i18n)
| Target | Rule | Example |
|--------|------|---------|
| 시트 컬럼명 | PascalCase | `StudentID`, `NameKR`, `AgencyCode` |
| i18n 키 | snake_case | `btn_login`, `label_name_kr` |
| ConfigKey | snake_case | `copyright_text`, `session_timeout` |
| Smart ID | YY-CODE-SEQ | `25-AJU-001` |

---

## 2. Project File Structure

```
Google Apps Script Project
│
│  ── Backend (.gs files) ──────────────────────────
│
├── Code.gs                  # 진입점: doGet(), doPost(), include()
├── Config.gs                # 상수, 시트 참조, 설정값
├── Auth.gs                  # 로그인, 세션, 권한 검증
├── StudentService.gs        # 학생 CRUD
├── ConsultService.gs        # 상담 기록 관리
├── ExamService.gs           # TOPIK 시험 성적
├── AdminService.gs          # 행정 정보 (비자, ARC, SIM)
├── I18nService.gs           # 다국어 엔진
├── NotificationService.gs   # 알림 발송
├── AuditService.gs          # 감사 로그
├── Helpers.gs               # 유틸리티 (ID 생성, 암호화, 날짜)
│
│  ── Frontend (.html files) ───────────────────────
│
├── Index.html               # 메인 SPA 컨테이너
├── Login.html               # 로그인 페이지
├── Stylesheet.html          # CSS (<style> 태그)
├── JavaScript.html          # 공통 JS (<script> 태그)
├── I18nClient.html          # 다국어 클라이언트 JS
├── Components.html          # 재사용 UI 컴포넌트
├── StudentForm.html         # 학생 정보 입력/수정 폼
├── StudentList.html         # 학생 목록 뷰
├── ConsultForm.html         # 상담 기록 입력 폼
├── ExamForm.html            # 시험 성적 입력 폼
└── ConsentModal.html        # 개인정보 동의 팝업
```

---

## 3. GAS Function Patterns

### Public API 함수 (Frontend에서 호출)
```javascript
/**
 * 학생 정보 조회
 * @param {string} studentId - 학생 ID
 * @returns {Object} {success: boolean, data?: Object, error?: string}
 */
function getStudentById(studentId) {
  try {
    const session = _validateSession();
    _validatePermission(session, 'READ', 'Students', studentId);

    // 비즈니스 로직
    const student = _findStudentById(studentId);
    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    _saveAuditLog(session.userId, 'READ', 'Students', studentId);
    return { success: true, data: student };

  } catch (e) {
    Logger.log('ERROR in getStudentById: ' + e.message);
    _saveAuditLog('SYSTEM', 'ERROR', 'Students', studentId, e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

### Private 헬퍼 함수
```javascript
/**
 * [Private] 세션 검증
 * @returns {Object} session 객체
 * @throws {Error} 인증 실패 시
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
```

### 응답 형식 (통일)
```javascript
// 성공
{ success: true, data: { ... } }
{ success: true, data: [...], meta: { total: 50, page: 1 } }

// 실패
{ success: false, errorKey: 'err_permission_denied' }
{ success: false, errorKey: 'err_required_field', errorField: 'NameKR' }
```

---

## 4. i18n Key Convention

### 카테고리별 Prefix

| Prefix | Category | Usage | Example |
|--------|----------|-------|---------|
| `btn_` | 버튼 | 모든 버튼 텍스트 | `btn_save`, `btn_cancel`, `btn_delete` |
| `label_` | 폼 라벨 | 입력 필드 라벨 | `label_name_kr`, `label_dob` |
| `placeholder_` | 플레이스홀더 | 입력 힌트 | `placeholder_search`, `placeholder_phone` |
| `title_` | 제목 | 페이지/섹션 제목 | `title_student_list`, `title_login` |
| `nav_` | 네비게이션 | 메뉴, 탭 | `nav_dashboard`, `nav_students` |
| `msg_` | 메시지 | 안내/확인 메시지 | `msg_save_success`, `msg_confirm_delete` |
| `err_` | 에러 | 에러 메시지 | `err_required_field`, `err_permission` |
| `col_` | 테이블 헤더 | 목록 컬럼명 | `col_student_name`, `col_agency` |
| `legal_` | 법률/약관 | 동의 문구, 저작권 | `legal_privacy_consent`, `legal_copyright` |
| `noti_` | 알림 | 알림톡/SMS 문구 | `noti_visa_expiry`, `noti_exam_reminder` |
| `status_` | 상태 | 상태 표시 | `status_active`, `status_graduated` |
| `confirm_` | 확인 | 확인 다이얼로그 | `confirm_delete_student` |

### i18n 사용 규칙

```javascript
// GOOD - i18n 키 참조
document.getElementById('save-btn').textContent = i18n['btn_save'];

// BAD - 하드코딩 (절대 금지)
document.getElementById('save-btn').textContent = '저장';
```

---

## 5. Error Handling Convention

### Error Key 체계
| Key Pattern | Description | HTTP-like |
|-------------|-------------|-----------|
| `err_required_field` | 필수 입력값 누락 | 400 |
| `err_invalid_format` | 입력 형식 오류 | 400 |
| `err_session_expired` | 세션 만료 | 401 |
| `err_permission_denied` | 권한 없음 | 403 |
| `err_not_found` | 데이터 없음 | 404 |
| `err_duplicate` | 중복 데이터 | 409 |
| `err_unknown` | 알 수 없는 오류 | 500 |
| `err_sheet_access` | 시트 접근 실패 | 500 |

### Error 객체 규칙
```javascript
// 에러 발생 시 errorKey를 포함
const error = new Error('Permission denied');
error.errorKey = 'err_permission_denied';
throw error;
```

---

## 6. Audit Log Convention

### 모든 Public 함수에 감사 로그 필수
```javascript
// 함수 성공 시
_saveAuditLog(session.userId, 'CREATE', 'Students', newStudentId);

// 함수 실패 시
_saveAuditLog(session.userId, 'ERROR', 'Students', studentId, errorMessage);
```

### Action Types
| Action | When |
|--------|------|
| `CREATE` | 새 레코드 생성 |
| `READ` | 데이터 조회 (개별/목록) |
| `UPDATE` | 데이터 수정 |
| `DELETE` | 데이터 삭제 |
| `LOGIN` | 로그인 성공 |
| `LOGOUT` | 로그아웃 |
| `LOGIN_FAIL` | 로그인 실패 |
| `EXPORT` | 엑셀 다운로드 |
| `ERROR` | 에러 발생 |

---

## 7. Frontend Convention

### HTML 구조
```html
<!-- 모든 텍스트는 data-i18n 속성 사용 -->
<button id="save-btn" data-i18n="btn_save" class="btn btn-primary"></button>
<label data-i18n="label_name_kr" for="name-kr"></label>
<input id="name-kr" data-placeholder-i18n="placeholder_name_kr" />
```

### 언어 전환 로직
```javascript
// 언어 전환 시 모든 data-i18n 요소 갱신
function applyLanguage(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = i18nStrings[key] || key;
  });
  document.querySelectorAll('[data-placeholder-i18n]').forEach(el => {
    const key = el.getAttribute('data-placeholder-i18n');
    el.placeholder = i18nStrings[key] || key;
  });
}
```

### CSS 네이밍
```css
/* BEM-like: block-element--modifier */
.card { }
.card-header { }
.card-body { }
.btn { }
.btn-primary { }
.btn--disabled { }
.form-group { }
.form-input { }
.form-input--error { }
```

---

## 8. Code Style

| Rule | Value |
|------|-------|
| Indentation | 2 spaces |
| Quotes | Single quotes (`'`) |
| Semicolons | Yes (GAS 권장) |
| Max line length | 120 |
| JSDoc | 모든 Public 함수에 필수 |
| Comments | 한국어 허용 (비즈니스 로직 설명) |

---

## 9. Security Convention

### 권한 검증 패턴
```javascript
// 모든 데이터 접근 함수 첫 줄에 필수
function _validatePermission(session, action, sheet, targetId) {
  if (session.role === 'master') return; // 마스터는 전체 접근

  if (session.role === 'agency') {
    // agency는 자기 소속만
    if (sheet === 'Students' || sheet === 'Consultations' || sheet === 'ExamResults') {
      const record = _getRecordById(sheet, targetId);
      if (record && record.AgencyCode !== session.agencyCode) {
        const error = new Error('Permission denied');
        error.errorKey = 'err_permission_denied';
        throw error;
      }
    }
  }
}
```

### 민감 정보 처리
```javascript
// 암호화 필수 필드: ParentEconomic
// 저장 시: encrypt(plainText) → 시트에 저장
// 조회 시: 시트에서 읽기 → decrypt(cipherText) → 반환
// 로그에는 절대 평문 기록 금지
```

---

## Validation Checklist

- [x] Naming convention 정의됨 (Backend/Frontend/Data 분리)
- [x] File structure 정의됨 (11 .gs + 11 .html)
- [x] i18n key convention 정의됨 (12개 카테고리)
- [x] Error handling convention 정의됨
- [x] Audit log convention 정의됨
- [x] Security convention 정의됨
- [x] Code style 설정됨
- [x] Frontend HTML/CSS convention 정의됨

---

*Generated by bkit PDCA System*
