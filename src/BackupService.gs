/**
 * BackupService.gs
 *
 * 데이터 백업/복구 서비스
 *
 * Features:
 * - 수동 백업 생성 (Master 권한만)
 * - 백업 목록 조회
 * - 백업에서 복구
 * - 30일 초과 백업 자동 정리
 * - 매일 자정 자동 백업 (Time Trigger)
 *
 * @version 2.2
 * @since 2026-02-16
 */

/* ========================================
   BACKUP CONFIGURATION
   ======================================== */

const BACKUP_FOLDER_NAME = 'AJU_EJ_Backups'; // Drive에 생성할 백업 폴더명
const BACKUP_RETENTION_DAYS = 30; // 백업 보관 일수
const AUTO_BACKUP_HOUR = 0; // 자동 백업 시간 (0 = 자정)

/**
 * 백업 생성
 *
 * @param {string} sessionId - 세션 ID
 * @returns {Object} { success: boolean, backup?: Object, error?: string }
 *
 * @example
 * const result = createBackup(sessionId);
 * // Returns: {
 * //   success: true,
 * //   backup: {
 * //     backupId: 'backup_2026-02-16_001234',
 * //     timestamp: '2026-02-16T00:12:34Z',
 * //     sheetsCopied: ['Students', 'Agencies', 'Consultations', ...],
 * //     fileSize: '2.5 MB',
 * //     driveFileId: '1AbC...'
 * //   }
 * // }
 */
function createBackup(sessionId) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 권한 확인 (Master만 백업 가능)
    if (session.role !== 'master') {
      return {
        success: false,
        errorKey: 'err_permission_denied',
        error: '백업 권한이 없습니다. (Master 전용)'
      };
    }

    // 4. 원본 스프레드시트 열기
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();

    // 5. 백업 폴더 확인/생성
    const backupFolder = _getOrCreateBackupFolder();

    // 6. 백업 ID 생성 (backup_YYYY-MM-DD_HHMMSS)
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
    const backupId = 'backup_' + dateStr;

    // 7. 새 스프레드시트 생성 (백업 파일)
    const backupFileName = '[BACKUP] AJU E&J - ' + dateStr;
    const backupSS = SpreadsheetApp.create(backupFileName);
    const backupFile = DriveApp.getFileById(backupSS.getId());

    // 8. 백업 파일을 백업 폴더로 이동
    backupFile.moveTo(backupFolder);

    // 9. 모든 시트 복사
    const sheetsCopied = [];
    const backupDefaultSheet = backupSS.getSheets()[0]; // 기본 시트 (나중에 삭제)

    for (let i = 0; i < sheets.length; i++) {
      const sourceSheet = sheets[i];
      const sheetName = sourceSheet.getName();

      // 시트 복사
      sourceSheet.copyTo(backupSS).setName(sheetName);
      sheetsCopied.push(sheetName);

      Logger.log('✅ Sheet copied: ' + sheetName);
    }

    // 10. 기본 시트 삭제 (Sheet1)
    if (backupDefaultSheet.getName() === 'Sheet1') {
      backupSS.deleteSheet(backupDefaultSheet);
    }

    // 11. 백업 메타데이터 추가 (Backup_Info 시트)
    const metaSheet = backupSS.insertSheet('Backup_Info', 0);
    metaSheet.getRange('A1:B10').setValues([
      ['Backup ID', backupId],
      ['Timestamp', timestamp],
      ['Created By', session.loginId],
      ['Sheets Copied', sheetsCopied.length],
      ['Sheet Names', sheetsCopied.join(', ')],
      ['Original Spreadsheet ID', SPREADSHEET_ID],
      ['Backup File ID', backupSS.getId()],
      ['Retention Days', BACKUP_RETENTION_DAYS],
      ['Auto Cleanup', 'Enabled'],
      ['Notes', 'Auto-generated backup by AJU E&J System']
    ]);
    metaSheet.autoResizeColumns(1, 2);

    // 12. 파일 크기 계산
    const fileSize = _formatFileSize(backupFile.getSize());

    // 13. 백업 정보 객체 생성
    const backupInfo = {
      backupId: backupId,
      timestamp: timestamp,
      createdBy: session.loginId,
      sheetsCopied: sheetsCopied,
      sheetCount: sheetsCopied.length,
      fileSize: fileSize,
      driveFileId: backupSS.getId(),
      driveFileUrl: backupSS.getUrl(),
      retentionDays: BACKUP_RETENTION_DAYS
    };

    // 14. 감사 로그 기록
    _saveAuditLog(session.loginId, 'BACKUP', 'System', backupId, sessionId);

    Logger.log('========================================');
    Logger.log('BACKUP CREATED SUCCESSFULLY');
    Logger.log('Backup ID: ' + backupId);
    Logger.log('Sheets Copied: ' + sheetsCopied.length);
    Logger.log('File Size: ' + fileSize);
    Logger.log('========================================');

    return {
      success: true,
      backup: backupInfo
    };

  } catch (e) {
    Logger.log('ERROR in createBackup: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_backup_failed',
      error: '백업 생성 실패: ' + e.message
    };
  }
}

