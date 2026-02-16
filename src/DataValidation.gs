/**
 * DataValidation.gs - 데이터 정합성 확인 및 수정
 * Phase C: 데이터 정합성 확인
 *
 * 사용법:
 * 1. GAS 에디터에서 이 파일 열기
 * 2. 실행할 함수 선택
 * 3. 실행 버튼 클릭
 */

/**
 * 통합 데이터 검증 실행
 * 모든 검증을 한 번에 실행하고 리포트 생성
 */
function runAllValidations() {
  Logger.log('========================================');
  Logger.log('DATA VALIDATION REPORT');
  Logger.log('========================================');
  Logger.log('Execution Time: ' + new Date());
  Logger.log('');

  var results = {
    agencies: validateAgencies(),
    students: validateStudents(),
    orphanStudents: findOrphanStudents(),
    duplicates: findDuplicateData()
  };

  Logger.log('');
  Logger.log('========================================');
  Logger.log('SUMMARY');
  Logger.log('========================================');
  Logger.log('Agencies: ' + results.agencies.total + ' (' + results.agencies.issues.length + ' issues)');
  Logger.log('Students: ' + results.students.total + ' (' + results.students.issues.length + ' issues)');
  Logger.log('Orphan Students: ' + results.orphanStudents.count);
  Logger.log('Duplicate Data: ' + results.duplicates.total + ' duplicates found');
  Logger.log('');

  return results;
}

/**
 * Agencies 시트 검증
 * 1. AgencyNumber 필드 존재 여부
 * 2. AgencyNumber 값 할당 여부
 * 3. 중복 AgencyNumber 확인
 */
function validateAgencies() {
  Logger.log('--- Validating Agencies ---');

  var agencies = _getAllRows(SHEETS.AGENCIES);
  var issues = [];
  var agencyNumbers = {};

  for (var i = 0; i < agencies.length; i++) {
    var agency = agencies[i];

    // AgencyNumber 필드 확인
    if (agency.AgencyNumber === undefined || agency.AgencyNumber === null || agency.AgencyNumber === '') {
      issues.push({
        type: 'MISSING_AGENCY_NUMBER',
        agencyCode: agency.AgencyCode,
        agencyName: agency.AgencyName,
        message: 'AgencyNumber 미할당'
      });
    } else {
      // 중복 확인
      var num = agency.AgencyNumber;
      if (agencyNumbers[num]) {
        issues.push({
          type: 'DUPLICATE_AGENCY_NUMBER',
          agencyCode: agency.AgencyCode,
          agencyNumber: num,
          duplicateWith: agencyNumbers[num],
          message: 'AgencyNumber 중복: ' + num
        });
      } else {
        agencyNumbers[num] = agency.AgencyCode;
      }
    }
  }

  Logger.log('Total Agencies: ' + agencies.length);
  Logger.log('Issues Found: ' + issues.length);

  if (issues.length > 0) {
    Logger.log('Issues:');
    for (var i = 0; i < issues.length; i++) {
      Logger.log('  [' + issues[i].type + '] ' + issues[i].agencyCode + ': ' + issues[i].message);
    }
  }

  Logger.log('');

  return {
    total: agencies.length,
    issues: issues,
    agencyNumbers: agencyNumbers
  };
}

/**
 * Students 시트 검증
 * 1. 학생 ID 형식 확인 (YYAAASSSSS)
 * 2. 필수 필드 확인
 */
