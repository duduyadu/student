# AJU E&J 학생관리 프로그램 - 세션 연속성 문서

## 📋 프로젝트 개요

**프로젝트명**: AJU E&J 베트남 유학생 통합 관리 시스템
**기술 스택**: Google Apps Script + Google Sheets (Database)
**개발 방식**: clasp (Command Line Apps Script Projects) 로컬 개발
**현재 상태**: Phase 1 진행 중 (파일 생성 완료, clasp push 대기)

---

## ✅ 현재까지 완료된 작업

### 1. 개발 환경 설정 완료
- ✅ Node.js v22.17.1 설치 확인
- ✅ clasp 전역 설치 (`npm install -g @google/clasp`)
- ✅ clasp 로그인 완료
- ✅ Google Apps Script API 활성화
- ✅ GAS 프로젝트 생성 완료
  - 프로젝트 ID: `1j1tnoI_AHuxe624nn5ET3s7oizWFmOKkkQp7YuoKK02DLr_tOQkmlscN`
  - URL: https://script.google.com/d/1j1tnoI_AHuxe624nn5ET3s7oizWFmOKkkQp7YuoKK02DLr_tOQkmlscN/edit

### 2. 파일 생성 완료 (src/ 폴더)

#### Backend 파일 (8개)
1. ✅ **Config.gs** - 기본 설정 및 Sheet 접근 헬퍼
2. ✅ **Helpers.gs** - Smart ID 생성, 암호화, 날짜 포맷
3. ✅ **I18nService.gs** - 다국어 엔진 (한국어/베트남어)
4. ✅ **Code.gs** - GAS 진입점 (doGet)
5. ✅ **Auth.gs** - 인증 시스템 (로그인/로그아웃/세션/권한)
6. ✅ **AuditService.gs** - 감사 로그 시스템
7. ✅ **StudentService.gs** - 학생 CRUD (Phase 4에서 완성 예정)
8. ✅ **SetupSheets.gs** - Phase 1 자동 설정 스크립트

#### Frontend 파일 (2개)
1. ✅ **Login.html** - 로그인 페이지 (다국어 지원)
2. ✅ **Index.html** - 메인 대시보드 (Phase 4에서 확장 예정)

#### 설정 파일
1. ✅ **appsscript.json** - timezone을 Asia/Seoul로 수정 완료
2. ✅ **.clasp.json** - 프로젝트 ID 연결 완료

#### 데이터 파일
1. ✅ **setup/i18n-initial-data.tsv** - 75개 i18n 키 준비 완료

---

## 🚀 지금 바로 실행할 단계

### Step 1: clasp push로 파일 업로드

현재 위치에서 다음 명령어 실행:

```bash
cd "C:\Users\dudu\Documents\완성된 프로그램\AJU E&J 학생관리프로그램"
clasp push
```

**예상 결과**:
```
└─ appsscript.json
└─ src/AuditService.gs
└─ src/Auth.gs
└─ src/Code.gs
└─ src/Config.gs
└─ src/Helpers.gs
└─ src/I18nService.gs
└─ src/Index.html
└─ src/Login.html
└─ src/SetupSheets.gs
└─ src/StudentService.gs
Pushed 11 files.
```

> **참고**: clasp가 느릴 수 있지만 이는 개발 작업 속도에만 영향을 미치며, 실제 사용자가 웹앱을 사용할 때는 Google 서버에서 빠르게 실행됩니다.

---

### Step 2: Google Spreadsheet 생성

1. Google Sheets 열기: https://sheets.google.com
2. **빈 스프레드시트** 생성
3. 이름 변경: `AJU E&J Student DB`
4. **URL에서 SPREADSHEET_ID 복사**
   - URL 형식: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
   - 예시: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
5. 복사한 ID를 메모장에 임시 저장

---

### Step 3: Script Properties 초기 설정 (1단계)

1. GAS 프로젝트 열기:
   https://script.google.com/d/1j1tnoI_AHuxe624nn5ET3s7oizWFmOKkkQp7YuoKK02DLr_tOQkmlscN/edit

2. 왼쪽 메뉴에서 **프로젝트 설정** (톱니바퀴 아이콘) 클릭

