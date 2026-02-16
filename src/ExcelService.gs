/**
 * ExcelService.gs
 *
 * Excel/CSV Import/Export 서비스
 *
 * Features:
 * - 학생 데이터 CSV 내보내기 (권한별 필터링)
 * - 학생 데이터 CSV 가져오기 (일괄 등록)
 * - UTF-8 BOM 포함 (한글/베트남어 지원)
 * - 데이터 검증 (ValidationService 사용)
 *
 * @version 2.1
 * @since 2026-02-15
 */

/**
 * 학생 데이터를 CSV 파일로 내보내기
 *
 * @param {string} sessionId - 세션 ID
 * @returns {Object} { success: boolean, csv?: string, fileName?: string, error?: string }
 *
 * @example
 * const result = exportStudentsToCSV(sessionId);
 * // Returns: { success: true, csv: "...", fileName: "students_2026-02-15.csv" }
 */
function exportStudentsToCSV(sessionId) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 3. 권한 확인 (Master 또는 Agency만)
    if (session.role !== 'master' && session.role !== 'agency') {
      return {
        success: false,
        errorKey: 'err_permission_denied',
        error: 'CSV 내보내기 권한이 없습니다.'
      };
    }

    // 4. Students 시트 읽기
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const studentsSheet = ss.getSheetByName('Students');
    const data = studentsSheet.getDataRange().getValues();
    const headers = data[0];

    // 5. 권한별 필터링
    let filteredData = [];

    if (session.role === 'master') {
      // Master: 모든 학생
      filteredData = data.slice(1); // 헤더 제외
    } else if (session.role === 'agency') {
      // Agency: 소속 학생만
      const agencyCodeCol = headers.indexOf('AgencyCode');
      filteredData = data.slice(1).filter(function(row) {
        return row[agencyCodeCol] === session.agencyCode;
      });
    }

    // 6. CSV 문자열 생성
    const csvRows = [];

    // 헤더 추가
    csvRows.push(headers.map(escapeCSVValue).join(','));

    // 데이터 추가
    for (let i = 0; i < filteredData.length; i++) {
      const row = filteredData[i];
      csvRows.push(row.map(escapeCSVValue).join(','));
    }

    // 7. UTF-8 BOM 추가 (엑셀에서 한글 깨짐 방지)
    const bom = '\uFEFF';
    const csv = bom + csvRows.join('\n');

    // 8. 파일명 생성 (students_YYYY-MM-DD.csv)
    const today = new Date();
    const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const fileName = 'students_' + dateStr + '.csv';

    // 9. 감사 로그
    _saveAuditLog(session.loginId, 'EXPORT', SHEETS.STUDENTS, 'CSV', sessionId);

    return {
      success: true,
      csv: csv,
      fileName: fileName
    };

  } catch (e) {
    Logger.log('ERROR in exportStudentsToCSV: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_unknown',
      error: e.message
    };
  }
}

/**
 * CSV 값 이스케이프 처리 (쉼표, 따옴표, 줄바꿈)
 *
 * @param {string} value - CSV 셀 값
 * @returns {string} 이스케이프된 값
 *
 * @example
 * escapeCSVValue('Hello, World');
 * // Returns: '"Hello, World"'
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // 쉼표, 따옴표, 줄바꿈이 있으면 따옴표로 감싸기
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    // 따옴표는 두 번 쓰기 (" → "")
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * CSV 파일에서 학생 데이터 가져오기 (일괄 등록)
 *
 * @param {string} sessionId - 세션 ID
 * @param {string} csvContent - CSV 파일 내용
 * @returns {Object} { success: boolean, imported: number, failed: number, errors?: Array<Object> }
 *
 * @example
 * const result = importStudentsFromCSV(sessionId, csvContent);
 * // Returns: { success: true, imported: 10, failed: 2, errors: [...] }
 */
function importStudentsFromCSV(sessionId, csvContent) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting (v2.1)
    checkRateLimit(session.userId);

    // 3. 권한 확인 (Master 또는 Agency만)
    if (session.role !== 'master' && session.role !== 'agency') {
      return {
        success: false,
        errorKey: 'err_permission_denied',
        error: 'CSV 가져오기 권한이 없습니다.'
      };
    }

    // 4. CSV 파싱
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return {
        success: false,
        errorKey: 'err_empty_csv',
        error: 'CSV 파일이 비어있습니다.'
      };
    }

    // 5. 헤더 검증
    const headers = rows[0];
    const requiredHeaders = ['NameKR', 'NameVN', 'DOB', 'AgencyCode'];

    for (let i = 0; i < requiredHeaders.length; i++) {
      if (!headers.includes(requiredHeaders[i])) {
        return {
          success: false,
          errorKey: 'err_invalid_csv_header',
          error: '필수 헤더가 없습니다: ' + requiredHeaders[i]
        };
      }
    }

    // 6. 데이터 행 처리
    let importedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // 행을 객체로 변환
      const studentData = {};
      for (let j = 0; j < headers.length; j++) {
        studentData[headers[j]] = row[j] || '';
      }

      // Agency 권한이면 AgencyCode 강제 설정
      if (session.role === 'agency') {
        studentData.AgencyCode = session.agencyCode;
      }

      // 7. 학생 등록 시도
      try {
        const createResult = createStudent(sessionId, studentData);

        if (createResult.success) {
          importedCount++;
        } else {
          failedCount++;
          errors.push({
            row: i + 1,
            data: studentData,
            error: createResult.error || createResult.errorKey
          });
        }
      } catch (e) {
        failedCount++;
        errors.push({
          row: i + 1,
          data: studentData,
          error: e.message
        });
      }
    }

    // 8. 감사 로그
    _saveAuditLog(session.loginId, 'IMPORT', SHEETS.STUDENTS, 'CSV: ' + importedCount + ' imported', sessionId);

    return {
      success: true,
      imported: importedCount,
      failed: failedCount,
      errors: errors
    };

  } catch (e) {
    Logger.log('ERROR in importStudentsFromCSV: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_unknown',
      error: e.message
    };
  }
}

