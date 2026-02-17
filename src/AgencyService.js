/**
 * AgencyService.gs - 유학원 CRUD 비즈니스 로직
 * 관리자(master) 전용 기능 + 드롭다운용 조회
 */

// ==================== READ ====================

/**
 * 유학원 목록 조회 (드롭다운용 - 모든 역할 허용)
 * @param {string} sessionToken - 세션 토큰
 * @returns {Object} { success: true, data: agencies[] }
 */
function getAgencyList(sessionToken) {
  try {
    // 1. 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult || !sessionResult.success) {
      return sessionResult || { success: false, errorKey: 'err_session_expired' };
    }
    var session = sessionResult.data;

    // 2. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 3. Users 시트에서 agency 유형만 조회 (Agencies는 deprecated)
    var users = _getAllRows(SHEETS.USERS);
    var agencies = [];

    for (var i = 0; i < users.length; i++) {
      if (users[i].UserType === 'agency' && users[i].IsActive !== false) {
        // AgencyCode를 기준으로 중복 제거
        var exists = false;
        for (var j = 0; j < agencies.length; j++) {
          if (agencies[j].AgencyCode === users[i].AgencyCode) {
            exists = true;
            break;
          }
        }

        if (!exists) {
          agencies.push({
            AgencyCode: users[i].AgencyCode,
            AgencyName: users[i].AgencyCode  // TODO: Agencies 시트에서 이름 가져오기
          });
        }
      }
    }

    // 4. 감사 로그
    _saveAuditLog(session.userId, 'READ', SHEETS.USERS, 'AGENCY_LIST', sessionToken);

    var output = { success: true, data: agencies || [] };
    return output;

  } catch (e) {
    Logger.log('ERROR in getAgencyList: ' + e.message);
    return { success: false, error: String(e.message), errorKey: (e.errorKey || 'err_unknown') };
  }
}

/**
 * 유학원 목록 조회 (관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @returns {Object} { success: true, data: agencies[] }
 */
function getAgencyListForAdmin(sessionToken) {
  try {
    // 1. 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult || !sessionResult.success) {
      return sessionResult || { success: false, errorKey: 'err_session_expired' };
    }
    var session = sessionResult.data;

    // 2. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 3. master 권한 확인 (v2.0: userType)
    if (session.userType !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. Agencies 시트 읽기
    var agencies = _getAllRows(SHEETS.AGENCIES);

    // 5. 비활성(삭제된) 유학원 제외
    var activeAgencies = agencies.filter(function(a) {
      return a.IsActive !== false && String(a.IsActive).toUpperCase() !== 'FALSE';
    });

    // 6. 감사 로그
    _saveAuditLog(session.userId, 'READ', SHEETS.AGENCIES, 'LIST', sessionToken);

    var output = { success: true, data: activeAgencies || [] };
    return output;

  } catch (e) {
    Logger.log('ERROR in getAgencyListForAdmin: ' + e.message);
    return { success: false, error: String(e.message), errorKey: (e.errorKey || 'err_unknown') };
  }
}

/**
 * 유학원 정보 조회 (단일)
 * @param {string} sessionToken - 세션 토큰
 * @param {string} agencyCode - 유학원 코드
 * @returns {Object} { success: true, data: agency }
 */