3. 하단 **스크립트 속성** 섹션에서 **스크립트 속성 추가** 클릭

4. 첫 번째 속성 추가:
   - **속성**: `SPREADSHEET_ID`
   - **값**: (Step 2에서 복사한 Spreadsheet ID)
   - **추가** 클릭

5. **저장** 버튼 클릭

---

### Step 4: MASTER_SALT 생성

1. GAS 편집기 상단에서 **SetupSheets.gs** 파일 열기

2. 함수 드롭다운에서 `runPhase1Setup` 선택

3. **실행** 버튼 (▶) 클릭

4. 권한 요청 팝업이 나오면:
   - **권한 검토** 클릭
   - Google 계정 선택
   - **고급** 클릭
   - **안전하지 않은 페이지로 이동** 클릭
   - **허용** 클릭

5. 실행 완료 후 **실행 로그 보기** 클릭 (상단 **보기** 메뉴 → **로그**)

6. 로그에서 다음과 같은 출력 확인:
   ```
   ========================================
   ⚠️  중요: 다음 값을 복사하세요!
   ========================================

   MASTER_SALT:
   xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

   ========================================
   ```

7. **MASTER_SALT 값 전체를 복사** (매우 긴 문자열)

---

### Step 5: Script Properties 완성 (2단계)

1. 다시 **프로젝트 설정** → **스크립트 속성**으로 이동

2. 두 번째 속성 추가:
   - **속성**: `MASTER_SALT`
   - **값**: (Step 4에서 복사한 MASTER_SALT)
   - **추가** 클릭

3. **저장** 버튼 클릭

4. 최종 확인: 스크립트 속성에 2개 항목이 있어야 함
   - `SPREADSHEET_ID`: (Spreadsheet ID)
   - `MASTER_SALT`: (긴 UUID 문자열)

---

### Step 6: Sheet 자동 생성 및 초기 데이터 설정

1. GAS 편집기에서 **SetupSheets.gs** 파일 열기

2. 함수 드롭다운에서 `finalizePhase1` 선택

3. **실행** 버튼 (▶) 클릭

4. 실행 로그에서 다음 확인:
   ```
   ========================================
   Phase 1 마무리 시작
   ========================================
   ✅ Script Properties 확인 완료
   ✅ Students
   ✅ Agencies
   ✅ AuditLogs
   ✅ SystemConfig
   ✅ i18n
   ✅ Consultations
   ✅ ExamResults
   ✅ TargetHistory
   ✅ MASTER 계정 (admin/admin123)
   ========================================
   ✅ Phase 1 자동 설정 완료!
   ========================================
   ```

5. Spreadsheet로 돌아가서 8개 시트가 생성되었는지 확인:
   - Students
   - Agencies
   - AuditLogs
   - SystemConfig
   - i18n
   - Consultations
   - ExamResults
   - TargetHistory

---

### Step 7: i18n 데이터 수동 임포트

1. `setup/i18n-initial-data.tsv` 파일을 메모장으로 열기

2. 내용 전체 복사 (Ctrl+A, Ctrl+C)

3. Spreadsheet의 **i18n** 시트 열기

4. A2 셀 선택 (헤더 다음 행)

5. 붙여넣기 (Ctrl+V)

6. 데이터 확인:
   - Key 컬럼: `btn_login`, `label_password` 등
   - Korean 컬럼: 한국어 번역
   - Vietnamese 컬럼: 베트남어 번역
   - 총 75개 행

---

### Step 8: 웹앱 배포

1. GAS 편집기 상단 **배포** 버튼 클릭 → **새 배포**

2. 설정:
   - **유형 선택**: 웹 앱
   - **설명**: Phase 1 배포
   - **실행 권한**: 나
   - **액세스 권한**: 모든 사용자
   - **배포** 클릭

3. **웹 앱 URL** 복사 (나중에 테스트에 사용)

---

### Step 9: 로그인 테스트

1. 복사한 웹 앱 URL을 브라우저에서 열기

2. 로그인 화면 확인:
   - 언어 전환 버튼 (한국어/Tiếng Việt) 동작 확인
   - 입력 필드가 번역되는지 확인

