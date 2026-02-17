/**
 * QuickSetup.gs
 * Container-bound script용 빠른 설정
 *
 * 실행 방법:
 * 1. GAS 에디터에서 이 파일 열기
 * 2. 함수 드롭다운에서 quickSetup 선택
 * 3. 실행 버튼 클릭
 */

function quickSetup() {
  Logger.log('========================================');
  Logger.log('QUICK SETUP - Container-bound Script');
  Logger.log('========================================\n');

  try {
    // 1. 현재 스프레드시트 확인
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spreadsheetId = ss.getId();
    const spreadsheetName = ss.getName();

    Logger.log('📊 스프레드시트 정보:');
    Logger.log('   이름: ' + spreadsheetName);
    Logger.log('   ID: ' + spreadsheetId);
    Logger.log('');

    // 2. Script Properties 설정
    const props = PropertiesService.getScriptProperties();

    props.setProperty('SPREADSHEET_ID', spreadsheetId);
    Logger.log('✅ SPREADSHEET_ID 설정 완료');

    // MASTER_SALT 설정 (기존 값 유지)
    const existingSalt = props.getProperty('MASTER_SALT');
    if (!existingSalt) {
      const newSalt = 'your-secret-salt-AJU-EJ-2024-v2';
      props.setProperty('MASTER_SALT', newSalt);
      Logger.log('✅ MASTER_SALT 생성 완료');
    } else {
      Logger.log('ℹ️  MASTER_SALT 이미 존재 (유지)');
    }

    Logger.log('');
    Logger.log('========================================');
    Logger.log('✅ SETUP COMPLETED!');
    Logger.log('========================================');
    Logger.log('');
    Logger.log('📝 다음 단계:');
    Logger.log('1. 웹앱 배포: 배포 → 새 배포');
    Logger.log('2. 유형: 웹 앱');
    Logger.log('3. 실행 계정: 나');
    Logger.log('4. 액세스 권한: 전체 사용자');
    Logger.log('5. 배포 클릭!');

  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
    Logger.log('');
    Logger.log('스택 트레이스:');
    Logger.log(e.stack);
  }
}

/**
 * 설정 확인
 */
function checkSetup() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const masterSalt = props.getProperty('MASTER_SALT');

  Logger.log('========================================');
  Logger.log('SETUP CHECK');
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
}