/**
 * CSV 문자열 파싱 (RFC 4180 기본 지원)
 *
 * @param {string} csvContent - CSV 문자열
 * @returns {Array<Array<string>>} 2차원 배열
 *
 * @example
 * parseCSV('"Name","Age"\n"John",25\n"Jane",30');
 * // Returns: [["Name", "Age"], ["John", "25"], ["Jane", "30"]]
 */
function parseCSV(csvContent) {
  // UTF-8 BOM 제거
  let content = csvContent.replace(/^\uFEFF/, '');

  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // 이스케이프된 따옴표 ("" → ")
        currentValue += '"';
        i++; // 다음 따옴표 건너뛰기
      } else {
        // 따옴표 토글
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // 쉼표 (셀 구분자)
      currentRow.push(currentValue);
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // 줄바꿈 (행 구분자)
      if (currentValue || currentRow.length > 0) {
        currentRow.push(currentValue);
        rows.push(currentRow);
        currentRow = [];
        currentValue = '';
      }

      // \r\n 처리
      if (char === '\r' && nextChar === '\n') {
        i++; // \n 건너뛰기
      }
    } else {
      // 일반 문자
      currentValue += char;
    }
  }

  // 마지막 행 추가
  if (currentValue || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * CSV Export 테스트 함수
 *
 * @example
 * // GAS 에디터에서 실행:
 * testCSVExport();
 */
function testCSVExport() {
  Logger.log('========================================');
  Logger.log('CSV EXPORT TEST');
  Logger.log('========================================');

  // 테스트용 세션 (Master 권한)
  const testSession = {
    sessionId: 'test_session_123',
    userId: 'admin',
    loginId: 'admin',
    role: 'master',
    agencyCode: 'MASTER'
  };

  // 임시 세션 저장
  const cache = CacheService.getScriptCache();
  cache.put(testSession.sessionId, JSON.stringify(testSession), 3600);

  // CSV Export 실행
  const result = exportStudentsToCSV(testSession.sessionId);

  if (result.success) {
    Logger.log('✅ CSV Export 성공!');
    Logger.log('파일명: ' + result.fileName);
    Logger.log('CSV 내용 (첫 500자):');
    Logger.log(result.csv.substring(0, 500));
  } else {
    Logger.log('❌ CSV Export 실패!');
    Logger.log('에러: ' + result.error);
  }

  Logger.log('========================================');

  return result;
}

/**
 * CSV Import 테스트 함수
 *
 * @example
 * // GAS 에디터에서 실행:
 * testCSVImport();
 */
function testCSVImport() {
  Logger.log('========================================');
  Logger.log('CSV IMPORT TEST');
  Logger.log('========================================');

  // 테스트용 세션 (Master 권한)
  const testSession = {
    sessionId: 'test_session_456',
    userId: 'admin',
    loginId: 'admin',
    role: 'master',
    agencyCode: 'MASTER'
  };

  // 임시 세션 저장
  const cache = CacheService.getScriptCache();
  cache.put(testSession.sessionId, JSON.stringify(testSession), 3600);

  // 테스트용 CSV 데이터 (최소 필수 필드만)
  const testCSV = `NameKR,NameVN,DOB,AgencyCode,Email,PhoneKR
홍길동,Hong Gil Dong,2005-10-15,HANOI,hong@test.com,01012345678
이순신,Lee Soon Shin,2005-12-20,HANOI,lee@test.com,01087654321`;

  // CSV Import 실행
  const result = importStudentsFromCSV(testSession.sessionId, testCSV);

  if (result.success) {
    Logger.log('✅ CSV Import 성공!');
    Logger.log('가져온 학생: ' + result.imported + '명');
    Logger.log('실패한 학생: ' + result.failed + '명');

    if (result.errors.length > 0) {
      Logger.log('에러 내역:');
      for (let i = 0; i < result.errors.length; i++) {
        Logger.log('  Row ' + result.errors[i].row + ': ' + result.errors[i].error);
      }
    }
  } else {
    Logger.log('❌ CSV Import 실패!');
    Logger.log('에러: ' + result.error);
  }

  Logger.log('========================================');

  return result;
}