/**
 * 백업 목록 조회
 *
 * @param {string} sessionId - 세션 ID
 * @returns {Object} { success: boolean, backups?: Array<Object>, error?: string }
 *
 * @example
 * const result = listBackups(sessionId);
 * // Returns: {
 * //   success: true,
 * //   backups: [
 * //     { backupId: 'backup_2026-02-16_001234', timestamp: '...', fileSize: '2.5 MB', ... },
 * //     { backupId: 'backup_2026-02-15_001234', timestamp: '...', fileSize: '2.3 MB', ... }
 * //   ]
 * // }
 */
function listBackups(sessionId) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 권한 확인 (Master만 조회 가능)
    if (session.role !== 'master') {
      return {
        success: false,
        errorKey: 'err_permission_denied',
        error: '백업 조회 권한이 없습니다. (Master 전용)'
      };
    }

    // 4. 백업 폴더 확인
    const backupFolder = _getOrCreateBackupFolder();

    // 5. 백업 파일 목록 가져오기
    const backupFiles = backupFolder.getFilesByType(MimeType.GOOGLE_SHEETS);

    const backups = [];

    while (backupFiles.hasNext()) {
      const file = backupFiles.next();
      const fileName = file.getName();

      // 백업 파일인지 확인 (파일명에 [BACKUP] 포함)
      if (fileName.indexOf('[BACKUP]') === -1) {
        continue;
      }

      try {
        // 백업 파일 열기
        const backupSS = SpreadsheetApp.openById(file.getId());
        const metaSheet = backupSS.getSheetByName('Backup_Info');

        if (!metaSheet) {
          // Backup_Info 시트가 없으면 구 형식 백업
          backups.push({
            backupId: fileName,
            timestamp: file.getDateCreated().toISOString(),
            createdBy: 'Unknown',
            sheetCount: backupSS.getSheets().length,
            fileSize: _formatFileSize(file.getSize()),
            driveFileId: file.getId(),
            driveFileUrl: backupSS.getUrl(),
            isLegacy: true
          });
        } else {
          // 메타데이터에서 정보 읽기
          const metaData = metaSheet.getRange('A1:B10').getValues();

          const backupInfo = {};
          for (let i = 0; i < metaData.length; i++) {
            const key = metaData[i][0];
            const value = metaData[i][1];
            backupInfo[key] = value;
          }

          backups.push({
            backupId: backupInfo['Backup ID'] || fileName,
            timestamp: backupInfo['Timestamp'] || file.getDateCreated().toISOString(),
            createdBy: backupInfo['Created By'] || 'Unknown',
            sheetCount: parseInt(backupInfo['Sheets Copied']) || backupSS.getSheets().length - 1,
            sheetNames: backupInfo['Sheet Names'] ? backupInfo['Sheet Names'].split(', ') : [],
            fileSize: _formatFileSize(file.getSize()),
            driveFileId: file.getId(),
            driveFileUrl: backupSS.getUrl(),
            retentionDays: parseInt(backupInfo['Retention Days']) || BACKUP_RETENTION_DAYS,
            isLegacy: false
          });
        }
      } catch (e) {
        Logger.log('⚠️  Failed to read backup file: ' + fileName + ' (' + e.message + ')');
      }
    }

    // 6. 타임스탬프 역순 정렬 (최신순)
    backups.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    Logger.log('========================================');
    Logger.log('BACKUP LIST RETRIEVED');
    Logger.log('Total Backups: ' + backups.length);
    Logger.log('========================================');

    return {
      success: true,
      backups: backups,
      totalBackups: backups.length
    };

  } catch (e) {
    Logger.log('ERROR in listBackups: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_list_backups_failed',
      error: '백업 목록 조회 실패: ' + e.message
    };
  }
}

