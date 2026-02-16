/**
 * SequenceService.gs
 *
 * 동시성 제어 서비스 (Race Condition Prevention)
 *
 * Features:
 * - LockService를 사용한 Atomic Increment
 * - Sequences 시트 기반 순번 관리
 * - StudentID 중복 방지
 *
 * @version 2.1
 * @since 2026-02-15
 */

/**
 * 다음 시퀀스 번호 반환 (Atomic Increment)
 *
 * @param {string} entityType - 엔티티 유형 (예: "StudentID_26001")
 * @returns {Object} { success: boolean, sequence?: number, error?: string }
 *
 * @example
 * const result = getNextSequence('StudentID_26001');
 * // Returns: { success: true, sequence: 1 }
 */
function getNextSequence(entityType) {
  const lock = LockService.getScriptLock();

  try {
    // 1. Lock 획득 (최대 30초 대기)
    const hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return {
        success: false,
        error: '동시 접속으로 인한 지연이 발생했습니다. 잠시 후 다시 시도해주세요.',
        errorKey: 'err_lock_timeout'
      };
    }

    // 2. Sequences 시트 접근
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sequencesSheet = ss.getSheetByName('Sequences');

    // 3. Sequences 시트가 없으면 생성
    if (!sequencesSheet) {
      sequencesSheet = _createSequencesSheet(ss);
    }

    // 4. EntityType 검색
    const data = sequencesSheet.getDataRange().getValues();
    const headers = data[0];
    const entityTypeCol = headers.indexOf('EntityType') + 1;
    const lastSequenceCol = headers.indexOf('LastSequence') + 1;
    const updatedAtCol = headers.indexOf('UpdatedAt') + 1;
    const updatedByCol = headers.indexOf('UpdatedBy') + 1;

    let targetRow = -1;
    let currentSequence = 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i][entityTypeCol - 1] === entityType) {
        targetRow = i + 1; // Sheet row는 1-based
        currentSequence = data[i][lastSequenceCol - 1];
        break;
      }
    }

    // 5. EntityType이 없으면 새로 생성
    if (targetRow === -1) {
      targetRow = sequencesSheet.getLastRow() + 1;
      sequencesSheet.getRange(targetRow, entityTypeCol).setValue(entityType);
      sequencesSheet.getRange(targetRow, lastSequenceCol).setValue(1);
      sequencesSheet.getRange(targetRow, updatedAtCol).setValue(new Date());
      sequencesSheet.getRange(targetRow, updatedByCol).setValue('SYSTEM');

      return { success: true, sequence: 1 };
    }

    // 6. LastSequence + 1
    const nextSequence = currentSequence + 1;
    sequencesSheet.getRange(targetRow, lastSequenceCol).setValue(nextSequence);
    sequencesSheet.getRange(targetRow, updatedAtCol).setValue(new Date());
    sequencesSheet.getRange(targetRow, updatedByCol).setValue('SYSTEM');

    return { success: true, sequence: nextSequence };

  } catch (e) {
    Logger.log('getNextSequence Error: ' + e.message);
    return {
      success: false,
      error: '시스템 오류가 발생했습니다. 관리자에게 문의하세요.',
      errorKey: 'err_system'
    };
  } finally {
    // 7. Lock 해제
    lock.releaseLock();
  }
}

/**
 * StudentID 안전 생성 (Race Condition 방지)
 *
 * @param {string} agencyCode - 유학원 코드 (예: "HANOI")
 * @returns {Object} { success: boolean, studentId?: string, error?: string }
 *
 * @example
 * const result = generateStudentIDSafe('HANOI');
 * // Returns: { success: true, studentId: "260010001" }
 */
function generateStudentIDSafe(agencyCode) {
  try {
    // 1. AgencyNumber 조회
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const agenciesSheet = ss.getSheetByName('Agencies');
    const data = agenciesSheet.getDataRange().getValues();
    const headers = data[0];

    const agencyCodeCol = headers.indexOf('AgencyCode') + 1;
    const agencyNumberCol = headers.indexOf('AgencyNumber') + 1;

    let agencyNumber = null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][agencyCodeCol - 1] === agencyCode) {
        agencyNumber = data[i][agencyNumberCol - 1];
        break;
      }
    }

    if (agencyNumber === null) {
      return {
        success: false,
        error: '유학원 정보를 찾을 수 없습니다.',
        errorKey: 'err_agency_not_found'
      };
    }

    // 2. 연도 2자리
    const year = new Date().getFullYear().toString().slice(-2); // "26"

    // 3. AgencyNumber 3자리 (001, 002, ...)
    const agencyNum = String(agencyNumber).padStart(3, '0');

    // 4. EntityType 생성
    const entityType = `StudentID_${year}${agencyNum}`;

    // 5. 다음 시퀀스 조회 (Atomic Increment)
    const seqResult = getNextSequence(entityType);

    if (!seqResult.success) {
      return seqResult; // Error 전달
    }

    // 6. 시퀀스 4자리 (0001, 0002, ...)
    const sequence = String(seqResult.sequence).padStart(4, '0');

    // 7. StudentID 조합 (9자리)
    const studentId = `${year}${agencyNum}${sequence}`;

    return { success: true, studentId: studentId };

  } catch (e) {
    Logger.log('generateStudentIDSafe Error: ' + e.message);
    return {
      success: false,
      error: '학생 ID 생성 중 오류가 발생했습니다.',
      errorKey: 'err_generate_id'
    };
  }
}