function validateStudents() {
  Logger.log('--- Validating Students ---');

  var students = _getAllRows(SHEETS.STUDENTS);
  var issues = [];

  var oldFormatPattern = /^\d{2}-[A-Z]+-\d{3}$/;  // 25-AJU-001
  var newFormatPattern = /^\d{9}$/;  // 260010001

  for (var i = 0; i < students.length; i++) {
    var student = students[i];

    // StudentID 형식 확인
    if (student.StudentID) {
      if (oldFormatPattern.test(student.StudentID)) {
        issues.push({
          type: 'OLD_FORMAT_ID',
          studentId: student.StudentID,
          studentName: student.NameKR || student.NameVN,
          message: '구 형식 ID (YY-AGENCY-SEQ)'
        });
      } else if (!newFormatPattern.test(student.StudentID)) {
        issues.push({
          type: 'INVALID_FORMAT_ID',
          studentId: student.StudentID,
          studentName: student.NameKR || student.NameVN,
          message: '잘못된 ID 형식'
        });
      }
    } else {
      issues.push({
        type: 'MISSING_ID',
        studentName: student.NameKR || student.NameVN,
        message: 'StudentID 누락'
      });
    }

    // 필수 필드 확인
    var requiredFields = ['NameKR', 'NameVN', 'AgencyCode'];
    for (var j = 0; j < requiredFields.length; j++) {
      var field = requiredFields[j];
      if (!student[field]) {
        issues.push({
          type: 'MISSING_FIELD',
          studentId: student.StudentID,
          field: field,
          message: '필수 필드 누락: ' + field
        });
      }
    }
  }

  Logger.log('Total Students: ' + students.length);
  Logger.log('Issues Found: ' + issues.length);

  if (issues.length > 0) {
    Logger.log('Issues:');
    for (var i = 0; i < Math.min(10, issues.length); i++) {
      Logger.log('  [' + issues[i].type + '] ' + (issues[i].studentId || issues[i].studentName) + ': ' + issues[i].message);
    }
    if (issues.length > 10) {
      Logger.log('  ... and ' + (issues.length - 10) + ' more issues');
    }
  }

  Logger.log('');

  return {
    total: students.length,
    issues: issues
  };
}

/**
 * 고아 학생 찾기 (AgencyCode가 존재하지 않는 학생)
 */
function findOrphanStudents() {
  Logger.log('--- Finding Orphan Students ---');

  var agencies = _getAllRows(SHEETS.AGENCIES);
  var students = _getAllRows(SHEETS.STUDENTS);

  var validAgencyCodes = {};
  for (var i = 0; i < agencies.length; i++) {
    validAgencyCodes[agencies[i].AgencyCode] = true;
  }

  var orphans = [];
  for (var i = 0; i < students.length; i++) {
    var student = students[i];
    if (!validAgencyCodes[student.AgencyCode]) {
      orphans.push({
        studentId: student.StudentID,
        studentName: student.NameKR || student.NameVN,
        agencyCode: student.AgencyCode
      });
    }
  }

  Logger.log('Orphan Students Found: ' + orphans.length);

  if (orphans.length > 0) {
    Logger.log('Orphans:');
    for (var i = 0; i < orphans.length; i++) {
      Logger.log('  ' + orphans[i].studentId + ' (' + orphans[i].studentName + ') → ' + orphans[i].agencyCode);
    }
  }

  Logger.log('');

  return {
    count: orphans.length,
    students: orphans
  };
}

/**
 * 중복 데이터 찾기 (전화번호, 이메일)
 */
function findDuplicateData() {
  Logger.log('--- Finding Duplicate Data ---');

  var students = _getAllRows(SHEETS.STUDENTS);
  var phoneMap = {};
  var emailMap = {};
  var duplicates = [];

  for (var i = 0; i < students.length; i++) {
    var student = students[i];

    // 전화번호 중복 확인
    if (student.PhoneKR) {
      if (phoneMap[student.PhoneKR]) {
        duplicates.push({
          type: 'DUPLICATE_PHONE',
          field: 'PhoneKR',
          value: student.PhoneKR,
          student1: phoneMap[student.PhoneKR],
          student2: student.StudentID + ' (' + student.NameKR + ')'
        });
      } else {
        phoneMap[student.PhoneKR] = student.StudentID + ' (' + student.NameKR + ')';
      }
    }

    // 이메일 중복 확인
    if (student.Email) {
      if (emailMap[student.Email]) {
        duplicates.push({
          type: 'DUPLICATE_EMAIL',
          field: 'Email',
          value: student.Email,
          student1: emailMap[student.Email],
          student2: student.StudentID + ' (' + student.NameKR + ')'
        });
      } else {
        emailMap[student.Email] = student.StudentID + ' (' + student.NameKR + ')';
      }
    }
  }

  Logger.log('Duplicates Found: ' + duplicates.length);

  if (duplicates.length > 0) {
    Logger.log('Duplicates:');
    for (var i = 0; i < duplicates.length; i++) {
      var dup = duplicates[i];
      Logger.log('  [' + dup.type + '] ' + dup.value + ': ' + dup.student1 + ' vs ' + dup.student2);
    }
  }

  Logger.log('');

  return {
    total: duplicates.length,
    duplicates: duplicates
  };
}

