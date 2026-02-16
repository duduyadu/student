/**
 * ========================================
 * Phase 1 통합 자동 설정 스크립트
 * ========================================
 *
 * 이 스크립트는 Phase 1의 모든 작업을 자동으로 수행합니다:
 * 1. MASTER_SALT 생성 및 출력
 * 2. 8개 시트 자동 생성
 * 3. 헤더 설정
 * 4. SystemConfig 초기 데이터 입력
 * 5. Agencies MASTER 계정 생성
 *
 * 사용법:
 * 1. Google Apps Script 프로젝트 생성
 * 2. Google Spreadsheet 생성
 * 3. SPREADSHEET_ID를 Script Properties에 저장
 * 4. 이 전체 코드를 Code.gs에 복사
 * 5. runPhase1Setup() 함수 실행
 * 6. 로그에서 MASTER_SALT 복사 → Script Properties에 저장
 * 7. finalizePhase1() 함수 실행
 */

// ========================================
// Step 1: MASTER_SALT 생성 및 초기 설정
// ========================================

/**
 * Phase 1 자동 설정 실행
 *
 * 실행 순서:
 * 1. 먼저 이 함수를 실행
 * 2. 로그에서 MASTER_SALT 복사
 * 3. Script Properties에 MASTER_SALT 저장
 * 4. finalizePhase1() 함수 실행
 */
function runPhase1Setup() {
  Logger.log('========================================');
  Logger.log('Phase 1 자동 설정 시작');
  Logger.log('========================================');

  // SPREADSHEET_ID 확인
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    Logger.log('❌ ERROR: SPREADSHEET_ID가 Script Properties에 없습니다!');
    Logger.log('');
    Logger.log('해결 방법:');
    Logger.log('1. 프로젝트 설정 (⚙️) → 스크립트 속성');
    Logger.log('2. "스크립트 속성 추가" 클릭');
    Logger.log('3. 속성: SPREADSHEET_ID');
    Logger.log('4. 값: (Spreadsheet URL에서 복사한 ID)');
    Logger.log('5. 저장 후 다시 실행');
    return;
  }

  Logger.log('✅ SPREADSHEET_ID 확인: ' + spreadsheetId);
  Logger.log('');

  // MASTER_SALT 생성
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
  Logger.log('2. 프로젝트 설정 (⚙️) → 스크립트 속성');
  Logger.log('3. "스크립트 속성 추가" 클릭');
  Logger.log('4. 속성: MASTER_SALT, 값: (위에서 복사한 값)');
  Logger.log('5. 저장 후 finalizePhase1() 함수 실행');
  Logger.log('========================================');
}

// ========================================
// Step 2: 시트 생성 및 데이터 입력
// ========================================

/**
 * Phase 1 마무리 (MASTER_SALT 저장 후 실행)
 */
function finalizePhase1() {
  Logger.log('========================================');
  Logger.log('Phase 1 마무리 시작');
  Logger.log('========================================');

  // 필수 속성 확인
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const masterSalt = PropertiesService.getScriptProperties().getProperty('MASTER_SALT');

  if (!spreadsheetId || !masterSalt) {
    Logger.log('❌ ERROR: Script Properties 확인 실패');
    Logger.log('SPREADSHEET_ID: ' + (spreadsheetId ? '✅' : '❌'));
    Logger.log('MASTER_SALT: ' + (masterSalt ? '✅' : '❌'));
    Logger.log('');
    Logger.log('먼저 runPhase1Setup()을 실행하고 MASTER_SALT를 저장하세요!');
    return;
  }

  Logger.log('✅ Script Properties 확인 완료');
  Logger.log('');

  const ss = SpreadsheetApp.openById(spreadsheetId);

  // 1. 8개 시트 생성
  Logger.log('📋 시트 생성 중...');
  createAllSheets(ss);
  Logger.log('');

  // 2. SystemConfig 초기 데이터 입력
  Logger.log('⚙️  SystemConfig 초기 데이터 입력 중...');
  addSystemConfigData(ss);
  Logger.log('');

  // 3. Agencies MASTER 계정 생성
  Logger.log('👤 MASTER 계정 생성 중...');
  createMasterAccount(ss, masterSalt);
  Logger.log('');

  // 4. 기본 Sheet1 삭제 (선택사항)
  deleteDefaultSheet(ss);

  Logger.log('========================================');
  Logger.log('✅ Phase 1 자동 설정 완료!');
  Logger.log('========================================');
  Logger.log('');
  Logger.log('완료 항목:');
  Logger.log('✅ 8개 시트 생성 (Students, Agencies, AuditLogs 등)');
  Logger.log('✅ 모든 시트 헤더 설정');
  Logger.log('✅ SystemConfig 초기 데이터 (3개)');
  Logger.log('✅ Agencies MASTER 계정 생성');
  Logger.log('');
  Logger.log('남은 작업:');
  Logger.log('❗ i18n 시트에 초기 데이터 입력');
  Logger.log('   → setup/i18n-initial-data.tsv 파일을 i18n 시트에 붙여넣기');
  Logger.log('');
  Logger.log('========================================');
  Logger.log('다음 단계: Phase 2 (기초 모듈 구현)');
  Logger.log('========================================');
}

