# Student CRUD Design Document

> **Summary**: 학생 정보 CRUD (생성, 조회, 수정, 삭제) 기능 상세 설계
>
> **Project**: AJU E&J 학생관리프로그램
> **Feature**: student-crud
> **Version**: 1.0.0
> **Author**: AJU E&J
> **Date**: 2026-02-15
> **Status**: Draft
> **Planning Doc**: [student-crud.plan.md](../../01-plan/features/student-crud.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | [Schema Definition](../../01-plan/schema.md) | ✅ |
| Phase 2 | [Coding Conventions](../../01-plan/conventions.md) | ✅ |
| Phase 3 | Authentication System (Phase 1 완료) | ✅ |

---

## 1. Overview

### 1.1 Design Goals

1. **권한 기반 데이터 격리**: agency 역할은 자기 소속 학생만 접근
2. **Smart ID 자동 생성**: YY-AGENCY-SEQ 형식 (예: 26-AJU-001)
3. **완전한 다국어 지원**: 모든 UI 텍스트 i18n 시트 참조
4. **Soft Delete**: 실제 삭제 대신 IsActive = false
5. **감사 추적**: 모든 CRUD 작업 AuditLogs 기록

### 1.2 Design Principles

- **서버단 권한 검증 필수**: 클라이언트 우회 불가
- **일관된 API 응답 형식**: `{ success: boolean, data?: any, errorKey?: string }`
- **i18n 키 네이밍 규칙**: `{category}_{element}_{detail}`
- **에러 처리 표준화**: 모든 에러는 errorKey로 반환 (클라이언트에서 i18n 처리)

---

## 2. Architecture

### 2.1 Backend Structure (StudentService.gs)

```javascript
/**
 * StudentService.gs
 * 학생 CRUD 비즈니스 로직
 */

// ==================== READ ====================

/**
 * 학생 목록 조회
 * @param {string} sessionId - 세션 ID (클라이언트에서 전달)
 * @param {Object} filters - 필터 조건 { search?, sortBy?, sortOrder? }
 * @returns {Object} { success: true, data: students[] }
 */
function getStudentList(sessionId, filters) {
  try {
    // 1. 세션 검증
    var session = _validateSession(sessionId);

    // 2. Students 시트 읽기
    var students = _getAllRows(SHEETS.STUDENTS);

    // 3. 권한별 필터링
    if (session.role === 'agency') {
      students = students.filter(function(s) {
        return s.AgencyCode === session.agencyCode;
      });
    }

    // 4. IsActive = true만 조회
    students = students.filter(function(s) { return s.IsActive === true; });

    // 5. 검색 필터 적용
    if (filters && filters.search) {
      var searchLower = filters.search.toLowerCase();
      students = students.filter(function(s) {
        return (s.NameKR && s.NameKR.toLowerCase().indexOf(searchLower) >= 0) ||
               (s.NameVN && s.NameVN.toLowerCase().indexOf(searchLower) >= 0) ||
               (s.StudentID && s.StudentID.toLowerCase().indexOf(searchLower) >= 0);
      });
    }

    // 6. 정렬
    if (filters && filters.sortBy) {
      students.sort(function(a, b) {
        var aVal = a[filters.sortBy] || '';
        var bVal = b[filters.sortBy] || '';
        if (filters.sortOrder === 'desc') {
          return aVal < bVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }

    // 7. 감사 로그
    _saveAuditLog(session.loginId, 'READ', SHEETS.STUDENTS, 'LIST', sessionId);

    return { success: true, data: students };

  } catch (e) {
    Logger.log('ERROR in getStudentList: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

/**
 * 학생 정보 조회 (단일)
 * @param {string} sessionId - 세션 ID
 * @param {string} studentId - 학생 ID
 * @returns {Object} { success: true, data: student }
 */
function getStudentById(sessionId, studentId) {
  try {
    var session = _validateSession(sessionId);

    var students = _getAllRows(SHEETS.STUDENTS);
    var student = null;

    for (var i = 0; i < students.length; i++) {
      if (students[i].StudentID === studentId) {
        student = students[i];
        break;
      }
    }

    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    // 권한 검증
    _validatePermission(session, 'READ', SHEETS.STUDENTS, studentId);

    _saveAuditLog(session.loginId, 'READ', SHEETS.STUDENTS, studentId, sessionId);

    return { success: true, data: student };

  } catch (e) {
    Logger.log('ERROR in getStudentById: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== CREATE ====================

/**
 * 학생 등록
 * @param {string} sessionId - 세션 ID
 * @param {Object} studentData - 학생 정보 객체
 * @returns {Object} { success: true, data: { StudentID } }
 */
function createStudent(sessionId, studentData) {
  try {
    var session = _validateSession(sessionId);

    // 1. 필수 필드 검증
    var requiredFields = ['NameKR', 'NameVN', 'DOB', 'Gender', 'AgencyCode'];
    for (var i = 0; i < requiredFields.length; i++) {
      if (!studentData[requiredFields[i]]) {
        return { success: false, errorKey: 'err_required_field', field: requiredFields[i] };
      }
    }

    // 2. agency 역할은 자동으로 자기 AgencyCode 할당
    if (session.role === 'agency') {
      studentData.AgencyCode = session.agencyCode;
    }

    // 3. 중복 확인 (전화번호, 이메일)
    if (studentData.PhoneKR || studentData.Email) {
      var existing = _getAllRows(SHEETS.STUDENTS);
      for (var i = 0; i < existing.length; i++) {
        if (studentData.PhoneKR && existing[i].PhoneKR === studentData.PhoneKR) {
          return { success: false, errorKey: 'err_duplicate_phone' };
        }
        if (studentData.Email && existing[i].Email === studentData.Email) {
          return { success: false, errorKey: 'err_duplicate_email' };
        }
      }
    }

    // 4. Smart ID 생성
    var studentId = _generateSmartId(studentData.AgencyCode);
    studentData.StudentID = studentId;

    // 5. 메타 데이터 추가
    var now = getCurrentTimestamp();
    studentData.CreatedBy = session.loginId;
    studentData.CreatedAt = now;
    studentData.UpdatedBy = session.loginId;
    studentData.UpdatedAt = now;
    studentData.IsActive = true;

    // 6. Students 시트에 행 추가
    _appendRow(SHEETS.STUDENTS, studentData);

    // 7. 감사 로그
    _saveAuditLog(session.loginId, 'CREATE', SHEETS.STUDENTS, studentId, sessionId);

    return { success: true, data: { StudentID: studentId } };

  } catch (e) {
    Logger.log('ERROR in createStudent: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== UPDATE ====================

/**
 * 학생 정보 수정
 * @param {string} sessionId - 세션 ID
 * @param {string} studentId - 학생 ID
 * @param {Object} updates - 수정할 필드 { NameKR?, Phone?, ... }
 * @returns {Object} { success: true }
 */
function updateStudent(sessionId, studentId, updates) {
  try {
    var session = _validateSession(sessionId);

    // 1. 학생 존재 확인
    var student = _getRecordById(SHEETS.STUDENTS, studentId);
    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    // 2. 권한 검증
    _validatePermission(session, 'UPDATE', SHEETS.STUDENTS, studentId);

    // 3. StudentID 변경 금지
    if (updates.StudentID && updates.StudentID !== studentId) {
      return { success: false, errorKey: 'err_cannot_change_id' };
    }
    delete updates.StudentID;

    // 4. 중복 확인 (본인 제외)
    if (updates.PhoneKR || updates.Email) {
      var existing = _getAllRows(SHEETS.STUDENTS);
      for (var i = 0; i < existing.length; i++) {
        if (existing[i].StudentID === studentId) continue;
        if (updates.PhoneKR && existing[i].PhoneKR === updates.PhoneKR) {
          return { success: false, errorKey: 'err_duplicate_phone' };
        }
        if (updates.Email && existing[i].Email === updates.Email) {
          return { success: false, errorKey: 'err_duplicate_email' };
        }
      }
    }

    // 5. 메타 데이터 업데이트
    updates.UpdatedBy = session.loginId;
    updates.UpdatedAt = getCurrentTimestamp();

    // 6. Students 시트 업데이트
    _updateRow(SHEETS.STUDENTS, 'StudentID', studentId, updates);

    // 7. 감사 로그
    _saveAuditLog(session.loginId, 'UPDATE', SHEETS.STUDENTS, studentId, sessionId);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in updateStudent: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== DELETE ====================

/**
 * 학생 삭제 (Soft Delete)
 * @param {string} sessionId - 세션 ID
 * @param {string} studentId - 학생 ID
 * @returns {Object} { success: true }
 */
function deleteStudent(sessionId, studentId) {
  try {
    var session = _validateSession(sessionId);

    // 1. master 역할만 허용
    if (session.role !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 2. 학생 존재 확인
    var student = _getRecordById(SHEETS.STUDENTS, studentId);
    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    // 3. Soft Delete (IsActive = false)
    _updateRow(SHEETS.STUDENTS, 'StudentID', studentId, {
      IsActive: false,
      UpdatedBy: session.loginId,
      UpdatedAt: getCurrentTimestamp()
    });

    // 4. 감사 로그
    _saveAuditLog(session.loginId, 'DELETE', SHEETS.STUDENTS, studentId, sessionId);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in deleteStudent: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

### 2.2 Frontend Structure (Login.html 확장)

```html
<!-- Login.html 내 app-view 섹션 확장 -->

<div id="app-view">
  <!-- 기존 헤더 -->
  <div class="header">
    <h1>AJU E&J 학생관리 시스템</h1>
    <div class="header-right">
      <span class="user-info" id="user-info"></span>
      <button class="btn-lang" onclick="switchLanguage('ko')" data-i18n="btn_lang_ko">한국어</button>
      <button class="btn-lang" onclick="switchLanguage('vi')" data-i18n="btn_lang_vi">Tiếng Việt</button>
      <button class="btn-logout" onclick="handleLogout()" data-i18n="btn_logout">로그아웃</button>
    </div>
  </div>

  <div class="app-container">
    <!-- 학생 관리 섹션 -->
    <div class="student-section">
      <div class="section-header">
        <h2 data-i18n="title_student_management">학생 관리</h2>
        <button class="btn-primary" onclick="showCreateForm()" data-i18n="btn_add_student">
          + 학생 등록
        </button>
      </div>

      <!-- 검색/필터 바 -->
      <div class="search-bar">
        <input
          type="text"
          id="search-input"
          data-placeholder-i18n="placeholder_search_student"
          placeholder="이름, 학생ID로 검색..."
          onkeyup="handleSearchKeyup(event)"
        >
        <button class="btn-search" onclick="searchStudents()" data-i18n="btn_search">검색</button>

        <select id="sort-select" onchange="sortStudents()">
          <option value="EnrollmentDate-desc" data-i18n="sort_newest">최신 등록순</option>
          <option value="EnrollmentDate-asc" data-i18n="sort_oldest">오래된 순</option>
          <option value="NameKR-asc" data-i18n="sort_name_asc">이름 가나다순</option>
        </select>
      </div>

      <!-- 학생 목록 테이블 -->
      <div class="table-container">
        <table class="student-table">
          <thead>
            <tr>
              <th data-i18n="label_student_id">학생 ID</th>
              <th data-i18n="label_name_kr">한국 이름</th>
              <th data-i18n="label_name_vn">베트남 이름</th>
              <th data-i18n="label_dob">생년월일</th>
              <th data-i18n="label_gender">성별</th>
              <th data-i18n="label_agency">유학원</th>
              <th data-i18n="label_phone_kr">연락처</th>
              <th data-i18n="label_enrollment_date">등록일</th>
              <th data-i18n="label_actions">작업</th>
            </tr>
          </thead>
          <tbody id="student-list">
            <!-- JavaScript로 동적 생성 -->
          </tbody>
        </table>
      </div>

      <!-- 페이지네이션 -->
      <div class="pagination" id="pagination">
        <!-- JavaScript로 동적 생성 -->
      </div>

      <!-- 로딩/메시지 -->
      <div class="loading" id="student-loading" style="display:none;">
        <span data-i18n="msg_loading">로딩 중...</span>
      </div>
      <div class="no-data" id="no-data" style="display:none;">
        <span data-i18n="msg_no_students">등록된 학생이 없습니다.</span>
      </div>
    </div>
  </div>

  <!-- 학생 등록/수정 모달 -->
  <div class="modal" id="student-form-modal" style="display:none;">
    <div class="modal-overlay" onclick="closeModal()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modal-title" data-i18n="title_add_student">학생 등록</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>

      <form id="student-form" onsubmit="handleStudentSubmit(event)">
        <!-- 기본 정보 섹션 -->
        <div class="form-section">
          <h3 data-i18n="section_basic_info">기본 정보</h3>

          <div class="form-row">
            <div class="form-group">
              <label data-i18n="label_name_kr">한국 이름 *</label>
              <input type="text" name="NameKR" required data-placeholder-i18n="placeholder_name_kr">
            </div>
            <div class="form-group">
              <label data-i18n="label_name_vn">베트남 이름 *</label>
              <input type="text" name="NameVN" required data-placeholder-i18n="placeholder_name_vn">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label data-i18n="label_dob">생년월일 *</label>
              <input type="date" name="DOB" required>
            </div>
            <div class="form-group">
              <label data-i18n="label_gender">성별 *</label>
              <select name="Gender" required>
                <option value="" data-i18n="option_select">선택</option>
                <option value="M" data-i18n="option_male">남성</option>
                <option value="F" data-i18n="option_female">여성</option>
              </select>
            </div>
          </div>

          <div class="form-group" id="agency-select-group">
            <label data-i18n="label_agency">유학원 *</label>
            <select name="AgencyCode" required id="agency-select">
              <!-- JavaScript로 동적 생성 -->
            </select>
          </div>
        </div>

        <!-- 연락처 정보 섹션 -->
        <div class="form-section">
          <h3 data-i18n="section_contact_info">연락처 정보</h3>

          <div class="form-group">
            <label data-i18n="label_address_vn">베트남 주소</label>
            <input type="text" name="HomeAddressVN" data-placeholder-i18n="placeholder_address_vn">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label data-i18n="label_phone_kr">한국 연락처</label>
              <input type="tel" name="PhoneKR" data-placeholder-i18n="placeholder_phone_kr">
            </div>
            <div class="form-group">
              <label data-i18n="label_phone_vn">베트남 연락처</label>
              <input type="tel" name="PhoneVN" data-placeholder-i18n="placeholder_phone_vn">
            </div>
          </div>

          <div class="form-group">
            <label data-i18n="label_email">이메일</label>
            <input type="email" name="Email" data-placeholder-i18n="placeholder_email">
          </div>
        </div>

        <!-- 학부모 정보 섹션 -->
        <div class="form-section">
          <h3 data-i18n="section_parent_info">학부모 정보</h3>

          <div class="form-row">
            <div class="form-group">
              <label data-i18n="label_parent_name">학부모 이름</label>
              <input type="text" name="ParentNameVN" data-placeholder-i18n="placeholder_parent_name">
            </div>
            <div class="form-group">
              <label data-i18n="label_parent_phone">학부모 연락처</label>
              <input type="tel" name="ParentPhoneVN" data-placeholder-i18n="placeholder_parent_phone">
            </div>
          </div>

          <div class="form-group">
            <label data-i18n="label_parent_economic">학부모 경제 상황</label>
            <select name="ParentEconomic">
              <option value="" data-i18n="option_select">선택</option>
              <option value="상" data-i18n="option_high">상</option>
              <option value="중" data-i18n="option_medium">중</option>
              <option value="하" data-i18n="option_low">하</option>
            </select>
          </div>
        </div>

        <!-- 학업 정보 섹션 -->
        <div class="form-section">
          <h3 data-i18n="section_academic_info">학업 정보</h3>

          <div class="form-row">
            <div class="form-group">
              <label data-i18n="label_high_school_gpa">고등학교 성적</label>
              <input type="text" name="HighSchoolGPA" data-placeholder-i18n="placeholder_gpa">
            </div>
            <div class="form-group">
              <label data-i18n="label_enrollment_date">등록일</label>
              <input type="date" name="EnrollmentDate">
            </div>
          </div>

          <div class="form-group">
            <label data-i18n="label_status">상태</label>
            <select name="Status">
              <option value="재학" data-i18n="option_enrolled">재학</option>
              <option value="휴학" data-i18n="option_leave">휴학</option>
              <option value="졸업" data-i18n="option_graduated">졸업</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary" data-i18n="btn_save">저장</button>
          <button type="button" class="btn-secondary" onclick="closeModal()" data-i18n="btn_cancel">취소</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 삭제 확인 다이얼로그 -->
  <div class="confirm-dialog" id="delete-confirm" style="display:none;">
    <div class="dialog-overlay" onclick="closeDeleteDialog()"></div>
    <div class="dialog-content">
      <h3 data-i18n="title_confirm_delete">삭제 확인</h3>
      <p data-i18n="msg_confirm_delete">정말로 이 학생을 삭제하시겠습니까?</p>
      <p class="student-name" id="delete-student-name"></p>
      <div class="dialog-actions">
        <button class="btn-danger" onclick="confirmDelete()" data-i18n="btn_delete">삭제</button>
        <button class="btn-secondary" onclick="closeDeleteDialog()" data-i18n="btn_cancel">취소</button>
      </div>
    </div>
  </div>
</div>
```

### 2.3 JavaScript Functions (Login.html <script>)

```javascript
// ==================== 전역 변수 ====================
var studentList = [];          // 전체 학생 목록
var currentPage = 1;           // 현재 페이지
var itemsPerPage = 20;         // 페이지당 항목 수
var currentFilters = {};       // 현재 필터 조건
var editingStudentId = null;   // 수정 중인 학생 ID

// ==================== 초기화 ====================

// 앱 뷰 표시 시 학생 목록 로드
function showAppView() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'block';

  // 사용자 정보 표시
  if (currentUser) {
    document.getElementById('user-info').textContent =
      currentUser.loginId + ' (' + currentUser.agencyName + ')';
  }

  // 학생 목록 로드
  loadStudentList();

  // agency 역할이면 유학원 선택 필드 숨기기
  if (currentUser.role === 'agency') {
    document.getElementById('agency-select-group').style.display = 'none';
  }
}

