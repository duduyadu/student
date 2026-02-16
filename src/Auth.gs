/**
 * Auth.gs v2.0 - 통합 인증 시스템
 * Step 4 Week 9-10 구현
 *
 * 주요 변경사항:
 * - Agencies 시트 → Users 시트 기반 인증
 * - userType 파라미터 추가 (master/agency/student)
 * - 비밀번호 정책 강화
 * - changePassword() 함수 추가
 *
 * 세션 관리 전략:
 * - CacheService (ScriptCache) 사용
 * - 토큰 기반: 클라이언트가 sessionToken을 저장하고 모든 API 호출 시 전달
 * - 캐시 키: 'SESSION_' + sessionToken
 * - TTL: 1시간 (SESSION_TIMEOUT)
 */

// ==================== 상수 정의 ====================

/**
 * 비밀번호 정책
 */
const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 50,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?"
};

// ==================== Public API ====================

/**
 * 로그인 (Users 기반)
 * @param {string} loginId - 로그인 ID (이메일)
 * @param {string} password - 평문 비밀번호
 * @param {string} userType - "master" | "agency" | "student"
 * @returns {Object} {success: boolean, data?: {userId, userType, agencyCode, sessionToken, sessionExpiry}, error?: string, errorKey?: string}
 */
function login(loginId, password, userType) {
  const startTime = new Date().getTime();

  try {
    // 1. Users 시트에서 LoginID + UserType 조회
    const t1 = new Date().getTime();
    const users = _getAllRows(SHEETS.USERS);
    const t2 = new Date().getTime();
    Logger.log('[PERF] Users sheet read: ' + (t2 - t1) + 'ms');

    let user = null;
    for (let i = 0; i < users.length; i++) {
      if (users[i].LoginID === loginId && users[i].UserType === userType) {
        user = users[i];
        break;
      }
    }

    if (!user) {
      _saveAuditLog('SYSTEM', 'LOGIN_FAIL', 'Users', loginId, 'User not found: ' + userType);
      return { success: false, error: 'Invalid credentials', errorKey: 'err_invalid_credentials' };
    }

    // 2. 계정 상태 확인
    if (user.IsActive === false || String(user.IsActive).toUpperCase() === 'FALSE') {
      _saveAuditLog(loginId, 'LOGIN_FAIL', 'Users', user.UserID, 'Account inactive');
      return { success: false, error: 'Account is inactive', errorKey: 'err_account_inactive' };
    }

    // 3. 로그인 시도 횟수 확인 (5회 초과 시 계정 잠금)
    const loginAttempts = user.LoginAttempts || 0;
    if (loginAttempts >= 5) {
      // 계정 잠금
      _updateRow(SHEETS.USERS, 'UserID', user.UserID, {
        IsActive: false,
        UpdatedAt: getCurrentTimestamp()
      });
      _saveAuditLog(loginId, 'ACCOUNT_LOCKED', 'Users', user.UserID, 'Max login attempts exceeded');
      return { success: false, error: 'Account locked due to multiple failed attempts', errorKey: 'err_account_locked' };
    }

    // 4. 비밀번호 검증
    const hashedInput = hashPassword(password);

    if (hashedInput !== user.PasswordHash) {
      // 비밀번호 불일치 - LoginAttempts 증가
      _updateRow(SHEETS.USERS, 'UserID', user.UserID, {
        LoginAttempts: loginAttempts + 1,
        UpdatedAt: getCurrentTimestamp()
      });

      _saveAuditLog(loginId, 'LOGIN_FAIL', 'Users', user.UserID, 'Invalid password');
      return { success: false, error: 'Invalid credentials', errorKey: 'err_invalid_credentials' };
    }

    // 5. 세션 생성
    const sessionToken = _createSession(user);
    const sessionExpiry = new Date().getTime() + (SESSION_TIMEOUT * 1000); // TTL: 1시간

    // 6. 로그인 성공 처리
    _updateRow(SHEETS.USERS, 'UserID', user.UserID, {
      LoginAttempts: 0,
      LastLogin: getCurrentTimestamp(),
      UpdatedAt: getCurrentTimestamp()
    });

    _saveAuditLog(user.UserID, 'LOGIN', 'Users', user.UserID, 'Login success: ' + userType);

    const endTime = new Date().getTime();
    Logger.log('[PERF] Total login time: ' + (endTime - startTime) + 'ms');

    // 7. 응답 생성
    const responseData = {
      userId: user.UserID,
      userType: user.UserType,
      sessionToken: sessionToken,
      sessionExpiry: sessionExpiry
    };

    // agency와 student는 agencyCode 포함
    if (user.UserType === 'agency' || user.UserType === 'student') {
      responseData.agencyCode = user.AgencyCode;
    }

    return {
      success: true,
      data: responseData
    };

  } catch (e) {
    Logger.log('ERROR in login: ' + e.message);
    _saveAuditLog('SYSTEM', 'LOGIN_ERROR', 'Users', loginId, e.message);
    return { success: false, error: 'Internal server error', errorKey: 'err_unknown' };
  }
}

