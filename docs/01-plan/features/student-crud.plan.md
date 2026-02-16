# Student CRUD Planning Document

> **Summary**: 학생 정보 생성, 조회, 수정, 삭제(CRUD) 기능 구현. 권한별 데이터 격리, Smart ID 자동 생성, 다국어 UI 지원.
>
> **Project**: AJU E&J 학생관리프로그램
> **Feature**: student-crud
> **Version**: 1.0.0
> **Author**: AJU E&J
> **Date**: 2026-02-15
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

학생 정보를 체계적으로 관리할 수 있는 CRUD(Create, Read, Update, Delete) 기능을 구현합니다. 권한별 데이터 격리, Smart ID 자동 생성, 다국어 UI, 감사 로그를 핵심으로 하며, Google Apps Script + Google Sheets 기반으로 개발합니다.

### 1.2 Background

- **Phase 1 (인증 시스템) 완료**: 로그인, 세션 관리, 권한 검증 기능 구현됨
- **Students 시트 준비됨**: 21개 컬럼 구조 정의 완료
- **다음 우선순위**: 학생 데이터 CRUD가 시스템의 핵심 기능
- **기존 시스템**: Login.html의 app-view 섹션 확장 필요

### 1.3 Related Documents

- **Plan**: `docs/01-plan/features/gas-student-platform.plan.md` - 전체 프로젝트 계획
- **Schema**: `docs/01-plan/schema.md` - Students 시트 구조 정의
- **Conventions**: `docs/01-plan/conventions.md` - GAS 코딩 규칙
- **Design Document**: `docs/02-design/features/student-crud.design.md` (예정)

---

## 2. Scope

### 2.1 In Scope

- [x] **학생 목록 조회 (Read)**
  - [x] 권한별 필터링 (master: 전체, agency: 소속만, branch: 전체 읽기 전용)
  - [ ] 검색 기능 (이름, 학생ID, 유학원)
  - [ ] 정렬 기능 (등록일, 이름)
  - [ ] 페이지네이션 (20명씩)
  - [ ] 다국어 테이블 헤더

- [ ] **학생 등록 (Create)**
  - [ ] 학생 정보 입력 폼 (21개 필드)
  - [ ] Smart ID 자동 생성 (YY-AGENCY-SEQ)
  - [ ] 필수 필드 유효성 검사
  - [ ] 중복 확인 (전화번호, 이메일)
  - [ ] agency 역할은 자동으로 소속 AgencyCode 할당
  - [ ] 다국어 폼 라벨 및 플레이스홀더

- [ ] **학생 정보 수정 (Update)**
  - [ ] 기존 정보 불러오기
  - [ ] 수정 폼 (StudentID 변경 불가)
  - [ ] 권한 검증 (agency는 자기 소속만)
  - [ ] UpdatedAt, UpdatedBy 자동 기록
  - [ ] 감사 로그 기록

- [ ] **학생 삭제 (Delete)**
  - [ ] Soft Delete (IsActive = false로 변경)
  - [ ] master 역할만 삭제 가능
  - [ ] 삭제 확인 다이얼로그 (다국어)
  - [ ] 감사 로그 기록

- [ ] **공통 요구사항**
  - [ ] 모든 UI 텍스트 i18n 시트 참조
  - [ ] 모든 API에 서버단 권한 검증
  - [ ] 감사 로그 자동 기록
  - [ ] 반응형 UI (모바일 지원)

### 2.2 Out of Scope