/**
 * 백업에서 복구
 *
 * @param {string} sessionId - 세션 ID
 * @param {string} backupId - 백업 ID 또는 Drive 파일 ID
 * @returns {Object} { success: boolean, restored?: Object, error?: string }
 *
 * @example
 * const result = restoreFromBackup(sessionId, 'backup_2026-02-16_001234');
 * // Returns: {
 * //   success: true,
 * //   restored: {
 * //     backupId: 'backup_2026-02-16_001234',
 * //     restoredSheets: ['Students', 'Agencies', ...],
 * //     timestamp: '2026-02-16T10:30:00Z'
 * //   }
 * // }
 */
function restoreFromBackup(sessionId, backupId) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 권한 확인 (Master만 복구 가능)
    if (session.role !== 'master') {
      return {
        success: false,
        errorKey: 'err_permission_denied',
        error: '백업 복구 권한이 없습니다. (Master 전용)'
      };
    }

    // 4. 백업 파일 찾기
    const backupFile = _findBackupFile(backupId);

    if (!backupFile) {
      return {
        success: false,
        errorKey: 'err_backup_not_found',
        error: '백업 파일을 찾을 수 없습니다: ' + backupId
      };
    }

    // 5. 백업 파일 열기
    const backupSS = SpreadsheetApp.openById(backupFile.getId());
    const backupSheets = backupSS.getSheets();

    // 6. 원본 스프레드시트 열기
    const targetSS = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 7. 복구 전 현재 상태 백업 (안전장치)
    Logger.log('⚠️  Creating pre-restore backup...');
    const preRestoreBackup = createBackup(sessionId);
    if (!preRestoreBackup.success) {
      Logger.log('❌ Pre-restore backup failed. Aborting restore.');
      return {
        success: false,
        errorKey: 'err_pre_restore_backup_failed',
        error: '복구 전 백업 생성 실패. 복구를 중단합니다.'
      };
    }
    Logger.log('✅ Pre-restore backup created: ' + preRestoreBackup.backup.backupId);

    // 8. 복구 시작
    const restoredSheets = [];

    for (let i = 0; i < backupSheets.length; i++) {
      const backupSheet = backupSheets[i];
      const sheetName = backupSheet.getName();

      // Backup_Info 시트는 건너뛰기
      if (sheetName === 'Backup_Info') {
        continue;
      }

      try {
        // 대상 시트가 있으면 삭제
        const targetSheet = targetSS.getSheetByName(sheetName);
        if (targetSheet) {
          targetSS.deleteSheet(targetSheet);
          Logger.log('🗑️  Deleted existing sheet: ' + sheetName);
        }

        // 백업 시트 복사
        const restoredSheet = backupSheet.copyTo(targetSS);
        restoredSheet.setName(sheetName);

        restoredSheets.push(sheetName);
        Logger.log('✅ Sheet restored: ' + sheetName);

      } catch (e) {
        Logger.log('❌ Failed to restore sheet: ' + sheetName + ' (' + e.message + ')');
      }
    }

    // 9. 복구 완료
    const timestamp = new Date().toISOString();

    // 10. 감사 로그 기록
    _saveAuditLog(session.loginId, 'RESTORE', 'System', backupId + ' → ' + restoredSheets.length + ' sheets', sessionId);

    Logger.log('========================================');
    Logger.log('RESTORE COMPLETED');
    Logger.log('Backup ID: ' + backupId);
    Logger.log('Restored Sheets: ' + restoredSheets.length);
    Logger.log('Pre-restore Backup: ' + preRestoreBackup.backup.backupId);
    Logger.log('========================================');

    return {
      success: true,
      restored: {
        backupId: backupId,
        restoredSheets: restoredSheets,
        sheetCount: restoredSheets.length,
        timestamp: timestamp,
        preRestoreBackupId: preRestoreBackup.backup.backupId
      }
    };

  } catch (e) {
    Logger.log('ERROR in restoreFromBackup: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_restore_failed',
      error: '백업 복구 실패: ' + e.message
    };
  }
}