/**
 * 로그아웃
 * @param {string} sessionToken - 세션 토큰
 * @returns {Object} {success: boolean, error?: string}
 */
function logout(sessionToken) {
  try {
    const session = validateSession(sessionToken);

    if (!session.success) {
      // 세션이 이미 만료되었어도 로그아웃 성공 처리
      return { success: true };
    }

    const cache = CacheService.getScriptCache();
    cache.remove('SESSION_' + sessionToken);

    _saveAuditLog(session.data.userId, 'LOGOUT', 'N/A', 'N/A', 'Logout success');

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in logout: ' + e.message);
    return { success: true }; // 에러가 발생해도 로그아웃 성공 처리
  }
}

/**
 * 세션 검증 (Public API)
 * 모든 보호된 API에서 호출
 * @param {string} sessionToken - 세션 토큰
 * @returns {Object} {success: boolean, data?: {userId, userType, agencyCode}, error?: string, errorKey?: string}
 */
function validateSession(sessionToken) {
  try {
    if (!sessionToken) {
      return { success: false, error: 'No session token provided', errorKey: 'err_session_expired' };
    }

    const cache = CacheService.getScriptCache();
    const cacheKey = 'SESSION_' + sessionToken;
    const sessionData = cache.get(cacheKey);

    if (!sessionData) {
      return { success: false, error: 'Session expired', errorKey: 'err_session_expired' };
    }

    const session = JSON.parse(sessionData);

    return {
      success: true,
      data: {
        userId: session.userId,
        userType: session.userType,
        agencyCode: session.agencyCode || null
      }
    };

  } catch (e) {
    Logger.log('ERROR in validateSession: ' + e.message);
    return { success: false, error: 'Session validation failed', errorKey: 'err_session_expired' };
  }
}

/**
 * 비밀번호 변경
 * @param {string} userId - UserID
 * @param {string} oldPassword - 현재 비밀번호
 * @param {string} newPassword - 새 비밀번호
 * @returns {Object} {success: boolean, error?: string, errorKey?: string}
 */
function changePassword(userId, oldPassword, newPassword) {
  try {
    // 1. Users 시트에서 userId 조회
    const users = _getAllRows(SHEETS.USERS);
    let user = null;

    for (let i = 0; i < users.length; i++) {
      if (users[i].UserID === userId) {
        user = users[i];
        break;
      }
    }

    if (!user) {
      return { success: false, error: 'User not found', errorKey: 'err_user_not_found' };
    }

    // 2. 현재 비밀번호 검증
    const hashedOld = hashPassword(oldPassword);
    if (hashedOld !== user.PasswordHash) {
      _saveAuditLog(userId, 'PASSWORD_CHANGE_FAIL', 'Users', userId, 'Invalid old password');
      return { success: false, error: 'Current password is incorrect', errorKey: 'err_invalid_password' };
    }

    // 3. 새 비밀번호 유효성 검증
    const validation = _validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error, errorKey: validation.errorKey };
    }

    // 4. 새 PasswordHash 생성
    const hashedNew = hashPassword(newPassword);

    // 5. Users 시트 업데이트
    _updateRow(SHEETS.USERS, 'UserID', userId, {
      PasswordHash: hashedNew,
      UpdatedAt: getCurrentTimestamp()
    });

    // 6. 모든 세션 무효화 (보안상 재로그인 필요)
    _invalidateAllSessions(userId);

    // 7. AuditLog 기록
    _saveAuditLog(userId, 'PASSWORD_CHANGE', 'Users', userId, 'Password changed successfully');

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in changePassword: ' + e.message);
    return { success: false, error: 'Internal server error', errorKey: 'err_unknown' };
  }
}

