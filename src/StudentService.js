/**
 * StudentService.gs - 학생 CRUD 비즈니스 로직
 * Phase 4 구현
 */

// ==================== READ ====================

/**
 * 학생 목록 조회
 * @param {string} sessionId - 세션 ID
 * @param {Object} filters - 필터 조건 { search?, sortBy?, sortOrder? }
 * @returns {Object} { success: true, data: students[] } - GAS는 undefined 반환 시 클라이언트에 null 전달
 */
function getStudentList(sessionToken, filters) {
  Logger.log('[WEB DEBUG] getStudentList called. sessionToken: ' + sessionToken);
  try {
    // 1. 세션 검증 (v2.0)
    Logger.log('[WEB DEBUG] Step 1: Validating session...');
    var sessionResult = validateSession(sessionToken);
    Logger.log('[WEB DEBUG] sessionResult: ' + JSON.stringify(sessionResult));
    if (!sessionResult || !sessionResult.success) {
      Logger.log('[WEB DEBUG] Session validation failed!');
      return sessionResult || { success: false, errorKey: 'err_session_expired' };
    }
    var session = sessionResult.data;
    Logger.log('[WEB DEBUG] Session validated. userId: ' + session.userId + ', userType: ' + session.userType);

    // 2. Rate Limiting (v2.1)
    Logger.log('[WEB DEBUG] Step 2: Checking rate limit...');
    checkRateLimit(session.userId);

    // 3. Students 시트 읽기
    Logger.log('[WEB DEBUG] Step 3: Reading Students sheet...');
    var students = _getAllRows(SHEETS.STUDENTS);
    Logger.log('[WEB DEBUG] Students count: ' + (students ? students.length : 'null'));

    // 4. 권한별 필터링 (userType 사용)
    if (session.userType === 'master') {
      // 모든 학생 조회
    } else if (session.userType === 'agency') {
      // 자기 유학원 학생만
      students = students.filter(function(s) {
        return s.AgencyCode === session.agencyCode;
      });
    } else if (session.userType === 'student') {
      // Phase 3: 본인만 (추후 구현)
      students = students.filter(function(s) {
        return s.StudentID === session.userId;  // userId가 StudentID
      });
    } else {
      // 알 수 없는 userType
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. 비활성(삭제된) 학생 제외 (IsActive가 false인 것만 제외, 빈 값은 활성으로 간주)
    students = students.filter(function(s) { return s.IsActive !== false && String(s.IsActive).toUpperCase() !== 'FALSE'; });

    // 5. 검색 필터 적용
    if (filters && filters.search) {
      var searchLower = filters.search.toLowerCase();
      students = students.filter(function(s) {
        return (s.NameKR && s.NameKR.toLowerCase().indexOf(searchLower) >= 0) ||
               (s.NameVN && s.NameVN.toLowerCase().indexOf(searchLower) >= 0) ||
               (s.StudentID && String(s.StudentID).toLowerCase().indexOf(searchLower) >= 0);
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

    // 7. 감사 로그 (v2.0: userId 사용)
    Logger.log('[WEB DEBUG] Step 4: Saving audit log...');
    _saveAuditLog(session.userId, 'READ', SHEETS.STUDENTS, 'LIST', sessionToken);
    Logger.log('[WEB DEBUG] Audit log saved.');

    var output = { success: true, data: students || [] };
    Logger.log('[WEB DEBUG] Output created. success: ' + output.success + ', data count: ' + (output.data ? output.data.length : 0));
    Logger.log('[WEB DEBUG] Returning output...');
    return output;

  } catch (e) {
    Logger.log('ERROR in getStudentList: ' + e.message);
    return { success: false, error: String(e.message), errorKey: (e.errorKey || 'err_unknown') };
  }
}

/**
 * 학생 정보 조회 (단일)
 * @param {string} sessionId - 세션 ID
 * @param {string} studentId - 학생 ID
 * @returns {Object} { success: true, data: student }
 */
function getStudentById(sessionToken, studentId) {
  try {
    // 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    // Rate Limiting (v2.1)
    checkRateLimit(session.userId);

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

    // 권한 검증 (v2.0: userType 사용)
    _validatePermission(session, 'READ', SHEETS.STUDENTS, studentId);

    _saveAuditLog(session.userId, 'READ', SHEETS.STUDENTS, studentId, sessionToken);

    return { success: true, data: student };

  } catch (e) {
    Logger.log('ERROR in getStudentById: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== CREATE ====================

/**
 * 학생 등록
 * @param {string} sessionToken - 세션 토큰
 * @param {Object} studentData - 학생 정보 객체
 * @returns {Object} { success: true, data: { StudentID } }
 */
function createStudent(sessionToken, studentData) {
  try {
    // 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    // 1. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 2. 필수 필드 검증
    var requiredFields = ['NameKR', 'NameVN', 'DOB', 'Gender', 'AgencyCode'];
    for (var i = 0; i < requiredFields.length; i++) {
      if (!studentData[requiredFields[i]]) {
        return { success: false, errorKey: 'err_required_field', field: requiredFields[i] };
      }
    }

    // 3. agency 역할은 자동으로 자기 AgencyCode 할당 (v2.0: userType)
    if (session.userType === 'agency') {
      studentData.AgencyCode = session.agencyCode;
    }

    // 4. 데이터 검증 (XSS 방어 + 비즈니스 룰) - v2.1
    var validationResult = validateStudentData(studentData, false);
    if (!validationResult.valid) {
      return {
        success: false,
        errorKey: 'err_validation_failed',
        errors: validationResult.errors
      };
    }

    // 5. 전화번호 중복 확인 (이메일은 validateStudentData에서 처리)
    if (studentData.PhoneKR) {
      var existing = _getAllRows(SHEETS.STUDENTS);
      for (var i = 0; i < existing.length; i++) {
        if (existing[i].PhoneKR === studentData.PhoneKR) {
          return { success: false, errorKey: 'err_duplicate_phone' };
        }
      }
    }

    // 6. Smart ID 생성 (Race Condition 방지)
    var idResult = generateStudentIDSafe(studentData.AgencyCode);

    if (!idResult.success) {
      return {
        success: false,
        error: idResult.error || '학생 ID 생성에 실패했습니다.',
        errorKey: idResult.errorKey || 'err_generate_id'
      };
    }

    studentData.StudentID = idResult.studentId;

    // 7. 메타 데이터 추가 (v2.0: userId 사용)
    var now = getCurrentTimestamp();
    studentData.CreatedBy = session.userId;
    studentData.CreatedAt = now;
    studentData.UpdatedBy = session.userId;
    studentData.UpdatedAt = now;
    studentData.IsActive = true;

    // 8. Students 시트에 행 추가
    _appendRow(SHEETS.STUDENTS, studentData);

    // 9. 감사 로그
    _saveAuditLog(session.userId, 'CREATE', SHEETS.STUDENTS, idResult.studentId, sessionToken);

    return { success: true, data: { StudentID: idResult.studentId } };

  } catch (e) {
    Logger.log('ERROR in createStudent: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== UPDATE ====================

/**
 * 학생 정보 수정
 * @param {string} sessionToken - 세션 토큰
 * @param {string} studentId - 학생 ID
 * @param {Object} updates - 수정할 필드 { NameKR?, Phone?, ... }
 * @returns {Object} { success: true }
 */
function updateStudent(sessionToken, studentId, updates) {
  try {
    // 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    // 1. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 2. 학생 존재 확인
    var student = _getRecordById(SHEETS.STUDENTS, studentId);
    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    // 3. 권한 검증
    _validatePermission(session, 'UPDATE', SHEETS.STUDENTS, studentId);

    // 4. StudentID 변경 금지
    if (updates.StudentID && updates.StudentID !== studentId) {
      return { success: false, errorKey: 'err_cannot_change_id' };
    }
    delete updates.StudentID;

    // 5. 데이터 검증 (XSS 방어 + 비즈니스 룰) - v2.1
    // StudentID 임시 추가 (이메일 중복 확인 시 본인 제외)
    updates.StudentID = studentId;
    var validationResult = validateStudentData(updates, true);
    delete updates.StudentID;

    if (!validationResult.valid) {
      return {
        success: false,
        errorKey: 'err_validation_failed',
        errors: validationResult.errors
      };
    }

    // 6. 전화번호 중복 확인 (본인 제외) - 이메일은 validateStudentData에서 처리
    if (updates.PhoneKR) {
      var existing = _getAllRows(SHEETS.STUDENTS);
      for (var i = 0; i < existing.length; i++) {
        if (existing[i].StudentID === studentId) continue;
        if (existing[i].PhoneKR === updates.PhoneKR) {
          return { success: false, errorKey: 'err_duplicate_phone' };
        }
      }
    }

    // 7. 메타 데이터 업데이트 (v2.0: userId 사용)
    updates.UpdatedBy = session.userId;
    updates.UpdatedAt = getCurrentTimestamp();

    // 8. Students 시트 업데이트
    _updateRow(SHEETS.STUDENTS, 'StudentID', studentId, updates);

    // 9. 감사 로그
    _saveAuditLog(session.userId, 'UPDATE', SHEETS.STUDENTS, studentId, sessionToken);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in updateStudent: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== DELETE ====================

/**
 * 학생 삭제 (Soft Delete)
 * @param {string} sessionToken - 세션 토큰
 * @param {string} studentId - 학생 ID
 * @returns {Object} { success: true }
 */
function deleteStudent(sessionToken, studentId) {
  try {
    // 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    // 1. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 2. master 역할만 허용 (v2.0: userType)
    if (session.userType !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 3. 학생 존재 확인
    var student = _getRecordById(SHEETS.STUDENTS, studentId);
    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    // 3. Soft Delete (IsActive = false)
    _updateRow(SHEETS.STUDENTS, 'StudentID', studentId, {
      IsActive: false,
      UpdatedBy: session.userId,
      UpdatedAt: getCurrentTimestamp()
    });

    // 4. 감사 로그
    _saveAuditLog(session.userId, 'DELETE', SHEETS.STUDENTS, studentId, sessionToken);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in deleteStudent: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== STATISTICS ====================

/**
 * 학생 수 조회 (역할 기반 필터링)
 * @param {string} sessionToken - 세션 토큰
 * @returns {Object} { success: true, data: { count: number } }
 */
function getStudentCount(sessionToken) {
  try {
    // 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    // 1. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 2. 모든 학생 데이터 읽기
    var allStudents = _getAllRows(SHEETS.STUDENTS);

    // 3. 역할 기반 필터링 (v2.0: userType)
    var filteredStudents = allStudents.filter(function(s) {
      // Soft Delete된 학생 제외
      if (s.IsActive === false || String(s.IsActive).toUpperCase() === 'FALSE') {
        return false;
      }

      // master: 모든 학생 조회
      if (session.userType === 'master') {
        return true;
      }

      // agency: 소속 유학원 학생만
      if (session.userType === 'agency') {
        return s.AgencyCode === session.agencyCode;
      }

      // student: 본인만 (항상 1명)
      if (session.userType === 'student') {
        return s.StudentID === session.userId;
      }

      return false;
    });

    // 4. 감사 로그
    _saveAuditLog(session.userId, 'READ', SHEETS.STUDENTS, 'COUNT', sessionToken);

    return { success: true, data: { count: filteredStudents.length } };

  } catch (e) {
    Logger.log('ERROR in getStudentCount: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