3. 테스트 계정으로 로그인:
   - **로그인 ID**: `admin`
   - **비밀번호**: `admin123`

4. 로그인 성공 시:
   - Index.html 페이지로 이동
   - "환영합니다!" 메시지 표시
   - "학생 목록 테스트" 버튼 클릭 → "학생 수: 0명" 표시

5. AuditLogs 시트에서 로그인 기록 확인:
   - UserId: admin
   - Action: LOGIN
   - IsSuccess: true

---

## 🔍 문제 해결 가이드

### clasp push 실패 시

**오류**: `User has not enabled the Apps Script API`
- **해결**: https://script.google.com/home/usersettings 에서 API 토글 켜기

**오류**: `Could not read .clasp.json`
- **해결**: 프로젝트 루트 디렉토리에서 명령어 실행 확인

### Script 실행 권한 오류

**오류**: `Exception: You do not have permission to call...`
- **해결**: Step 4의 권한 승인 과정 다시 진행

### MASTER_SALT를 복사하지 못한 경우

1. GAS 편집기에서 **보기** → **로그** 클릭
2. 로그 창에서 MASTER_SALT 값 찾아서 복사
3. 또는 `runPhase1Setup()` 함수를 다시 실행 (새로운 SALT 생성됨)

### 로그인 실패

**증상**: "로그인에 실패했습니다" 메시지
- **원인 1**: Script Properties가 올바르게 설정되지 않음
  - **해결**: Step 5 다시 확인
- **원인 2**: finalizePhase1()이 실행되지 않음
  - **해결**: Step 6 다시 실행
- **원인 3**: 비밀번호 오타
  - **해결**: `admin123` 정확히 입력 (소문자)

---

## 📊 데이터베이스 구조 (8개 Sheet)

### 1. Students (학생 정보)
- StudentID: Smart ID (예: 26-AJU-001)
- NameKR, NameVN: 한국/베트남 이름
- DOB: 생년월일
- Gender: 성별
- AgencyCode: 소속 유학원 코드
- 주소, 연락처, 학부모 정보 등

### 2. Agencies (사용자/기관)
- AgencyCode: 기관 코드
- AgencyName: 기관명
- Role: master, agency, branch
- LoginID, PasswordHash: 인증 정보
- IsActive, LoginAttempts, LastLogin

### 3. AuditLogs (감사 로그)
- Timestamp, UserId, Action
- TargetSheet, TargetId
- Details, IP, SessionId
- ErrorMessage, IsSuccess

### 4. SystemConfig (시스템 설정)
- ConfigKey, ConfigValue
- Description, UpdatedBy, UpdatedAt

### 5. i18n (다국어)
- Key: btn_login, label_password 등
- Korean, Vietnamese: 번역 텍스트
- Category, UpdatedAt

### 6. Consultations (상담 기록)
- ConsultationID, StudentID
- ConsultDate, ConsultType
- ConsultantId, Summary
- ImprovementArea, NextGoal

### 7. ExamResults (시험 결과)
- ExamResultID, StudentID
- ExamDate, ExamType
- Listening, Reading, Writing
- TotalScore, Grade

### 8. TargetHistory (목표 대학 변경 이력)
- HistoryID, StudentID
- ChangedDate
- TargetUniversityKR, TargetUniversityVN
- TargetMajorKR, TargetMajorVN

---

## 🎯 다음 단계: Phase 4-9 개요

### Phase 4: 학생 CRUD UI 구현 (다음 작업)

**목표**: 학생 정보를 생성, 조회, 수정, 삭제하는 UI 구현

**작업 내용**:
1. StudentService.gs 완성
   - createStudent(), updateStudent(), deleteStudent() 구현
   - Smart ID 자동 생성 통합
   - 권한별 데이터 필터링

2. StudentList.html 생성
   - 학생 목록 테이블
   - 검색/필터 기능
   - 엑셀 업로드/다운로드 버튼

3. StudentForm.html 생성
   - 학생 등록/수정 폼
   - 유효성 검사
   - 다국어 입력 필드

4. Index.html 확장
   - 네비게이션 메뉴 추가
   - 학생 관리 섹션 통합

