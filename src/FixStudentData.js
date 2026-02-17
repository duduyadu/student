/**
 * FixStudentData.gs - Students 시트 데이터 수정
 *
 * 문제: StudentID: 26-1-001, AgencyCode: 1 (숫자)
 * 해결: AgencyCode를 "HANOI" (문자열)로 수정
 */

/**
 * Students 시트 데이터 자동 수정
 */
function fixStudentData() {
  Logger.log('========================================');
  Logger.log('FIX STUDENT DATA');
  Logger.log('========================================');

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEETS.STUDENTS);

    if (!sheet) {
      Logger.log('ERROR: Students sheet not found');
      return;
    }

    // 헤더 확인
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var agencyCodeCol = headers.indexOf('AgencyCode') + 1;
    var studentIdCol = headers.indexOf('StudentID') + 1;

    Logger.log('Columns found:');
    Logger.log('  StudentID: ' + studentIdCol);
    Logger.log('  AgencyCode: ' + agencyCodeCol);
    Logger.log('');

    // Row 2 (첫 번째 데이터 행) 확인 및 수정
    var currentAgencyCode = sheet.getRange(2, agencyCodeCol).getValue();
    var currentStudentId = sheet.getRange(2, studentIdCol).getValue();

    Logger.log('Current Data (Row 2):');
    Logger.log('  StudentID: ' + currentStudentId);
    Logger.log('  AgencyCode: ' + currentAgencyCode + ' (type: ' + typeof currentAgencyCode + ')');
    Logger.log('');

    if (currentAgencyCode === 1 || currentAgencyCode === '1') {
      // AgencyCode를 HANOI로 수정
      sheet.getRange(2, agencyCodeCol).setValue('HANOI');
      Logger.log('✓ Row 2 AgencyCode fixed: ' + currentAgencyCode + ' → HANOI');
    } else {
      Logger.log('ℹ️  Row 2 AgencyCode is already correct: ' + currentAgencyCode);
    }

    // 구 형식 학생 ID 처리
    if (currentStudentId === '26-1-001') {
      Logger.log('');
      Logger.log('⚠️  Old format StudentID detected: ' + currentStudentId);
      Logger.log('   Recommended action:');
      Logger.log('   1. Delete this row (test data)');
      Logger.log('   2. OR convert to new format: 260010001');
      Logger.log('   → 사용자가 직접 결정해야 합니다.');
    }

    Logger.log('');
    Logger.log('========================================');
    Logger.log('STUDENT DATA FIXED!');
    Logger.log('========================================');
    Logger.log('');
    Logger.log('Next: 웹앱 재배포 (clasp deploy)');

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
  }
}

/**
 * 모든 학생 데이터 검증
 */
function validateAllStudentData() {
  Logger.log('========================================');
  Logger.log('VALIDATE ALL STUDENT DATA');
  Logger.log('========================================');

  try {
    var students = _getAllRows(SHEETS.STUDENTS);

    Logger.log('Total Students: ' + students.length);
    Logger.log('');

    var issues = [];

    for (var i = 0; i < students.length; i++) {
      var student = students[i];

      // AgencyCode 타입 확인
      if (typeof student.AgencyCode !== 'string') {
        issues.push({
          row: i + 2,
          studentId: student.StudentID,
          issue: 'AgencyCode is not string (type: ' + typeof student.AgencyCode + ', value: ' + student.AgencyCode + ')'
        });
      }

      // 구 형식 ID 확인
      if (/^\d{2}-\d+-\d{3}$/.test(student.StudentID)) {
        issues.push({
          row: i + 2,
          studentId: student.StudentID,
          issue: 'Old format StudentID'
        });
      }
    }

    if (issues.length === 0) {
      Logger.log('✅ All student data is valid!');
    } else {
      Logger.log('⚠️  Issues found: ' + issues.length);
      Logger.log('');
      for (var i = 0; i < issues.length; i++) {
        Logger.log('  Row ' + issues[i].row + ': ' + issues[i].studentId + ' - ' + issues[i].issue);
      }
    }

    Logger.log('');
    Logger.log('========================================');

    return {
      total: students.length,
      issues: issues
    };

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return null;
  }
}

/**
 * 구 형식 학생 ID를 신 형식으로 변환
 * 26-1-001 → 260010001
 */
function convertOldStudentIdToNew() {
  Logger.log('========================================');
  Logger.log('CONVERT OLD STUDENT ID TO NEW FORMAT');
  Logger.log('========================================');

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var studentsSheet = ss.getSheetByName(SHEETS.STUDENTS);
    var agenciesSheet = ss.getSheetByName(SHEETS.AGENCIES);

    if (!studentsSheet || !agenciesSheet) {
      Logger.log('ERROR: Required sheets not found');
      return;
    }

    // Students 시트 헤더 확인
    var headers = studentsSheet.getRange(1, 1, 1, studentsSheet.getLastColumn()).getValues()[0];
    var studentIdCol = headers.indexOf('StudentID') + 1;
    var agencyCodeCol = headers.indexOf('AgencyCode') + 1;

    // Row 2 데이터 읽기
    var currentStudentId = studentsSheet.getRange(2, studentIdCol).getValue();
    var currentAgencyCode = studentsSheet.getRange(2, agencyCodeCol).getValue();

    Logger.log('Current Data (Row 2):');
    Logger.log('  StudentID: ' + currentStudentId);
    Logger.log('  AgencyCode: ' + currentAgencyCode);
    Logger.log('');

    // 구 형식 확인
    var oldFormatPattern = /^(\d{2})-(\d+)-(\d{3})$/;
    if (!oldFormatPattern.test(currentStudentId)) {
      Logger.log('ℹ️  StudentID is already in new format or invalid: ' + currentStudentId);
      return;
    }

    // 구 형식 파싱
    var match = currentStudentId.match(oldFormatPattern);
    var year = match[1];        // 26
    var oldAgencyNum = match[2]; // 1
    var sequence = match[3];     // 001

    // AgencyCode로 AgencyNumber 찾기
    var agencies = _getAllRows(SHEETS.AGENCIES);
    var agencyNumber = null;

    for (var i = 0; i < agencies.length; i++) {
      if (agencies[i].AgencyCode === currentAgencyCode) {
        agencyNumber = agencies[i].AgencyNumber;
        break;
      }
    }

    if (agencyNumber === null || agencyNumber === undefined) {
      Logger.log('ERROR: AgencyNumber not found for AgencyCode: ' + currentAgencyCode);
      return;
    }

    // 신 형식 생성: YYAAASSSSS
    // YY (26) + AAA (001) + SSSSS (0001)
    var newStudentId = year +
                       String(agencyNumber).padStart(3, '0') +
                       sequence.padStart(4, '0');

    Logger.log('Conversion:');
    Logger.log('  Old: ' + currentStudentId);
    Logger.log('  New: ' + newStudentId);
    Logger.log('  Details:');
    Logger.log('    - Year: ' + year);
    Logger.log('    - AgencyCode: ' + currentAgencyCode);
    Logger.log('    - AgencyNumber: ' + agencyNumber + ' → ' + String(agencyNumber).padStart(3, '0'));
    Logger.log('    - Sequence: ' + sequence + ' → ' + sequence.padStart(4, '0'));
    Logger.log('');

    // StudentID 업데이트
    studentsSheet.getRange(2, studentIdCol).setValue(newStudentId);

    Logger.log('✅ StudentID converted successfully!');
    Logger.log('');
    Logger.log('========================================');
    Logger.log('CONVERSION COMPLETED!');
    Logger.log('========================================');
    Logger.log('');
    Logger.log('Next: Refresh web app and test');

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
}
