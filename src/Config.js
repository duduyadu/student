/**
 * Config.gs - 설정 및 헬퍼 함수
 * Phase 2 구현
 */

// 상수 정의
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
const MASTER_SALT = PropertiesService.getScriptProperties().getProperty('MASTER_SALT');
const SESSION_TIMEOUT = 3600; // 1시간 (초)
const CACHE_TTL = 300; // 5분 (초)

// 시트 이름 상수
const SHEETS = {
  STUDENTS: 'Students',
  AGENCIES: 'Agencies',
  USERS: 'Users',                  // Step 4: 통합 인증 시트
  AUDIT_LOGS: 'AuditLogs',
  SYSTEM_CONFIG: 'SystemConfig',
  I18N: 'i18n',
  CONSULTATIONS: 'Consultations',
  EXAM_RESULTS: 'ExamResults',
  TARGET_HISTORY: 'TargetHistory',
  SCHEDULES: 'Schedules',
  FILES: 'Files',
  NOTIFICATIONS: 'Notifications'
};

/**
 * 시트 객체 가져오기
 * @param {string} sheetName - 시트 이름
 * @returns {Sheet} Sheet 객체
 */
function _getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  return sheet;
}

/**
 * 시트의 모든 데이터를 객체 배열로 변환
 * @param {string} sheetName - 시트 이름
 * @returns {Array<Object>} 데이터 배열
 */
function _getAllRows(sheetName) {
  const sheet = _getSheet(sheetName);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return []; // 헤더만 있거나 빈 시트

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * 단일 행 추가
 * @param {string} sheetName - 시트 이름
 * @param {Object} rowData - 행 데이터 객체
 */
function _appendRow(sheetName, rowData) {
  const sheet = _getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const row = headers.map(header => rowData[header] || '');
  sheet.appendRow(row);
}

/**
 * 특정 조건의 행 업데이트
 * @param {string} sheetName - 시트 이름
 * @param {string} keyColumn - 검색 컬럼명
 * @param {*} keyValue - 검색 값
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {boolean} 성공 여부
 */
function _updateRow(sheetName, keyColumn, keyValue, updateData) {
  const sheet = _getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) return false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIndex] === keyValue) {
      // 업데이트할 컬럼들 적용
      Object.keys(updateData).forEach(col => {
        const colIndex = headers.indexOf(col);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(updateData[col]);
        }
      });
      return true;
    }
  }
  return false;
}

/**
 * 특정 조건의 행 삭제 (IsActive = false로 설정)
 * @param {string} sheetName - 시트 이름
 * @param {string} keyColumn - 검색 컬럼명
 * @param {*} keyValue - 검색 값
 * @returns {boolean} 성공 여부
 */
function _softDeleteRow(sheetName, keyColumn, keyValue) {
  return _updateRow(sheetName, keyColumn, keyValue, { IsActive: false });
}
