/**
 * DebugHelper.gs - 문제 진단용 함수
 * GAS 에디터에서 직접 실행하여 상태 확인
 */

/**
 * 전체 시스템 상태 체크 (이 함수를 실행하세요!)
 */
function checkSystemStatus() {
  Logger.log('========================================');
  Logger.log('시스템 상태 진단');
  Logger.log('========================================');
  Logger.log('');

  // 1. Script Properties 확인
  checkScriptProperties();
  Logger.log('');

  // 2. Spreadsheet 연결 확인
  checkSpreadsheetConnection();
  Logger.log('');

  // 3. Agencies 시트 데이터 확인
  checkAgenciesData();
  Logger.log('');

  // 4. Students 시트 데이터 확인
  checkStudentsData();
  Logger.log('');

  Logger.log('========================================');
  Logger.log('진단 완료');
  Logger.log('========================================');
}

/**
 * 1. Script Properties 확인
 */
function checkScriptProperties() {
  Logger.log('--- 1. Script Properties 확인 ---');

  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var masterSalt = PropertiesService.getScriptProperties().getProperty('MASTER_SALT');

  if (!spreadsheetId) {
    Logger.log('❌ SPREADSHEET_ID 없음!');
    Logger.log('   해결: createSpreadsheet() 또는 runPhase1Setup() 실행');
  } else {
    Logger.log('✅ SPREADSHEET_ID: ' + spreadsheetId);
  }

  if (!masterSalt) {
    Logger.log('❌ MASTER_SALT 없음!');
    Logger.log('   해결: runPhase1Setup() 실행 후 Script Properties에 설정');
  } else {
    Logger.log('✅ MASTER_SALT: (설정됨)');
  }
}

/**
 * 2. Spreadsheet 연결 확인
 */
function checkSpreadsheetConnection() {
  Logger.log('--- 2. Spreadsheet 연결 확인 ---');

  try {
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

    if (!spreadsheetId) {
      Logger.log('❌ SPREADSHEET_ID가 없어서 확인 불가');
      return;
    }

    var ss = SpreadsheetApp.openById(spreadsheetId);
    var url = ss.getUrl();
    var sheets = ss.getSheets();

    Logger.log('✅ Spreadsheet 연결 성공');
    Logger.log('   URL: ' + url);
    Logger.log('   시트 개수: ' + sheets.length);
    Logger.log('   시트 목록:');

    sheets.forEach(function(sheet) {
      Logger.log('     - ' + sheet.getName() + ' (행: ' + sheet.getLastRow() + ')');
    });

  } catch (e) {
    Logger.log('❌ Spreadsheet 연결 실패: ' + e.message);
    Logger.log('   해결: SPREADSHEET_ID 확인 또는 createSpreadsheet() 재실행');
  }
}

/**
 * 3. Agencies 시트 데이터 확인
 */
function checkAgenciesData() {
  Logger.log('--- 3. Agencies 시트 데이터 확인 ---');

  try {
    var agencies = _getAllRows(SHEETS.AGENCIES);

    Logger.log('✅ Agencies 시트 읽기 성공');
    Logger.log('   총 행 수: ' + agencies.length);

    if (agencies.length === 0) {
      Logger.log('⚠️  데이터 없음!');
      Logger.log('   해결: finalizePhase1() 실행하여 MASTER 계정 생성');
      Logger.log('   또는: fixAgencyData() 실행하여 데이터 복구');
      return;
    }

    Logger.log('');
    Logger.log('   데이터 목록:');
    agencies.forEach(function(agency, index) {
      Logger.log('   ' + (index + 1) + '. AgencyCode: ' + agency.AgencyCode +
                 ', AgencyNumber: ' + agency.AgencyNumber +
                 ', AgencyName: ' + agency.AgencyName +
                 ', IsActive: ' + agency.IsActive);
    });

    // AgencyNumber 누락 확인
    var missingNumber = agencies.filter(function(a) {
      return !a.AgencyNumber && a.AgencyNumber !== 0;
    });

    if (missingNumber.length > 0) {
      Logger.log('');
      Logger.log('⚠️  AgencyNumber 누락된 유학원: ' + missingNumber.length + '개');
      missingNumber.forEach(function(a) {
        Logger.log('     - ' + a.AgencyCode);
      });
      Logger.log('   해결: setupPhaseA() 실행하여 AgencyNumber 자동 할당');
    }

  } catch (e) {
    Logger.log('❌ Agencies 시트 읽기 실패: ' + e.message);
  }
}