/**
 * Phase A 자동 설정 (원클릭 실행)
 * 1. AgencyNumber 컬럼 추가 (없으면)
 * 2. 기존 유학원에 AgencyNumber 자동 할당
 */
function setupPhaseA() {
  Logger.log('========================================');
  Logger.log('PHASE A: AUTO SETUP');
  Logger.log('========================================');
  Logger.log('');

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEETS.AGENCIES);

    if (!sheet) {
      Logger.log('ERROR: Agencies sheet not found');
      return { success: false, error: 'Sheet not found' };
    }

    // Step 1: AgencyNumber 컬럼 확인 및 추가
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var agencyNumberIndex = headers.indexOf('AgencyNumber');

    if (agencyNumberIndex === -1) {
      Logger.log('Step 1: Adding AgencyNumber column...');

      // AgencyCode 다음 위치 찾기 (보통 A열)
      var agencyCodeIndex = headers.indexOf('AgencyCode');
      var insertIndex = agencyCodeIndex + 2; // B열 (1-based)

      // B열 삽입
      sheet.insertColumnBefore(insertIndex);

      // 헤더 설정
      sheet.getRange(1, insertIndex).setValue('AgencyNumber');

      Logger.log('✓ AgencyNumber column added at column ' + insertIndex);
    } else {
      Logger.log('Step 1: AgencyNumber column already exists');
    }

    // Step 2: AgencyNumber 자동 할당
    Logger.log('');
    Logger.log('Step 2: Auto-assigning AgencyNumbers...');

    var agencies = _getAllRows(SHEETS.AGENCIES);
    var masterAssigned = false;
    var regularCount = 0;

    for (var i = 0; i < agencies.length; i++) {
      var agency = agencies[i];

      // AgencyNumber가 없거나 비어있으면 할당
      if (agency.AgencyNumber === undefined || agency.AgencyNumber === null || agency.AgencyNumber === '') {
        var assignedNumber;

        // MASTER는 0 할당
        if (agency.AgencyCode === 'MASTER') {
          assignedNumber = 0;
          masterAssigned = true;
          Logger.log('  [MASTER] Assigned #0 to MASTER');
        } else {
          // 일반 유학원은 1부터 순차 할당
          regularCount++;
          assignedNumber = regularCount;
          Logger.log('  [' + regularCount + '] Assigned #' + assignedNumber + ' to ' + agency.AgencyCode + ' (' + agency.AgencyName + ')');
        }

        _updateRow(SHEETS.AGENCIES, 'AgencyCode', agency.AgencyCode, {
          AgencyNumber: assignedNumber
        });
      } else {
        Logger.log('  [SKIP] ' + agency.AgencyCode + ' already has AgencyNumber: ' + agency.AgencyNumber);
      }
    }

    Logger.log('');
    Logger.log('========================================');
    Logger.log('PHASE A SETUP COMPLETED!');
    Logger.log('========================================');
    Logger.log('✓ AgencyNumber column: OK');
    Logger.log('✓ MASTER assigned: ' + (masterAssigned ? '#0' : 'Already assigned'));
    Logger.log('✓ Regular agencies assigned: ' + regularCount);
    Logger.log('');
    Logger.log('Next Step:');
    Logger.log('1. Run: clasp push --force');
    Logger.log('2. Run: clasp deploy');
    Logger.log('');

    return {
      success: true,
      columnAdded: agencyNumberIndex === -1,
      masterAssigned: masterAssigned,
      regularAssigned: regularCount
    };

  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * AgencyNumber 자동 할당 (누락된 유학원에 대해)
 * 주의: 실행 전 백업 권장
 */
