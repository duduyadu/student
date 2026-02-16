# AJU E&J 베트남 유학생 통합 관리 플랫폼

> Google Apps Script 기반 다국어(KO/VI) 학생 관리 시스템. 권한별 데이터 격리, 감사 로그, 자동 알림 포함.

---

## Core Principles

### 1. Automation First, Commands are Shortcuts
```
Claude automatically applies PDCA methodology.
Commands are shortcuts for power users.
```

### 2. SoR (Single Source of Truth) Priority
```
1st: Codebase (actual working code - .gs, .html files)
2nd: CLAUDE.md / Convention docs
3rd: docs/ design documents
```

### 3. No Guessing
```
Unknown → Check documentation
Not in docs → Ask user
Never guess
```

---

## Tech Stack

| Item | Value |
|------|-------|
| Language | JavaScript (Google Apps Script) |
| Platform | Google Apps Script (GAS) |
| Database | Google Sheets (5+ sheets) |
| Frontend | GAS HtmlService (HTML/CSS/JS) |
| i18n | i18n Sheet (Key-Value 다국어 사전) |
| Auth | Custom (Sheets 기반 역할 인증) |
| Notification | 알림톡/SMS API + Email 폴백 |
| Level | Dynamic |
| Tier | Tier 2 (Domain Specific - GAS) |

> **Tier 2 (Domain Specific)**
> - GAS는 Google Workspace 생태계에 특화
> - 서버리스, 무료 호스팅, Sheets 네이티브 연동
> - 6분 실행 제한, API 호출 제한 존재
> - PDCA 워크플로우 적용

---

## Development Workflow

### GAS 프로젝트 실행
```bash
# GAS는 웹 에디터 또는 clasp CLI 사용
# clasp 사용 시:
clasp login
clasp push          # 로컬 → GAS 업로드
clasp pull          # GAS → 로컬 다운로드
clasp open          # GAS 에디터 열기
clasp deploy        # 웹앱 배포
```

### 테스트
```bash
# GAS는 별도 테스트 프레임워크 없음
# 테스트 함수를 Code.gs에 작성하여 GAS 에디터에서 실행
# 함수명 규칙: test_함수명()
```

---

## Coding Conventions

### Naming Rules

| Target | Convention | Example |
|--------|-----------|---------|
| GAS 함수 (public) | camelCase | `getStudentById()`, `saveAuditLog()` |
| GAS 함수 (private) | _camelCase | `_validatePermission()`, `_hashPassword()` |
| 시트 컬럼명 | PascalCase | `StudentID`, `NameKR`, `AgencyCode` |
| i18n 키 | snake_case | `login_btn`, `form_name_label`, `err_permission` |
| 상수 | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS`, `CACHE_DURATION` |
| HTML id/class | kebab-case | `student-form`, `lang-toggle-btn` |
| JS 변수 (Frontend) | camelCase | `currentLang`, `studentData` |

### i18n Key Naming Convention
```
{category}_{element}_{detail}