/**
 * 30일 초과 백업 자동 정리
 *
 * @param {string} sessionId - 세션 ID (선택적, 수동 실행 시)
 * @param {number} daysToKeep - 보관 일수 (기본값: 30)
 * @returns {Object} { success: boolean, deleted?: Object, error?: string }
 *
 * @example
 * const result = cleanupOldBackups(sessionId, 30);
 * // Returns: {
 * //   success: true,
 * //   deleted: {
 * //     deletedBackups: ['backup_2026-01-01_001234', ...],
 * //     freedSpace: '50 MB'
 * //   }
 * // }
 */
function cleanupOldBackups(sessionId, daysToKeep) {
  try {
    // 1. daysToKeep 기본값 설정
    if (!daysToKeep || typeof daysToKeep !== 'number' || daysToKeep <= 0) {
      daysToKeep = BACKUP_RETENTION_DAYS;
    }

    // 2. 세션 검증 (선택적 - Trigger에서 호출 시 sessionId가 없을 수 있음)
    let session = null;
    if (sessionId) {
      session = _validateSession(sessionId);

      // Rate Limiting
      checkRateLimit(session.userId);

      // 권한 확인 (Master만 수동 정리 가능)
      if (session.role !== 'master') {
        return {
          success: false,
          errorKey: 'err_permission_denied',
          error: '백업 정리 권한이 없습니다. (Master 전용)'
        };
      }
    }

    // 3. 백업 폴더 확인
    const backupFolder = _getOrCreateBackupFolder();

    // 4. 백업 파일 목록 가져오기
    const backupFiles = backupFolder.getFilesByType(MimeType.GOOGLE_SHEETS);

    // 5. 삭제 기준 날짜 계산
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedBackups = [];
    let freedSpace = 0;

    while (backupFiles.hasNext()) {
      const file = backupFiles.next();
      const fileName = file.getName();

      // 백업 파일인지 확인
      if (fileName.indexOf('[BACKUP]') === -1) {
        continue;
      }

      const createdDate = file.getDateCreated();

      // 기준 날짜보다 오래된 백업 삭제
      if (createdDate < cutoffDate) {
        const fileSize = file.getSize();

        // 파일 삭제 (휴지통으로 이동)
        file.setTrashed(true);

        deletedBackups.push({
          backupId: fileName,
          createdDate: createdDate.toISOString(),
          fileSize: _formatFileSize(fileSize)
        });

        freedSpace += fileSize;

        Logger.log('🗑️  Deleted old backup: ' + fileName + ' (Created: ' + createdDate.toLocaleDateString() + ')');
      }
    }

    // 6. 감사 로그 기록
    if (session) {
      _saveAuditLog(session.loginId, 'CLEANUP', 'System', deletedBackups.length + ' backups deleted', sessionId);
    } else {
      _saveAuditLog('AUTO_CLEANUP', 'CLEANUP', 'System', deletedBackups.length + ' backups deleted', null);
    }

    Logger.log('========================================');
    Logger.log('BACKUP CLEANUP COMPLETED');
    Logger.log('Days to Keep: ' + daysToKeep);
    Logger.log('Deleted Backups: ' + deletedBackups.length);
    Logger.log('Freed Space: ' + _formatFileSize(freedSpace));
    Logger.log('========================================');

    return {
      success: true,
      deleted: {
        deletedBackups: deletedBackups,
        deletedCount: deletedBackups.length,
        freedSpace: _formatFileSize(freedSpace)
      }
    };

  } catch (e) {
    Logger.log('ERROR in cleanupOldBackups: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_cleanup_failed',
      error: '백업 정리 실패: ' + e.message
    };
  }
}

/**
 * 자동 백업 Time Trigger 설정
 *
 * @returns {Object} { success: boolean, trigger?: Object, error?: string }
 *
 * @example
 * const result = scheduleAutoBackup();
 * // Returns: {
 * //   success: true,
 * //   trigger: {
 * //     triggerId: 'trigger_abc123',
 * //     schedule: 'Daily at 00:00',
 * //     functionName: '_runAutoBackup'
 * //   }
 * // }
 */
