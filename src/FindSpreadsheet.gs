/**
 * FindSpreadsheet.gs
 * Google Drive에서 스프레드시트 찾기
 */

/**
 * 내 Google Drive의 모든 스프레드시트 나열
 */
function listMySpreadsheets() {
  Logger.log('========================================');
  Logger.log('내 Google Drive 스프레드시트 목록');
  Logger.log('========================================\n');

  try {
    // Google Drive에서 스프레드시트 검색
    const files = DriveApp.searchFiles(
      'mimeType="application/vnd.google-apps.spreadsheet" and trashed=false'
    );

    let count = 0;
    while (files.hasNext()) {
      const file = files.next();
      count++;

      Logger.log(count + '. ' + file.getName());
      Logger.log('   ID: ' + file.getId());
      Logger.log('   URL: ' + file.getUrl());
      Logger.log('   수정일: ' + file.getLastUpdated());
      Logger.log('');
    }

    Logger.log('========================================');
    Logger.log('총 ' + count + '개의 스프레드시트를 찾았습니다.');
    Logger.log('========================================');

    if (count === 0) {
      Logger.log('\n⚠️ 스프레드시트를 찾을 수 없습니다.');
      Logger.log('Google Drive에 스프레드시트가 있는지 확인하세요.');
    } else {
      Logger.log('\n📝 다음 단계:');
      Logger.log('1. 위 목록에서 "AJU E&J" 이름을 찾으세요.');
      Logger.log('2. 해당 스프레드시트의 ID를 복사하세요.');
      Logger.log('3. GAS 에디터 → 프로젝트 설정 → 스크립트 속성 추가');
      Logger.log('   - 속성: SPREADSHEET_ID');
      Logger.log('   - 값: [복사한 ID]');
    }

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
  }
}

/**
 * 특정 이름으로 스프레드시트 검색
 */
function findSpreadsheetByName() {
  const SEARCH_NAME = 'AJU E&J';  // ← 검색할 이름

  Logger.log('========================================');
  Logger.log('스프레드시트 검색: "' + SEARCH_NAME + '"');
  Logger.log('========================================\n');

  try {
    const files = DriveApp.searchFiles(
      'title contains "' + SEARCH_NAME + '" and ' +
      'mimeType="application/vnd.google-apps.spreadsheet" and ' +
      'trashed=false'
    );

    let count = 0;
    while (files.hasNext()) {
      const file = files.next();
      count++;

      Logger.log('✅ 찾았습니다!');
      Logger.log('   이름: ' + file.getName());
      Logger.log('   ID: ' + file.getId());
      Logger.log('   URL: ' + file.getUrl());
      Logger.log('');
    }

    Logger.log('========================================');
    Logger.log('총 ' + count + '개 발견');
    Logger.log('========================================');

    if (count === 0) {
      Logger.log('\n⚠️ "' + SEARCH_NAME + '"를 포함하는 스프레드시트를 찾을 수 없습니다.');
      Logger.log('해결 방법:');
      Logger.log('1. 이 파일의 SEARCH_NAME 값을 수정하세요.');
      Logger.log('2. 또는 listMySpreadsheets() 함수를 실행하여 전체 목록을 확인하세요.');
    } else {
      Logger.log('\n📝 다음 단계:');
      Logger.log('1. 위에 표시된 ID를 복사하세요.');
      Logger.log('2. GAS 에디터 → 프로젝트 설정 → 스크립트 속성 추가');
      Logger.log('   - 속성: SPREADSHEET_ID');
      Logger.log('   - 값: [복사한 ID]');
      Logger.log('   - 속성: MASTER_SALT');
      Logger.log('   - 값: your-secret-salt-AJU-EJ-2024');
      Logger.log('3. checkScriptProperties() 실행하여 확인');
    }

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
  }
}