카테고리:
- btn_   : 버튼 텍스트       (btn_save, btn_cancel, btn_login)
- label_ : 폼 라벨           (label_name_kr, label_dob)
- msg_   : 일반 메시지        (msg_save_success, msg_confirm_delete)
- err_   : 에러 메시지        (err_required_field, err_permission_denied)
- nav_   : 네비게이션         (nav_student_list, nav_dashboard)
- title_ : 페이지/섹션 제목   (title_student_form, title_login)
- legal_ : 법률/약관 문구     (legal_privacy_consent, legal_copyright)
- noti_  : 알림 문구          (noti_visa_expiry, noti_exam_reminder)
```

### GAS 파일 구조
```
프로젝트 (Google Apps Script)
├── Code.gs              # 메인 진입점 (doGet, doPost, includes)
├── Auth.gs              # 인증/권한 관리 (login, session, permission)
├── StudentService.gs    # 학생 CRUD 비즈니스 로직
├── ConsultService.gs    # 상담 기록 관리
├── ExamService.gs       # TOPIK 시험 성적 관리
├── AdminService.gs      # 행정 정보 (비자, 등록증 등)
├── I18nService.gs       # 다국어 엔진 (getLocaleStrings, translateKey)
├── NotificationService.gs # 알림 발송 (비자만료, 일정)
├── AuditService.gs      # 감사 로그 기록
├── Helpers.gs           # 유틸리티 (ID 생성, 암호화, 날짜 처리)
├── Config.gs            # 설정 상수 및 시트 참조
│
├── Index.html           # 메인 페이지 (SPA 컨테이너)
├── Login.html           # 로그인 페이지
├── Stylesheet.html      # CSS 스타일시트 (<style> 태그)
├── JavaScript.html      # 공통 JS 로직 (<script> 태그)
├── I18nClient.html      # 다국어 클라이언트 로직
└── Components.html      # 재사용 UI 컴포넌트 (모달, 폼 등)
```

### Import / Include 패턴 (GAS HtmlService)
```javascript
// Code.gs에서 HTML include 헬퍼
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Index.html에서 사용
// <?!= include('Stylesheet'); ?>
// <?!= include('JavaScript'); ?>
// <?!= include('I18nClient'); ?>
```

### 에러 처리 패턴
```javascript
// 모든 public 함수에 적용
function getStudentById(studentId) {
  try {
    _validateSession();
    _validatePermission('READ', studentId);
    // ... 비즈니스 로직 ...
    _saveAuditLog('READ', 'Students', studentId);
    return { success: true, data: student };
  } catch (e) {
    _saveAuditLog('ERROR', 'Students', studentId, e.message);
    return { success: false, error: e.message, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

### 반드시 지켜야 할 규칙

#### MUST DO
- 모든 UI 텍스트는 **i18n 시트**에서 참조 (하드코딩 절대 금지)
- 모든 데이터 접근 함수에 **서버단 권한 검증** 포함
- 모든 CRUD 작업 시 **감사 로그** 기록
- 민감 정보(학부모 경제상황) **암호화** 저장
- 저작권/소유권 문구는 **SystemConfig 시트**에서 동적 로드

#### MUST NOT
- 구글 시트 원본 공유로 데이터 접근 허용 금지
- 하드코딩 UI 텍스트 사용 금지
- 클라이언트 측에서만 권한 검증 금지
- GAS 6분 제한 초과하는 단일 함수 작성 금지

---

## Google Sheets Structure (Database)

| Sheet | Purpose | Key |
|-------|---------|-----|
| **Students** | 학생 통합 정보 | StudentID (YY-Agency-Seq) |
| **Agencies** | 유학원 정보 및 인증 | AgencyCode |
| **Consultations** | 상담 기록 | ConsultID |
| **ExamResults** | TOPIK 시험 성적 | ExamID |
| **TargetHistory** | 목표대학 변경 이력 | HistoryID |
| **AuditLogs** | 감사 기록 | LogID |
| **SystemConfig** | 시스템 설정 (KR/VN) | ConfigKey |
| **i18n** | 다국어 사전 | Key |

---

## PDCA Auto Behavior

### On New Feature Request
```
User: "상담 기록 기능 만들어줘"
Claude: 1. Check docs/02-design/ → Create design if missing
        2. i18n 키 목록 먼저 정의
        3. GAS 서비스 함수 구현 (권한 검증 + 감사 로그 포함)
        4. HTML 폼 구현 (i18n 참조)
        5. Suggest Gap analysis after completion
```

### On Bug Fix / Refactoring
```
Claude: 1. Compare code with design documents
        2. 권한 검증 누락 여부 확인
        3. i18n 하드코딩 여부 확인
        4. Fix and update documentation
```

---

## Key Commands

| Command | Description |
|---------|-------------|
| `/pdca status` | 현재 PDCA 진행 상황 확인 |
| `/pdca plan {feature}` | Plan 문서 생성 |
| `/pdca design {feature}` | Design 문서 생성 |
| `/pdca analyze {feature}` | Gap 분석 실행 |
| `/pdca next` | 다음 단계 안내 |

---

## Environment Configuration (GAS Properties)

| Property | Purpose | Scope |
|----------|---------|-------|
| `SPREADSHEET_ID` | 메인 스프레드시트 ID | Script |
| `MASTER_SALT` | 비밀번호 해시 솔트 | Script |
| `ENCRYPTION_KEY` | 민감정보 암호화 키 | Script |
| `NOTIFICATION_API_KEY` | 알림톡 API 키 | Script |
| `SESSION_DURATION` | 세션 유지 시간 (분) | Script |
| `MAX_LOGIN_ATTEMPTS` | 최대 로그인 시도 횟수 | Script |

---

## Document Structure

### docs/01-plan/ (계획)
```
- features/ : PDCA Plan 문서
- schema.md : 데이터 구조 정의
- conventions.md : 코딩 규칙 정의
```

### docs/02-design/ (설계)
```
- features/ : PDCA Design 문서
```

### docs/03-analysis/ (분석)
```
- Gap 분석 결과 문서
```

### docs/04-report/ (보고서)
```
- PDCA 완료 보고서
```

---

**Generated by**: bkit PDCA System
**Project Level**: Dynamic
**Template Version**: 1.3.0
