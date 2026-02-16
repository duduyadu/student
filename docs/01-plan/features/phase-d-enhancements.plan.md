# Phase D 추가 기능 개발 계획

> PDCA Plan Document - 시스템 고도화 기능
> **Created**: 2026-02-15
> **Level**: Dynamic
> **Priority**: Medium (Phase A-C 완료 후 진행)

---

## 📋 Overview

Phase A-C 완료 후 시스템을 더욱 완성도 있게 만들기 위한 5가지 추가 기능 계획.

### 기능 목록

| 기능 | 우선순위 | 예상 시간 | 난이도 |
|------|---------|----------|--------|
| 1. 관리자 비밀번호 변경 | High | 2시간 | ⭐ |
| 2. 학생 자가 등록 (Student Role) | Medium | 8시간 | ⭐⭐⭐ |
| 3. PDF 생활기록부 생성 | High | 12시간 | ⭐⭐⭐⭐ |
| 4. Excel 일괄 업로드/다운로드 | Medium | 6시간 | ⭐⭐⭐ |
| 5. 비자 만료 알림 시스템 | Low | 8시간 | ⭐⭐⭐ |

---

## 1️⃣ 관리자 비밀번호 변경 기능

### 📌 목적
- 현재 하드코딩된 초기 비밀번호(admin123)를 안전한 비밀번호로 변경
- 사용자가 직접 비밀번호를 변경할 수 있는 UI 제공

### 🎯 요구사항

**기능 요구사항**:
- [ ] 로그인 후 "비밀번호 변경" 버튼 추가
- [ ] 현재 비밀번호 확인
- [ ] 새 비밀번호 입력 (2회 확인)
- [ ] 비밀번호 강도 검증 (8자 이상, 영문+숫자+특수문자)
- [ ] 변경 성공 시 재로그인 유도

**보안 요구사항**:
- [ ] 현재 비밀번호 검증 필수
- [ ] 새 비밀번호 != 현재 비밀번호
- [ ] SHA-256 해시 유지 (기존 방식과 동일)
- [ ] 감사 로그 기록

### 🛠️ 구현 방안

**Backend (Auth.gs)**:
```javascript
/**
 * 비밀번호 변경
 * @param {string} sessionId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Object} {success: boolean}
 */
function changePassword(sessionId, currentPassword, newPassword) {
  // 1. 세션 검증
  // 2. 현재 비밀번호 확인
  // 3. 새 비밀번호 강도 검증
  // 4. 해시 생성 및 저장
  // 5. 감사 로그
}
```

**Frontend (Login.html)**:
- 비밀번호 변경 모달 추가
- 입력 필드 3개: 현재 비밀번호, 새 비밀번호, 새 비밀번호 확인
- 실시간 강도 표시 (약함/중간/강함)

### ✅ 완료 조건
- [ ] master 계정 비밀번호 변경 성공
- [ ] agency 계정 비밀번호 변경 성공
- [ ] 약한 비밀번호 거부 확인
- [ ] 틀린 현재 비밀번호 거부 확인

---

## 2️⃣ 학생 자가 등록 (Student Role)

### 📌 목적
- 학생이 직접 자신의 정보를 등록할 수 있도록 함
- 유학원 관리자 부담 경감

### 🎯 요구사항

**기능 요구사항**:
- [ ] 학생 전용 로그인 페이지 (또는 "학생 등록" 버튼)
- [ ] 최소 정보 입력 폼 (이름, 생년월일, 연락처, 유학원 선택)
- [ ] 임시 비밀번호 자동 생성 (또는 학생이 직접 설정)
- [ ] 등록 후 유학원 관리자 승인 대기

**승인 프로세스**:
1. 학생이 정보 입력 및 제출
2. Students 시트에 `Status = 'pending'`으로 저장
3. 유학원 관리자가 승인/거부
4. 승인 시 `Status = 'active'`, 학생에게 로그인 정보 전달

### 🛠️ 구현 방안

**Agencies 시트 확장**:
- StudentID를 LoginID로 사용
- PasswordHash 추가 (학생용)
- Role = 'student'

**또는 별도 Students_Auth 시트 생성**:
```
StudentID | PasswordHash | IsApproved | CreatedAt
```