- 엑셀 일괄 업로드/다운로드 (별도 Phase)
- PDF 생활기록부 생성 (별도 Phase)
- 고급 필터링 (날짜 범위, 복합 조건 등)
- 학생 사진 업로드
- 학생 상세 프로필 페이지 (현재는 목록 + 폼만)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | **학생 목록 조회**: 권한별 필터링 적용된 학생 목록 표시 | High | Pending |
| FR-02 | **검색 기능**: 이름(KR/VN), 학생ID, 유학원으로 검색 | Medium | Pending |
| FR-03 | **정렬 기능**: 등록일, 이름 오름차순/내림차순 | Medium | Pending |
| FR-04 | **페이지네이션**: 20명씩 페이지 분할 | Low | Pending |
| FR-05 | **학생 등록 폼**: 21개 필드 입력, 다국어 라벨 | High | Pending |
| FR-06 | **Smart ID 생성**: YY-AGENCY-SEQ 형식 자동 생성 (예: 26-AJU-001) | High | Pending |
| FR-07 | **필수 필드 검증**: NameKR, NameVN, DOB, Gender, AgencyCode 필수 | High | Pending |
| FR-08 | **중복 확인**: 전화번호, 이메일 중복 검증 | Medium | Pending |
| FR-09 | **학생 정보 수정**: 기존 정보 불러오기 + 수정 + 저장 | High | Pending |
| FR-10 | **권한 검증**: agency는 자기 소속 학생만 수정 가능 | High | Pending |
| FR-11 | **학생 삭제**: Soft Delete (IsActive = false) | Medium | Pending |
| FR-12 | **삭제 권한**: master 역할만 삭제 가능 | High | Pending |
| FR-13 | **감사 로그**: 모든 CRUD 작업 AuditLogs에 기록 | High | Pending |
| FR-14 | **다국어 UI**: 모든 라벨, 버튼, 메시지 i18n 시트 참조 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 학생 목록 조회 < 2초 (100명 기준) | Network 탭 측정 |
| Usability | 모바일 환경 폼 입력 편의성 | 실제 기기 테스트 |
| Security | 서버단 권한 검증 100% | 코드 리뷰, 침투 테스트 |
| Localization | i18n 참조율 100% | 하드코딩 텍스트 검색 (0건) |
| Auditability | 모든 CRUD 감사 로그 기록 | 로그 누락 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] StudentService.gs 구현 완료
  - [ ] `getStudentList(sessionId, filters)`
  - [ ] `getStudentById(sessionId, studentId)`
  - [ ] `createStudent(sessionId, studentData)`
  - [ ] `updateStudent(sessionId, studentId, updates)`
  - [ ] `deleteStudent(sessionId, studentId)` (Soft Delete)

- [ ] Login.html의 app-view 확장
  - [ ] 학생 목록 테이블
  - [ ] 학생 등록 폼
  - [ ] 학생 수정 폼
  - [ ] 검색/정렬 UI

- [ ] i18n 시트에 학생 관리 관련 텍스트 추가 (약 30개 키)

- [ ] 권한별 테스트 완료
  - [ ] master: 전체 학생 조회/수정/삭제
  - [ ] agency: 자기 소속 학생만 조회/수정
  - [ ] branch: 전체 학생 읽기 전용

- [ ] 감사 로그 정상 기록 확인

### 4.2 Quality Criteria

- [ ] i18n 참조율 100%
- [ ] 서버단 권한 검증 테스트 통과
- [ ] 모바일 반응형 정상 작동
- [ ] Smart ID 중복 없이 생성 확인

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| GAS 실행 시간 제한 (6분) 초과 | Medium | Low | 학생 목록 페이지네이션, 캐싱 활용 |
| 동시 접속 시 Smart ID 중복 생성 | High | Medium | Transaction Lock 패턴, ID 생성 시 중복 확인 |
| agency 역할이 타 유학원 데이터 접근 시도 | High | Medium | 모든 API에 서버단 AgencyCode 필터링 필수 |
| i18n 키 누락으로 하드코딩 텍스트 표출 | Medium | Medium | 빌드 시 i18n 키 검증, 폴백 텍스트 |
| 모바일에서 21개 필드 입력 UX 불편 | Medium | High | 필드 그룹화, 섹션 분리, 필수/선택 구분 |

---

## 6. Architecture Considerations

### 6.1 Backend Structure (StudentService.gs)

```javascript
// 학생 목록 조회
function getStudentList(sessionId, filters) {
  // 1. 세션 검증
  // 2. 권한별 필터링 (agency → AgencyCode 필터)
  // 3. 검색/정렬 적용
  // 4. 감사 로그
  // return { success: true, data: students }
}

// 학생 정보 조회 (단일)
function getStudentById(sessionId, studentId) {
  // 1. 세션 검증
  // 2. 권한 검증 (agency는 자기 소속만)
  // 3. Students 시트에서 조회
  // return { success: true, data: student }
}

// 학생 등록
function createStudent(sessionId, studentData) {
  // 1. 세션 검증
  // 2. 필수 필드 검증
  // 3. 중복 확인 (전화번호, 이메일)
  // 4. Smart ID 생성 (YY-AGENCY-SEQ)
  // 5. agency 역할은 자동 AgencyCode 할당
  // 6. Students 시트에 행 추가
  // 7. 감사 로그
  // return { success: true, data: { StudentID } }
}

// 학생 정보 수정
function updateStudent(sessionId, studentId, updates) {
  // 1. 세션 검증
  // 2. 권한 검증 (agency는 자기 소속만)
  // 3. StudentID 변경 불가
  // 4. UpdatedAt, UpdatedBy 자동 추가
  // 5. Students 시트 업데이트
  // 6. 감사 로그
  // return { success: true }
}

// 학생 삭제 (Soft Delete)
function deleteStudent(sessionId, studentId) {
  // 1. 세션 검증
  // 2. master 역할만 허용
  // 3. IsActive = false로 변경
  // 4. 감사 로그
  // return { success: true }
}
```

