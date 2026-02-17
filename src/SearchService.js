/**
 * SearchService.gs
 *
 * 통합 검색 및 필터링 서비스
 *
 * Features:
 * - 통합 검색 (학생, 유학원, 상담 기록)
 * - 자동완성 (3글자 이상, 최대 10개)
 * - 고급 필터 (유학원, 날짜, 상태)
 *
 * @version 2.2
 * @since 2026-02-16
 */

/**
 * 통합 검색 (학생, 유학원, 상담 기록)
 *
 * @param {string} sessionId - 세션 ID
 * @param {string} query - 검색어 (최소 2글자)
 * @param {Object} options - 검색 옵션 { types: ['students', 'agencies', 'consultations'], limit: 10 }
 * @returns {Object} { success: boolean, results?: Object, error?: string }
 *
 * @example
 * const result = searchAll(sessionId, '홍길동', { types: ['students'], limit: 10 });
 * // Returns: {
 * //   success: true,
 * //   results: {
 * //     students: [{ StudentID: '...', NameKR: '홍길동', ... }],
 * //     agencies: [],
 * //     consultations: [],
 * //     totalCount: 1
 * //   }
 * // }
 */
function searchAll(sessionId, query, options) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 검색어 검증 및 XSS 방어
    if (!query || query.trim().length < 2) {
      return {
        success: false,
        errorKey: 'err_query_too_short',
        error: '검색어는 최소 2글자 이상이어야 합니다.'
      };
    }

    query = _sanitizeQuery(query.trim()).toLowerCase();

    // 4. 옵션 기본값
    const defaultOptions = {
      types: ['students', 'agencies', 'consultations'],
      limit: 10,
      offset: 0
    };

    options = options || defaultOptions;
    options.types = options.types || defaultOptions.types;
    options.limit = options.limit || defaultOptions.limit;
    options.offset = options.offset || defaultOptions.offset;

    // 5. 검색 결과 객체
    const results = {
      students: [],
      agencies: [],
      consultations: [],
      totalCount: 0
    };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 6. 학생 검색
    if (options.types.includes('students')) {
      const studentsSheet = ss.getSheetByName('Students');
      const studentsData = studentsSheet.getDataRange().getValues();
      const studentsHeaders = studentsData[0];

      const allStudents = []; // 모든 검색 결과 수집

      for (let i = 1; i < studentsData.length; i++) {
        const row = studentsData[i];

        // 권한 필터링
        const agencyCode = row[studentsHeaders.indexOf('AgencyCode')];
        if (session.role === 'agency' && agencyCode !== session.agencyCode) {
          continue;
        }

        // 검색어 매칭 (StudentID, NameKR, NameVN, Email, PhoneKR)
        const studentID = String(row[studentsHeaders.indexOf('StudentID')]);
        const nameKR = String(row[studentsHeaders.indexOf('NameKR')]);
        const nameVN = String(row[studentsHeaders.indexOf('NameVN')]);
        const email = String(row[studentsHeaders.indexOf('Email')]);
        const phoneKR = String(row[studentsHeaders.indexOf('PhoneKR')]);

        const studentIDLower = studentID.toLowerCase();
        const nameKRLower = nameKR.toLowerCase();
        const nameVNLower = nameVN.toLowerCase();
        const emailLower = email.toLowerCase();
        const phoneKRLower = phoneKR.toLowerCase();

        let matchScore = 0;

        // matchScore 계산 (100/80/60/40)
        if (studentIDLower === query) {
          matchScore = 100; // 학생 ID 완전 일치
        } else if (nameKRLower === query || nameVNLower === query) {
          matchScore = 80; // 이름 완전 일치
        } else if (emailLower === query) {
          matchScore = 60; // 이메일 완전 일치
        } else if (studentIDLower.includes(query) || nameKRLower.includes(query) ||
                   nameVNLower.includes(query) || emailLower.includes(query) ||
                   phoneKRLower.includes(query)) {
          matchScore = 40; // 부분 일치
        }

        if (matchScore > 0) {
          const student = {};
          for (let j = 0; j < studentsHeaders.length; j++) {
            student[studentsHeaders[j]] = row[j];
          }
          student.matchScore = matchScore;
          allStudents.push(student);
        }
      }

      // matchScore 내림차순 정렬
      allStudents.sort(function(a, b) {
        return b.matchScore - a.matchScore;
      });

      // offset과 limit 적용
      results.students = allStudents.slice(options.offset, options.offset + options.limit);
    }

    // 7. 유학원 검색 (Master만)
    if (options.types.includes('agencies') && session.role === 'master') {
      const agenciesSheet = ss.getSheetByName('Agencies');
      const agenciesData = agenciesSheet.getDataRange().getValues();
      const agenciesHeaders = agenciesData[0];

      const allAgencies = []; // 모든 검색 결과 수집

      for (let i = 1; i < agenciesData.length; i++) {
        const row = agenciesData[i];

        // 검색어 매칭 (AgencyCode, AgencyName, ContactPerson)
        const agencyCode = String(row[agenciesHeaders.indexOf('AgencyCode')]);
        const agencyName = String(row[agenciesHeaders.indexOf('AgencyName')]);
        const contactPerson = String(row[agenciesHeaders.indexOf('ContactPerson')]);

        const agencyCodeLower = agencyCode.toLowerCase();
        const agencyNameLower = agencyName.toLowerCase();
        const contactPersonLower = contactPerson.toLowerCase();

        let matchScore = 0;

        // matchScore 계산 (100/80/40)
        if (agencyCodeLower === query) {
          matchScore = 100; // 유학원 코드 완전 일치
        } else if (agencyNameLower === query) {
          matchScore = 80; // 유학원 이름 완전 일치
        } else if (agencyCodeLower.includes(query) || agencyNameLower.includes(query) ||
                   contactPersonLower.includes(query)) {
          matchScore = 40; // 부분 일치
        }

        if (matchScore > 0) {
          const agency = {};
          for (let j = 0; j < agenciesHeaders.length; j++) {
            agency[agenciesHeaders[j]] = row[j];
          }
          agency.matchScore = matchScore;
          allAgencies.push(agency);
        }
      }

      // matchScore 내림차순 정렬
      allAgencies.sort(function(a, b) {
        return b.matchScore - a.matchScore;
      });

      // offset과 limit 적용
      results.agencies = allAgencies.slice(options.offset, options.offset + options.limit);
    }

    // 8. 상담 검색
    if (options.types.includes('consultations')) {
      const consultationsSheet = ss.getSheetByName('Consultations');
      const consultationsData = consultationsSheet.getDataRange().getValues();
      const consultationsHeaders = consultationsData[0];

      const allConsultations = []; // 모든 검색 결과 수집

      // Agency 권한인 경우, 소속 학생 목록 먼저 가져오기
      let allowedStudentIDs = null;
      if (session.role === 'agency') {
        allowedStudentIDs = new Set();
        const studentsSheet = ss.getSheetByName('Students');
        const studentsData = studentsSheet.getDataRange().getValues();
        const studentsHeaders = studentsData[0];

        for (let i = 1; i < studentsData.length; i++) {
          const row = studentsData[i];
          const agencyCode = row[studentsHeaders.indexOf('AgencyCode')];
          if (agencyCode === session.agencyCode) {
            const studentID = row[studentsHeaders.indexOf('StudentID')];
            allowedStudentIDs.add(studentID);
          }
        }
      }

      for (let i = 1; i < consultationsData.length; i++) {
        const row = consultationsData[i];
        const studentID = String(row[consultationsHeaders.indexOf('StudentID')]);

        // 권한 필터링 (Agency는 자기 유학원 학생의 상담만)
        if (session.role === 'agency' && !allowedStudentIDs.has(studentID)) {
          continue;
        }

        // 검색어 매칭 (StudentID, Summary, ConsultantName)
        const summary = String(row[consultationsHeaders.indexOf('Summary')]);
        const consultantName = String(row[consultationsHeaders.indexOf('ConsultantName')]);

        const studentIDLower = studentID.toLowerCase();
        const summaryLower = summary.toLowerCase();
        const consultantNameLower = consultantName.toLowerCase();

        let matchScore = 0;

        // matchScore 계산 (100/80/40)
        if (studentIDLower === query) {
          matchScore = 100; // 학생 ID 완전 일치
        } else if (summaryLower === query || consultantNameLower === query) {
          matchScore = 80; // 요약/상담사 이름 완전 일치
        } else if (studentIDLower.includes(query) || summaryLower.includes(query) ||
                   consultantNameLower.includes(query)) {
          matchScore = 40; // 부분 일치
        }

        if (matchScore > 0) {
          const consultation = {};
          for (let j = 0; j < consultationsHeaders.length; j++) {
            consultation[consultationsHeaders[j]] = row[j];
          }
          consultation.matchScore = matchScore;
          allConsultations.push(consultation);
        }
      }

      // matchScore 내림차순 정렬
      allConsultations.sort(function(a, b) {
        return b.matchScore - a.matchScore;
      });

      // offset과 limit 적용
      results.consultations = allConsultations.slice(options.offset, options.offset + options.limit);
    }

    // 9. 총 검색 결과 수
    results.totalCount = results.students.length + results.agencies.length + results.consultations.length;

    Logger.log('Search completed: query="' + query + '", totalCount=' + results.totalCount);

    return {
      success: true,
      results: results,
      query: query
    };

  } catch (e) {
    Logger.log('ERROR in searchAll: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_search_failed',
      error: '검색 실패: ' + e.message
    };
  }
}