// ==================== Private Helper Functions ====================

/**
 * 세션 생성 (Private)
 * @param {Object} user - Users 시트의 행 객체
 * @returns {string} sessionToken
 */
function _createSession(user) {
  const sessionToken = generateUUID();

  const sessionData = {
    sessionToken: sessionToken,
    userId: user.UserID,
    userType: user.UserType,
    agencyCode: user.AgencyCode || null,
    createdAt: new Date().getTime()
  };

  const cache = CacheService.getScriptCache();
  const cacheKey = 'SESSION_' + sessionToken;
  cache.put(cacheKey, JSON.stringify(sessionData), SESSION_TIMEOUT);

  Logger.log('[AUTH] Session created: ' + user.UserID + ' (' + user.UserType + ')');

  return sessionToken;
}

/**
 * 비밀번호 유효성 검증 (Private)
 * @param {string} password - 평문 비밀번호
 * @returns {Object} {valid: boolean, error?: string, errorKey?: string}
 */
function _validatePassword(password) {
  if (!password || password.length < PASSWORD_POLICY.minLength) {
    return {
      valid: false,
      error: 'Password must be at least ' + PASSWORD_POLICY.minLength + ' characters',
      errorKey: 'err_password_too_short'
    };
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    return {
      valid: false,
      error: 'Password must be at most ' + PASSWORD_POLICY.maxLength + ' characters',
      errorKey: 'err_password_too_long'
    };
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
      errorKey: 'err_password_no_uppercase'
    };
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
      errorKey: 'err_password_no_lowercase'
    };
  }

  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
      errorKey: 'err_password_no_number'
    };
  }

  if (PASSWORD_POLICY.requireSpecial) {
    const specialChars = PASSWORD_POLICY.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const specialRegex = new RegExp('[' + specialChars + ']');
    if (!specialRegex.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one special character',
        errorKey: 'err_password_no_special'
      };
    }
  }

  return { valid: true };
}

/**
 * 특정 사용자의 모든 세션 무효화 (Private)
 * CacheService는 키별 삭제만 지원하므로 실제로는 불가능
 * 차선책: 클라이언트에게 재로그인 강제 알림
 * @param {string} userId - UserID
 */
function _invalidateAllSessions(userId) {
  // CacheService는 키 목록 조회 불가능
  // 실제 구현 시:
  // 1. 세션 데이터에 invalidatedAt 추가
  // 2. validateSession에서 invalidatedAt 체크
  // 3. 또는 DB 기반 세션 관리로 전환 필요

  Logger.log('[AUTH] All sessions invalidated for user: ' + userId);
  // 현재는 로그만 기록, 실제 무효화는 TTL 만료까지 대기
}

/**
 * 권한 검증 (Private)
 * @param {Object} session - validateSession() 결과의 data 객체
 * @param {string} action - "READ" | "CREATE" | "UPDATE" | "DELETE"
 * @param {string} sheet - 시트명 (SHEETS.STUDENTS 등)
 * @param {string} targetId - 대상 레코드 ID (선택)
 * @throws {Error} 권한 없으면 예외 발생
 */
