/**
 * FixAgencyData.gs - Agencies 시트 데이터 수정
 *
 * 문제: AgencyCode, AgencyName이 비어있음
 * 해결: 제대로 된 데이터로 수정
 */

/**
 * Agencies 시트 데이터 자동 수정
 */
function fixAgencyData() {
  Logger.log('========================================');
  Logger.log('FIX AGENCY DATA');
  Logger.log('========================================');

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEETS.AGENCIES);

    if (!sheet) {
      Logger.log('ERROR: Agencies sheet not found');
      return;
    }

    // 헤더 확인
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var agencyCodeCol = headers.indexOf('AgencyCode') + 1;
    var agencyNumberCol = headers.indexOf('AgencyNumber') + 1;
    var agencyNameCol = headers.indexOf('AgencyName') + 1;

    Logger.log('Columns found:');
    Logger.log('  AgencyCode: ' + agencyCodeCol);
    Logger.log('  AgencyNumber: ' + agencyNumberCol);
    Logger.log('  AgencyName: ' + agencyNameCol);
    Logger.log('');

    // Row 3 수정 (AgencyNumber = 1)
    if (agencyCodeCol > 0 && sheet.getRange(3, agencyCodeCol).getValue() !== 'HANOI') {
      sheet.getRange(3, agencyCodeCol).setValue('HANOI');
      Logger.log('✓ Row 3 AgencyCode set to: HANOI');
    }

    if (agencyNameCol > 0) {
      sheet.getRange(3, agencyNameCol).setValue('하노이 유학원');
      Logger.log('✓ Row 3 AgencyName set to: 하노이 유학원');
    }

    Logger.log('');

    // Row 4 수정 (AgencyNumber = 2)
    if (agencyCodeCol > 0 && sheet.getRange(4, agencyCodeCol).getValue() !== 'DANANG') {
      sheet.getRange(4, agencyCodeCol).setValue('DANANG');
      Logger.log('✓ Row 4 AgencyCode set to: DANANG');
    }

    if (agencyNameCol > 0) {
      sheet.getRange(4, agencyNameCol).setValue('다낭 유학원');
      Logger.log('✓ Row 4 AgencyName set to: 다낭 유학원');
    }

    Logger.log('');
    Logger.log('========================================');
    Logger.log('AGENCY DATA FIXED!');
    Logger.log('========================================');
    Logger.log('');
    Logger.log('Next: 웹앱 재배포 (clasp deploy)');

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
  }
}

/**
 * Agencies 시트 헤더 마이그레이션
 * AgencyNameKR + AgencyNameVN → AgencyName (단일 컬럼)
 *
 * 실행 전: AgencyCode | AgencyNumber | AgencyNameKR | AgencyNameVN | Role | ...
 * 실행 후: AgencyCode | AgencyNumber | AgencyName | Role | LoginID | PasswordHash | IsActive | LoginAttempts | LastLogin | CreatedBy | CreatedAt | UpdatedBy | UpdatedAt
 *
 * ⚠️ 한 번만 실행! 실행 후 시트를 확인하세요.
 */
function migrateAgencyNameColumns() {
  Logger.log('========================================');
  Logger.log('MIGRATE: AgencyNameKR + AgencyNameVN → AgencyName');
  Logger.log('========================================');

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEETS.AGENCIES);

    if (!sheet) {
      Logger.log('ERROR: Agencies sheet not found');
      return;
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nameKRCol = headers.indexOf('AgencyNameKR');
    var nameVNCol = headers.indexOf('AgencyNameVN');
    var nameCol = headers.indexOf('AgencyName');

    Logger.log('Current headers: ' + JSON.stringify(headers));
    Logger.log('AgencyNameKR index: ' + nameKRCol);
    Logger.log('AgencyNameVN index: ' + nameVNCol);
    Logger.log('AgencyName index: ' + nameCol);
    Logger.log('');

    // 이미 마이그레이션 완료된 경우
    if (nameKRCol === -1 && nameVNCol === -1 && nameCol >= 0) {
      Logger.log('✅ 이미 마이그레이션 완료! AgencyName 컬럼이 존재합니다.');
      return;
    }

    // AgencyNameKR/VN이 있는 경우 → 마이그레이션 실행
    if (nameKRCol >= 0) {
      var lastRow = sheet.getLastRow();

      // Step 1: AgencyNameKR 헤더를 AgencyName으로 변경
      sheet.getRange(1, nameKRCol + 1).setValue('AgencyName');
      Logger.log('✓ 헤더 변경: AgencyNameKR → AgencyName (열 ' + (nameKRCol + 1) + ')');

      // Step 2: AgencyNameKR에 값이 비어있으면 AgencyNameVN 값으로 채우기
      if (nameVNCol >= 0 && lastRow > 1) {
        for (var row = 2; row <= lastRow; row++) {
          var nameKRValue = sheet.getRange(row, nameKRCol + 1).getValue();
          var nameVNValue = sheet.getRange(row, nameVNCol + 1).getValue();

          if (!nameKRValue && nameVNValue) {
            sheet.getRange(row, nameKRCol + 1).setValue(nameVNValue);
            Logger.log('  Row ' + row + ': AgencyName 빈 값 → "' + nameVNValue + '" (VN에서 복사)');
          }
        }
      }

      // Step 3: AgencyNameVN 컬럼 삭제
      if (nameVNCol >= 0) {
        sheet.deleteColumn(nameVNCol + 1);
        Logger.log('✓ AgencyNameVN 컬럼 삭제 (열 ' + (nameVNCol + 1) + ')');
      }

      Logger.log('');
      Logger.log('========================================');
      Logger.log('✅ 마이그레이션 완료!');
      Logger.log('========================================');

      // 결과 확인
      var newHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      Logger.log('New headers: ' + JSON.stringify(newHeaders));

    } else {
      Logger.log('⚠️ AgencyNameKR 컬럼을 찾을 수 없습니다.');
      Logger.log('   현재 헤더: ' + JSON.stringify(headers));
    }

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
}
