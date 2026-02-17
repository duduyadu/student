/**
 * SheetsPermissions.gs - Google Sheets 권한 설정
 * Students, Agencies 시트에 권한 및 필터 뷰 설정
 */

/**
 * 전체 권한 설정 실행 (한 번만 실행)
 */
function setupSheetsPermissions() {
  Logger.log('========================================');
  Logger.log('SHEETS PERMISSIONS SETUP');
  Logger.log('========================================');

  var masterEmail = 'duyang22@gmail.com';

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. Students 시트 권한 설정
    setupStudentsPermissions(ss, masterEmail);

    // 2. Agencies 시트 권한 설정
    setupAgenciesPermissions(ss, masterEmail);

    // 3. 필터 뷰 생성
    createFilterViews(ss);

    // 4. 시트 공유 (뷰어로)
    shareSpreadsheet(ss, masterEmail);

    Logger.log('');
    Logger.log('========================================');
    Logger.log('✅ PERMISSIONS SETUP COMPLETED!');
    Logger.log('========================================');
    Logger.log('');
    Logger.log('다음 단계:');
    Logger.log('1. Google Sheets 열기');
    Logger.log('2. 상단 메뉴 "학생 관리" → "내 학생만 보기" 클릭');
    Logger.log('3. Students 시트에서 필터링된 학생 목록 확인');
    Logger.log('');

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
}

/**
 * Students 시트 권한 설정
 */
function setupStudentsPermissions(ss, masterEmail) {
  Logger.log('--- Students 시트 권한 설정 ---');

  var sheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (!sheet) {
    Logger.log('ERROR: Students sheet not found');
    return;
  }

  // 기존 보호 제거
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  for (var i = 0; i < protections.length; i++) {
    protections[i].remove();
  }

  // 전체 시트 보호
  var protection = sheet.protect();
  protection.setDescription('Students 시트 - MASTER만 수정 가능');

  // MASTER만 편집자로 추가
  protection.addEditor(masterEmail);

  // 경고 모드 비활성화 (실제 보호)
  protection.setWarningOnly(false);

  Logger.log('✓ Students 시트 보호 완료 (편집자: ' + masterEmail + ')');
}

/**
 * Agencies 시트 권한 설정
 */
function setupAgenciesPermissions(ss, masterEmail) {
  Logger.log('--- Agencies 시트 권한 설정 ---');

  var sheet = ss.getSheetByName(SHEETS.AGENCIES);
  if (!sheet) {
    Logger.log('ERROR: Agencies sheet not found');
    return;
  }

  // 기존 보호 제거
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  for (var i = 0; i < protections.length; i++) {
    protections[i].remove();
  }

  // 전체 시트 보호
  var protection = sheet.protect();
  protection.setDescription('Agencies 시트 - MASTER만 수정 가능');

  // MASTER만 편집자로 추가
  protection.addEditor(masterEmail);

  // 경고 모드 비활성화 (실제 보호)
  protection.setWarningOnly(false);

  Logger.log('✓ Agencies 시트 보호 완료 (편집자: ' + masterEmail + ')');
}

/**
 * 필터 뷰 생성 (각 유학원별)
 */
function createFilterViews(ss) {
  Logger.log('--- 필터 뷰 생성 ---');

  var sheet = ss.getSheetByName(SHEETS.STUDENTS);
  if (!sheet) {
    Logger.log('ERROR: Students sheet not found');
    return;
  }

  // 기존 필터 뷰 삭제
  var existingFilters = sheet.getFilters();
  for (var i = 0; i < existingFilters.length; i++) {
    existingFilters[i].remove();
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1) {
    Logger.log('⚠️  Students 시트에 데이터가 없습니다. 필터 뷰를 생성할 수 없습니다.');
    return;
  }

  // AgencyCode 컬럼 찾기
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var agencyCodeCol = headers.indexOf('AgencyCode') + 1;

  if (agencyCodeCol === 0) {
    Logger.log('ERROR: AgencyCode 컬럼을 찾을 수 없습니다.');
    return;
  }

  Logger.log('AgencyCode 컬럼: ' + agencyCodeCol);

  // HANOI 필터 뷰
  try {
    var hanoiFilter = sheet.newFilter();
    var hanoiRange = sheet.getRange(1, 1, lastRow, lastCol);
    hanoiFilter.setRange(hanoiRange);

    var hanoiCriteria = SpreadsheetApp.newFilterCriteria()
      .whenTextEqualTo('HANOI')
      .build();
    hanoiFilter.setColumnFilterCriteria(agencyCodeCol, hanoiCriteria);

    Logger.log('✓ HANOI 필터 뷰 생성 완료');
  } catch (e) {
    Logger.log('⚠️  HANOI 필터 뷰 생성 실패: ' + e.message);
  }

  // DANANG 필터 뷰
  try {
    var danangFilter = sheet.newFilter();
    var danangRange = sheet.getRange(1, 1, lastRow, lastCol);
    danangFilter.setRange(danangRange);

    var danangCriteria = SpreadsheetApp.newFilterCriteria()
      .whenTextEqualTo('DANANG')
      .build();
    danangFilter.setColumnFilterCriteria(agencyCodeCol, danangCriteria);

    Logger.log('✓ DANANG 필터 뷰 생성 완료');
  } catch (e) {
    Logger.log('⚠️  DANANG 필터 뷰 생성 실패: ' + e.message);
  }
}

/**
 * Spreadsheet 공유
 */
function shareSpreadsheet(ss, masterEmail) {
  Logger.log('--- Spreadsheet 공유 ---');

  try {
    // MASTER를 편집자로 추가 (이미 소유자일 수 있음)
    ss.addEditor(masterEmail);
    Logger.log('✓ ' + masterEmail + '을(를) 편집자로 추가했습니다.');
  } catch (e) {
    Logger.log('ℹ️  편집자 추가 스킵: ' + e.message);
  }
}

/**
 * 권한 제거 (초기화용)
 */
function removeAllProtections() {
  Logger.log('========================================');
  Logger.log('REMOVE ALL PROTECTIONS');
  Logger.log('========================================');

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheets = ss.getSheets();

    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);

      for (var j = 0; j < protections.length; j++) {
        protections[j].remove();
        Logger.log('✓ ' + sheet.getName() + ' 보호 제거');
      }
    }

    Logger.log('');
    Logger.log('✅ 모든 보호 제거 완료');

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
  }
}