function autoAssignAgencyNumbers() {
  Logger.log('--- Auto-Assigning AgencyNumbers ---');

  var agencies = _getAllRows(SHEETS.AGENCIES);
  var maxNumber = 0;
  var missingCount = 0;

  // 최대 AgencyNumber 찾기
  for (var i = 0; i < agencies.length; i++) {
    var num = parseInt(agencies[i].AgencyNumber) || 0;
    if (num > maxNumber) {
      maxNumber = num;
    }
  }

  Logger.log('Current Max AgencyNumber: ' + maxNumber);

  // 누락된 유학원에 번호 할당
  for (var i = 0; i < agencies.length; i++) {
    var agency = agencies[i];
    if (!agency.AgencyNumber && agency.AgencyNumber !== 0) {
      maxNumber++;
      _updateRow(SHEETS.AGENCIES, 'AgencyCode', agency.AgencyCode, {
        AgencyNumber: maxNumber
      });
      Logger.log('Assigned #' + maxNumber + ' to ' + agency.AgencyCode + ' (' + agency.AgencyName + ')');
      missingCount++;
    }
  }

  Logger.log('');
  Logger.log('COMPLETED: Assigned ' + missingCount + ' AgencyNumbers');
  Logger.log('');

  return {
    assigned: missingCount,
    maxNumber: maxNumber
  };
}

/**
 * 구 형식 학생 ID를 신 형식으로 변환
 * 주의: 실행 전 백업 필수!
 */
function convertOldStudentIDs() {
  Logger.log('--- Converting Old Student IDs ---');
  Logger.log('WARNING: This will modify student IDs. Backup recommended!');
  Logger.log('');

  var students = _getAllRows(SHEETS.STUDENTS);
  var agencies = _getAllRows(SHEETS.AGENCIES);

  // AgencyCode → AgencyNumber 매핑
  var agencyMap = {};
  for (var i = 0; i < agencies.length; i++) {
    agencyMap[agencies[i].AgencyCode] = agencies[i].AgencyNumber;
  }

  var oldFormatPattern = /^(\d{2})-([A-Z]+)-(\d{3})$/;  // 25-AJU-001
  var converted = 0;
  var failed = 0;

  for (var i = 0; i < students.length; i++) {
    var student = students[i];
    var oldId = student.StudentID;

    if (oldFormatPattern.test(oldId)) {
      var match = oldId.match(oldFormatPattern);
      var year = match[1];  // 25
      var agencyCode = match[2];  // AJU
      var seq = match[3];  // 001

      var agencyNumber = agencyMap[agencyCode];
      if (agencyNumber !== undefined && agencyNumber !== null) {
        // 새 형식: YYAAASSSSS
        var newId = year + String(agencyNumber).padStart(3, '0') + seq.padStart(4, '0').slice(-4);

        _updateRow(SHEETS.STUDENTS, 'StudentID', oldId, {
          StudentID: newId
        });

        Logger.log('Converted: ' + oldId + ' → ' + newId);
        converted++;
      } else {
        Logger.log('FAILED: ' + oldId + ' (AgencyCode ' + agencyCode + ' not found or no AgencyNumber)');
        failed++;
      }
    }
  }

  Logger.log('');
  Logger.log('COMPLETED: ' + converted + ' converted, ' + failed + ' failed');
  Logger.log('');

  return {
    converted: converted,
    failed: failed
  };
}
