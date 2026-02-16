# Version Audit Report

> **Created**: 2026-02-16
> **Purpose**: 전체 파일 구조의 v1.0/v2.0 버전 일관성 검사

---

## 1. 백엔드 서비스 (*.gs)

### ✅ v2.0 전환 완료 (3개 파일)

| File | Status | Auth Pattern | Session | User Field |
|------|--------|--------------|---------|------------|
| **Auth.gs** | ✅ v2.0 | `validateSession(sessionToken)` | CacheService | userId, userType, agencyCode |
| **StudentService.gs** | ✅ v2.0 | `validateSession(sessionToken)` | sessionToken | session.userType |
| **AgencyService.gs** | ⚠️ 부분 v2.0 | READ 함수만 v2.0 | sessionToken | CUD 함수는 v1.0 |

**Auth.gs v2.0 Functions**:
- ✅ `login(loginId, password, userType)` - v2.0
- ✅ `validateSession(sessionToken)` - v2.0 (public)
- ✅ `_validatePermission(session, action, sheet, targetId)` - v2.0
- ✅ `checkSession(sessionToken)` - v2.0 wrapper

**StudentService.gs v2.0 Functions** (6개):
- ✅ `getStudentList(sessionToken, filters)` - v2.0
- ✅ `getStudentById(sessionToken, studentId)` - v2.0
- ✅ `createStudent(sessionToken, studentData)` - v2.0
- ✅ `updateStudent(sessionToken, studentId, updates)` - v2.0
- ✅ `deleteStudent(sessionToken, studentId)` - v2.0
- ✅ `getStudentCount(sessionToken)` - v2.0

**AgencyService.gs v2.0 완료** (2026-02-16 완료):
- ✅ `getAgencyList(sessionToken)` - v2.0 (드롭다운용)
- ✅ `getAgencyListForAdmin(sessionToken)` - v2.0
- ✅ `getAgencyById(sessionToken, agencyCode)` - v2.0
- ✅ `createAgency(sessionToken, agencyData)` - ✅ v2.0
- ✅ `updateAgency(sessionToken, agencyCode, updates)` - ✅ v2.0
- ✅ `deleteAgency(sessionToken, agencyCode)` - ✅ v2.0

---

### ❌ v1.0 패턴 잔존 (8개 파일)

| File | v1.0 Count | Status | Priority | 사용 여부 |
|------|-----------|--------|----------|----------|
| **ScheduleService.gs** | 25 | ❌ v1.0 | P3 (Low) | Phase 6 예정 |
| **DashboardService.gs** | 16 | ❌ v1.0 | P3 (Low) | Phase 7 예정 |
| **AnalyticsService.gs** | 13 | ❌ v1.0 | P3 (Low) | Phase 7 예정 |
| **SearchService.gs** | 10 | ❌ v1.0 | P3 (Low) | Phase 5 예정 |
| **BackupService.gs** | 8 | ❌ v1.0 | P2 (Medium) | 사용 중 |
| **ExcelService.gs** | 7 | ❌ v1.0 | P2 (Medium) | 사용 중 |
| **FileService.gs** | 7 | ❌ v1.0 | P2 (Medium) | 사용 중 |
| **AuditService.gs** | 1 | ❌ v1.0 | P1 (High) | 사용 중 |

**v1.0 패턴 문제점**:
```javascript
// ❌ v1.0 패턴
function createAgency(sessionId, agencyData) {
  var session = _validateSession(sessionId);  // ❌ 존재하지 않는 함수!

  if (session.role !== 'master') {            // ❌ session.role (v1.0)
    return { success: false, errorKey: 'err_permission_denied' };
  }
}
```

**v2.0로 전환해야 하는 패턴**:
```javascript
// ✅ v2.0 패턴
function createAgency(sessionToken, agencyData) {
  var sessionResult = validateSession(sessionToken);  // ✅ public 함수
  if (!sessionResult.success) {
    return sessionResult;
  }
  var session = sessionResult.data;

  checkRateLimit(session.userId);  // ✅ Rate limiting

  if (session.userType !== 'master') {  // ✅ session.userType (v2.0)
    return { success: false, errorKey: 'err_permission_denied' };
  }
}
```

