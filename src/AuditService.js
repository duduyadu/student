/**
 * AuditService.gs - 감사 로그
 * Phase 3 구현
 *
 * 주의: UserCache 사용 금지 (웹앱 컨텍스트 불일치)
 */

/**
 * 감사 로그 저장
 * @param {string} userId - 사용자 ID
 * @param {string} action - 작업 유형
 * @param {string} targetSheet - 대상 시트
 * @param {string} targetId - 대상 ID
 * @param {string} details - 상세 내용
 * @param {string} [sessionId] - 세션 ID (선택)
 */
function _saveAuditLog(userId, action, targetSheet, targetId, details, sessionId) {
  try {
    var activeEmail = '';
    try {
      activeEmail = Session.getActiveUser().getEmail() || 'N/A';
    } catch (emailErr) {
      activeEmail = 'N/A';
    }

    var logData = {
      Timestamp: getCurrentTimestamp(),
      UserId: userId || 'SYSTEM',
      Action: action,
      TargetSheet: targetSheet || 'N/A',
      TargetId: targetId || 'N/A',
      Details: details || '',
      IP: activeEmail,
      SessionId: sessionId || 'N/A',
      ErrorMessage: '',
      IsSuccess: true
    };

    _appendRow(SHEETS.AUDIT_LOGS, logData);

  } catch (e) {
    Logger.log('ERROR in _saveAuditLog: ' + e.message);
  }
}

/**
 * 감사 로그 조회
 * @param {string} sessionId - 세션 ID (클라이언트에서 전달)
 * @param {Object} filters - 필터 조건
 */
function getAuditLogs(sessionId, filters) {
  try {
    var session = _validateSession(sessionId);
    _validatePermission(session, 'READ', SHEETS.AUDIT_LOGS);

    var logs = _getAllRows(SHEETS.AUDIT_LOGS);

    if (filters && filters.userId) {
      logs = logs.filter(function(log) { return log.UserId === filters.userId; });
    }
    if (filters && filters.action) {
      logs = logs.filter(function(log) { return log.Action === filters.action; });
    }

    logs.sort(function(a, b) {
      return String(b.Timestamp).localeCompare(String(a.Timestamp));
    });
    logs = logs.slice(0, 1000);

    return { success: true, data: logs };

  } catch (e) {
    Logger.log('ERROR in getAuditLogs: ' + e.message);
    return { success: false, errorKey: e.errorKey || 'err_unknown' };
  }
}