function getAgencyById(sessionToken, agencyCode) {
  try {
    // 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    if (session.userType !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    var agencies = _getAllRows(SHEETS.AGENCIES);
    var agency = null;

    for (var i = 0; i < agencies.length; i++) {
      if (agencies[i].AgencyCode === agencyCode) {
        agency = agencies[i];
        break;
      }
    }

    if (!agency) {
      return { success: false, errorKey: 'err_agency_not_found' };
    }

    _saveAuditLog(session.userId, 'READ', SHEETS.AGENCIES, agencyCode, sessionToken);

    return { success: true, data: agency };

  } catch (e) {
    Logger.log('ERROR in getAgencyById: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== CREATE ====================

/**
 * 유학원 등록 (관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @param {Object} agencyData - 유학원 정보 객체
 * @returns {Object} { success: true, data: { AgencyCode } }
 */
function createAgency(sessionToken, agencyData) {
  try {
    // 1. 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    // 2. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 3. master 권한 확인 (v2.0: userType)
    if (session.userType !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. 필수 필드 검증
    var requiredFields = ['AgencyCode', 'AgencyName', 'LoginID', 'Password'];
    for (var i = 0; i < requiredFields.length; i++) {
      if (!agencyData[requiredFields[i]]) {
        return { success: false, errorKey: 'err_required_field', field: requiredFields[i] };
      }
    }

    // 5. AgencyCode 중복 확인 및 AgencyNumber 자동 할당
    var existing = _getAllRows(SHEETS.AGENCIES);
    var maxAgencyNumber = 0;

    for (var i = 0; i < existing.length; i++) {
      if (existing[i].AgencyCode === agencyData.AgencyCode) {
        return { success: false, errorKey: 'err_duplicate_agency_code' };
      }
      if (existing[i].LoginID === agencyData.LoginID) {
        return { success: false, errorKey: 'err_duplicate_login_id' };
      }

      // 최대 AgencyNumber 찾기
      var num = parseInt(existing[i].AgencyNumber) || 0;
      if (num > maxAgencyNumber) {
        maxAgencyNumber = num;
      }
    }

    // 새 AgencyNumber 할당 (최대값 + 1)
    var newAgencyNumber = maxAgencyNumber + 1;

    // 6. 비밀번호 해시
    var passwordHash = hashPassword(agencyData.Password);

    // 7. 유학원 데이터 구성
    var now = getCurrentTimestamp();
    var newAgency = {
      AgencyCode: agencyData.AgencyCode,
      AgencyNumber: newAgencyNumber,  // 3자리 숫자로 자동 할당
      AgencyName: agencyData.AgencyName || '',
      Role: agencyData.Role || 'agency', // 기본값: agency
      LoginID: agencyData.LoginID,
      PasswordHash: passwordHash,
      IsActive: true,
      LoginAttempts: 0,
      LastLogin: '',
      CreatedBy: session.userId,
      CreatedAt: now,
      UpdatedBy: session.userId,
      UpdatedAt: now
    };

    // 8. Agencies 시트에 행 추가
    _appendRow(SHEETS.AGENCIES, newAgency);

    // 9. 감사 로그 (v2.0)
    _saveAuditLog(session.userId, 'CREATE', SHEETS.AGENCIES, agencyData.AgencyCode, sessionToken);

    return { success: true, data: { AgencyCode: agencyData.AgencyCode } };

  } catch (e) {
    Logger.log('ERROR in createAgency: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== UPDATE ====================

/**
 * 유학원 정보 수정 (관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @param {string} agencyCode - 유학원 코드
 * @param {Object} updates - 수정할 필드
 * @returns {Object} { success: true }
 */
function updateAgency(sessionToken, agencyCode, updates) {
  try {
    // 1. 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    // 2. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 3. master 권한 확인 (v2.0: userType)
    if (session.userType !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. 유학원 존재 확인
    var agencies = _getAllRows(SHEETS.AGENCIES);
    var agency = null;
    for (var i = 0; i < agencies.length; i++) {
      if (agencies[i].AgencyCode === agencyCode) {
        agency = agencies[i];
        break;
      }
    }

    if (!agency) {
      return { success: false, errorKey: 'err_agency_not_found' };
    }

    // 5. AgencyCode 변경 금지
    if (updates.AgencyCode && updates.AgencyCode !== agencyCode) {
      return { success: false, errorKey: 'err_cannot_change_code' };
    }
    delete updates.AgencyCode;

    // 6. LoginID 중복 확인 (본인 제외)
    if (updates.LoginID) {
      for (var i = 0; i < agencies.length; i++) {
        if (agencies[i].AgencyCode === agencyCode) continue;
        if (agencies[i].LoginID === updates.LoginID) {
          return { success: false, errorKey: 'err_duplicate_login_id' };
        }
      }
    }

    // 7. 비밀번호 변경 시 해시
    if (updates.Password) {
      updates.PasswordHash = hashPassword(updates.Password);
      delete updates.Password;
    }

    // 8. 메타 데이터 업데이트 (v2.0: userId)
    updates.UpdatedBy = session.userId;
    updates.UpdatedAt = getCurrentTimestamp();

    // 9. Agencies 시트 업데이트
    _updateRow(SHEETS.AGENCIES, 'AgencyCode', agencyCode, updates);

    // 10. 감사 로그 (v2.0)
    _saveAuditLog(session.userId, 'UPDATE', SHEETS.AGENCIES, agencyCode, sessionToken);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in updateAgency: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}

// ==================== DELETE ====================

/**
 * 유학원 삭제 (Soft Delete, 관리자 전용)
 * @param {string} sessionToken - 세션 토큰
 * @param {string} agencyCode - 유학원 코드
 * @returns {Object} { success: true }
 */
function deleteAgency(sessionToken, agencyCode) {
  try {
    // 1. 세션 검증 (v2.0)
    var sessionResult = validateSession(sessionToken);
    if (!sessionResult.success) {
      return sessionResult;
    }
    var session = sessionResult.data;

    // 2. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 3. master 권한 확인 (v2.0: userType)
    if (session.userType !== 'master') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. MASTER 계정 삭제 방지
    if (agencyCode === 'MASTER') {
      return { success: false, errorKey: 'err_cannot_delete_master' };
    }

    // 5. 유학원 존재 확인
    var agencies = _getAllRows(SHEETS.AGENCIES);
    var agency = null;
    for (var i = 0; i < agencies.length; i++) {
      if (agencies[i].AgencyCode === agencyCode) {
        agency = agencies[i];
        break;
      }
    }

    if (!agency) {
      return { success: false, errorKey: 'err_agency_not_found' };
    }

    // 6. Soft Delete (IsActive = false)
    _updateRow(SHEETS.AGENCIES, 'AgencyCode', agencyCode, {
      IsActive: false,
      UpdatedBy: session.userId,
      UpdatedAt: getCurrentTimestamp()
    });

    // 7. 감사 로그 (v2.0)
    _saveAuditLog(session.userId, 'DELETE', SHEETS.AGENCIES, agencyCode, sessionToken);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in deleteAgency: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