// ========================================
// 헬퍼 함수들
// ========================================

/**
 * 모든 시트 생성
 */
function createAllSheets(ss) {
  const sheets = [
    {
      name: 'Students',
      headers: [
        'StudentID', 'NameKR', 'NameVN', 'DOB', 'Gender', 'AgencyCode',
        'HomeAddressVN', 'PhoneKR', 'PhoneVN', 'Email',
        'ParentNameVN', 'ParentPhoneVN', 'ParentEconomic',
        'HighSchoolGPA', 'EnrollmentDate', 'Status',
        'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt', 'IsActive'
      ]
    },
    {
      name: 'Agencies',
      headers: [
        'AgencyCode', 'AgencyName', 'Role',
        'LoginID', 'PasswordHash', 'IsActive', 'LoginAttempts', 'LastLogin'
      ]
    },
    {
      name: 'AuditLogs',
      headers: [
        'Timestamp', 'UserId', 'Action', 'TargetSheet', 'TargetId',
        'Details', 'IP', 'SessionId', 'ErrorMessage', 'IsSuccess'
      ]
    },
    {
      name: 'SystemConfig',
      headers: ['ConfigKey', 'ConfigValue', 'Description', 'UpdatedBy', 'UpdatedAt']
    },
    {
      name: 'i18n',
      headers: ['Key', 'Korean', 'Vietnamese', 'Category', 'UpdatedAt']
    },
    {
      name: 'Consultations',
      headers: [
        'ConsultationID', 'StudentID', 'ConsultDate', 'ConsultType',
        'ConsultantId', 'Summary', 'ImprovementArea', 'NextGoal',
        'CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt'
      ]
    },
    {
      name: 'ExamResults',
      headers: [
        'ExamResultID', 'StudentID', 'ExamDate', 'ExamType',
        'Listening', 'Reading', 'Writing', 'TotalScore', 'Grade',
        'CreatedBy', 'CreatedAt'
      ]
    },
    {
      name: 'TargetHistory',
      headers: [
        'HistoryID', 'StudentID', 'ChangedDate',
        'TargetUniversityKR', 'TargetUniversityVN',
        'TargetMajorKR', 'TargetMajorVN',
        'ChangedBy', 'ChangedAt'
      ]
    }
  ];

  sheets.forEach(function(sheetConfig) {
    createSheet(ss, sheetConfig.name, sheetConfig.headers);
  });
}

/**
 * 시트 생성 및 헤더 설정
 */
function createSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);

  if (sheet) {
    Logger.log('  ⚠️  ' + sheetName + ' 시트가 이미 존재합니다 (건너뛰기)');
    return sheet;
  }

  // 시트 생성
  sheet = ss.insertSheet(sheetName);

  // 헤더 설정
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);

  // 헤더 스타일링
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4CAF50');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setHorizontalAlignment('center');

  // 열 너비 자동 조정
  for (let i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // 첫 행 고정
  sheet.setFrozenRows(1);

  Logger.log('  ✅ ' + sheetName + ' (' + headers.length + '개 컬럼)');
  return sheet;
}

