/**
 * SetupScriptProperties.gs
 * Script Properties 설정 헬퍼
 *
 * GAS 에디터에서 이 함수를 1회만 실행하세요!
 */

/**
 * Step 1: 현재 설정 확인
 */
function checkScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const masterSalt = props.getProperty('MASTER_SALT');

  Logger.log('========================================');
  Logger.log('SCRIPT PROPERTIES CHECK');
  Logger.log('========================================');

  if (spreadsheetId) {
    Logger.log('✅ SPREADSHEET_ID: ' + spreadsheetId);
  } else {
    Logger.log('❌ SPREADSHEET_ID: NOT SET');
  }

  if (masterSalt) {
    Logger.log('✅ MASTER_SALT: SET (length: ' + masterSalt.length + ')');
  } else {
    Logger.log('❌ MASTER_SALT: NOT SET');
  }

  Logger.log('========================================');

  if (!spreadsheetId || !masterSalt) {
    Logger.log('\n⚠️ Script Properties가 설정되지 않았습니다!');
    Logger.log('\n해결 방법:');
    Logger.log('1. 이 스크립트가 연결된 스프레드시트를 엽니다.');
    Logger.log('2. URL에서 스프레드시트 ID를 복사합니다.');
    Logger.log('3. setupScriptPropertiesAuto() 함수를 실행합니다.');
  }
}

/**
 * Step 2: 자동 설정 (스프레드시트 바운드 스크립트인 경우)
 *
 * 이 함수는 GAS가 스프레드시트에 바운드되어 있을 때만 작동합니다.
 */
function setupScriptPropertiesAuto() {
  try {
    // 1. 현재 스프레드시트 ID 가져오기
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spreadsheetId = ss.getId();

    Logger.log('========================================');
    Logger.log('AUTO SETUP SCRIPT PROPERTIES');
    Logger.log('========================================');

    Logger.log('\n스프레드시트 정보:');
    Logger.log('  이름: ' + ss.getName());
    Logger.log('  ID: ' + spreadsheetId);

    // 2. Script Properties 설정
    const props = PropertiesService.getScriptProperties();

    props.setProperty('SPREADSHEET_ID', spreadsheetId);
    Logger.log('\n✅ SPREADSHEET_ID 설정 완료!');

    // 3. MASTER_SALT 설정 (이미 있으면 유지)
    const existingSalt = props.getProperty('MASTER_SALT');
    if (!existingSalt) {
      const newSalt = 'salt-' + Utilities.getUuid();
      props.setProperty('MASTER_SALT', newSalt);
      Logger.log('✅ MASTER_SALT 생성 완료! (length: ' + newSalt.length + ')');
    } else {
      Logger.log('ℹ️ MASTER_SALT 이미 존재 (유지)');
    }

    Logger.log('\n========================================');
    Logger.log('✅ SETUP COMPLETED!');
    Logger.log('========================================');

    Logger.log('\n다음 단계:');
    Logger.log('1. checkScriptProperties() 실행하여 설정 확인');
    Logger.log('2. 웹앱 재배포');
    Logger.log('3. 브라우저 캐시 삭제 후 테스트');

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
    Logger.log('\n이 스크립트가 스프레드시트에 바운드되지 않았을 수 있습니다.');
    Logger.log('해결 방법: setupScriptPropertiesManual() 함수를 사용하세요.');
  }
}

/**
 * Step 3: 수동 설정 (스프레드시트 ID를 직접 입력)
 *
 * 사용법:
 * 1. 스프레드시트 URL에서 ID를 복사합니다.
 *    예: https://docs.google.com/spreadsheets/d/1ABC123XYZ456/edit
 *                                              → 1ABC123XYZ456
 * 2. 아래 YOUR_SPREADSHEET_ID를 실제 ID로 교체합니다.
 * 3. 이 함수를 실행합니다.
 */
function setupScriptPropertiesManual() {
  // ⚠️ 여기에 실제 스프레드시트 ID를 입력하세요!
  const YOUR_SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

  if (YOUR_SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    Logger.log('❌ ERROR: 스프레드시트 ID를 입력하지 않았습니다!');
    Logger.log('\n사용법:');
    Logger.log('1. 스프레드시트 URL을 열어 ID를 복사합니다.');
    Logger.log('2. 이 파일의 YOUR_SPREADSHEET_ID 값을 교체합니다.');
    Logger.log('3. 다시 실행합니다.');
    return;
  }

  Logger.log('========================================');
  Logger.log('MANUAL SETUP SCRIPT PROPERTIES');
  Logger.log('========================================');

  // Script Properties 설정
  const props = PropertiesService.getScriptProperties();

  props.setProperty('SPREADSHEET_ID', YOUR_SPREADSHEET_ID);
  Logger.log('✅ SPREADSHEET_ID 설정: ' + YOUR_SPREADSHEET_ID);

  // MASTER_SALT 설정
  const existingSalt = props.getProperty('MASTER_SALT');
  if (!existingSalt) {
    const newSalt = 'salt-' + Utilities.getUuid();
    props.setProperty('MASTER_SALT', newSalt);
    Logger.log('✅ MASTER_SALT 생성 완료! (length: ' + newSalt.length + ')');
  } else {
    Logger.log('ℹ️ MASTER_SALT 이미 존재 (유지)');
  }

  Logger.log('\n========================================');
  Logger.log('✅ SETUP COMPLETED!');
  Logger.log('========================================');
}

/**
 * Step 4: 설정 삭제 (초기화)
 *
 * 주의: 이 함수를 실행하면 모든 Script Properties가 삭제됩니다!
 */
function deleteScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.deleteAllProperties();

  Logger.log('========================================');
  Logger.log('⚠️ ALL SCRIPT PROPERTIES DELETED!');
  Logger.log('========================================');

  Logger.log('\nsetupScriptPropertiesAuto() 또는 setupScriptPropertiesManual()을 실행하여 재설정하세요.');
}