/**
 * 자동완성 (3글자 이상, 최대 10개)
 *
 * @param {string} sessionId - 세션 ID
 * @param {string} query - 검색어 (최소 3글자)
 * @param {string} type - 검색 타입 ('students' | 'agencies')
 * @returns {Object} { success: boolean, suggestions?: Array<{label, value, type, id}>, error?: string }
 *
 * @example
 * const result = autocomplete(sessionId, '홍', 'students');
 * // Returns: {
 * //   success: true,
 * //   suggestions: [
 * //     { label: '홍길동', value: '260010001', type: 'student', id: '260010001' },
 * //     { label: '홍길순', value: '260010002', type: 'student', id: '260010002' }
 * //   ]
 * // }
 */
function autocomplete(sessionId, query, type) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 검색어 검증 및 XSS 방어 (최소 3글자)
    if (!query || query.trim().length < 3) {
      return {
        success: false,
        errorKey: 'err_query_too_short',
        error: '검색어는 최소 3글자 이상이어야 합니다.'
      };
    }

    query = _sanitizeQuery(query.trim()).toLowerCase();

    // 4. type 기본값
    if (!type || (type !== 'students' && type !== 'agencies')) {
      type = 'students';
    }

    // 5. CacheService 확인 (60초 TTL)
    const cache = CacheService.getScriptCache();
    const cacheKey = 'autocomplete_' + type + '_' + query;
    const cachedResult = cache.get(cacheKey);

    if (cachedResult) {
      Logger.log('Autocomplete cache hit: ' + cacheKey);
      return {
        success: true,
        suggestions: JSON.parse(cachedResult),
        query: query,
        type: type,
        cached: true
      };
    }

    const suggestions = [];
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 5. 학생 이름 자동완성
    if (type === 'students') {
      const studentsSheet = ss.getSheetByName('Students');
      const studentsData = studentsSheet.getDataRange().getValues();
      const studentsHeaders = studentsData[0];

      const studentIDIndex = studentsHeaders.indexOf('StudentID');
      const nameKRIndex = studentsHeaders.indexOf('NameKR');
      const nameVNIndex = studentsHeaders.indexOf('NameVN');
      const agencyCodeIndex = studentsHeaders.indexOf('AgencyCode');

      const addedNames = new Set(); // 중복 방지

      for (let i = 1; i < studentsData.length; i++) {
        const row = studentsData[i];

        // 권한 필터링
        if (session.role === 'agency' && row[agencyCodeIndex] !== session.agencyCode) {
          continue;
        }

        const studentID = String(row[studentIDIndex]);
        const nameKR = String(row[nameKRIndex]);
        const nameVN = String(row[nameVNIndex]);
        const nameKRLower = nameKR.toLowerCase();
        const nameVNLower = nameVN.toLowerCase();

        if (nameKRLower.includes(query) && !addedNames.has(nameKR)) {
          suggestions.push({
            label: nameKR,
            value: studentID,
            type: 'student',
            id: studentID
          });
          addedNames.add(nameKR);
        } else if (nameVNLower.includes(query) && !addedNames.has(nameVN)) {
          suggestions.push({
            label: nameVN,
            value: studentID,
            type: 'student',
            id: studentID
          });
          addedNames.add(nameVN);
        }

        if (suggestions.length >= 10) {
          break;
        }
      }
    }

    // 6. 유학원 이름 자동완성 (Master만)
    if (type === 'agencies' && session.role === 'master') {
      const agenciesSheet = ss.getSheetByName('Agencies');
      const agenciesData = agenciesSheet.getDataRange().getValues();
      const agenciesHeaders = agenciesData[0];

      const agencyCodeIndex = agenciesHeaders.indexOf('AgencyCode');
      const agencyNameIndex = agenciesHeaders.indexOf('AgencyName');

      const addedNames = new Set(); // 중복 방지

      for (let i = 1; i < agenciesData.length; i++) {
        const row = agenciesData[i];
        const agencyCode = String(row[agencyCodeIndex]);
        const agencyName = String(row[agencyNameIndex]);
        const agencyNameLower = agencyName.toLowerCase();

        if (agencyNameLower.includes(query) && !addedNames.has(agencyName)) {
          suggestions.push({
            label: agencyName,
            value: agencyCode,
            type: 'agency',
            id: agencyCode
          });
          addedNames.add(agencyName);
        }

        if (suggestions.length >= 10) {
          break;
        }
      }
    }

    Logger.log('Autocomplete: query="' + query + '", suggestions=' + suggestions.length);

    // CacheService에 저장 (60초 TTL)
    try {
      cache.put(cacheKey, JSON.stringify(suggestions), 60);
      Logger.log('Autocomplete cached: ' + cacheKey);
    } catch (cacheError) {
      Logger.log('Cache save failed: ' + cacheError.message);
      // 캐시 실패는 치명적이지 않으므로 계속 진행
    }

    return {
      success: true,
      suggestions: suggestions,
      query: query,
      type: type
    };

  } catch (e) {
    Logger.log('ERROR in autocomplete: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_autocomplete_failed',
      error: '자동완성 실패: ' + e.message
    };
  }
}