**예상 소요 시간**: 1-2일

---

### Phase 5: 상담 및 시험 관리

**목표**: 상담 기록과 TOPIK 시험 결과 관리

**작업 내용**:
1. ConsultationService.gs 생성
2. ExamService.gs 생성
3. Consultation.html 생성
4. ExamResult.html 생성

**예상 소요 시간**: 1일

---

### Phase 6: 행정 정보 및 알림

**목표**: 비자, 외국인등록증, 유심 정보 관리

**작업 내용**:
1. AdminService.gs 생성
2. AdminInfo.html 생성
3. 만료일 알림 기능 (Triggers 활용)

**예상 소요 시간**: 1일

---

### Phase 7: UI/UX 완성

**목표**: 전문적인 디자인 적용

**작업 내용**:
1. 통합 CSS 파일 생성
2. 반응형 디자인 적용
3. 로딩 인디케이터, 에러 메시지 개선

**예상 소요 시간**: 0.5일

---

### Phase 8: 통합 테스트

**목표**: 전체 기능 검증

**작업 내용**:
1. 권한별 접근 제어 테스트
2. 데이터 무결성 테스트
3. 다국어 기능 테스트
4. 성능 테스트

**예상 소요 시간**: 0.5일

---

### Phase 9: 배포 및 문서화

**목표**: 사용자 매뉴얼 및 최종 배포

**작업 내용**:
1. 사용자 매뉴얼 작성 (한국어/베트남어)
2. 관리자 가이드 작성
3. 최종 배포 및 URL 공유

**예상 소요 시간**: 0.5일

---

## 📝 참고 정보

### 주요 기술 개념

**Smart ID 생성 방식**:
- 형식: `YY-AGENCY-SEQ`
- 예시: `26-AJU-001` (2026년, AJU 유학원, 1번 학생)
- 자동 채번으로 중복 방지

**비밀번호 해싱**:
- SHA-256 + MASTER_SALT
- 원본 비밀번호는 저장하지 않음
- MASTER_SALT 유출 시 전체 재설정 필요

**세션 관리**:
- CacheService 사용 (1시간 TTL)
- 로그아웃 시 세션 무효화
- 자동 만료 후 재로그인 필요

**권한 체계**:
- master: 모든 기능 접근
- agency: 자신의 유학원 학생만 관리
- branch: 모든 학생 조회 + 상담/시험 추가

---

## 🔗 유용한 링크

- **GAS 프로젝트**: https://script.google.com/d/1j1tnoI_AHuxe624nn5ET3s7oizWFmOKkkQp7YuoKK02DLr_tOQkmlscN/edit
- **Apps Script API 설정**: https://script.google.com/home/usersettings
- **clasp 문서**: https://github.com/google/clasp
- **GAS 공식 문서**: https://developers.google.com/apps-script

---

## ✅ Phase 1 완료 체크리스트

완료 후 아래 항목을 체크하세요:

- [ ] clasp push 성공
- [ ] Google Spreadsheet 생성
- [ ] SPREADSHEET_ID 설정
- [ ] MASTER_SALT 생성 및 설정
- [ ] 8개 Sheet 생성 확인
- [ ] i18n 데이터 75개 행 임포트
- [ ] 웹앱 배포
- [ ] admin 계정으로 로그인 성공
- [ ] 학생 목록 테스트 버튼 동작 확인
- [ ] AuditLogs에 로그인 기록 확인

**모든 항목 체크 완료 시 → Phase 4로 진행 가능!**

---

## 💬 다음 세션에서 질문할 것

다음 작업을 시작할 때 Claude에게 이렇게 말하세요:

```
"Phase 1 완료했어요. SESSION-CONTINUITY.md 파일 확인해주고,
Phase 4 학생 CRUD UI 구현을 시작해주세요."
```

또는 Phase 1 중 문제가 발생하면:

```
"SESSION-CONTINUITY.md 파일의 Step X에서 문제가 발생했어요.
[에러 메시지 또는 문제 상황 설명]"
```

---

**문서 작성일**: 2026-02-10
**작성자**: Claude (Opus 4.6)
**버전**: 1.0