---

## 2. 프론트엔드 (*.html)

### ✅ v2.0 전환 완료 (1개)

| File | Status | Auth Pattern | API Call | Notes |
|------|--------|--------------|----------|-------|
| **Login.html** | ✅ v2.0 | `currentUser.userType` | `sessionToken` | testApiConnection 추가됨 |

**Login.html v2.0 패턴**:
- ✅ `login(loginId, password, userType)` - 3 parameters
- ✅ `validateSession(sessionToken)` via `checkSession()`
- ✅ `currentUser.userType` - v2.0 필드
- ✅ `getStudentList(currentSessionId, filters)` - sessionToken 사용
- ✅ `getAgencyList(currentSessionId)` - sessionToken 사용
- ✅ response null 방어 추가 (5개 함수)
- ✅ `testApiConnection()` - API 연결 확인

---

### ⏳ 미구현 프론트엔드 (Phase 4-9 예정)

| File | Status | Phase | Feature |
|------|--------|-------|---------|
| **SignUp.html** | 미구현 | Phase 4 | 학생 회원가입 |
| **ForgotPassword.html** | 미구현 | Phase 4 | 비밀번호 찾기 |
| **ResetPassword.html** | 미구현 | Phase 4 | 비밀번호 재설정 |
| **PrivacyPolicy.html** | 미구현 | Phase 4 | 개인정보 처리방침 |
| **Index.html** | 미구현 | Phase 5 | 메인 대시보드 |
| **Analytics.html** | 부분 구현 | Phase 7 | 분석 대시보드 |
| **Calendar.html** | 부분 구현 | Phase 6 | 일정 관리 |
| **FileManager.html** | 부분 구현 | Phase 8 | 파일 관리 |
| **BulkImport.html** | 부분 구현 | Phase 9 | 일괄 등록 |

---

## 3. 계획/설계 문서

### Plan Documents

| Document | Version | Auth Version | Status |
|----------|---------|--------------|--------|
| **step4-student-signup-system.plan.md** | Doc v1.0 | Auth v2.0 명시 | ✅ 최신 |
| **gas-student-platform.plan.md** | - | - | 업데이트 필요 |
| **role-based-access-control.plan.md** | - | v1.0 기반 | ⚠️ 구식 |
| **security-and-enhancements.plan.md** | - | - | 검토 필요 |

### Design Documents

| Document | Version | Auth Version | Status |
|----------|---------|--------------|--------|
| **step4-student-signup-system.design.md** | Doc v1.0 | Auth v2.0 명시 | ✅ 최신 |
| **security-and-enhancements.design.md** | - | - | 검토 필요 |

---

## 4. 우선순위별 전환 계획

### 🔴 Priority 1 (즉시 수정 필요 - 사용 중 기능)

| File | Functions | Reason |
|------|-----------|--------|
| **AgencyService.gs** | createAgency, updateAgency, deleteAgency | 유학원 관리 기능 (master 전용) |
| **AuditService.gs** | _saveAuditLog 호출부 | 모든 작업의 감사 로그 |

**예상 작업 시간**: 1-2시간

---

### 🟡 Priority 2 (중요 - 조만간 사용 예정)

| File | Functions | Reason |
|------|-----------|--------|
| **BackupService.gs** | createBackup, listBackups, restoreFromBackup | 데이터 백업/복원 |
| **ExcelService.gs** | exportToExcel, importFromExcel | 일괄 등록/다운로드 |
| **FileService.gs** | uploadFile, downloadFile, deleteFile | 파일 관리 |

**예상 작업 시간**: 3-4시간

---

### 🟢 Priority 3 (낮음 - Phase 5-7 구현 시)