/**
 * 4. Students 시트 데이터 확인
 */
function checkStudentsData() {
  Logger.log('--- 4. Students 시트 데이터 확인 ---');

  try {
    var students = _getAllRows(SHEETS.STUDENTS);

    Logger.log('✅ Students 시트 읽기 성공');
    Logger.log('   총 행 수: ' + students.length);

    if (students.length === 0) {
      Logger.log('ℹ️  등록된 학생 없음 (정상)');
      Logger.log('   학생 등록은 웹앱에서 진행하세요.');
      return;
    }

    Logger.log('');
    Logger.log('   데이터 목록 (최대 5개):');
    students.slice(0, 5).forEach(function(student, index) {
      Logger.log('   ' + (index + 1) + '. StudentID: ' + student.StudentID +
                 ', NameKR: ' + student.NameKR +
                 ', AgencyCode: ' + student.AgencyCode +
                 ', IsActive: ' + student.IsActive);
    });

    if (students.length > 5) {
      Logger.log('   ... 외 ' + (students.length - 5) + '명');
    }

  } catch (e) {
    Logger.log('❌ Students 시트 읽기 실패: ' + e.message);
  }
}

/**
 * 5. 로그인 테스트
 */
function testLogin() {
  Logger.log('========================================');
  Logger.log('로그인 테스트');
  Logger.log('========================================');

  var result = login('admin', 'admin123');

  Logger.log('');
  Logger.log('결과:');
  Logger.log('  success: ' + result.success);

  if (result.success) {
    Logger.log('  sessionId: ' + result.data.sessionId);
    Logger.log('  user: ' + JSON.stringify(result.data.user, null, 2));
  } else {
    Logger.log('  errorKey: ' + result.errorKey);
  }

  Logger.log('========================================');
}

/**
 * 6. 학생 목록 조회 테스트
 */
function testGetStudentList() {
  Logger.log('========================================');
  Logger.log('학생 목록 조회 테스트');
  Logger.log('========================================');

  // 먼저 로그인
  var loginResult = login('admin', 'admin123');

  if (!loginResult.success) {
    Logger.log('❌ 로그인 실패: ' + loginResult.errorKey);
    return;
  }

  var sessionId = loginResult.data.sessionId;
  Logger.log('✅ 로그인 성공 (sessionId: ' + sessionId + ')');
  Logger.log('');

  // 학생 목록 조회
  var result = getStudentList(sessionId, {});

  Logger.log('학생 목록 조회 결과:');
  Logger.log('  success: ' + result.success);

  if (result.success) {
    Logger.log('  학생 수: ' + result.data.length);

    if (result.data.length === 0) {
      Logger.log('  ℹ️  등록된 학생 없음');
    } else {
      Logger.log('  학생 목록 (최대 3개):');
      result.data.slice(0, 3).forEach(function(student, index) {
        Logger.log('    ' + (index + 1) + '. ' + student.StudentID + ' - ' + student.NameKR);
      });
    }
  } else {
    Logger.log('  ❌ errorKey: ' + result.errorKey);
  }

  Logger.log('========================================');
}

/**
 * 7. 유학원 목록 조회 테스트
 */
function testGetAgencyList() {
  Logger.log('========================================');
  Logger.log('유학원 목록 조회 테스트');
  Logger.log('========================================');

  // 먼저 로그인
  var loginResult = login('admin', 'admin123');

  if (!loginResult.success) {
    Logger.log('❌ 로그인 실패: ' + loginResult.errorKey);
    return;
  }

  var sessionId = loginResult.data.sessionId;
  Logger.log('✅ 로그인 성공 (sessionId: ' + sessionId + ')');
  Logger.log('');

  // 유학원 목록 조회 (드롭다운용)
  var result = getAgencyList(sessionId);

  Logger.log('유학원 목록 조회 결과 (드롭다운용):');
  Logger.log('  success: ' + result.success);

  if (result.success) {
    Logger.log('  유학원 수: ' + result.data.length);

    if (result.data.length === 0) {
      Logger.log('  ⚠️  유학원 없음 (MASTER 제외)');
    } else {
      Logger.log('  유학원 목록:');
      result.data.forEach(function(agency, index) {
        Logger.log('    ' + (index + 1) + '. ' + agency.AgencyCode + ' - ' + agency.AgencyName);
      });
    }
  } else {
    Logger.log('  ❌ errorKey: ' + result.errorKey);
  }

  Logger.log('========================================');
}