### 6.2 Frontend Structure (Login.html app-view 확장)

```html
<div id="app-view">
  <!-- 기존 헤더 -->
  <div class="header">...</div>

  <div class="app-container">
    <!-- 학생 관리 섹션 -->
    <div class="student-section">
      <!-- 검색/필터 -->
      <div class="search-bar">
        <input type="text" id="search-input" data-placeholder-i18n="placeholder_search_student">
        <button onclick="searchStudents()" data-i18n="btn_search">검색</button>
        <button onclick="showCreateForm()" data-i18n="btn_add_student">학생 등록</button>
      </div>

      <!-- 학생 목록 테이블 -->
      <table class="student-table">
        <thead>
          <tr>
            <th data-i18n="label_student_id">학생 ID</th>
            <th data-i18n="label_name_kr">한국 이름</th>
            <th data-i18n="label_name_vn">베트남 이름</th>
            <th data-i18n="label_dob">생년월일</th>
            <th data-i18n="label_agency">유학원</th>
            <th data-i18n="label_actions">작업</th>
          </tr>
        </thead>
        <tbody id="student-list"></tbody>
      </table>

      <!-- 페이지네이션 -->
      <div class="pagination" id="pagination"></div>
    </div>

    <!-- 학생 등록/수정 폼 (모달) -->
    <div class="modal" id="student-form-modal">
      <div class="modal-content">
        <h2 data-i18n="title_student_form">학생 정보</h2>
        <form id="student-form">
          <!-- 기본 정보 섹션 -->
          <div class="form-section">
            <h3 data-i18n="section_basic_info">기본 정보</h3>
            <div class="form-group">
              <label data-i18n="label_name_kr">한국 이름 *</label>
              <input type="text" name="NameKR" required>
            </div>
            <div class="form-group">
              <label data-i18n="label_name_vn">베트남 이름 *</label>
              <input type="text" name="NameVN" required>
            </div>
            <!-- ... 21개 필드 ... -->
          </div>

          <div class="form-actions">
            <button type="submit" data-i18n="btn_save">저장</button>
            <button type="button" onclick="closeModal()" data-i18n="btn_cancel">취소</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
```

### 6.3 i18n Keys (30개 예상)

```
// 공통
btn_add_student, btn_search, btn_edit, btn_delete, btn_save, btn_cancel

// 라벨
label_student_id, label_name_kr, label_name_vn, label_dob, label_gender,
label_agency, label_address, label_phone_kr, label_phone_vn, label_email,
label_parent_name, label_parent_phone, label_enrollment_date, label_status

// 섹션
section_basic_info, section_contact_info, section_parent_info, section_admin_info

// 메시지
msg_create_success, msg_update_success, msg_delete_success,
msg_confirm_delete, err_required_field, err_duplicate_phone, err_duplicate_email

// 플레이스홀더
placeholder_search_student, placeholder_name_kr, placeholder_phone
```

---

## 7. Implementation Roadmap

| Step | Task | Estimated Time |
|------|------|----------------|
| 1 | i18n 시트에 학생 관리 텍스트 30개 키 추가 | 30분 |
| 2 | StudentService.gs 백엔드 함수 구현 | 2-3시간 |
| 3 | Login.html app-view 확장 (목록 테이블) | 1-2시간 |
| 4 | 학생 등록 폼 UI 구현 (모달) | 2시간 |
| 5 | 학생 수정 폼 UI 구현 | 1시간 |
| 6 | 검색/정렬 기능 구현 | 1시간 |
| 7 | 페이지네이션 구현 | 1시간 |
| 8 | 삭제 기능 + 확인 다이얼로그 | 30분 |
| 9 | 권한별 테스트 (master/agency/branch) | 1시간 |
| 10 | 반응형 CSS 적용 및 모바일 테스트 | 1시간 |

**Total**: 약 10-12시간

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`student-crud.design.md`)
   - [ ] Students 시트 CRUD 흐름도
   - [ ] UI 와이어프레임
   - [ ] API 명세서
   - [ ] i18n 키 전체 목록

2. [ ] 구현 시작 (`/pdca do student-crud`)
   - [ ] StudentService.gs 작성
   - [ ] Login.html 확장
   - [ ] i18n 시트 업데이트

3. [ ] Gap 분석 (`/pdca analyze student-crud`)

4. [ ] 완료 보고서 (`/pdca report student-crud`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-15 | Initial draft - 학생 CRUD 계획 문서 작성 | AJU E&J |