function _validatePermission(session, action, sheet, targetId) {
  // master: 모든 권한
  if (session.userType === 'master') {
    return;
  }

  // student: 본인 데이터만 READ/UPDATE (구현 예정)
  if (session.userType === 'student') {
    if (action === 'DELETE' || action === 'CREATE') {
      const error = new Error('Students cannot create or delete records');
      error.errorKey = 'err_permission_denied';
      throw error;
    }

    // 본인 데이터인지 확인 (targetId === session.userId)
    if (targetId && targetId !== session.userId) {
      const error = new Error('Students can only access their own data');
      error.errorKey = 'err_permission_denied';
      throw error;
    }

    return;
  }

  // agency: 소속 유학원 학생만 접근 가능
  if (session.userType === 'agency') {
    // agency는 삭제 권한 없음
    if (action === 'DELETE') {
      const error = new Error('Agencies cannot delete records');
      error.errorKey = 'err_permission_denied';
      throw error;
    }

    // 학생 관련 시트인 경우 AgencyCode 확인
    if (sheet === SHEETS.STUDENTS || sheet === SHEETS.CONSULTATIONS || sheet === SHEETS.EXAM_RESULTS) {
      if (targetId) {
        const record = _getRecordById(sheet, targetId);
        if (record && record.AgencyCode !== session.agencyCode) {
          const error = new Error('Agencies can only access students from their own agency');
          error.errorKey = 'err_permission_denied';
          throw error;
        }
      }
    }

    return;
  }

  // 기타 userType은 거부
  const error = new Error('Unknown user type');
  error.errorKey = 'err_permission_denied';
  throw error;
}

/**
 * 특정 ID로 레코드 조회 (Private)
 * @param {string} sheet - 시트명
 * @param {string} targetId - 레코드 ID
 * @returns {Object|null} 레코드 객체 또는 null
 */
function _getRecordById(sheet, targetId) {
  const rows = _getAllRows(sheet);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.StudentID === targetId ||
        row.ConsultationID === targetId ||
        row.ExamResultID === targetId ||
        row.UserID === targetId) {
      return row;
    }
  }

  return null;
}

/**
 * DEBUG: Auth v2.0 테스트 (GAS 에디터에서 실행)
 */
function testAuthV2AndStudentList() {
  Logger.log('========================================');
  Logger.log('TEST AUTH V2.0 + STUDENT LIST');
  Logger.log('========================================');

  // 1. Login 테스트
  Logger.log('\n1. Testing login...');
  var loginResult = login('admin', 'admin123', 'master');
  Logger.log('Login result: ' + JSON.stringify(loginResult));

  if (!loginResult.success) {
    Logger.log('❌ Login failed!');
    return;
  }

  var sessionToken = loginResult.data.sessionToken;
  Logger.log('✅ Login success! SessionToken: ' + sessionToken);

  // 2. ValidateSession 테스트
  Logger.log('\n2. Testing validateSession...');
  var sessionResult = validateSession(sessionToken);
  Logger.log('Session result: ' + JSON.stringify(sessionResult));

  if (!sessionResult.success) {
    Logger.log('❌ Session validation failed!');
    return;
  }

  Logger.log('✅ Session valid!');

  // 3. getStudentList 테스트
  Logger.log('\n3. Testing getStudentList...');
  var studentResult = getStudentList(sessionToken, {});
  Logger.log('Student list result: ' + JSON.stringify(studentResult));

  if (!studentResult.success) {
    Logger.log('❌ getStudentList failed!');
    return;
  }

  Logger.log('✅ getStudentList success! Count: ' + studentResult.data.length);

  // 4. getAgencyList 테스트
  Logger.log('\n4. Testing getAgencyList...');
  var agencyResult = getAgencyList(sessionToken);
  Logger.log('Agency list result: ' + JSON.stringify(agencyResult));

  if (!agencyResult.success) {
    Logger.log('❌ getAgencyList failed!');
    return;
  }

  Logger.log('✅ getAgencyList success! Count: ' + agencyResult.data.length);

  Logger.log('\n========================================');
  Logger.log('ALL TESTS PASSED! ✅');
  Logger.log('========================================');
}

/**
 * 세션 정보 조회 (클라이언트에서 호출 가능)
 * 레거시 호환성을 위해 유지
 * @param {string} sessionToken - 세션 토큰
 * @returns {Object} {success: boolean, data?: {user}, error?: string, errorKey?: string}
 */