/**
 * 고급 필터 (유학원, 날짜, 상태, IsActive, TOPIK 레벨)
 *
 * @param {string} sessionId - 세션 ID
 * @param {Object} filters - 필터 조건
 *   - agencyCodes?: string[] - 유학원 코드 배열
 *   - dateFrom?: string - 시작 날짜 (YYYY-MM-DD)
 *   - dateTo?: string - 종료 날짜 (YYYY-MM-DD)
 *   - statuses?: string[] - 상태 배열 (['Active', 'Inactive', 'Graduated'])
 *   - isActive?: boolean - Active 여부 (true: Active만, false: Inactive만)
 *   - topikLevels?: number[] - TOPIK 등급 배열 ([1, 2, 3, 4, 5, 6])
 * @returns {Object} { success: boolean, students?: Array<Object>, count?: number, error?: string }
 *
 * @example
 * const result = advancedFilter(sessionId, {
 *   agencyCodes: ['HANOI'],
 *   isActive: true,
 *   topikLevels: [3, 4, 5]
 * });
 * // Returns: {
 * //   success: true,
 * //   students: [{ StudentID: '...', ... }],
 * //   count: 10
 * // }
 */
function advancedFilter(sessionId, filters) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 필터 기본값
    filters = filters || {};

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const studentsSheet = ss.getSheetByName('Students');
    const studentsData = studentsSheet.getDataRange().getValues();
    const studentsHeaders = studentsData[0];

    // TOPIK Level 필터를 위한 ExamResults 시트 로드
    let studentTopikMap = null;
    if (filters.topikLevels && filters.topikLevels.length > 0) {
      studentTopikMap = {};
      const examResultsSheet = ss.getSheetByName('ExamResults');
      const examResultsData = examResultsSheet.getDataRange().getValues();
      const examHeaders = examResultsData[0];
      const examStudentIDIndex = examHeaders.indexOf('StudentID');
      const examLevelIndex = examHeaders.indexOf('Level');

      // 학생별 최신 TOPIK 레벨 저장
      for (let i = 1; i < examResultsData.length; i++) {
        const studentID = examResultsData[i][examStudentIDIndex];
        const level = examResultsData[i][examLevelIndex];

        // "TOPIK 1" → 1 변환
        const levelNumber = parseInt(level.replace('TOPIK ', ''));
        if (!isNaN(levelNumber)) {
          studentTopikMap[studentID] = levelNumber;
        }
      }
    }

    const filteredStudents = [];

    // 4. 필터링 로직
    for (let i = 1; i < studentsData.length; i++) {
      const row = studentsData[i];

      // 권한 필터링
      const agencyCode = row[studentsHeaders.indexOf('AgencyCode')];
      if (session.role === 'agency' && agencyCode !== session.agencyCode) {
        continue;
      }

      // 유학원 필터
      if (filters.agencyCodes && filters.agencyCodes.length > 0) {
        if (!filters.agencyCodes.includes(agencyCode)) {
          continue;
        }
      }

      // 날짜 필터 (등록일 기준)
      const registeredDate = row[studentsHeaders.indexOf('RegisteredDate')];
      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom);
        if (new Date(registeredDate) < dateFrom) {
          continue;
        }
      }

      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        if (new Date(registeredDate) > dateTo) {
          continue;
        }
      }

      // 상태 필터
      const status = row[studentsHeaders.indexOf('Status')];
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(status)) {
          continue;
        }
      }

      // isActive 필터 (boolean)
      if (filters.isActive !== undefined) {
        const isActive = (status === 'Active');
        if (filters.isActive !== isActive) {
          continue;
        }
      }

      // TOPIK Level 필터
      if (filters.topikLevels && filters.topikLevels.length > 0) {
        const studentID = row[studentsHeaders.indexOf('StudentID')];
        const studentLevel = studentTopikMap[studentID];

        // TOPIK 레벨이 없거나 필터에 포함되지 않으면 제외
        if (!studentLevel || !filters.topikLevels.includes(studentLevel)) {
          continue;
        }
      }

      // 필터 통과 → 결과에 추가
      const student = {};
      for (let j = 0; j < studentsHeaders.length; j++) {
        student[studentsHeaders[j]] = row[j];
      }

      filteredStudents.push(student);
    }

    Logger.log('Advanced filter: count=' + filteredStudents.length);

    return {
      success: true,
      students: filteredStudents,
      count: filteredStudents.length,
      filters: filters
    };

  } catch (e) {
    Logger.log('ERROR in advancedFilter: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_filter_failed',
      error: '고급 필터 실패: ' + e.message
    };
  }
}