**Backend (StudentService.gs)**:
```javascript
/**
 * 학생 자가 등록 (승인 대기)
 */
function selfRegisterStudent(studentData, password) {
  // 1. 최소 정보 검증
  // 2. Smart ID 생성
  // 3. 비밀번호 해시
  // 4. Status = 'pending' 저장
  // 5. 유학원 관리자에게 알림
}

/**
 * 학생 등록 승인 (agency/master 전용)
 */
function approveStudentRegistration(sessionId, studentId) {
  // 1. 권한 검증
  // 2. Status = 'active' 변경
  // 3. 학생에게 승인 알림
}
```

### ✅ 완료 조건
- [ ] 학생 자가 등록 성공
- [ ] 승인 대기 목록 표시
- [ ] 유학원 관리자 승인 기능
- [ ] 승인 후 학생 로그인 성공

---

## 3️⃣ PDF 생활기록부 생성

### 📌 목적
- 학생의 모든 정보를 종합한 전문적인 PDF 문서 생성
- 인쇄 가능한 고품질 레이아웃

### 🎯 요구사항

**포함 정보**:
- [ ] 학생 기본 정보 (사진, 이름, 생년월일, 연락처)
- [ ] 유학원 정보
- [ ] TOPIK 성적 이력 (그래프)
- [ ] 상담 기록 요약
- [ ] 목표 대학 변경 이력
- [ ] 비자/외국인등록증 정보

**디자인 요구사항**:
- [ ] A4 사이즈
- [ ] 한국어/베트남어 선택 가능
- [ ] 학교 로고 삽입
- [ ] 컬러 인쇄 대응
- [ ] 페이지 번호, 생성일자

### 🛠️ 구현 방안

**방법 1: Google Docs Template + PDF 변환** (권장)
```javascript
/**
 * PDF 생활기록부 생성
 */
function generateStudentReport(sessionId, studentId, lang) {
  // 1. Google Docs 템플릿 복사
  // 2. 학생 데이터 조회
  // 3. 템플릿 치환 ({{NameKR}} → 실제 값)
  // 4. PDF로 변환
  // 5. Drive에 저장 및 URL 반환
}
```

**템플릿 변수 예시**:
```
{{NameKR}}, {{NameVN}}, {{DOB}}, {{Phone}}, {{AgencyName}},
{{TOPIKScores}}, {{ConsultationSummary}}, {{TargetUniversity}}
```

**방법 2: HTML to PDF (Apps Script 제한 있음)**
- HtmlService로 HTML 생성
- 외부 API(PDF.co, DocRaptor) 사용하여 PDF 변환

### ✅ 완료 조건
- [ ] 한국어 PDF 생성 성공
- [ ] 베트남어 PDF 생성 성공
- [ ] 모든 정보 정확히 표시
- [ ] 디자인 깔끔하고 전문적

---

## 4️⃣ Excel 일괄 업로드/다운로드

### 📌 목적
- 대량의 학생 데이터를 한 번에 등록
- 기존 데이터를 Excel로 백업

### 🎯 요구사항

**다운로드 기능**:
- [ ] 현재 학생 목록을 Excel 파일로 다운로드
- [ ] 권한별 필터링 (agency는 자기 유학원만)
- [ ] 열 순서: StudentID, NameKR, NameVN, DOB, Gender, ...

**업로드 기능**:
- [ ] Excel 파일 업로드 (xlsx)
- [ ] 데이터 검증 (필수 필드, 중복 체크)
- [ ] 오류 행 리포트 생성
- [ ] 성공한 데이터만 일괄 등록

### 🛠️ 구현 방안

**Backend (StudentService.gs)**:
```javascript
/**
 * 학생 목록 Excel 다운로드
 */
function downloadStudentsExcel(sessionId) {
  // 1. 권한별 학생 목록 조회
  // 2. Spreadsheet 생성
  // 3. 데이터 쓰기
  // 4. Excel 변환 및 다운로드 URL 반환
}

/**
 * Excel 일괄 업로드
 */
function uploadStudentsExcel(sessionId, fileId) {
  // 1. 파일 읽기 (DriveApp)
  // 2. 행별 데이터 검증
  // 3. 오류 수집
  // 4. 성공 데이터 일괄 등록
  // 5. 결과 리포트 반환
}
```