// ==================== 학생 목록 로드 ====================

function loadStudentList() {
  showLoading(true);

  google.script.run
    .withSuccessHandler(function(response) {
      showLoading(false);
      if (response.success) {
        studentList = response.data;
        renderStudentTable();
      } else {
        showMessage(i18n[response.errorKey] || 'Error loading students');
      }
    })
    .withFailureHandler(function(error) {
      showLoading(false);
      showMessage(i18n['err_unknown']);
    })
    .getStudentList(currentSessionId, currentFilters);
}

// ==================== 테이블 렌더링 ====================

function renderStudentTable() {
  var tbody = document.getElementById('student-list');
  tbody.innerHTML = '';

  if (studentList.length === 0) {
    document.getElementById('no-data').style.display = 'block';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  document.getElementById('no-data').style.display = 'none';

  // 페이지네이션 계산
  var start = (currentPage - 1) * itemsPerPage;
  var end = Math.min(start + itemsPerPage, studentList.length);
  var pageData = studentList.slice(start, end);

  // 테이블 행 생성
  pageData.forEach(function(student) {
    var tr = document.createElement('tr');

    tr.innerHTML =
      '<td>' + student.StudentID + '</td>' +
      '<td>' + student.NameKR + '</td>' +
      '<td>' + student.NameVN + '</td>' +
      '<td>' + formatDate(student.DOB) + '</td>' +
      '<td>' + (student.Gender === 'M' ? i18n['option_male'] : i18n['option_female']) + '</td>' +
      '<td>' + student.AgencyCode + '</td>' +
      '<td>' + (student.PhoneKR || '-') + '</td>' +
      '<td>' + formatDate(student.EnrollmentDate) + '</td>' +
      '<td class="actions">' +
        '<button class="btn-sm btn-edit" onclick="showEditForm(\'' + student.StudentID + '\')">' +
          i18n['btn_edit'] +
        '</button>' +
        (currentUser.role === 'master' ?
          '<button class="btn-sm btn-delete" onclick="showDeleteDialog(\'' + student.StudentID + '\', \'' + student.NameKR + '\')">' +
            i18n['btn_delete'] +
          '</button>' : '') +
      '</td>';

    tbody.appendChild(tr);
  });

  // 페이지네이션 렌더링
  renderPagination();
}

function renderPagination() {
  var totalPages = Math.ceil(studentList.length / itemsPerPage);
  var paginationDiv = document.getElementById('pagination');
  paginationDiv.innerHTML = '';

  if (totalPages <= 1) return;

  // 이전 버튼
  var prevBtn = document.createElement('button');
  prevBtn.textContent = '‹';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = function() {
    currentPage--;
    renderStudentTable();
  };
  paginationDiv.appendChild(prevBtn);

  // 페이지 번호
  for (var i = 1; i <= totalPages; i++) {
    var pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    pageBtn.className = i === currentPage ? 'active' : '';
    pageBtn.onclick = (function(page) {
      return function() {
        currentPage = page;
        renderStudentTable();
      };
    })(i);
    paginationDiv.appendChild(pageBtn);
  }

  // 다음 버튼
  var nextBtn = document.createElement('button');
  nextBtn.textContent = '›';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = function() {
    currentPage++;
    renderStudentTable();
  };
  paginationDiv.appendChild(nextBtn);
}

// ==================== 검색/정렬 ====================

function searchStudents() {
  var searchValue = document.getElementById('search-input').value;
  currentFilters.search = searchValue;
  currentPage = 1;
  loadStudentList();
}

function handleSearchKeyup(event) {
  if (event.key === 'Enter') {
    searchStudents();
  }
}

function sortStudents() {
  var sortValue = document.getElementById('sort-select').value;
  var parts = sortValue.split('-');
  currentFilters.sortBy = parts[0];
  currentFilters.sortOrder = parts[1];
  currentPage = 1;
  loadStudentList();
}

// ==================== 학생 등록 ====================

function showCreateForm() {
  editingStudentId = null;
  document.getElementById('modal-title').setAttribute('data-i18n', 'title_add_student');
  document.getElementById('modal-title').textContent = i18n['title_add_student'];
  document.getElementById('student-form').reset();
  document.getElementById('student-form-modal').style.display = 'block';
}

function handleStudentSubmit(event) {
  event.preventDefault();

  var formData = {};
  var form = document.getElementById('student-form');
  var inputs = form.querySelectorAll('input, select');

  inputs.forEach(function(input) {
    if (input.name) {
      formData[input.name] = input.value;
    }
  });

  showLoading(true);

  if (editingStudentId) {
    // 수정
    google.script.run
      .withSuccessHandler(handleStudentSaveSuccess)
      .withFailureHandler(handleStudentSaveError)
      .updateStudent(currentSessionId, editingStudentId, formData);
  } else {
    // 등록
    google.script.run
      .withSuccessHandler(handleStudentSaveSuccess)
      .withFailureHandler(handleStudentSaveError)
      .createStudent(currentSessionId, formData);
  }
}

function handleStudentSaveSuccess(response) {
  showLoading(false);
  if (response.success) {
    showMessage(i18n['msg_save_success']);
    closeModal();
    loadStudentList();
  } else {
    showMessage(i18n[response.errorKey] || 'Save failed');
  }
}

function handleStudentSaveError(error) {
  showLoading(false);
  showMessage(i18n['err_unknown']);
}

// ==================== 학생 수정 ====================

function showEditForm(studentId) {
  editingStudentId = studentId;
  document.getElementById('modal-title').setAttribute('data-i18n', 'title_edit_student');
  document.getElementById('modal-title').textContent = i18n['title_edit_student'];

  showLoading(true);

  google.script.run
    .withSuccessHandler(function(response) {
      showLoading(false);
      if (response.success) {
        fillFormWithData(response.data);
        document.getElementById('student-form-modal').style.display = 'block';
      } else {
        showMessage(i18n[response.errorKey]);
      }
    })
    .withFailureHandler(function(error) {
      showLoading(false);
      showMessage(i18n['err_unknown']);
    })
    .getStudentById(currentSessionId, studentId);
}

function fillFormWithData(student) {
  var form = document.getElementById('student-form');
  for (var field in student) {
    var input = form.querySelector('[name="' + field + '"]');
    if (input) {
      input.value = student[field] || '';
    }
  }
}

// ==================== 학생 삭제 ====================

var deletingStudentId = null;

function showDeleteDialog(studentId, studentName) {
  deletingStudentId = studentId;
  document.getElementById('delete-student-name').textContent = studentName;
  document.getElementById('delete-confirm').style.display = 'block';
}

function confirmDelete() {
  showLoading(true);

  google.script.run
    .withSuccessHandler(function(response) {
      showLoading(false);
      if (response.success) {
        showMessage(i18n['msg_delete_success']);
        closeDeleteDialog();
        loadStudentList();
      } else {
        showMessage(i18n[response.errorKey]);
      }
    })
    .withFailureHandler(function(error) {
      showLoading(false);
      showMessage(i18n['err_unknown']);
    })
    .deleteStudent(currentSessionId, deletingStudentId);
}

function closeDeleteDialog() {
  deletingStudentId = null;
  document.getElementById('delete-confirm').style.display = 'none';
}

// ==================== 유틸리티 ====================

function closeModal() {
  document.getElementById('student-form-modal').style.display = 'none';
  editingStudentId = null;
}

function showLoading(show) {
  document.getElementById('student-loading').style.display = show ? 'block' : 'none';
}

function showMessage(message) {
  // 메시지 표시 로직 (추후 Toast UI 구현)
  alert(message);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  var date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR');
}
```

---

## 3. API Specification

### 3.1 getStudentList

**Endpoint**: `google.script.run.getStudentList(sessionId, filters)`

**Request**:
```javascript
{
  sessionId: "uuid-string",
  filters: {
    search: "검색어",      // optional
    sortBy: "NameKR",     // optional (NameKR, EnrollmentDate 등)
    sortOrder: "asc"      // optional (asc, desc)
  }
}
```

**Response (Success)**:
```javascript
{
  success: true,
  data: [
    {
      StudentID: "26-AJU-001",
      NameKR: "응웬반안",
      NameVN: "Nguyen Van An",
      DOB: "2003-05-15",
      Gender: "M",
      AgencyCode: "AJU",
      HomeAddressVN: "Ha Noi, Vietnam",
      PhoneKR: "010-1234-5678",
      PhoneVN: "+84-912-345-678",
      Email: "nguyen@example.com",
      ParentNameVN: "Nguyen Van Ba",
      ParentPhoneVN: "+84-913-456-789",
      ParentEconomic: "중",
      HighSchoolGPA: "8.5",
      EnrollmentDate: "2024-03-01",
      Status: "재학",
      CreatedBy: "admin",
      CreatedAt: "2024-03-01T10:00:00Z",
      UpdatedBy: "admin",
      UpdatedAt: "2024-03-01T10:00:00Z",
      IsActive: true
    }
  ]
}
```

**Response (Error)**:
```javascript
{
  success: false,
  errorKey: "err_session_expired"
}
```

**권한별 동작**:
- **master**: 모든 학생 조회
- **agency**: 자기 AgencyCode 학생만 조회
- **branch**: 모든 학생 조회 (읽기 전용)

---

### 3.2 getStudentById

**Endpoint**: `google.script.run.getStudentById(sessionId, studentId)`

**Request**:
```javascript
{
  sessionId: "uuid-string",
  studentId: "26-AJU-001"
}
```

**Response (Success)**:
```javascript
{
  success: true,
  data: {
    StudentID: "26-AJU-001",
    NameKR: "응웬반안",
    // ... (전체 필드)
  }
}
```

**Response (Error)**:
```javascript
{
  success: false,
  errorKey: "err_student_not_found"  // 또는 "err_permission_denied"
}
```

---

### 3.3 createStudent

**Endpoint**: `google.script.run.createStudent(sessionId, studentData)`

**Request**:
```javascript
{
  sessionId: "uuid-string",
  studentData: {
    NameKR: "응웬반안",
    NameVN: "Nguyen Van An",
    DOB: "2003-05-15",
    Gender: "M",
    AgencyCode: "AJU",
    HomeAddressVN: "Ha Noi, Vietnam",
    PhoneKR: "010-1234-5678",
    // ... (선택 필드)
  }
}
```

**필수 필드**:
- NameKR
- NameVN
- DOB
- Gender
- AgencyCode (agency 역할은 자동 할당)

**Response (Success)**:
```javascript
{
  success: true,
  data: {
    StudentID: "26-AJU-003"  // 자동 생성된 ID
  }
}
```

**Response (Error)**:
```javascript
{
  success: false,
  errorKey: "err_required_field",  // 또는 "err_duplicate_phone", "err_duplicate_email"
  field: "NameKR"  // optional (필수 필드 에러 시)
}
```

---

### 3.4 updateStudent

**Endpoint**: `google.script.run.updateStudent(sessionId, studentId, updates)`

**Request**:
```javascript
{
  sessionId: "uuid-string",
  studentId: "26-AJU-001",
  updates: {
    PhoneKR: "010-9999-8888",
    Status: "휴학"
  }
}
```

**제한 사항**:
- StudentID 변경 불가
- agency 역할은 자기 소속 학생만 수정 가능

**Response (Success)**:
```javascript
{
  success: true
}
```

**Response (Error)**:
```javascript
{
  success: false,
  errorKey: "err_permission_denied"  // 또는 "err_student_not_found", "err_cannot_change_id"
}
```

---

### 3.5 deleteStudent

**Endpoint**: `google.script.run.deleteStudent(sessionId, studentId)`

**Request**:
```javascript
{
  sessionId: "uuid-string",
  studentId: "26-AJU-001"
}
```

**권한 제한**: master 역할만 가능

**동작**: Soft Delete (IsActive = false로 변경)

**Response (Success)**:
```javascript
{
  success: true
}
```

**Response (Error)**:
```javascript
{
  success: false,
  errorKey: "err_permission_denied"  // 또는 "err_student_not_found"
}
```

---

## 4. Data Flow

### 4.1 학생 목록 조회 (READ)

```
[사용자]
   │
   ▼ 클릭 "학생 관리"
[Login.html]
   │
   ▼ showAppView() → loadStudentList()
[google.script.run]
   │
   ▼ .getStudentList(sessionId, filters)
[StudentService.gs]
   │
   ├─→ _validateSession(sessionId)         # 세션 확인
   ├─→ _getAllRows(SHEETS.STUDENTS)        # Students 시트 읽기
   ├─→ filter by session.role               # 권한별 필터링
   │    ├─ master: 전체
   │    ├─ agency: AgencyCode 필터
   │    └─ branch: 전체
   ├─→ filter by filters.search            # 검색 필터
   ├─→ sort by filters.sortBy              # 정렬
   ├─→ _saveAuditLog()                     # 감사 로그
   │
   ▼ return { success: true, data: students }
[Login.html]
   │
   ▼ renderStudentTable()                   # 테이블 렌더링
[사용자]
   │
   ▼ 학생 목록 확인
```

### 4.2 학생 등록 (CREATE)

```
[사용자]
   │
   ▼ 클릭 "+ 학생 등록"
[Login.html]
   │
   ▼ showCreateForm()                      # 폼 모달 표시
[사용자]
   │
   ▼ 폼 입력 후 "저장" 클릭
[Login.html]
   │
   ▼ handleStudentSubmit() → formData 수집
[google.script.run]
   │
   ▼ .createStudent(sessionId, formData)
[StudentService.gs]
   │
   ├─→ _validateSession(sessionId)
   ├─→ 필수 필드 검증 (NameKR, NameVN, DOB, Gender, AgencyCode)
   ├─→ agency 역할이면 AgencyCode 자동 할당
   ├─→ 중복 확인 (PhoneKR, Email)
   ├─→ _generateSmartId(AgencyCode)       # Smart ID 생성 (26-AJU-003)
   ├─→ 메타 데이터 추가 (CreatedBy, CreatedAt, UpdatedBy, UpdatedAt, IsActive)
   ├─→ _appendRow(SHEETS.STUDENTS)        # Students 시트에 행 추가
   ├─→ _saveAuditLog()
   │
   ▼ return { success: true, data: { StudentID } }
[Login.html]
   │
   ▼ handleStudentSaveSuccess()            # 성공 메시지
   ▼ closeModal()
   ▼ loadStudentList()                     # 목록 새로고침
[사용자]
   │
   ▼ 새 학생 목록 확인
```

### 4.3 학생 수정 (UPDATE)

```
[사용자]
   │
   ▼ 클릭 "수정" 버튼 (특정 학생)
[Login.html]
   │
   ▼ showEditForm(studentId)
[google.script.run]
   │
   ▼ .getStudentById(sessionId, studentId)
[StudentService.gs]
   │
   ├─→ _validateSession(sessionId)
   ├─→ _validatePermission(session, 'READ', SHEETS.STUDENTS, studentId)
   │
   ▼ return { success: true, data: student }
[Login.html]
   │
   ▼ fillFormWithData(student)             # 폼에 기존 데이터 채우기
   ▼ 모달 표시
[사용자]
   │
   ▼ 정보 수정 후 "저장" 클릭
[Login.html]
   │
   ▼ handleStudentSubmit() → formData 수집
[google.script.run]
   │
   ▼ .updateStudent(sessionId, studentId, updates)
[StudentService.gs]
   │
   ├─→ _validateSession(sessionId)
   ├─→ _getRecordById(SHEETS.STUDENTS, studentId)  # 존재 확인
   ├─→ _validatePermission(session, 'UPDATE', SHEETS.STUDENTS, studentId)
   ├─→ StudentID 변경 금지 체크
   ├─→ 중복 확인 (본인 제외)
   ├─→ UpdatedBy, UpdatedAt 추가
   ├─→ _updateRow(SHEETS.STUDENTS, 'StudentID', studentId, updates)
   ├─→ _saveAuditLog()
   │
   ▼ return { success: true }
[Login.html]
   │
   ▼ handleStudentSaveSuccess()
   ▼ closeModal()
   ▼ loadStudentList()
[사용자]
   │
   ▼ 수정된 목록 확인
```

### 4.4 학생 삭제 (DELETE)

```
[사용자]
   │
   ▼ 클릭 "삭제" 버튼 (master만 보임)
[Login.html]
   │
   ▼ showDeleteDialog(studentId, studentName)  # 확인 다이얼로그
[사용자]
   │
   ▼ "삭제" 확인 클릭
[Login.html]
   │
   ▼ confirmDelete()
[google.script.run]
   │
   ▼ .deleteStudent(sessionId, studentId)
[StudentService.gs]
   │
   ├─→ _validateSession(sessionId)
   ├─→ session.role === 'master' 확인        # master만 허용
   ├─→ _getRecordById(SHEETS.STUDENTS, studentId)
   ├─→ _updateRow(SHEETS.STUDENTS, 'StudentID', studentId, { IsActive: false })  # Soft Delete
   ├─→ _saveAuditLog()
   │
   ▼ return { success: true }
[Login.html]
   │
   ▼ showMessage(i18n['msg_delete_success'])
   ▼ closeDeleteDialog()
   ▼ loadStudentList()                      # 목록 새로고침 (삭제된 학생 제외)
[사용자]
   │
   ▼ 업데이트된 목록 확인
```

---

## 5. i18n Keys (Complete List)

### 5.1 버튼 (Buttons)

| Key | Korean | Vietnamese |
|-----|--------|------------|
| `btn_add_student` | + 학생 등록 | + Thêm sinh viên |
| `btn_search` | 검색 | Tìm kiếm |
| `btn_edit` | 수정 | Sửa |
| `btn_delete` | 삭제 | Xóa |
| `btn_save` | 저장 | Lưu |
| `btn_cancel` | 취소 | Hủy |
| `btn_lang_ko` | 한국어 | Tiếng Hàn |
| `btn_lang_vi` | Tiếng Việt | Tiếng Việt |
| `btn_logout` | 로그아웃 | Đăng xuất |

### 5.2 라벨 (Labels)

| Key | Korean | Vietnamese |
|-----|--------|------------|
| `label_student_id` | 학생 ID | Mã sinh viên |
| `label_name_kr` | 한국 이름 | Tên Hàn Quốc |
| `label_name_vn` | 베트남 이름 | Tên Việt Nam |
| `label_dob` | 생년월일 | Ngày sinh |
| `label_gender` | 성별 | Giới tính |
| `label_agency` | 유학원 | Cơ sở |
| `label_address_vn` | 베트남 주소 | Địa chỉ Việt Nam |
| `label_phone_kr` | 한국 연락처 | SĐT Hàn Quốc |
| `label_phone_vn` | 베트남 연락처 | SĐT Việt Nam |
| `label_email` | 이메일 | Email |
| `label_parent_name` | 학부모 이름 | Tên phụ huynh |
| `label_parent_phone` | 학부모 연락처 | SĐT phụ huynh |
| `label_parent_economic` | 학부모 경제 상황 | Tình hình kinh tế |
| `label_high_school_gpa` | 고등학교 성적 | Điểm trung học |
| `label_enrollment_date` | 등록일 | Ngày đăng ký |
| `label_status` | 상태 | Trạng thái |
| `label_actions` | 작업 | Thao tác |

### 5.3 타이틀 (Titles)

| Key | Korean | Vietnamese |
|-----|--------|------------|
| `title_student_management` | 학생 관리 | Quản lý sinh viên |
| `title_add_student` | 학생 등록 | Thêm sinh viên |
| `title_edit_student` | 학생 정보 수정 | Sửa thông tin |
| `title_confirm_delete` | 삭제 확인 | Xác nhận xóa |

### 5.4 섹션 (Sections)

| Key | Korean | Vietnamese |
|-----|--------|------------|
| `section_basic_info` | 기본 정보 | Thông tin cơ bản |
| `section_contact_info` | 연락처 정보 | Thông tin liên hệ |
| `section_parent_info` | 학부모 정보 | Thông tin phụ huynh |
| `section_academic_info` | 학업 정보 | Thông tin học tập |

### 5.5 메시지 (Messages)

| Key | Korean | Vietnamese |
|-----|--------|------------|
| `msg_loading` | 로딩 중... | Đang tải... |
| `msg_no_students` | 등록된 학생이 없습니다. | Không có sinh viên |
| `msg_save_success` | 저장되었습니다. | Đã lưu thành công |
| `msg_delete_success` | 삭제되었습니다. | Đã xóa thành công |
| `msg_confirm_delete` | 정말로 이 학생을 삭제하시겠습니까? | Bạn có chắc muốn xóa? |

### 5.6 에러 메시지 (Error Messages)

| Key | Korean | Vietnamese |
|-----|--------|------------|
| `err_required_field` | 필수 항목입니다. | Trường bắt buộc |
| `err_duplicate_phone` | 이미 등록된 전화번호입니다. | SĐT đã tồn tại |
| `err_duplicate_email` | 이미 등록된 이메일입니다. | Email đã tồn tại |
| `err_student_not_found` | 학생을 찾을 수 없습니다. | Không tìm thấy SV |
| `err_permission_denied` | 권한이 없습니다. | Không có quyền |
| `err_cannot_change_id` | 학생 ID는 변경할 수 없습니다. | Không thể đổi ID |
| `err_session_expired` | 세션이 만료되었습니다. 다시 로그인해주세요. | Phiên hết hạn |
| `err_unknown` | 오류가 발생했습니다. | Đã xảy ra lỗi |

### 5.7 옵션 (Options)

| Key | Korean | Vietnamese |
|-----|--------|------------|
| `option_select` | 선택 | Chọn |
| `option_male` | 남성 | Nam |
| `option_female` | 여성 | Nữ |
| `option_high` | 상 | Cao |
| `option_medium` | 중 | Trung bình |
| `option_low` | 하 | Thấp |
| `option_enrolled` | 재학 | Đang học |
| `option_leave` | 휴학 | Nghỉ học |
| `option_graduated` | 졸업 | Đã tốt nghiệp |

### 5.8 정렬 (Sort Options)

| Key | Korean | Vietnamese |
|-----|--------|------------|
| `sort_newest` | 최신 등록순 | Mới nhất |
| `sort_oldest` | 오래된 순 | Cũ nhất |
| `sort_name_asc` | 이름 가나다순 | Tên A-Z |

### 5.9 플레이스홀더 (Placeholders)

| Key | Korean | Vietnamese |
|-----|--------|------------|
| `placeholder_search_student` | 이름, 학생ID로 검색... | Tìm theo tên, mã... |
| `placeholder_name_kr` | 예: 김철수 | VD: Kim Chul Soo |
| `placeholder_name_vn` | 예: Nguyen Van An | VD: Nguyen Van An |
| `placeholder_address_vn` | 예: Ha Noi, Vietnam | VD: Ha Noi, Viet Nam |
| `placeholder_phone_kr` | 예: 010-1234-5678 | VD: 010-1234-5678 |
| `placeholder_phone_vn` | 예: +84-912-345-678 | VD: +84-912-345-678 |
| `placeholder_email` | 예: student@example.com | VD: student@example.com |
| `placeholder_parent_name` | 예: Nguyen Van Ba | VD: Nguyen Van Ba |
| `placeholder_parent_phone` | 예: +84-913-456-789 | VD: +84-913-456-789 |
| `placeholder_gpa` | 예: 8.5 | VD: 8.5 |

**Total: 60개 키** (기존 인증 시스템 키 제외)

---

## 6. Error Handling

### 6.1 Backend Error Handling Pattern

```javascript
function someFunction(sessionId, param) {
  try {
    // 1. 세션 검증
    var session = _validateSession(sessionId);
    // throws { errorKey: 'err_session_expired' }

    // 2. 권한 검증
    _validatePermission(session, 'ACTION', 'SHEET', 'ID');
    // throws { errorKey: 'err_permission_denied' }

    // 3. 비즈니스 로직
    // ...

    // 4. 성공 응답
    return { success: true, data: result };

  } catch (e) {
    Logger.log('ERROR in someFunction: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

### 6.2 Frontend Error Handling Pattern

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    showLoading(false);

    if (response.success) {
      // 성공 처리
      showMessage(i18n['msg_success']);
    } else {
      // 에러 처리 (i18n으로 변환)
      var errorMessage = i18n[response.errorKey] || i18n['err_unknown'];
      showMessage(errorMessage);

      // 세션 만료 시 로그아웃
      if (response.errorKey === 'err_session_expired') {
        clearSession();
        showLoginView();
      }
    }
  })
  .withFailureHandler(function(error) {
    showLoading(false);
    console.error('Network error:', error);
    showMessage(i18n['err_unknown']);
  })
  .someFunction(sessionId, param);
```

---

## 7. Permission Logic

### 7.1 권한별 기능 제한

| 기능 | master | agency | branch |
|-----|:------:|:------:|:------:|
| 전체 학생 조회 | ✅ | ❌ (자기 소속만) | ✅ (읽기 전용) |
| 학생 등록 | ✅ | ✅ (자기 소속으로) | ❌ |
| 학생 수정 | ✅ | ✅ (자기 소속만) | ❌ |
| 학생 삭제 | ✅ | ❌ | ❌ |

### 7.2 Auth.gs의 _validatePermission() 수정

```javascript
function _validatePermission(session, action, sheet, targetId) {
  // master는 모든 권한
  if (session.role === 'master') return;

  // branch는 삭제/수정 불가
  if (session.role === 'branch') {
    if (action === 'DELETE' || action === 'UPDATE' || action === 'CREATE') {
      var error = new Error('Permission denied');
      error.errorKey = 'err_permission_denied';
      throw error;
    }
    return;
  }

  // agency는 자기 소속만 접근 가능
  if (session.role === 'agency') {
    if (sheet === SHEETS.STUDENTS) {
      if (targetId) {
        var record = _getRecordById(sheet, targetId);
        if (record && record.AgencyCode !== session.agencyCode) {
          var error = new Error('Permission denied');
          error.errorKey = 'err_permission_denied';
          throw error;
        }
      }
    }
  }
}
```

---

## 8. CSS Styles (Login.html <style>)

```css
/* 학생 관리 섹션 */
.student-section {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  color: #333;
}

/* 검색 바 */
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-bar input {
  flex: 1;
  min-width: 200px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.search-bar select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn-search {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* 테이블 */
.table-container {
  overflow-x: auto;
}

.student-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.student-table thead {
  background: #4CAF50;
  color: white;
}

.student-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
}

.student-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.student-table tbody tr:hover {
  background: #f5f5f5;
}

.actions {
  display: flex;
  gap: 5px;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 13px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.btn-edit {
  background: #2196F3;
  color: white;
}

.btn-delete {
  background: #f44336;
  color: white;
}

/* 페이지네이션 */
.pagination {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-top: 20px;
}

.pagination button {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 3px;
}

.pagination button.active {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 모달 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
}

.modal-content {
  position: relative;
  max-width: 800px;
  max-height: 90vh;
  margin: 50px auto;
  background: white;
  border-radius: 8px;
  overflow-y: auto;
  padding: 30px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
}

/* 폼 */
.form-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  margin: 0 0 15px 0;
  color: #555;
  font-size: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #555;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 15px;
}

.btn-secondary {
  padding: 10px 20px;
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 15px;
}

/* 삭제 확인 다이얼로그 */
.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000;
}

.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
}

.dialog-content {
  position: relative;
  max-width: 400px;
  margin: 200px auto;
  background: white;
  border-radius: 8px;
  padding: 30px;
}

.dialog-content h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.dialog-content p {
  color: #666;
  margin-bottom: 10px;
}

.student-name {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-danger {
  padding: 10px 20px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* 로딩/메시지 */
.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
}

/* 반응형 */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .student-table {
    font-size: 13px;
  }

  .student-table th,
  .student-table td {
    padding: 8px;
  }

  .modal-content {
    margin: 20px;
    padding: 20px;
  }
}
```

---

## 9. Implementation Checklist

### 9.1 Backend (StudentService.gs)

- [ ] `getStudentList(sessionId, filters)` 구현
- [ ] `getStudentById(sessionId, studentId)` 구현
- [ ] `createStudent(sessionId, studentData)` 구현
  - [ ] 필수 필드 검증
  - [ ] 중복 확인 (전화번호, 이메일)
  - [ ] Smart ID 생성 (`_generateSmartId`)
  - [ ] agency 역할 자동 AgencyCode 할당
- [ ] `updateStudent(sessionId, studentId, updates)` 구현
  - [ ] StudentID 변경 금지
  - [ ] 권한 검증
- [ ] `deleteStudent(sessionId, studentId)` 구현
  - [ ] master 역할만 허용
  - [ ] Soft Delete (IsActive = false)
- [ ] 모든 함수에 감사 로그 추가
- [ ] 에러 처리 표준화 (errorKey 사용)

### 9.2 Frontend (Login.html)

- [ ] app-view 섹션 확장
  - [ ] 검색/필터 바
  - [ ] 학생 목록 테이블
  - [ ] 페이지네이션
- [ ] 학생 등록/수정 모달 구현
  - [ ] 21개 필드 폼
  - [ ] 섹션 구분 (기본 정보, 연락처, 학부모, 학업)
  - [ ] 필수 필드 마크 (*)
- [ ] 삭제 확인 다이얼로그
- [ ] JavaScript 함수 구현
  - [ ] `loadStudentList()`
  - [ ] `renderStudentTable()`
  - [ ] `renderPagination()`
  - [ ] `searchStudents()`
  - [ ] `sortStudents()`
  - [ ] `showCreateForm()`
  - [ ] `showEditForm(studentId)`
  - [ ] `handleStudentSubmit(event)`
  - [ ] `showDeleteDialog(studentId, studentName)`
  - [ ] `confirmDelete()`
- [ ] agency 역할은 유학원 선택 필드 숨기기
- [ ] master 역할만 삭제 버튼 표시
- [ ] CSS 스타일 추가
- [ ] 반응형 디자인 구현

### 9.3 i18n 시트

- [ ] 60개 i18n 키 추가
  - [ ] 버튼 (9개)
  - [ ] 라벨 (17개)
  - [ ] 타이틀 (4개)
  - [ ] 섹션 (4개)
  - [ ] 메시지 (5개)
  - [ ] 에러 메시지 (8개)
  - [ ] 옵션 (9개)
  - [ ] 정렬 (3개)
  - [ ] 플레이스홀더 (10개)
- [ ] 한국어 텍스트 입력
- [ ] 베트남어 번역 입력

### 9.4 Helpers.gs

- [ ] `_generateSmartId(agencyCode)` 함수 구현
  - [ ] 현재 연도 (YY)
  - [ ] AgencyCode
  - [ ] Sequence (해당 유학원의 마지막 번호 + 1)
  - [ ] 예: 26-AJU-001

### 9.5 Auth.gs

- [ ] `_validatePermission()` 함수 수정
  - [ ] branch 역할 제한 (CREATE, UPDATE, DELETE 불가)
  - [ ] agency 역할 AgencyCode 필터링

### 9.6 테스트

- [ ] master 역할 테스트
  - [ ] 전체 학생 조회
  - [ ] 학생 등록 (모든 유학원)
  - [ ] 학생 수정 (모든 학생)
  - [ ] 학생 삭제
- [ ] agency 역할 테스트
  - [ ] 자기 소속 학생만 조회
  - [ ] 학생 등록 (자동 AgencyCode 할당)
  - [ ] 자기 소속 학생만 수정
  - [ ] 타 유학원 학생 접근 시 에러 (err_permission_denied)
  - [ ] 삭제 버튼 미표시
- [ ] branch 역할 테스트
  - [ ] 전체 학생 조회 (읽기 전용)
  - [ ] 등록/수정/삭제 버튼 미표시
- [ ] 검색/정렬 기능 테스트
- [ ] 페이지네이션 테스트
- [ ] 다국어 전환 테스트 (KO/VI)
- [ ] 중복 확인 테스트 (전화번호, 이메일)
- [ ] Smart ID 생성 테스트
- [ ] 감사 로그 기록 확인
- [ ] 반응형 디자인 테스트 (모바일)

---

## 10. Next Steps

1. [ ] `/pdca do student-crud` - 구현 시작
2. [ ] i18n 시트에 60개 키 추가
3. [ ] StudentService.gs 구현
4. [ ] Login.html 확장 (UI + JavaScript)
5. [ ] CSS 스타일 추가
6. [ ] 테스트 (권한별, 기능별)
7. [ ] `/pdca analyze student-crud` - Gap 분석
8. [ ] `/pdca report student-crud` - 완료 보고서

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-15 | Initial draft - 학생 CRUD 상세 설계 | AJU E&J |
