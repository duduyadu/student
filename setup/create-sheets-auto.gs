/**
 * Phase 1 자동 설정 스크립트
 *
 * 이 스크립트는 8개 시트를 자동으로 생성하고 헤더를 설정합니다.
 *
 * 사용법:
 * 1. SPREADSHEET_ID가 Script Properties에 저장되어 있는지 확인
 * 2. 이 코드를 GAS 프로젝트에 복사
 * 3. createAllSheets() 함수 실행
 * 4. 완료 후 이 파일 삭제
 */

const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

/**
 * 모든 시트 생성 및 헤더 설정
 */
function createAllSheets() {
  if (!SPREADSHEET_ID) {
    Logger.log('ERROR: SPREADSHEET_ID not found in Script Properties');
    return;
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  Logger.log('Starting sheet creation...');

  // 1. Students 시트
  createSheet(ss, 'Students', [
    'StudentID', 'NameKR', 'NameVN', 'DOB', 'Gender', 'AgencyCode',
    'HomeAddressVN', 'PhoneKR', 'PhoneVN', 'Email',
    'ParentNameVN', 'ParentPhoneVN', 'ParentEconomic',
    'HighSchoolGPA', 'EnrollmentDate', 'Status',
    'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt', 'IsActive'
  ]);

  // 2. Agencies 시트
  createSheet(ss, 'Agencies', [
    'AgencyCode', 'AgencyName', 'Role',
    'LoginID', 'PasswordHash', 'IsActive', 'LoginAttempts', 'LastLogin'
  ]);

  // 3. AuditLogs 시트
  createSheet(ss, 'AuditLogs', [
    'Timestamp', 'UserId', 'Action', 'TargetSheet', 'TargetId',
    'Details', 'IP', 'SessionId', 'ErrorMessage', 'IsSuccess'
  ]);

  // 4. SystemConfig 시트
  const configSheet = createSheet(ss, 'SystemConfig', [
    'ConfigKey', 'ConfigValue', 'Description', 'UpdatedBy', 'UpdatedAt'
  ]);

  // SystemConfig 초기 데이터 추가
  configSheet.appendRow(['copyright_text', '© 2026 AJU E&J', '저작권 표시', 'admin', getCurrentTimestamp()]);
  configSheet.appendRow(['session_timeout', '3600', '세션 만료 시간 (초)', 'admin', getCurrentTimestamp()]);
  configSheet.appendRow(['max_login_attempts', '5', '최대 로그인 시도 횟수', 'admin', getCurrentTimestamp()]);

  // 5. i18n 시트
  createSheet(ss, 'i18n', [
    'Key', 'Korean', 'Vietnamese', 'Category', 'UpdatedAt'
  ]);

  // 6. Consultations 시트
  createSheet(ss, 'Consultations', [
    'ConsultationID', 'StudentID', 'ConsultDate', 'ConsultType',
    'ConsultantId', 'Summary', 'ImprovementArea', 'NextGoal',
    'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
  ]);

  // 7. ExamResults 시트
  createSheet(ss, 'ExamResults', [
    'ExamResultID', 'StudentID', 'ExamDate', 'ExamType',
    'Listening', 'Reading', 'Writing', 'TotalScore', 'Grade',
    'CreatedBy', 'CreatedAt'
  ]);

  // 8. TargetHistory 시트
  createSheet(ss, 'TargetHistory', [
    'HistoryID', 'StudentID', 'ChangedDate',
    'TargetUniversityKR', 'TargetUniversityVN',
    'TargetMajorKR', 'TargetMajorVN',
    'ChangedBy', 'ChangedAt'
  ]);

  Logger.log('All sheets created successfully!');
  Logger.log('Next step: Import i18n data from setup/i18n-initial-data.tsv');
}

/**
 * 시트 생성 및 헤더 설정
 */
function createSheet(ss, sheetName, headers) {
  // 기존 시트 확인
  let sheet = ss.getSheetByName(sheetName);

  if (sheet) {
    Logger.log('Sheet already exists: ' + sheetName + ' (skipping)');
    return sheet;
  }

  // 새 시트 생성
  sheet = ss.insertSheet(sheetName);

  // 헤더 설정
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // 헤더 스타일링
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4CAF50');
  headerRange.setFontColor('#FFFFFF');

  // 열 너비 자동 조정
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // 첫 행 고정
  sheet.setFrozenRows(1);

  Logger.log('Created: ' + sheetName + ' (' + headers.length + ' columns)');
  return sheet;
}

/**
 * 현재 시간 반환
 */
function getCurrentTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}

/**
 * 기존 "Sheet1" 삭제 (선택사항)
 */
function deleteDefaultSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const defaultSheet = ss.getSheetByName('Sheet1');

  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
    Logger.log('Deleted default Sheet1');
  }
}
