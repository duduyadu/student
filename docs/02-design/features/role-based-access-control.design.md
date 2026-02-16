# Role-Based Access Control (RBAC) 재설계 - 상세 설계

> 작성일: 2026-02-15
> Phase: Design
> 기반 문서: `role-based-access-control.plan.md`

---

## 목차

1. [시스템 아키텍처](#1-시스템-아키텍처)
2. [데이터베이스 설계](#2-데이터베이스-설계)
3. [API 스펙](#3-api-스펙)
4. [권한 검증 로직](#4-권한-검증-로직)
5. [UI/UX 상세 설계](#5-uiux-상세-설계)
6. [구현 가이드](#6-구현-가이드)
7. [테스트 케이스](#7-테스트-케이스)

---

## 1. 시스템 아키텍처

### 1.1 권한 계층 구조

```
┌─────────────────────────────────────────────┐
│           MASTER (관리자)                    │
│  - 모든 유학원 CRUD                          │
│  - 모든 학생 CRUD                            │
│  - 유학원 관리 탭 접근                       │
│  - 감사 로그 조회                            │
└─────────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│      AGENCY (유학원 관리자)                  │
│  - 자기 유학원 학생만 CRUD                   │
│  - 학생 삭제 권한 없음                       │
│  - AgencyCode 자동 할당                      │
└─────────────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│         STUDENT (학생) - Phase 3            │
│  - 본인 정보 조회/수정 (제한적)              │
│  - 타 학생 정보 조회 불가                    │
└─────────────────────────────────────────────┘
```

### 1.2 데이터 접근 흐름

```
클라이언트 요청
    ↓
세션 검증 (_validateSession)
    ↓
권한 검증 (_validatePermission)
    ↓
데이터 필터링 (role별)
    ↓
응답 반환
    ↓
감사 로그 기록
```

---

## 2. 데이터베이스 설계

### 2.1 Agencies 시트 (변경 없음)

| 컬럼명 | 타입 | 설명 | 필수 | 예시 |
|--------|------|------|------|------|
| AgencyCode | String | 유학원 코드 (PK) | ✅ | HANOI |
| LoginID | String | 로그인 ID | ✅ | hanoi_admin |
| AgencyName | String | 유학원명 | ✅ | 하노이 유학원 |
| PasswordHash | String | SHA-256 해시 | ✅ | abc123... |
| Role | String | 권한 (master/agency/branch) | ✅ | agency |
| LoginAttempts | Number | 로그인 시도 횟수 | ✅ | 0 |
| LastLogin | Timestamp | 마지막 로그인 시간 | - | 2026-02-15 10:00 |
| IsActive | Boolean | 활성화 상태 | ✅ | true |
| CreatedBy | String | 생성자 | ✅ | admin |
| CreatedAt | Timestamp | 생성일시 | ✅ | 2026-01-01 09:00 |
| UpdatedBy | String | 수정자 | ✅ | admin |
| UpdatedAt | Timestamp | 수정일시 | ✅ | 2026-02-15 10:00 |

**변경 사항**:
- ❌ 없음 (기존 구조 유지)

### 2.2 Students 시트 (변경 없음)

**AgencyCode 필드**:
- 학생이 소속된 유학원 코드
- 권한 필터링의 핵심 필드
- agency role: 자기 AgencyCode와 일치하는 학생만 조회

---

## 3. API 스펙

### 3.1 유학원 목록 조회 (수정)

**함수명**: `getAgencyList(sessionId)`

**위치**: `Auth.gs`

**변경 전**:
```javascript
function getAgencyList(sessionId) {
  var activeAgencies = agencies.filter(function(a) {
    return a.IsActive === true;
  });
  // MASTER 포함됨 ❌
}
```

**변경 후**:
```javascript
function getAgencyList(sessionId) {
  try {
    var session = _validateSession(sessionId);
    var agencies = _getAllRows(SHEETS.AGENCIES);

    // ✅ MASTER 제외 + 활성 유학원만
    var activeAgencies = agencies.filter(function(a) {
      return a.IsActive === true && a.AgencyCode !== 'MASTER';
    });

    var agencyList = activeAgencies.map(function(a) {
      return {
        AgencyCode: a.AgencyCode,
        AgencyName: a.AgencyName || a.AgencyCode  // ✅ 이름 우선
      };
    });

    _saveAuditLog(session.loginId, 'READ', SHEETS.AGENCIES, 'LIST', sessionId);

    return { success: true, data: agencyList };
  } catch (e) {
    Logger.log('ERROR in getAgencyList: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

**응답 예시**:
```json
{
  "success": true,
  "data": [
    {
      "AgencyCode": "HANOI",
      "AgencyName": "하노이 유학원"
    },
    {
      "AgencyCode": "HOCHIMINH",
      "AgencyName": "호치민 유학원"
    }
  ]
}
```

---

### 3.2 학생 목록 조회 (수정)

**함수명**: `getStudentList(sessionId, filters)`

**위치**: `StudentService.gs`

**변경 전**:
```javascript
// 권한별 필터링
if (session.role === 'agency') {
  students = students.filter(function(s) {
    return s.AgencyCode === session.agencyCode;
  });
}
```

**변경 후**:
```javascript
function getStudentList(sessionId, filters) {
  try {
    var session = _validateSession(sessionId);
    var students = _getAllRows(SHEETS.STUDENTS);

    // ✅ 권한별 필터링 강화
    if (session.role === 'master') {
      // 모든 학생 조회
    } else if (session.role === 'agency') {
      // 자기 유학원 학생만
      students = students.filter(function(s) {
        return s.AgencyCode === session.agencyCode;
      });
    } else if (session.role === 'student') {
      // ✅ Phase 3: 본인만
      students = students.filter(function(s) {
        return s.StudentID === session.studentId;
      });
    } else {
      // 알 수 없는 role
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // IsActive = true만 조회
    students = students.filter(function(s) { return s.IsActive === true; });

    // 검색 필터 적용
    if (filters && filters.search) {
      var searchLower = filters.search.toLowerCase();
      students = students.filter(function(s) {
        return (s.NameKR && s.NameKR.toLowerCase().indexOf(searchLower) >= 0) ||
               (s.NameVN && s.NameVN.toLowerCase().indexOf(searchLower) >= 0) ||
               (s.StudentID && s.StudentID.toLowerCase().indexOf(searchLower) >= 0);
      });
    }

    // 정렬
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

    _saveAuditLog(session.loginId, 'READ', SHEETS.STUDENTS, 'LIST', sessionId);

    return { success: true, data: students };

  } catch (e) {
    Logger.log('ERROR in getStudentList: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

---

### 3.3 학생 삭제 (수정)

**함수명**: `deleteStudent(sessionId, studentId)`

**위치**: `StudentService.gs`

**변경 전**:
```javascript
// master 역할만 허용
if (session.role !== 'master') {
  return { success: false, errorKey: 'err_permission_denied' };
}
```

**변경 후** (동일, 이미 구현됨):
```javascript
function deleteStudent(sessionId, studentId) {
  try {
    var session = _validateSession(sessionId);

    // ✅ master만 삭제 가능
    if (session.role !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    var student = _getRecordById(SHEETS.STUDENTS, studentId);
    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    // Soft Delete
    _updateRow(SHEETS.STUDENTS, 'StudentID', studentId, {
      IsActive: false,
      UpdatedBy: session.loginId,
      UpdatedAt: getCurrentTimestamp()
    });

    _saveAuditLog(session.loginId, 'DELETE', SHEETS.STUDENTS, studentId, sessionId);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in deleteStudent: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

---

### 3.4 학생 등록 (확인)

**함수명**: `createStudent(sessionId, studentData)`

**위치**: `StudentService.gs`

**현재 구현** (유지):
```javascript
// agency 역할은 자동으로 자기 AgencyCode 할당
if (session.role === 'agency') {
  studentData.AgencyCode = session.agencyCode;
}
```

**확인 사항**:
- ✅ agency role: AgencyCode 자동 할당 (이미 구현됨)
- ✅ master role: 드롭다운에서 선택
- ✅ 중복 체크 (PhoneKR, Email)

---

## 4. 권한 검증 로직

### 4.1 _validatePermission() 함수

**위치**: `Auth.gs`

**현재 구현**:
```javascript
function _validatePermission(session, action, sheet, targetId) {
  if (session.role === 'master') return;

  if (session.role === 'branch') {
    if (action === 'DELETE') {
      var error = new Error('Permission denied');
      error.errorKey = 'err_permission_denied';
      throw error;
    }
    return;
  }

  if (session.role === 'agency') {
    if (sheet === SHEETS.STUDENTS || sheet === SHEETS.CONSULTATIONS || sheet === SHEETS.EXAM_RESULTS) {
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

**변경 필요 없음** (현재 로직이 적절함)

**권한 매트릭스**:

| Action | master | agency | student (Phase 3) |
|--------|--------|--------|-------------------|
| READ | ✅ 모든 데이터 | ✅ 소속 데이터만 | ✅ 본인 데이터만 |
| CREATE | ✅ 가능 | ✅ 가능 (자동 할당) | ❌ 불가 |
| UPDATE | ✅ 모든 데이터 | ✅ 소속 데이터만 | ✅ 본인 데이터만 (제한) |
| DELETE | ✅ 가능 | ❌ 불가 | ❌ 불가 |

---

## 5. UI/UX 상세 설계

### 5.1 학생 등록 폼 - 유학원 드롭다운

**HTML 구조**:
```html
<!-- 학생 등록/수정 모달 -->
<div class="modal" id="student-form-modal">
  <form id="student-form">
    <div class="form-section">
      <h3 data-i18n="section_basic_info">기본 정보</h3>

      <!-- 유학원 선택 (master만 표시, agency는 숨김) -->
      <div class="form-group" id="agency-select-group">
        <label data-i18n="label_agency">유학원 *</label>
        <select name="AgencyCode" required id="agency-select">
          <!-- JavaScript로 동적 생성 -->
        </select>
      </div>

      <!-- ... 나머지 필드 ... -->
    </div>
  </form>
</div>
```

**JavaScript 구현**:
```javascript
function loadAgencyList() {
  google.script.run
    .withSuccessHandler(function(response) {
      if (response.success) {
        var select = document.getElementById('agency-select');
        select.innerHTML = '<option value="" data-i18n="option_select">선택</option>';

        // ✅ AgencyName 표시, MASTER는 백엔드에서 이미 필터링됨
        response.data.forEach(function(agency) {
          var option = document.createElement('option');
          option.value = agency.AgencyCode;
          option.textContent = agency.AgencyName;  // ✅ 이름 표시
          select.appendChild(option);
        });
      }
    })
    .withFailureHandler(function(error) {
      showMessage(i18n['err_unknown']);
    })
    .getAgencyList(currentSessionId);
}
```

**렌더링 결과**:
```html
<select name="AgencyCode" id="agency-select">
  <option value="">선택</option>
  <!-- MASTER 없음 -->
  <option value="HANOI">하노이 유학원</option>
  <option value="HOCHIMINH">호치민 유학원</option>
  <option value="DANANG">다낭 유학원</option>
</select>
```

---

### 5.2 학생 목록 - 삭제 버튼 제어

**현재 코드** (Login.html):
```javascript
function renderStudentTable() {
  var tbody = document.getElementById('student-table-body');
  var html = '';

  pageData.forEach(function(student) {
    html += '<tr>';
    // ... 컬럼들 ...
    html += '<td class="action-buttons">';
    html += '<button class="btn-edit" onclick="showEditForm(\'' + student.StudentID + '\')" data-i18n="btn_edit">수정</button>';

    // ❌ 모든 role에 삭제 버튼 표시됨
    html += '<button class="btn-delete" onclick="showDeleteDialog(\'' + student.StudentID + '\', \'' + (student.NameKR || student.NameVN) + '\')" data-i18n="btn_delete">삭제</button>';

    html += '</td>';
    html += '</tr>';
  });

  tbody.innerHTML = html;
}
```

**변경 후**:
```javascript
function renderStudentTable() {
  var tbody = document.getElementById('student-table-body');
  var html = '';

  pageData.forEach(function(student) {
    html += '<tr>';
    // ... 컬럼들 ...
    html += '<td class="action-buttons">';
    html += '<button class="btn-edit" onclick="showEditForm(\'' + student.StudentID + '\')" data-i18n="btn_edit">수정</button>';

    // ✅ master만 삭제 버튼 표시
    if (currentUser.role === 'master') {
      html += '<button class="btn-delete" onclick="showDeleteDialog(\'' + student.StudentID + '\', \'' + (student.NameKR || student.NameVN) + '\')" data-i18n="btn_delete">삭제</button>';
    }

    html += '</td>';
    html += '</tr>';
  });

  tbody.innerHTML = html;
}
```

---

### 5.3 showAppView() - 역할별 UI 제어

**현재 코드**:
```javascript
function showAppView() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'block';

  // 사용자 정보 표시
  if (currentUser) {
    var roleLabel = {
      'master': 'Admin',
      'agency': currentUser.agencyName || currentUser.agencyCode,
      'branch': 'Branch'
    };
    document.getElementById('user-info').textContent =
      currentUser.loginId + ' (' + (roleLabel[currentUser.role] || currentUser.role) + ')';
  }

  loadStudentList();
  loadAgencyList();

  // agency 역할이면 유학원 선택 필드 숨기기
  if (currentUser.role === 'agency') {
    document.getElementById('agency-select-group').style.display = 'none';
  }

  // ✅ master 역할이면 유학원 관리 탭 표시
  if (currentUser.role === 'master') {
    document.getElementById('agency-tab-btn').style.display = 'block';
  }
}
```

**추가 제어 필요**:
```javascript
function showAppView() {
  // ... 기존 코드 ...

  // ✅ role별 UI 제어
  if (currentUser.role === 'agency') {
    // 유학원 선택 필드 숨김
    document.getElementById('agency-select-group').style.display = 'none';
  }

  if (currentUser.role === 'master') {
    // 유학원 관리 탭 표시
    document.getElementById('agency-tab-btn').style.display = 'block';
  }

  // ✅ Phase 3: student role
  if (currentUser.role === 'student') {
    // 학생 등록 버튼 숨김
    document.querySelector('[onclick="showCreateForm()"]').style.display = 'none';
    // 유학원 선택 필드 숨김
    document.getElementById('agency-select-group').style.display = 'none';
  }
}
```

---

## 6. 구현 가이드

### 6.1 Phase 1: 유학원 드롭다운 개선

#### Step 1: Auth.gs 수정

**파일**: `src/Auth.gs`

**수정 위치**: `getAgencyList()` 함수 (라인 236-266)

**변경 내용**:
```javascript
// 라인 244-247 수정
var activeAgencies = agencies.filter(function(a) {
  return a.IsActive === true && a.AgencyCode !== 'MASTER';  // ← 추가
});
```

#### Step 2: 테스트

1. clasp push
2. 웹앱 재배포
3. master 계정 로그인
4. 학생 등록 클릭
5. 유학원 드롭다운 확인:
   - MASTER 없음 확인
   - "하노이 유학원" 등 이름 표시 확인

---

### 6.2 Phase 2: 권한 제어 강화

#### Step 1: StudentService.gs 수정

**파일**: `src/StudentService.gs`

**수정 위치 1**: `getStudentList()` 함수 (라인 14-62)

**변경 전** (라인 23-27):
```javascript
if (session.role === 'agency') {
  students = students.filter(function(s) {
    return s.AgencyCode === session.agencyCode;
  });
}
```

**변경 후**:
```javascript
if (session.role === 'master') {
  // 모든 학생 조회
} else if (session.role === 'agency') {
  students = students.filter(function(s) {
    return s.AgencyCode === session.agencyCode;
  });
} else if (session.role === 'student') {
  // Phase 3: 본인만
  students = students.filter(function(s) {
    return s.StudentID === session.studentId;
  });
} else {
  return { success: false, errorKey: 'err_permission_denied' };
}
```

**수정 위치 2**: `deleteStudent()` 함수

**확인**: 이미 master 전용으로 구현됨 (라인 238-241)

---

#### Step 2: Login.html 수정

**파일**: `src/Login.html`

**수정 위치**: `renderStudentTable()` 함수

**수정 내용**:
```javascript
// 삭제 버튼 조건부 렌더링
if (currentUser.role === 'master') {
  html += '<button class="btn-delete" onclick="showDeleteDialog(\'' + student.StudentID + '\', \'' + (student.NameKR || student.NameVN) + '\')" data-i18n="btn_delete">삭제</button>';
}
```

#### Step 3: 테스트

1. master 계정 테스트:
   - 모든 학생 조회 확인
   - 삭제 버튼 표시 확인

2. agency 계정 테스트:
   - 자기 유학원 학생만 조회 확인
   - 삭제 버튼 미표시 확인
   - 타 유학원 학생 조회 불가 확인

---

### 6.3 Phase 3: student Role (선택적)

> **참고**: 현재는 구현하지 않음. 추후 필요 시 별도 설계 문서 작성.

**필요한 작업**:
1. Students 시트에 StudentLoginID, StudentPasswordHash 컬럼 추가
2. 학생 전용 로그인 함수 생성
3. 본인 정보 조회/수정 API 생성
4. 학생 전용 UI 페이지 생성

---

## 7. 테스트 케이스

### 7.1 Phase 1 테스트

| TC | 설명 | 입력 | 예상 결과 | Pass |
|----|------|------|-----------|------|
| TC-P1-01 | MASTER 필터링 | master 로그인 → 학생 등록 | 드롭다운에 MASTER 없음 | ⬜ |
| TC-P1-02 | 유학원 이름 표시 | master 로그인 → 학생 등록 | "하노이 유학원" 표시 | ⬜ |
| TC-P1-03 | 활성 유학원만 | IsActive=false 유학원 | 드롭다운에 미표시 | ⬜ |

### 7.2 Phase 2 테스트

| TC | 설명 | 입력 | 예상 결과 | Pass |
|----|------|------|-----------|------|
| TC-P2-01 | master 전체 조회 | master 로그인 | 모든 유학원 학생 표시 | ⬜ |
| TC-P2-02 | agency 소속만 조회 | HANOI 로그인 | HANOI 학생만 표시 | ⬜ |
| TC-P2-03 | master 삭제 가능 | master 로그인 | 삭제 버튼 표시 | ⬜ |
| TC-P2-04 | agency 삭제 불가 | HANOI 로그인 | 삭제 버튼 미표시 | ⬜ |
| TC-P2-05 | agency 타 유학원 조회 불가 | HANOI 로그인 | HOCHIMINH 학생 미표시 | ⬜ |

### 7.3 회귀 테스트

| TC | 설명 | 입력 | 예상 결과 | Pass |
|----|------|------|-----------|------|
| TC-REG-01 | 학생 등록 (master) | 드롭다운 선택 → 등록 | 정상 등록 | ⬜ |
| TC-REG-02 | 학생 등록 (agency) | 자동 할당 → 등록 | 정상 등록 | ⬜ |
| TC-REG-03 | 학생 수정 (master) | 모든 학생 수정 | 정상 수정 | ⬜ |
| TC-REG-04 | 학생 수정 (agency) | 소속 학생 수정 | 정상 수정 | ⬜ |
| TC-REG-05 | 학생 삭제 (master) | 학생 삭제 | Soft Delete 성공 | ⬜ |

---

## 8. 배포 체크리스트

### Phase 1 배포

- [ ] Auth.gs 수정 (MASTER 필터링)
- [ ] clasp push
- [ ] 웹앱 재배포 (새 버전)
- [ ] TC-P1-01 ~ TC-P1-03 테스트
- [ ] 회귀 테스트 (TC-REG-01 ~ TC-REG-02)
- [ ] 사용자 안내

### Phase 2 배포

- [ ] StudentService.gs 수정 (role 필터링 강화)
- [ ] Login.html 수정 (삭제 버튼 제어)
- [ ] clasp push
- [ ] 웹앱 재배포 (새 버전)
- [ ] TC-P2-01 ~ TC-P2-05 테스트
- [ ] 회귀 테스트 전체
- [ ] 사용자 안내

---

## 9. 전체 코드 요약

### 9.1 Auth.gs 변경 사항

```javascript
// ========== Auth.gs ==========

/**
 * 유학원 목록 조회 (학생 등록 시 드롭다운용)
 * ✅ MASTER 제외, 유학원 이름 표시
 */
function getAgencyList(sessionId) {
  try {
    var session = _validateSession(sessionId);
    var agencies = _getAllRows(SHEETS.AGENCIES);

    // ✅ MASTER 제외 + IsActive = true
    var activeAgencies = agencies.filter(function(a) {
      return a.IsActive === true && a.AgencyCode !== 'MASTER';
    });

    var agencyList = activeAgencies.map(function(a) {
      return {
        AgencyCode: a.AgencyCode,
        AgencyName: a.AgencyName || a.AgencyCode
      };
    });

    _saveAuditLog(session.loginId, 'READ', SHEETS.AGENCIES, 'LIST', sessionId);

    return { success: true, data: agencyList };
  } catch (e) {
    Logger.log('ERROR in getAgencyList: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

---

### 9.2 StudentService.gs 변경 사항

```javascript
// ========== StudentService.gs ==========

/**
 * 학생 목록 조회
 * ✅ role별 필터링 강화
 */
function getStudentList(sessionId, filters) {
  try {
    var session = _validateSession(sessionId);
    var students = _getAllRows(SHEETS.STUDENTS);

    // ✅ 권한별 필터링
    if (session.role === 'master') {
      // 모든 학생 조회
    } else if (session.role === 'agency') {
      students = students.filter(function(s) {
        return s.AgencyCode === session.agencyCode;
      });
    } else if (session.role === 'student') {
      // Phase 3: 본인만
      students = students.filter(function(s) {
        return s.StudentID === session.studentId;
      });
    } else {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // IsActive = true만
    students = students.filter(function(s) { return s.IsActive === true; });

    // 검색 필터
    if (filters && filters.search) {
      var searchLower = filters.search.toLowerCase();
      students = students.filter(function(s) {
        return (s.NameKR && s.NameKR.toLowerCase().indexOf(searchLower) >= 0) ||
               (s.NameVN && s.NameVN.toLowerCase().indexOf(searchLower) >= 0) ||
               (s.StudentID && s.StudentID.toLowerCase().indexOf(searchLower) >= 0);
      });
    }

    // 정렬
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

    _saveAuditLog(session.loginId, 'READ', SHEETS.STUDENTS, 'LIST', sessionId);
    return { success: true, data: students };

  } catch (e) {
    Logger.log('ERROR in getStudentList: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

/**
 * 학생 삭제 (Soft Delete)
 * ✅ master만 가능 (이미 구현됨)
 */
function deleteStudent(sessionId, studentId) {
  try {
    var session = _validateSession(sessionId);

    // ✅ master만 삭제 가능
    if (session.role !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    var student = _getRecordById(SHEETS.STUDENTS, studentId);
    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    _updateRow(SHEETS.STUDENTS, 'StudentID', studentId, {
      IsActive: false,
      UpdatedBy: session.loginId,
      UpdatedAt: getCurrentTimestamp()
    });

    _saveAuditLog(session.loginId, 'DELETE', SHEETS.STUDENTS, studentId, sessionId);
    return { success: true };

  } catch (e) {
    Logger.log('ERROR in deleteStudent: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

---

### 9.3 Login.html 변경 사항

```javascript
// ========== Login.html ==========

/**
 * 학생 목록 테이블 렌더링
 * ✅ master만 삭제 버튼 표시
 */
function renderStudentTable() {
  var tbody = document.getElementById('student-table-body');
  var noData = document.getElementById('no-data');

  if (studentList.length === 0) {
    tbody.innerHTML = '';
    noData.style.display = 'block';
    return;
  }

  noData.style.display = 'none';

  var start = (currentPage - 1) * itemsPerPage;
  var end = start + itemsPerPage;
  var pageData = studentList.slice(start, end);

  var html = '';
  pageData.forEach(function(student) {
    html += '<tr>';
    html += '<td>' + (student.StudentID || '-') + '</td>';
    html += '<td>' + (student.NameKR || '-') + '</td>';
    html += '<td>' + (student.NameVN || '-') + '</td>';
    html += '<td>' + formatDate(student.DOB) + '</td>';
    html += '<td>' + (student.Gender === 'M' ? '남성' : '여성') + '</td>';
    html += '<td>' + (student.AgencyCode || '-') + '</td>';
    html += '<td>' + (student.PhoneKR || '-') + '</td>';
    html += '<td>' + (student.Email || '-') + '</td>';
    html += '<td>' + (student.Status || '-') + '</td>';
    html += '<td class="action-buttons">';
    html += '<button class="btn-edit" onclick="showEditForm(\'' + student.StudentID + '\')" data-i18n="btn_edit">수정</button>';

    // ✅ master만 삭제 버튼 표시
    if (currentUser.role === 'master') {
      html += '<button class="btn-delete" onclick="showDeleteDialog(\'' + student.StudentID + '\', \'' + (student.NameKR || student.NameVN) + '\')" data-i18n="btn_delete">삭제</button>';
    }

    html += '</td>';
    html += '</tr>';
  });

  tbody.innerHTML = html;
}
```

---

## 10. 구현 순서 (한 번에 작업)

### Step 1: 백엔드 수정
```bash
# Auth.gs 수정
1. getAgencyList() 함수에서 MASTER 필터링 추가

# StudentService.gs 확인
1. getStudentList() role 필터링 확인
2. deleteStudent() master 전용 확인 (이미 구현됨)
```

### Step 2: 프론트엔드 수정
```bash
# Login.html 수정
1. renderStudentTable()에서 삭제 버튼 조건부 렌더링
```

### Step 3: 배포
```bash
clasp push --force
clasp deploy
```

### Step 4: 테스트
```bash
# Phase 1 테스트
- MASTER 필터링 확인
- 유학원 이름 표시 확인

# Phase 2 테스트
- master: 모든 학생 조회, 삭제 버튼 표시
- agency: 소속 학생만 조회, 삭제 버튼 미표시
```

---

## 11. 최종 확인사항

### ✅ Phase 1 (유학원 드롭다운)
- [ ] Auth.gs → MASTER 필터링
- [ ] AgencyName 표시 (이미 구현됨)
- [ ] 테스트 완료

### ✅ Phase 2 (권한 제어)
- [ ] StudentService.gs → role 필터링 확인
- [ ] Login.html → 삭제 버튼 제어
- [ ] 테스트 완료

### ⏳ Phase 3 (student Role)
- 추후 필요 시 별도 설계

---

**작성자**: Claude (PDCA Design Phase)
**다음 단계**: `/pdca do role-based-access-control` (구현 시작)