function scheduleAutoBackup() {
  try {
    // 1. 기존 Trigger 삭제 (중복 방지)
    const triggers = ScriptApp.getProjectTriggers();

    for (let i = 0; i < triggers.length; i++) {
      const trigger = triggers[i];

      // _runAutoBackup 함수의 Trigger만 삭제
      if (trigger.getHandlerFunction() === '_runAutoBackup') {
        ScriptApp.deleteTrigger(trigger);
        Logger.log('🗑️  Deleted existing auto-backup trigger: ' + trigger.getUniqueId());
      }
    }

    // 2. 새 Trigger 생성 (매일 자정)
    const newTrigger = ScriptApp.newTrigger('_runAutoBackup')
      .timeBased()
      .atHour(AUTO_BACKUP_HOUR) // 0 = 자정
      .everyDays(1)
      .create();

    const triggerId = newTrigger.getUniqueId();

    Logger.log('========================================');
    Logger.log('AUTO-BACKUP TRIGGER SCHEDULED');
    Logger.log('Trigger ID: ' + triggerId);
    Logger.log('Schedule: Daily at ' + AUTO_BACKUP_HOUR + ':00');
    Logger.log('Function: _runAutoBackup');
    Logger.log('========================================');

    return {
      success: true,
      trigger: {
        triggerId: triggerId,
        schedule: 'Daily at ' + AUTO_BACKUP_HOUR + ':00',
        functionName: '_runAutoBackup',
        status: 'Active'
      }
    };

  } catch (e) {
    Logger.log('ERROR in scheduleAutoBackup: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_schedule_failed',
      error: 'Trigger 설정 실패: ' + e.message
    };
  }
}

/* ========================================
   PRIVATE HELPER FUNCTIONS
   ======================================== */

/**
 * 백업 폴더 확인/생성
 * @private
 * @returns {Folder} 백업 폴더 객체
 */
function _getOrCreateBackupFolder() {
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);

  if (folders.hasNext()) {
    return folders.next();
  } else {
    // 백업 폴더 생성
    const newFolder = DriveApp.createFolder(BACKUP_FOLDER_NAME);
    Logger.log('✅ Backup folder created: ' + BACKUP_FOLDER_NAME);
    return newFolder;
  }
}

/**
 * 백업 파일 찾기
 * @private
 * @param {string} backupIdOrFileId - 백업 ID 또는 Drive 파일 ID
 * @returns {File|null} 백업 파일 객체 또는 null
 */
function _findBackupFile(backupIdOrFileId) {
  try {
    // 1. Drive 파일 ID로 직접 접근 시도
    try {
      const file = DriveApp.getFileById(backupIdOrFileId);
      if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
        return file;
      }
    } catch (e) {
      // File ID로 접근 실패 → Backup ID로 검색
    }

    // 2. Backup ID로 검색 (파일명에 포함)
    const backupFolder = _getOrCreateBackupFolder();
    const backupFiles = backupFolder.getFilesByType(MimeType.GOOGLE_SHEETS);

    while (backupFiles.hasNext()) {
      const file = backupFiles.next();
      const fileName = file.getName();

      if (fileName.indexOf(backupIdOrFileId) !== -1) {
        return file;
      }
    }

    return null;

  } catch (e) {
    Logger.log('ERROR in _findBackupFile: ' + e.message);
    return null;
  }
}

/**
 * 파일 크기 포맷팅
 * @private
 * @param {number} bytes - 바이트 단위 파일 크기
 * @returns {string} 포맷된 파일 크기 (예: "2.5 MB")
 */
function _formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 자동 백업 실행 함수 (Trigger에서 호출)
 * @private
 */