/**
 * ========================================
 * Private Helper Functions
 * ========================================
 */

/**
 * XSS 방어를 위한 검색어 sanitize
 *
 * @param {string} query - 원본 검색어
 * @returns {string} - Sanitize된 검색어
 * @private
 */
function _sanitizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // XSS 위험 문자 제거
  let sanitized = query
    .replace(/</g, '')  // < 제거
    .replace(/>/g, '')  // > 제거
    .replace(/&/g, '')  // & 제거
    .replace(/"/g, '')  // " 제거
    .replace(/'/g, '')  // ' 제거
    .replace(/\//g, '') // / 제거
    .replace(/\\/g, '') // \ 제거
    .replace(/`/g, ''); // ` 제거

  // 스크립트 태그 패턴 제거 (대소문자 무시)
  sanitized = sanitized.replace(/script/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/onerror/gi, '');
  sanitized = sanitized.replace(/onload/gi, '');

  return sanitized;
}

/**
 * SearchService 테스트 함수
 */
function testSearchService() {
  Logger.log('========================================');
  Logger.log('SEARCH SERVICE TEST');
  Logger.log('========================================');

  const testSession = {
    sessionId: 'test_session_search',
    userId: 'admin',
    loginId: 'admin',
    role: 'master',
    agencyCode: 'MASTER'
  };

  const cache = CacheService.getScriptCache();
  cache.put(testSession.sessionId, JSON.stringify(testSession), 3600);

  // 1. searchAll 테스트
  Logger.log('\n1. Testing searchAll()...');
  const searchResult = searchAll(testSession.sessionId, '홍', { types: ['students'], limit: 5 });

  if (searchResult.success) {
    Logger.log('✅ Search completed!');
    Logger.log('Total results: ' + searchResult.results.totalCount);
    Logger.log('Students: ' + searchResult.results.students.length);
  } else {
    Logger.log('❌ Search failed!');
    Logger.log('Error: ' + searchResult.error);
  }

  // 2. autocomplete 테스트
  Logger.log('\n2. Testing autocomplete()...');
  const autocompleteResult = autocomplete(testSession.sessionId, '홍길', 'students');

  if (autocompleteResult.success) {
    Logger.log('✅ Autocomplete completed!');
    Logger.log('Suggestions: ' + autocompleteResult.suggestions.join(', '));
  } else {
    Logger.log('❌ Autocomplete failed!');
    Logger.log('Error: ' + autocompleteResult.error);
  }

  Logger.log('\n========================================');
  Logger.log('SEARCH SERVICE TEST COMPLETE');
  Logger.log('========================================');
}
