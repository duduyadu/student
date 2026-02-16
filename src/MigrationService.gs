/**
 * MigrationService.gs - Agencies → Users 마이그레이션
 *
 * Step 4: Week 9-10 (Day 50-52)
 * 기존 Agencies 시트 데이터를 새로운 Users 시트로 마이그레이션
 */

/**
 * Agencies → Users 마이그레이션 실행
 *
 * 사전 조건:
 * 1. Users 시트가 생성되어 있어야 함 (14개 컬럼)
 * 2. MASTER 계정이 Users 시트에 수동으로 추가되어 있어야 함
 *
 * 실행 방법:
 * 1. GAS 에디터에서 이 함수 선택
 * 2. 실행 버튼 클릭 (▶)
 * 3. 로그 확인
 *
 * @returns {Object} { success: boolean, migratedCount: number, log: array }
 */
function migrateAgenciesToUsers() {
  Logger.log('========================================');
  Logger.log('AGENCIES → USERS MIGRATION START');
  Logger.log('========================================');

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const agenciesSheet = ss.getSheetByName('Agencies');
    const usersSheet = ss.getSheetByName('Users');

    // 1. 시트 존재 확인
    if (!agenciesSheet) {
      throw new Error('Agencies 시트를 찾을 수 없습니다');
    }
    if (!usersSheet) {
      throw new Error('Users 시트를 찾을 수 없습니다. 먼저 Users 시트를 생성해주세요.');
    }

    Logger.log('✓ Agencies 시트 확인: 존재');
    Logger.log('✓ Users 시트 확인: 존재');

    // 2. Agencies 데이터 읽기
    const agenciesData = agenciesSheet.getDataRange().getValues();
    if (agenciesData.length < 2) {
      Logger.log('⚠ Agencies 시트에 데이터가 없습니다 (헤더만 존재)');
      return {
        success: true,
        migratedCount: 0,
        log: [],
        message: 'No data to migrate'
      };
    }

    const agenciesHeaders = agenciesData[0];
    Logger.log('Agencies 헤더: ' + JSON.stringify(agenciesHeaders));

    // 3. 컬럼 인덱스 찾기
    const getColIndex = (headers, colName) => {
      const idx = headers.indexOf(colName);
      if (idx === -1) {
        throw new Error(`컬럼을 찾을 수 없습니다: ${colName}`);
      }
      return idx;
    };

    const agencyCodeIdx = getColIndex(agenciesHeaders, 'AgencyCode');
    const loginIdIdx = getColIndex(agenciesHeaders, 'LoginID');
    const passwordHashIdx = getColIndex(agenciesHeaders, 'PasswordHash');
    const isActiveIdx = getColIndex(agenciesHeaders, 'IsActive');
    const loginAttemptsIdx = getColIndex(agenciesHeaders, 'LoginAttempts');
    const lastLoginIdx = getColIndex(agenciesHeaders, 'LastLogin');

    // CreatedAt, UpdatedAt은 선택적 (없으면 현재 시간 사용)
    const createdAtIdx = agenciesHeaders.indexOf('CreatedAt');
    const updatedAtIdx = agenciesHeaders.indexOf('UpdatedAt');

    Logger.log('✓ 컬럼 인덱스 확인 완료');

    // 4. Users 헤더 확인
    const usersHeaders = usersSheet.getRange(1, 1, 1, 14).getValues()[0];
    Logger.log('Users 헤더: ' + JSON.stringify(usersHeaders));

    const expectedHeaders = [
      'UserID', 'UserType', 'LoginID', 'Email', 'PasswordHash',
      'AgencyCode', 'PrivacyConsentDate', 'LastPrivacyNotice',
      'LoginAttempts', 'LastLogin', 'IsActive', 'EmailVerified',
      'CreatedAt', 'UpdatedAt'
    ];

    for (let i = 0; i < expectedHeaders.length; i++) {
      if (usersHeaders[i] !== expectedHeaders[i]) {
        throw new Error(`Users 시트 헤더가 올바르지 않습니다. 예상: ${expectedHeaders[i]}, 실제: ${usersHeaders[i]}`);
      }
    }

    Logger.log('✓ Users 시트 헤더 검증 완료');

    // 5. 마이그레이션 실행
    const migrationLog = [];
    let migratedCount = 0;
    const now = getCurrentTimestamp();

    for (let i = 1; i < agenciesData.length; i++) {
      const row = agenciesData[i];
      const agencyCode = row[agencyCodeIdx];
      const loginId = row[loginIdIdx];
      const passwordHash = row[passwordHashIdx];
      const isActive = row[isActiveIdx];
      const loginAttempts = row[loginAttemptsIdx] || 0;
      const lastLogin = row[lastLoginIdx] || '';
      const createdAt = (createdAtIdx >= 0 && row[createdAtIdx]) ? row[createdAtIdx] : now;
      const updatedAt = (updatedAtIdx >= 0 && row[updatedAtIdx]) ? row[updatedAtIdx] : now;

      // MASTER는 이미 Users에 있으므로 스킵
      if (agencyCode === 'MASTER') {
        Logger.log(`⏭ Row ${i+1}: MASTER 계정 스킵 (이미 Users에 있음)`);
        migrationLog.push({
          rowNum: i + 1,
          agencyCode: agencyCode,
          loginId: loginId,
          status: 'skipped',
          reason: 'MASTER already in Users'
        });
        continue;
      }

      // 빈 행 스킵
      if (!agencyCode || !loginId) {
        Logger.log(`⏭ Row ${i+1}: 빈 행 스킵`);
        migrationLog.push({
          rowNum: i + 1,
          agencyCode: agencyCode || '(empty)',
          loginId: loginId || '(empty)',
          status: 'skipped',
          reason: 'Empty row'
        });
        continue;
      }

      // Users 행 생성
      const newUserRow = [
        agencyCode,              // UserID = AgencyCode
        'agency',                // UserType
        loginId,                 // LoginID
        loginId,                 // Email (same as LoginID for agencies)
        passwordHash,            // PasswordHash
        agencyCode,              // AgencyCode
        '',                      // PrivacyConsentDate (N/A for agency)
        '',                      // LastPrivacyNotice (N/A)
        loginAttempts,           // LoginAttempts
        lastLogin,               // LastLogin
        isActive,                // IsActive
        'TRUE',                  // EmailVerified (N/A for agency, default TRUE)
        createdAt,               // CreatedAt
        updatedAt                // UpdatedAt
      ];

      usersSheet.appendRow(newUserRow);
      migratedCount++;

      Logger.log(`✓ Row ${i+1}: ${agencyCode} (${loginId}) 마이그레이션 완료`);
      migrationLog.push({
        rowNum: i + 1,
        agencyCode: agencyCode,
        loginId: loginId,
        status: 'migrated',
        userId: agencyCode
      });
    }

    Logger.log('========================================');
    Logger.log('MIGRATION COMPLETED!');
    Logger.log(`Total migrated: ${migratedCount} agencies`);
    Logger.log('========================================');

    return {
      success: true,
      migratedCount: migratedCount,
      log: migrationLog,
      message: `Successfully migrated ${migratedCount} agencies to Users`
    };

  } catch (e) {
    Logger.log('========================================');
    Logger.log('MIGRATION FAILED!');
    Logger.log('Error: ' + e.message);
    Logger.log('========================================');

    return {
      success: false,
      error: e.message,
      migratedCount: 0,
      log: []
    };
  }
}