function _runAutoBackup() {
  Logger.log('========================================');
  Logger.log('AUTO-BACKUP STARTED');
  Logger.log('Timestamp: ' + new Date().toISOString());
  Logger.log('========================================');

  try {
    // 1. 자동 백업 실행 (sessionId 없이)
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();

    // 백업 폴더 확인/생성
    const backupFolder = _getOrCreateBackupFolder();

    // 백업 ID 생성
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmmss');
    const backupId = 'backup_auto_' + dateStr;

    // 백업 파일 생성
    const backupFileName = '[BACKUP] AJU E&J - ' + dateStr;
    const backupSS = SpreadsheetApp.create(backupFileName);
    const backupFile = DriveApp.getFileById(backupSS.getId());
    backupFile.moveTo(backupFolder);

    // 모든 시트 복사
    const sheetsCopied = [];
    const backupDefaultSheet = backupSS.getSheets()[0];

    for (let i = 0; i < sheets.length; i++) {
      const sourceSheet = sheets[i];
      const sheetName = sourceSheet.getName();
      sourceSheet.copyTo(backupSS).setName(sheetName);
      sheetsCopied.push(sheetName);
    }

    if (backupDefaultSheet.getName() === 'Sheet1') {
      backupSS.deleteSheet(backupDefaultSheet);
    }

    // 백업 메타데이터 추가
    const metaSheet = backupSS.insertSheet('Backup_Info', 0);
    metaSheet.getRange('A1:B10').setValues([
      ['Backup ID', backupId],
      ['Timestamp', now.toISOString()],
      ['Created By', 'AUTO_BACKUP'],
      ['Sheets Copied', sheetsCopied.length],
      ['Sheet Names', sheetsCopied.join(', ')],
      ['Original Spreadsheet ID', SPREADSHEET_ID],
      ['Backup File ID', backupSS.getId()],
      ['Retention Days', BACKUP_RETENTION_DAYS],
      ['Auto Cleanup', 'Enabled'],
      ['Notes', 'Auto-generated daily backup']
    ]);

    Logger.log('✅ Auto-backup completed: ' + backupId);

    // 2. 자동 정리 실행 (30일 초과 백업 삭제)
    cleanupOldBackups(null, BACKUP_RETENTION_DAYS);

    // 3. 감사 로그
    _saveAuditLog('AUTO_BACKUP', 'BACKUP', 'System', backupId, null);

    Logger.log('========================================');
    Logger.log('AUTO-BACKUP FINISHED');
    Logger.log('========================================');

  } catch (e) {
    Logger.log('❌ ERROR in _runAutoBackup: ' + e.message);
    _saveAuditLog('AUTO_BACKUP', 'ERROR', 'System', e.message, null);
  }
}

/**
 * BackupService 테스트 함수
 *
 * @example
 * // GAS 에디터에서 실행:
 * testBackupService();
 */
function testBackupService() {
  Logger.log('========================================');
  Logger.log('BACKUP SERVICE TEST');
  Logger.log('========================================');

  // 테스트용 세션 (Master 권한)
  const testSession = {
    sessionId: 'test_session_backup',
    userId: 'admin',
    loginId: 'admin',
    role: 'master',
    agencyCode: 'MASTER'
  };

  // 임시 세션 저장
  const cache = CacheService.getScriptCache();
  cache.put(testSession.sessionId, JSON.stringify(testSession), 3600);

  // 1. createBackup 테스트
  Logger.log('\n1. Testing createBackup()...');
  const createResult = createBackup(testSession.sessionId);

  if (createResult.success) {
    Logger.log('✅ Backup created!');
    Logger.log('Backup ID: ' + createResult.backup.backupId);
    Logger.log('Sheets Copied: ' + createResult.backup.sheetCount);
  } else {
    Logger.log('❌ Backup failed!');
    Logger.log('Error: ' + createResult.error);
  }

  // 2. listBackups 테스트
  Logger.log('\n2. Testing listBackups()...');
  const listResult = listBackups(testSession.sessionId);

  if (listResult.success) {
    Logger.log('✅ Backup list retrieved!');
    Logger.log('Total Backups: ' + listResult.totalBackups);
  } else {
    Logger.log('❌ List failed!');
    Logger.log('Error: ' + listResult.error);
  }

  // 3. scheduleAutoBackup 테스트
  Logger.log('\n3. Testing scheduleAutoBackup()...');
  const scheduleResult = scheduleAutoBackup();

  if (scheduleResult.success) {
    Logger.log('✅ Auto-backup scheduled!');
    Logger.log('Trigger ID: ' + scheduleResult.trigger.triggerId);
    Logger.log('Schedule: ' + scheduleResult.trigger.schedule);
  } else {
    Logger.log('❌ Schedule failed!');
    Logger.log('Error: ' + scheduleResult.error);
  }

  Logger.log('\n========================================');
  Logger.log('BACKUP SERVICE TEST COMPLETE');
  Logger.log('========================================');
}