| File | Functions | Reason |
|------|-----------|--------|
| **SearchService.gs** | searchStudents, searchAgencies | 검색 기능 (Phase 5) |
| **ScheduleService.gs** | 일정 관리 전체 | Phase 6 예정 |
| **DashboardService.gs** | 대시보드 통계 | Phase 7 예정 |
| **AnalyticsService.gs** | 분석 기능 | Phase 7 예정 |

**예상 작업 시간**: 6-8시간

---

## 5. 단계별 전환 로드맵

### Phase A: 긴급 수정 (2026-02-16 완료)

**목표**: 사용 중인 기능의 v2.0 전환

**Tasks**:
1. ✅ Auth.gs 중복 getAgencyList 삭제
2. ✅ Login.html response null 방어
3. ✅ Login.html v2.0 전환 (userType)
4. ✅ AgencyService.gs CUD 함수 v2.0 전환 (createAgency, updateAgency, deleteAgency)
5. ⏳ AuditService.gs v2.0 전환

**Status**: 80% 완료 (5개 중 4개 완료)
**Deployed**: @34 (2026-02-16)

---

### Phase B: 중요 기능 전환 (Week 10)

**목표**: 조만간 사용할 기능의 v2.0 전환

**Tasks**:
1. BackupService.gs v2.0 전환
2. ExcelService.gs v2.0 전환
3. FileService.gs v2.0 전환
4. 통합 테스트 및 검증

**Status**: 0% 완료

---

### Phase C: 향후 기능 전환 (Phase 5-7 구현 시)

**목표**: 미래 기능의 v2.0 전환

**Tasks**:
1. SearchService.gs v2.0 전환 (Phase 5)
2. ScheduleService.gs v2.0 전환 (Phase 6)
3. DashboardService.gs v2.0 전환 (Phase 7)
4. AnalyticsService.gs v2.0 전환 (Phase 7)

**Status**: 계획 단계

---

## 6. 전환 템플릿

### v1.0 → v2.0 전환 패턴

```javascript
// ❌ Before (v1.0)
function myFunction(sessionId, data) {
  try {
    var session = _validateSession(sessionId);

    if (session.role !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // ... 비즈니스 로직 ...

    _saveAuditLog(session.loginId, 'ACTION', 'Sheet', 'ID', sessionId);

    return { success: true };
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return { success: false, errorKey: 'err_unknown' };
  }
}

// ✅ After (v2.0)
function myFunction(sessionToken, data) {
  try {
    // 1. 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    // 2. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 3. 권한 검증 (v2.0: userType)
    if (session.userType !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // ... 비즈니스 로직 ...

    // 4. 감사 로그 (v2.0: userId, sessionToken)
    _saveAuditLog(session.userId, 'ACTION', 'Sheet', 'ID', sessionToken);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in myFunction: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
```

---

## 7. 검증 체크리스트

### 전환 후 필수 확인 사항

- [ ] `_validateSession` → `validateSession` 전환
- [ ] `sessionId` → `sessionToken` 파라미터명 변경
- [ ] `session.role` → `session.userType` 필드명 변경
- [ ] `session.loginId` → `session.userId` 필드명 변경
- [ ] `session.agencyCode` 필드 유지 (변경 없음)
- [ ] `checkRateLimit(session.userId)` 추가
- [ ] `_saveAuditLog()` 파라미터 순서 확인
- [ ] try-catch 에러 처리 확인
- [ ] JSDoc 주석 업데이트

---

## 8. 문서 업데이트 계획

### 업데이트 필요 문서

1. **CLAUDE.md** - v2.0 인증 시스템 반영
2. **README.md** - v2.0 API 문서화
3. **docs/01-plan/schema.md** - Users 시트 스키마 명시
4. **docs/01-plan/conventions.md** - v2.0 코딩 규칙
5. **role-based-access-control.plan.md** - v2.0 권한 시스템 재작성

---

**Last Updated**: 2026-02-16
**Next Review**: Phase B 시작 시 (Week 10)