/**
 * Users 시트 생성 (헤더만)
 *
 * 실행 방법:
 * 1. GAS 에디터에서 이 함수 선택
 * 2. 실행 버튼 클릭 (▶)
 * 3. 로그 확인
 */
function createUsersSheet() {
  Logger.log('========================================');
  Logger.log('CREATE USERS SHEET');
  Logger.log('========================================');

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!ss) {
      throw new Error('Spreadsheet를 찾을 수 없습니다. SPREADSHEET_ID를 확인하세요.');
    }
    let usersSheet = ss.getSheetByName('Users');

    // 이미 존재하면 에러
    if (usersSheet) {
      Logger.log('⚠ Users 시트가 이미 존재합니다');
      return {
        success: false,
        error: 'Users sheet already exists'
      };
    }

    // 새 시트 생성
    usersSheet = ss.insertSheet('Users');

    // 헤더 행 추가
    const headers = [
      'UserID', 'UserType', 'LoginID', 'Email', 'PasswordHash',
      'AgencyCode', 'PrivacyConsentDate', 'LastPrivacyNotice',
      'LoginAttempts', 'LastLogin', 'IsActive', 'EmailVerified',
      'CreatedAt', 'UpdatedAt'
    ];

    usersSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    usersSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    usersSheet.setFrozenRows(1);

    Logger.log('✓ Users 시트 생성 완료');
    Logger.log('✓ 헤더 행 추가 완료');
    Logger.log('========================================');

    return {
      success: true,
      message: 'Users sheet created successfully'
    };

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * MASTER 계정 추가 (Users 시트에)
 *
 * 사전 조건:
 * 1. Users 시트가 생성되어 있어야 함
 * 2. Agencies 시트에 MASTER 계정이 있어야 함
 *
 * 실행 방법:
 * 1. GAS 에디터에서 이 함수 선택
 * 2. 실행 버튼 클릭 (▶)
 * 3. 로그 확인
 */