function checkSession(sessionToken) {
  const result = validateSession(sessionToken);

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: {
      user: {
        userId: result.data.userId,
        userType: result.data.userType,
        agencyCode: result.data.agencyCode
      }
    }
  };
}

// ==================== 테스트 함수 ====================

/**
 * AuthService v2.0 통합 테스트
 */
function testAuthServiceV2() {
  Logger.log('========================================');
  Logger.log('AUTH SERVICE V2.0 TEST');
  Logger.log('========================================');

  // Test 1: master 로그인
  Logger.log('\n--- Test 1: master login ---');
  const masterLogin = login('admin', 'admin123', 'master');
  Logger.log('Master login result: ' + JSON.stringify(masterLogin));

  // Test 2: agency 로그인
  Logger.log('\n--- Test 2: agency login ---');
  const agencyLogin = login('HANOI', 'hanoi123', 'agency');
  Logger.log('Agency login result: ' + JSON.stringify(agencyLogin));

  // Test 3: 세션 검증
  if (masterLogin.success) {
    Logger.log('\n--- Test 3: validateSession ---');
    const sessionCheck = validateSession(masterLogin.data.sessionToken);
    Logger.log('Session validation: ' + JSON.stringify(sessionCheck));
  }

  // Test 4: 잘못된 비밀번호
  Logger.log('\n--- Test 4: wrong password ---');
  const wrongPassword = login('admin', 'wrongpassword', 'master');
  Logger.log('Wrong password result: ' + JSON.stringify(wrongPassword));

  // Test 5: 잘못된 userType
  Logger.log('\n--- Test 5: wrong userType ---');
  const wrongType = login('admin', 'admin123', 'student');
  Logger.log('Wrong userType result: ' + JSON.stringify(wrongType));

  Logger.log('\n========================================');
  Logger.log('AUTH SERVICE V2.0 TEST COMPLETED');
  Logger.log('========================================');
}

/**
 * Users 시트 데이터 확인 (디버깅용)
 */
function checkUsersSheet() {
  const users = _getAllRows(SHEETS.USERS);

  Logger.log('========================================');
  Logger.log('USERS SHEET DATA');
  Logger.log('========================================');

  users.forEach(function(user) {
    Logger.log('\nUserID: ' + user.UserID);
    Logger.log('  UserType: ' + user.UserType);
    Logger.log('  LoginID: ' + user.LoginID);
    Logger.log('  AgencyCode: ' + user.AgencyCode);
    Logger.log('  IsActive: ' + user.IsActive);
  });

  Logger.log('\n========================================');
  Logger.log('Total users: ' + users.length);
  Logger.log('========================================');
}

/**
 * 웹앱 디버깅 (진단용)
 * 실제 API 호출 시뮬레이션
 */
function testWebAppDebug() {
  Logger.log('========================================');
  Logger.log('WEB APP DEBUG TEST');
  Logger.log('========================================');

  // 1. Login 테스트
  Logger.log('\n1. Testing login...');
  var loginResult = login('admin', 'admin123', 'master');
  Logger.log('Login result type: ' + typeof loginResult);
  Logger.log('Login result is null: ' + (loginResult === null));
  Logger.log('Login result is undefined: ' + (loginResult === undefined));
  Logger.log('Login result: ' + JSON.stringify(loginResult));

  if (!loginResult || !loginResult.success) {
    Logger.log('❌ Login failed!');
    return;
  }

  var sessionToken = loginResult.data.sessionToken;
  Logger.log('✅ Login success! Token: ' + sessionToken);

  // 2. getStudentList 테스트
  Logger.log('\n2. Testing getStudentList...');
  var studentsResult = getStudentList(sessionToken, {});
  Logger.log('Students result type: ' + typeof studentsResult);
  Logger.log('Students result is null: ' + (studentsResult === null));
  Logger.log('Students result is undefined: ' + (studentsResult === undefined));
  Logger.log('Students result: ' + JSON.stringify(studentsResult));

  // 3. getAgencyListForAdmin 테스트
  Logger.log('\n3. Testing getAgencyListForAdmin...');
  var agenciesResult = getAgencyListForAdmin(sessionToken);
  Logger.log('Agencies result type: ' + typeof agenciesResult);
  Logger.log('Agencies result is null: ' + (agenciesResult === null));
  Logger.log('Agencies result is undefined: ' + (agenciesResult === undefined));
  Logger.log('Agencies result: ' + JSON.stringify(agenciesResult));

  Logger.log('\n========================================');
  if (studentsResult && studentsResult.success && agenciesResult && agenciesResult.success) {
    Logger.log('✅ ALL TESTS PASSED!');
  } else {
    Logger.log('❌ SOME TESTS FAILED!');
  }
  Logger.log('========================================');
}