**Frontend (Login.html)**:
- "Excel 다운로드" 버튼
- "Excel 업로드" 버튼 (파일 선택)
- 업로드 결과 모달 (성공 N건, 실패 M건, 오류 상세)

### ✅ 완료 조건
- [ ] Excel 다운로드 성공
- [ ] 50건 이상 일괄 업로드 성공
- [ ] 오류 데이터 올바르게 거부
- [ ] 결과 리포트 정확

---

## 5️⃣ 비자 만료 알림 시스템

### 📌 목적
- 비자 만료일 30일 전 자동 알림
- 학생 관리 누락 방지

### 🎯 요구사항

**알림 조건**:
- [ ] 비자 만료일 30일 전부터 매일 체크
- [ ] 만료일 7일 전, 3일 전 재알림
- [ ] 만료 당일 긴급 알림

**알림 방법**:
- [ ] 이메일 (학생 + 유학원 관리자)
- [ ] SMS (선택 - 외부 API)
- [ ] 시스템 내 알림 배지

### 🛠️ 구현 방안

**Backend (NotificationService.gs)**:
```javascript
/**
 * 비자 만료 체크 (트리거: 매일 오전 9시)
 */
function checkVisaExpiry() {
  // 1. 모든 학생 조회
  // 2. VisaExpiry 확인
  // 3. 만료일 30일 이내면 알림 발송
  // 4. 이미 알림 보낸 학생은 스킵 (AuditLogs 확인)
}

/**
 * 이메일 알림 발송
 */
function sendVisaExpiryEmail(student, daysLeft) {
  // 1. 템플릿 로드
  // 2. 학생 언어에 맞게 i18n
  // 3. MailApp.sendEmail()
}
```

**트리거 설정**:
- GAS 트리거: 매일 오전 9시 실행
- 또는 수동 실행 버튼 제공

### ✅ 완료 조건
- [ ] 트리거 정상 작동
- [ ] 만료 30일 전 알림 발송 확인
- [ ] 중복 알림 방지 확인
- [ ] 이메일 수신 확인

---

## 📊 구현 우선순위 제안

### 1단계 (필수, 2-3일)
1. ✅ 관리자 비밀번호 변경 (2시간)
2. ✅ Excel 다운로드 (3시간)

### 2단계 (권장, 4-5일)
3. ✅ PDF 생활기록부 생성 (12시간)
4. ✅ Excel 업로드 (3시간)

### 3단계 (선택, 1주일)
5. ✅ 비자 만료 알림 (8시간)
6. ✅ 학생 자가 등록 (8시간)

---

## 🔧 기술 스택 (추가 필요)

| 기능 | 기술 |
|------|------|
| PDF 생성 | Google Docs API + DriveApp |
| Excel 처리 | SpreadsheetApp + Blob 변환 |
| 이메일 발송 | MailApp (GAS 내장) |
| SMS 발송 | 외부 API (SENS, 카카오 알림톡) |
| 트리거 | Apps Script Time-based Triggers |

---

## ✅ 전체 완료 조건

- [ ] 모든 5가지 기능 구현 완료
- [ ] 각 기능별 테스트 통과
- [ ] 문서화 완료 (사용자 가이드)
- [ ] 배포 및 운영 안정화

---

## 📝 참고사항

### 개발 시 주의사항
1. **GAS 실행 제한**: 최대 6분, 일일 호출 제한 확인
2. **Drive 용량**: PDF/Excel 파일 누적 시 용량 관리
3. **이메일 할당량**: MailApp 일일 100통 제한 (유료 계정: 1,500통)
4. **보안**: 민감 정보 암호화 유지

### 추가 검토 사항
- [ ] 백업 정책 수립 (주간/월간 자동 백업)
- [ ] 사용자 교육 자료 작성
- [ ] 운영 매뉴얼 작성

---

**Generated by**: bkit PDCA System
**Next Step**: Phase D Design 문서 작성 → 기능별 상세 설계