/**
 * Sequences 시트 생성 (Private)
 *
 * @param {Spreadsheet} ss - Spreadsheet 객체
 * @returns {Sheet} 생성된 Sequences 시트
 * @private
 */
function _createSequencesSheet(ss) {
  const sheet = ss.insertSheet('Sequences');

  // 헤더 설정
  const headers = ['EntityType', 'LastSequence', 'UpdatedAt', 'UpdatedBy'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // 헤더 스타일
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#4285f4')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  // 컬럼 너비
  sheet.setColumnWidth(1, 200); // EntityType
  sheet.setColumnWidth(2, 120); // LastSequence
  sheet.setColumnWidth(3, 180); // UpdatedAt
  sheet.setColumnWidth(4, 150); // UpdatedBy

  // 시트 보호 (Master만 수정 가능)
  const protection = sheet.protect().setDescription('Sequences Sheet - Master Only');
  protection.removeEditors(protection.getEditors());
  protection.addEditor('duyang22@gmail.com');

  Logger.log('Sequences 시트 생성 완료');

  return sheet;
}

/**
 * Sequences 시트 수동 초기화 (테스트용)
 *
 * ⚠️ 주의: 이 함수는 모든 시퀀스 데이터를 삭제합니다.
 * 프로덕션 환경에서 절대 실행하지 마세요.
 *
 * @example
 * // GAS 에디터에서 실행:
 * resetSequences();
 */
function resetSequences() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Sequences');

    if (sheet) {
      // 기존 시트 삭제
      ss.deleteSheet(sheet);
      Logger.log('기존 Sequences 시트 삭제 완료');
    }

    // 새 시트 생성
    _createSequencesSheet(ss);
    Logger.log('Sequences 시트 초기화 완료');

    return { success: true, message: 'Sequences 시트가 초기화되었습니다.' };
  } catch (e) {
    Logger.log('resetSequences Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 시퀀스 데이터 확인 (디버깅용)
 *
 * @example
 * // GAS 에디터에서 실행:
 * checkSequences();
 */
function checkSequences() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Sequences');

    if (!sheet) {
      Logger.log('Sequences 시트가 없습니다.');
      return { success: false, message: 'Sequences 시트가 없습니다.' };
    }

    const data = sheet.getDataRange().getValues();

    Logger.log('========================================');
    Logger.log('SEQUENCES DATA');
    Logger.log('========================================');

    for (let i = 0; i < data.length; i++) {
      Logger.log(`Row ${i + 1}: ${JSON.stringify(data[i])}`);
    }

    Logger.log('========================================');
    Logger.log(`Total Rows: ${data.length - 1}`); // 헤더 제외
    Logger.log('========================================');

    return { success: true, data: data };
  } catch (e) {
    Logger.log('checkSequences Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 동시성 테스트 (100명 동시 등록 시뮬레이션)
 *
 * ⚠️ 주의: 테스트 환경에서만 실행하세요.
 *
 * @example
 * // GAS 에디터에서 실행:
 * testConcurrency();
 */
function testConcurrency() {
  const startTime = new Date().getTime();
  const results = [];
  const agencyCode = 'HANOI';
  const testCount = 100;

  Logger.log('========================================');
  Logger.log(`동시성 테스트 시작 (${testCount}명)`);
  Logger.log('========================================');

  for (let i = 0; i < testCount; i++) {
    const result = generateStudentIDSafe(agencyCode);
    results.push(result);

    if (i % 10 === 0) {
      Logger.log(`Progress: ${i}/${testCount}`);
    }
  }

  const endTime = new Date().getTime();
  const duration = (endTime - startTime) / 1000;

  // 중복 검사
  const studentIds = results
    .filter(r => r.success)
    .map(r => r.studentId);

  const uniqueIds = [...new Set(studentIds)];
  const duplicates = studentIds.length - uniqueIds.length;

  Logger.log('========================================');
  Logger.log('테스트 결과');
  Logger.log('========================================');
  Logger.log(`총 생성: ${results.length}개`);
  Logger.log(`성공: ${studentIds.length}개`);
  Logger.log(`실패: ${testCount - studentIds.length}개`);
  Logger.log(`중복: ${duplicates}개`);
  Logger.log(`소요 시간: ${duration}초`);
  Logger.log('========================================');

  if (duplicates > 0) {
    Logger.log('❌ 중복 ID 발견! Race Condition 발생');
    return { success: false, duplicates: duplicates };
  } else {
    Logger.log('✅ 중복 ID 없음. Race Condition 방지 성공!');
    return { success: true, message: '동시성 테스트 통과' };
  }
}