/**
 * SystemConfig 초기 데이터 추가
 */
function addSystemConfigData(ss) {
  const sheet = ss.getSheetByName('SystemConfig');
  if (!sheet) {
    Logger.log('  ❌ SystemConfig 시트를 찾을 수 없습니다');
    return;
  }

  const timestamp = getCurrentTimestamp();

  const configData = [
    ['copyright_text', '© 2026 AJU E&J', '저작권 표시', 'admin', timestamp],
    ['session_timeout', '3600', '세션 만료 시간 (초)', 'admin', timestamp],
    ['max_login_attempts', '5', '최대 로그인 시도 횟수', 'admin', timestamp]
  ];

  // 데이터가 이미 있는지 확인
  const existingData = sheet.getDataRange().getValues();
  if (existingData.length > 1) {
    Logger.log('  ⚠️  SystemConfig 데이터가 이미 존재합니다 (건너뛰기)');
    return;
  }

  // 데이터 추가
  configData.forEach(function(row) {
    sheet.appendRow(row);
  });

  Logger.log('  ✅ SystemConfig 초기 데이터 3개 추가');
}

/**
 * Agencies MASTER 계정 생성
 */
function createMasterAccount(ss, masterSalt) {
  const sheet = ss.getSheetByName('Agencies');
  if (!sheet) {
    Logger.log('  ❌ Agencies 시트를 찾을 수 없습니다');
    return;
  }

  // 데이터가 이미 있는지 확인
  const existingData = sheet.getDataRange().getValues();
  if (existingData.length > 1) {
    Logger.log('  ⚠️  Agencies 데이터가 이미 존재합니다 (건너뛰기)');
    return;
  }

  // 임시 비밀번호 해시 생성 (admin123)
  const tempPassword = 'admin123';
  const tempHash = hashPassword(tempPassword, masterSalt);

  const masterAccount = [
    'MASTER',                    // AgencyCode
    '마스터 관리자',              // AgencyName
    'master',                    // Role
    'admin',                     // LoginID
    tempHash,                    // PasswordHash
    true,                        // IsActive
    0,                           // LoginAttempts
    ''                           // LastLogin
  ];

  sheet.appendRow(masterAccount);

  Logger.log('  ✅ MASTER 계정 생성 완료');
  Logger.log('  📝 로그인 정보:');
  Logger.log('     ID: admin');
  Logger.log('     PW: admin123');
  Logger.log('  ⚠️  실제 운영 전에 비밀번호를 변경하세요!');
}

/**
 * 비밀번호 해시 (간단 버전)
 */
function hashPassword(password, salt) {
  const saltedPassword = password + salt;
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    saltedPassword,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64Encode(hash);
}

/**
 * 기본 Sheet1 삭제
 */
function deleteDefaultSheet(ss) {
  const defaultSheet = ss.getSheetByName('Sheet1');

  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
    Logger.log('🗑️  기본 Sheet1 삭제');
  }
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

  return year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
}

// ========================================
// 테스트 함수들 (선택사항)
// ========================================

/**
 * Script Properties 확인
 */
function checkScriptProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();

  Logger.log('========================================');
  Logger.log('Script Properties 확인');
  Logger.log('========================================');

  if (Object.keys(props).length === 0) {
    Logger.log('❌ Script Properties가 비어있습니다');
    return;
  }

  Object.keys(props).forEach(function(key) {
    if (key === 'MASTER_SALT') {
      Logger.log(key + ': ' + props[key].substring(0, 20) + '...');
    } else {
      Logger.log(key + ': ' + props[key]);
    }
  });

  Logger.log('========================================');
}

/**
 * 시트 목록 확인
 */
function checkSheets() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    Logger.log('❌ SPREADSHEET_ID가 없습니다');
    return;
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheets = ss.getSheets();

  Logger.log('========================================');
  Logger.log('시트 목록 (' + sheets.length + '개)');
  Logger.log('========================================');

  sheets.forEach(function(sheet) {
    const name = sheet.getName();
    const rows = sheet.getLastRow();
    const cols = sheet.getLastColumn();
    Logger.log(name + ' - ' + rows + '행 x ' + cols + '열');
  });

  Logger.log('========================================');
}