function addMasterToUsers() {
  Logger.log('========================================');
  Logger.log('ADD MASTER TO USERS');
  Logger.log('========================================');

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const agenciesSheet = ss.getSheetByName('Agencies');
    const usersSheet = ss.getSheetByName('Users');

    if (!agenciesSheet) {
      throw new Error('Agencies 시트를 찾을 수 없습니다');
    }
    if (!usersSheet) {
      throw new Error('Users 시트를 찾을 수 없습니다');
    }

    // Agencies에서 MASTER 계정 찾기
    const agenciesData = agenciesSheet.getDataRange().getValues();
    const agenciesHeaders = agenciesData[0];

    const agencyCodeIdx = agenciesHeaders.indexOf('AgencyCode');
    const loginIdIdx = agenciesHeaders.indexOf('LoginID');
    const passwordHashIdx = agenciesHeaders.indexOf('PasswordHash');
    const isActiveIdx = agenciesHeaders.indexOf('IsActive');
    const loginAttemptsIdx = agenciesHeaders.indexOf('LoginAttempts');
    const lastLoginIdx = agenciesHeaders.indexOf('LastLogin');

    // CreatedAt, UpdatedAt은 선택적 (없으면 현재 시간 사용)
    const createdAtIdx = agenciesHeaders.indexOf('CreatedAt');
    const updatedAtIdx = agenciesHeaders.indexOf('UpdatedAt');

    let masterRow = null;
    for (let i = 1; i < agenciesData.length; i++) {
      if (agenciesData[i][agencyCodeIdx] === 'MASTER') {
        masterRow = agenciesData[i];
        break;
      }
    }

    if (!masterRow) {
      throw new Error('Agencies 시트에 MASTER 계정을 찾을 수 없습니다');
    }

    Logger.log('✓ MASTER 계정 찾음');

    const now = getCurrentTimestamp();
    const masterUserRow = [
      'MASTER',                                  // UserID
      'master',                                  // UserType
      masterRow[loginIdIdx],                     // LoginID
      masterRow[loginIdIdx],                     // Email (same as LoginID)
      masterRow[passwordHashIdx],                // PasswordHash
      '',                                        // AgencyCode (N/A for master)
      '',                                        // PrivacyConsentDate (N/A)
      '',                                        // LastPrivacyNotice (N/A)
      masterRow[loginAttemptsIdx] || 0,          // LoginAttempts
      masterRow[lastLoginIdx] || '',             // LastLogin
      masterRow[isActiveIdx],                    // IsActive
      'TRUE',                                    // EmailVerified (N/A for master)
      (createdAtIdx >= 0 && masterRow[createdAtIdx]) ? masterRow[createdAtIdx] : now,  // CreatedAt
      (updatedAtIdx >= 0 && masterRow[updatedAtIdx]) ? masterRow[updatedAtIdx] : now   // UpdatedAt
    ];

    usersSheet.appendRow(masterUserRow);

    Logger.log('✓ MASTER 계정 추가 완료');
    Logger.log('  UserID: MASTER');
    Logger.log('  UserType: master');
    Logger.log('  LoginID: ' + masterRow[loginIdIdx]);
    Logger.log('========================================');

    return {
      success: true,
      message: 'MASTER account added to Users'
    };

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * 마이그레이션 롤백 (비상용)
 * Users 시트에서 UserType='agency' 행 삭제
 *
 * ⚠️ 주의: MASTER 계정은 삭제되지 않음
 *
 * 실행 방법:
 * 1. GAS 에디터에서 이 함수 선택
 * 2. 실행 버튼 클릭 (▶)
 * 3. 로그 확인
 */
function rollbackMigration() {
  Logger.log('========================================');
  Logger.log('ROLLBACK MIGRATION (EMERGENCY)');
  Logger.log('========================================');

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const usersSheet = ss.getSheetByName('Users');

    if (!usersSheet) {
      throw new Error('Users 시트를 찾을 수 없습니다');
    }

    const usersData = usersSheet.getDataRange().getValues();
    const usersHeaders = usersData[0];
    const userTypeIdx = usersHeaders.indexOf('UserType');

    if (userTypeIdx === -1) {
      throw new Error('UserType 컬럼을 찾을 수 없습니다');
    }

    let deletedCount = 0;

    // 뒤에서부터 삭제 (행 번호가 바뀌지 않도록)
    for (let i = usersData.length - 1; i >= 1; i--) {
      if (usersData[i][userTypeIdx] === 'agency') {
        usersSheet.deleteRow(i + 1);
        deletedCount++;
        Logger.log(`✓ Row ${i+1} 삭제 (UserID: ${usersData[i][0]})`);
      }
    }

    Logger.log('========================================');
    Logger.log('ROLLBACK COMPLETED!');
    Logger.log(`Total deleted: ${deletedCount} agency accounts`);
    Logger.log('⚠ MASTER 계정은 삭제되지 않았습니다');
    Logger.log('========================================');

    return {
      success: true,
      deletedCount: deletedCount,
      message: `Deleted ${deletedCount} agency accounts from Users`
    };

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * 마이그레이션 검증
 * Agencies와 Users 시트의 데이터 일치 확인
 *
 * 실행 방법:
 * 1. GAS 에디터에서 이 함수 선택
 * 2. 실행 버튼 클릭 (▶)
 * 3. 로그 확인
 */
function verifyMigration() {
  Logger.log('========================================');
  Logger.log('VERIFY MIGRATION');
  Logger.log('========================================');

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const agenciesSheet = ss.getSheetByName('Agencies');
    const usersSheet = ss.getSheetByName('Users');

    const agenciesData = agenciesSheet.getDataRange().getValues();
    const usersData = usersSheet.getDataRange().getValues();

    const agenciesHeaders = agenciesData[0];
    const usersHeaders = usersData[0];

    const agencyCodeIdx = agenciesHeaders.indexOf('AgencyCode');
    const userIdIdx = usersHeaders.indexOf('UserID');
    const userTypeIdx = usersHeaders.indexOf('UserType');

    // Agencies에서 MASTER 제외한 개수
    let agenciesCount = 0;
    for (let i = 1; i < agenciesData.length; i++) {
      if (agenciesData[i][agencyCodeIdx] && agenciesData[i][agencyCodeIdx] !== 'MASTER') {
        agenciesCount++;
      }
    }

    // Users에서 agency 타입 개수
    let usersAgencyCount = 0;
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][userTypeIdx] === 'agency') {
        usersAgencyCount++;
      }
    }

    // Users에서 master 타입 개수
    let usersMasterCount = 0;
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][userTypeIdx] === 'master') {
        usersMasterCount++;
      }
    }

    Logger.log(`Agencies 시트: ${agenciesCount} agencies (MASTER 제외)`);
    Logger.log(`Users 시트: ${usersAgencyCount} agencies`);
    Logger.log(`Users 시트: ${usersMasterCount} master`);

    if (agenciesCount === usersAgencyCount && usersMasterCount === 1) {
      Logger.log('✓ 마이그레이션 검증 성공!');
      Logger.log('========================================');
      return {
        success: true,
        agenciesCount: agenciesCount,
        usersAgencyCount: usersAgencyCount,
        usersMasterCount: usersMasterCount,
        message: 'Migration verified successfully'
      };
    } else {
      Logger.log('⚠ 마이그레이션 검증 실패!');
      Logger.log('========================================');
      return {
        success: false,
        agenciesCount: agenciesCount,
        usersAgencyCount: usersAgencyCount,
        usersMasterCount: usersMasterCount,
        message: 'Migration verification failed'
      };
    }

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}