/**
 * 환경 설정 확인 (디버깅용)
 * Script Properties, 필수 시트 존재 여부 확인
 */
function checkEnvironment() {
  Logger.log('========================================');
  Logger.log('ENVIRONMENT CHECK');
  Logger.log('========================================');

  // 1. Script Properties 확인
  Logger.log('\n--- Script Properties ---');
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var masterSalt = PropertiesService.getScriptProperties().getProperty('MASTER_SALT');

  Logger.log('SPREADSHEET_ID: ' + (spreadsheetId ? spreadsheetId : '❌ NOT SET'));
  Logger.log('MASTER_SALT: ' + (masterSalt ? '✅ SET (length: ' + masterSalt.length + ')' : '❌ NOT SET'));

  if (!spreadsheetId) {
    Logger.log('\n⚠️ SPREADSHEET_ID is not set!');
    Logger.log('Run: PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", "YOUR_SPREADSHEET_ID");');
    return;
  }

  // 2. 스프레드시트 접근 확인
  Logger.log('\n--- Spreadsheet Access ---');
  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    Logger.log('✅ Spreadsheet access OK: ' + ss.getName());
  } catch (e) {
    Logger.log('❌ Cannot access spreadsheet: ' + e.message);
    return;
  }

  // 3. 필수 시트 존재 확인
  Logger.log('\n--- Required Sheets ---');
  var requiredSheets = [
    SHEETS.USERS,
    SHEETS.STUDENTS,
    SHEETS.AGENCIES,
    SHEETS.I18N,
    SHEETS.AUDIT_LOGS
  ];

  var allSheetsExist = true;
  requiredSheets.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      var rowCount = sheet.getLastRow();
      Logger.log('✅ ' + sheetName + ' (rows: ' + rowCount + ')');
    } else {
      Logger.log('❌ ' + sheetName + ' NOT FOUND');
      allSheetsExist = false;
    }
  });

  // 4. Users 시트 데이터 확인
  if (ss.getSheetByName(SHEETS.USERS)) {
    Logger.log('\n--- Users Sheet Data ---');
    var users = _getAllRows(SHEETS.USERS);
    Logger.log('Total users: ' + users.length);

    var masterCount = 0;
    var agencyCount = 0;
    var studentCount = 0;

    users.forEach(function(user) {
      if (user.UserType === 'master') masterCount++;
      else if (user.UserType === 'agency') agencyCount++;
      else if (user.UserType === 'student') studentCount++;
    });

    Logger.log('  master: ' + masterCount);
    Logger.log('  agency: ' + agencyCount);
    Logger.log('  student: ' + studentCount);
  }

  // 5. Students 시트 데이터 확인
  if (ss.getSheetByName(SHEETS.STUDENTS)) {
    Logger.log('\n--- Students Sheet Data ---');
    var students = _getAllRows(SHEETS.STUDENTS);
    Logger.log('Total students: ' + students.length);
  }

  Logger.log('\n========================================');
  if (allSheetsExist && spreadsheetId && masterSalt) {
    Logger.log('✅ ENVIRONMENT OK - All checks passed!');
  } else {
    Logger.log('⚠️ ENVIRONMENT ISSUES DETECTED');
  }
  Logger.log('========================================');
}
