/**
 * SetupSheets.gs - Phase 1 시트 자동 생성
 * 한 번만 실행
 */

/**
 * Step 0: Spreadsheet 생성 (가장 먼저 실행)
 */
function createSpreadsheet() {
  Logger.log('========================================');
  Logger.log('Spreadsheet 생성 시작');
  Logger.log('========================================');

  // 새 스프레드시트 생성
  const ss = SpreadsheetApp.create("AJU E&J Student Management DB");
  const spreadsheetId = ss.getId();
  const url = ss.getUrl();

  // Script Properties에 자동 저장
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);

  Logger.log('');
  Logger.log('✅ Spreadsheet 생성 완료!');
  Logger.log('');
  Logger.log('========================================');
  Logger.log('📋 Spreadsheet 정보');
  Logger.log('========================================');
  Logger.log('ID: ' + spreadsheetId);
  Logger.log('URL: ' + url);
  Logger.log('');
  Logger.log('✅ SPREADSHEET_ID가 Script Properties에 자동 저장되었습니다.');
  Logger.log('');
  Logger.log('========================================');
  Logger.log('🚀 다음 단계');
  Logger.log('========================================');
  Logger.log('1. 위 URL을 클릭하여 스프레드시트 확인');
  Logger.log('2. runPhase1Setup() 함수 실행');
  Logger.log('========================================');

  return {
    id: spreadsheetId,
    url: url
  };
}

/**
 * Phase 1 자동 설정 실행
 */
function runPhase1Setup() {
  Logger.log('========================================');
  Logger.log('Phase 1 자동 설정 시작');
  Logger.log('========================================');

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    Logger.log('❌ ERROR: SPREADSHEET_ID가 Script Properties에 없습니다!');
    return;
  }

  Logger.log('✅ SPREADSHEET_ID 확인: ' + spreadsheetId);

  const salt = Utilities.getUuid() + Utilities.getUuid();

  Logger.log('========================================');
  Logger.log('⚠️  중요: 다음 값을 복사하세요!');
  Logger.log('========================================');
  Logger.log('');
  Logger.log('MASTER_SALT:');
  Logger.log(salt);
  Logger.log('');
  Logger.log('========================================');
  Logger.log('다음 단계:');
  Logger.log('1. 위 MASTER_SALT 값 복사');
  Logger.log('2. 프로젝트 설정 → 스크립트 속성');
  Logger.log('3. 속성: MASTER_SALT, 값: (위에서 복사한 값)');
  Logger.log('4. 저장 후 finalizePhase1() 함수 실행');
  Logger.log('========================================');
}

/**
 * Phase 1 마무리
 */
function finalizePhase1() {
  Logger.log('========================================');
  Logger.log('Phase 1 마무리 시작');
  Logger.log('========================================');

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const masterSalt = PropertiesService.getScriptProperties().getProperty('MASTER_SALT');

  if (!spreadsheetId || !masterSalt) {
    Logger.log('❌ ERROR: Script Properties 확인 실패');
    return;
  }

  Logger.log('✅ Script Properties 확인 완료');

  const ss = SpreadsheetApp.openById(spreadsheetId);

  createAllSheets(ss);
  addSystemConfigData(ss);
  createMasterAccount(ss, masterSalt);
  deleteDefaultSheet(ss);

  Logger.log('========================================');
  Logger.log('✅ Phase 1 자동 설정 완료!');
  Logger.log('========================================');
}

/**
 * 모든 시트 생성
 */
function createAllSheets(ss) {
  const sheets = [
    { name: 'Students', headers: ['StudentID', 'NameKR', 'NameVN', 'DOB', 'Gender', 'AgencyCode', 'HomeAddressVN', 'PhoneKR', 'PhoneVN', 'Email', 'ParentNameVN', 'ParentPhoneVN', 'ParentEconomic', 'HighSchoolGPA', 'EnrollmentDate', 'Status', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt', 'IsActive'] },
    { name: 'Agencies', headers: ['AgencyCode', 'AgencyNumber', 'AgencyName', 'Role', 'LoginID', 'PasswordHash', 'IsActive', 'LoginAttempts', 'LastLogin', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'] },
    { name: 'AuditLogs', headers: ['Timestamp', 'UserId', 'Action', 'TargetSheet', 'TargetId', 'Details', 'IP', 'SessionId', 'ErrorMessage', 'IsSuccess'] },
    { name: 'SystemConfig', headers: ['ConfigKey', 'ConfigValue', 'Description', 'UpdatedBy', 'UpdatedAt'] },
    { name: 'i18n', headers: ['Key', 'Korean', 'Vietnamese', 'Category', 'UpdatedAt'] },
    { name: 'Consultations', headers: ['ConsultationID', 'StudentID', 'ConsultDate', 'ConsultType', 'ConsultantId', 'Summary', 'ImprovementArea', 'NextGoal', 'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'] },
    { name: 'ExamResults', headers: ['ExamResultID', 'StudentID', 'ExamDate', 'ExamType', 'Listening', 'Reading', 'Writing', 'TotalScore', 'Grade', 'CreatedBy', 'CreatedAt'] },
    { name: 'TargetHistory', headers: ['HistoryID', 'StudentID', 'ChangedDate', 'TargetUniversityKR', 'TargetUniversityVN', 'TargetMajorKR', 'TargetMajorVN', 'ChangedBy', 'ChangedAt'] }
  ];

  sheets.forEach(function(config) {
    createSheet(ss, config.name, config.headers);
  });
}

function createSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (sheet) {
    Logger.log('  ⚠️  ' + name + ' 이미 존재');
    return sheet;
  }

  sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#4CAF50').setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  Logger.log('  ✅ ' + name);
  return sheet;
}

function addSystemConfigData(ss) {
  const sheet = ss.getSheetByName('SystemConfig');
  if (!sheet || sheet.getLastRow() > 1) return;

  const ts = getCurrentTimestamp();
  sheet.appendRow(['copyright_text', '© 2026 AJU E&J', '저작권', 'admin', ts]);
  sheet.appendRow(['session_timeout', '3600', '세션 만료 시간', 'admin', ts]);
  sheet.appendRow(['max_login_attempts', '5', '최대 로그인 시도', 'admin', ts]);
}

function createMasterAccount(ss, salt) {
  const sheet = ss.getSheetByName('Agencies');
  if (!sheet || sheet.getLastRow() > 1) return;

  const hash = Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    'admin123' + salt,
    Utilities.Charset.UTF_8
  ));

  const ts = getCurrentTimestamp();

  // MASTER 계정: AgencyNumber = 0 (학생 ID: 26-000-0001)
  sheet.appendRow([
    'MASTER',           // AgencyCode
    0,                  // AgencyNumber (MASTER는 0번)
    '마스터 관리자',     // AgencyName
    'master',           // Role
    'admin',            // LoginID
    hash,               // PasswordHash
    true,               // IsActive
    0,                  // LoginAttempts
    '',                 // LastLogin
    'admin',            // CreatedBy
    ts,                 // CreatedAt
    'admin',            // UpdatedBy
    ts                  // UpdatedAt
  ]);
  Logger.log('  ✅ MASTER 계정 (admin/admin123, AgencyNumber=0)');
}

function deleteDefaultSheet(ss) {
  const sheet = ss.getSheetByName('Sheet1');
  if (sheet && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet);
  }
}
