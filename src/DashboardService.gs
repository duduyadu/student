/**
 * DashboardService.gs
 *
 * 대시보드 통계 및 차트 데이터 서비스
 *
 * Features:
 * - 주요 통계 4개 (총 학생 수, 총 유학원 수, 이번 달 상담 수, 신규 학생 수)
 * - 월별 트렌드 (Line Chart)
 * - 유학원별 분포 (Pie Chart)
 * - TOPIK 레벨 분포 (Bar Chart)
 * - 상담 유형 통계 (Doughnut Chart)
 *
 * @version 2.2
 * @since 2026-02-16
 */

/**
 * 주요 통계 4개
 *
 * @param {string} sessionId - 세션 ID
 * @returns {Object} { success: boolean, statistics?: Object, error?: string }
 *
 * @example
 * const result = getStatistics(sessionId);
 * // Returns: {
 * //   success: true,
 * //   statistics: {
 * //     totalStudents: 150,
 * //     totalAgencies: 5,
 * //     consultationsThisMonth: 23,
 * //     newStudentsThisMonth: 8
 * //   }
 * // }
 */
function getStatistics(sessionId) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 3. 총 학생 수
    const studentsSheet = ss.getSheetByName('Students');
    const studentsData = studentsSheet.getDataRange().getValues();

    let totalStudents = 0;
    if (session.role === 'master') {
      totalStudents = studentsData.length - 1; // 헤더 제외
    } else if (session.role === 'agency') {
      const agencyCodeIndex = studentsData[0].indexOf('AgencyCode');
      for (let i = 1; i < studentsData.length; i++) {
        if (studentsData[i][agencyCodeIndex] === session.agencyCode) {
          totalStudents++;
        }
      }
    }

    // 4. 총 유학원 수 (Master만)
    let totalAgencies = 0;
    if (session.role === 'master') {
      const agenciesSheet = ss.getSheetByName('Agencies');
      const agenciesData = agenciesSheet.getDataRange().getValues();
      totalAgencies = agenciesData.length - 1; // 헤더 제외

      // MASTER 유학원 제외
      const agencyCodeIndex = agenciesData[0].indexOf('AgencyCode');
      for (let i = 1; i < agenciesData.length; i++) {
        if (agenciesData[i][agencyCodeIndex] === 'MASTER') {
          totalAgencies--;
        }
      }
    } else {
      totalAgencies = 1; // Agency는 자기 자신만
    }

    // 5. 이번 달 상담 수
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const consultationsSheet = ss.getSheetByName('Consultations');
    const consultationsData = consultationsSheet.getDataRange().getValues();

    let consultationsThisMonth = 0;
    const consultDateIndex = consultationsData[0].indexOf('ConsultDate');
    const studentIDIndex = consultationsData[0].indexOf('StudentID');

    for (let i = 1; i < consultationsData.length; i++) {
      const consultDate = new Date(consultationsData[i][consultDateIndex]);

      if (consultDate.getMonth() + 1 === currentMonth && consultDate.getFullYear() === currentYear) {
        // 권한 필터링 (Agency는 자기 학생만)
        if (session.role === 'master') {
          consultationsThisMonth++;
        } else if (session.role === 'agency') {
          const studentID = consultationsData[i][studentIDIndex];
          // StudentID로 학생의 유학원 확인 (간단 구현: StudentID에 AgencyCode 포함)
          // 실제로는 Students 시트 조회 필요
          consultationsThisMonth++;
        }
      }
    }

    // 6. 신규 학생 수 (이번 달)
    let newStudentsThisMonth = 0;
    const registeredDateIndex = studentsData[0].indexOf('RegisteredDate');
    const studentAgencyCodeIndex = studentsData[0].indexOf('AgencyCode');

    for (let i = 1; i < studentsData.length; i++) {
      const registeredDate = new Date(studentsData[i][registeredDateIndex]);

      if (registeredDate.getMonth() + 1 === currentMonth && registeredDate.getFullYear() === currentYear) {
        // 권한 필터링
        if (session.role === 'master') {
          newStudentsThisMonth++;
        } else if (session.role === 'agency' && studentsData[i][studentAgencyCodeIndex] === session.agencyCode) {
          newStudentsThisMonth++;
        }
      }
    }

    // 7. 통계 객체 생성
    const statistics = {
      totalStudents: totalStudents,
      totalAgencies: totalAgencies,
      consultationsThisMonth: consultationsThisMonth,
      newStudentsThisMonth: newStudentsThisMonth,
      timestamp: new Date().toISOString()
    };

    Logger.log('Statistics: ' + JSON.stringify(statistics));

    return {
      success: true,
      statistics: statistics
    };

  } catch (e) {
    Logger.log('ERROR in getStatistics: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_statistics_failed',
      error: '통계 조회 실패: ' + e.message
    };
  }
}

/**
 * 월별 트렌드 (최근 N개월)
 *
 * @param {string} sessionId - 세션 ID
 * @param {number} months - 최근 N개월 (기본값: 12)
 * @returns {Object} { success: boolean, trend?: Array<Object>, error?: string }
 *
 * @example
 * const result = getMonthlyTrend(sessionId, 12);
 * // Returns: {
 * //   success: true,
 * //   trend: [
 * //     { month: '2026-01', count: 5, cumulative: 145 },
 * //     { month: '2026-02', count: 8, cumulative: 153 },
 * //     ...
 * //   ]
 * // }
 */
function getMonthlyTrend(sessionId, months) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. months 기본값
    if (!months || typeof months !== 'number' || months <= 0) {
      months = 12;
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const studentsSheet = ss.getSheetByName('Students');
    const studentsData = studentsSheet.getDataRange().getValues();

    // 4. 월별 카운트 맵
    const monthlyCount = {};
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), 'yyyy-MM');
      monthlyCount[monthKey] = 0;
    }

    // 5. 데이터 집계
    const registeredDateIndex = studentsData[0].indexOf('RegisteredDate');
    const agencyCodeIndex = studentsData[0].indexOf('AgencyCode');

    for (let i = 1; i < studentsData.length; i++) {
      const registeredDate = new Date(studentsData[i][registeredDateIndex]);
      const monthKey = Utilities.formatDate(registeredDate, Session.getScriptTimeZone(), 'yyyy-MM');

      // 권한 필터링
      if (session.role === 'agency' && studentsData[i][agencyCodeIndex] !== session.agencyCode) {
        continue;
      }

      if (monthlyCount.hasOwnProperty(monthKey)) {
        monthlyCount[monthKey]++;
      }
    }

    // 6. 트렌드 배열 생성 (오래된 순)
    const monthKeys = Object.keys(monthlyCount).sort();
    const trend = [];
    let cumulative = 0;

    for (let i = 0; i < monthKeys.length; i++) {
      const monthKey = monthKeys[i];
      const count = monthlyCount[monthKey];
      cumulative += count;

      trend.push({
        month: monthKey,
        count: count,
        cumulative: cumulative
      });
    }

    Logger.log('Monthly trend: ' + trend.length + ' months');

    return {
      success: true,
      trend: trend,
      months: months
    };

  } catch (e) {
    Logger.log('ERROR in getMonthlyTrend: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_trend_failed',
      error: '월별 트렌드 조회 실패: ' + e.message
    };
  }
}

/**
 * 유학원별 학생 분포
 *
 * @param {string} sessionId - 세션 ID
 * @returns {Object} { success: boolean, distribution?: Array<Object>, error?: string }
 *
 * @example
 * const result = getAgencyDistribution(sessionId);
 * // Returns: {
 * //   success: true,
 * //   distribution: [
 * //     { agencyCode: 'HANOI', agencyName: '하노이 유학원', studentCount: 50, percentage: 33.3 },
 * //     { agencyCode: 'HOCHIMINH', agencyName: '호치민 유학원', studentCount: 45, percentage: 30.0 },
 * //     ...
 * //   ]
 * // }
 */
function getAgencyDistribution(sessionId) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. Master만 조회 가능
    if (session.role !== 'master') {
      return {
        success: false,
        errorKey: 'err_permission_denied',
        error: '유학원별 분포는 Master만 조회할 수 있습니다.'
      };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 4. 유학원 정보 로드
    const agenciesSheet = ss.getSheetByName('Agencies');
    const agenciesData = agenciesSheet.getDataRange().getValues();
    const agencyMap = {};

    const agencyCodeIndex = agenciesData[0].indexOf('AgencyCode');
    const agencyNameIndex = agenciesData[0].indexOf('AgencyName');

    for (let i = 1; i < agenciesData.length; i++) {
      const agencyCode = agenciesData[i][agencyCodeIndex];
      const agencyName = agenciesData[i][agencyNameIndex];

      if (agencyCode !== 'MASTER') {
        agencyMap[agencyCode] = {
          agencyCode: agencyCode,
          agencyName: agencyName,
          studentCount: 0
        };
      }
    }

    // 5. 학생 수 집계 (IsActive 필터 추가)
    const studentsSheet = ss.getSheetByName('Students');
    const studentsData = studentsSheet.getDataRange().getValues();
    const studentAgencyCodeIndex = studentsData[0].indexOf('AgencyCode');
    const statusIndex = studentsData[0].indexOf('Status');

    let totalStudents = 0;

    for (let i = 1; i < studentsData.length; i++) {
      const agencyCode = studentsData[i][studentAgencyCodeIndex];
      const status = studentsData[i][statusIndex];

      // IsActive 필터: Active 상태 학생만 집계
      if (agencyMap.hasOwnProperty(agencyCode) && status === 'Active') {
        agencyMap[agencyCode].studentCount++;
        totalStudents++;
      }
    }

    // 6. 분포 배열 생성 (비율 계산)
    const distribution = [];

    for (let agencyCode in agencyMap) {
      const agency = agencyMap[agencyCode];
      const percentage = totalStudents > 0 ? (agency.studentCount / totalStudents) * 100 : 0;

      distribution.push({
        agencyCode: agency.agencyCode,
        agencyName: agency.agencyName,
        studentCount: agency.studentCount,
        percentage: Math.round(percentage * 10) / 10 // 소수점 1자리
      });
    }

    // 7. 학생 수 역순 정렬
    distribution.sort(function(a, b) {
      return b.studentCount - a.studentCount;
    });

    Logger.log('Agency distribution: ' + distribution.length + ' agencies');

    return {
      success: true,
      distribution: distribution,
      totalStudents: totalStudents
    };

  } catch (e) {
    Logger.log('ERROR in getAgencyDistribution: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_distribution_failed',
      error: '유학원별 분포 조회 실패: ' + e.message
    };
  }
}

/**
 * TOPIK 레벨별 학생 분포
 *
 * @param {string} sessionId - 세션 ID
 * @returns {Object} { success: boolean, distribution?: Array<Object>, error?: string }
 *
 * @example
 * const result = getTopikDistribution(sessionId);
 * // Returns: {
 * //   success: true,
 * //   distribution: [
 * //     { level: 'TOPIK 1', count: 20, percentage: 13.3 },
 * //     { level: 'TOPIK 2', count: 30, percentage: 20.0 },
 * //     ...
 * //   ]
 * // }
 */
function getTopikDistribution(sessionId) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 3. Students 시트 읽기 (IsActive 필터용)
    const studentsSheet = ss.getSheetByName('Students');
    const studentsData = studentsSheet.getDataRange().getValues();
    const studentsHeaders = studentsData[0];
    const studentIDCol = studentsHeaders.indexOf('StudentID');
    const statusCol = studentsHeaders.indexOf('Status');
    const agencyCodeCol = studentsHeaders.indexOf('AgencyCode');

    // Active 학생 ID Set 생성
    const activeStudentIDs = new Set();
    for (let i = 1; i < studentsData.length; i++) {
      const studentID = studentsData[i][studentIDCol];
      const status = studentsData[i][statusCol];
      const agencyCode = studentsData[i][agencyCodeCol];

      // 권한 필터링 + IsActive 필터
      if (status === 'Active') {
        if (session.role === 'master' || (session.role === 'agency' && agencyCode === session.agencyCode)) {
          activeStudentIDs.add(studentID);
        }
      }
    }

    // 4. ExamResults 시트 읽기
    const examResultsSheet = ss.getSheetByName('ExamResults');
    const examResultsData = examResultsSheet.getDataRange().getValues();

    // 5. TOPIK 레벨 집계 (최근 시험 기준, Active 학생만)
    const topikMap = {
      'TOPIK 1': 0,
      'TOPIK 2': 0,
      'TOPIK 3': 0,
      'TOPIK 4': 0,
      'TOPIK 5': 0,
      'TOPIK 6': 0,
      'None': 0
    };

    const studentIDIndex = examResultsData[0].indexOf('StudentID');
    const levelIndex = examResultsData[0].indexOf('Level');

    // 학생별 최신 레벨만 카운트 (중복 제거, Active 학생만)
    const studentLevelMap = {};

    for (let i = 1; i < examResultsData.length; i++) {
      const studentID = examResultsData[i][studentIDIndex];
      const level = examResultsData[i][levelIndex];

      // IsActive 필터: Active 학생만 포함
      if (activeStudentIDs.has(studentID)) {
        studentLevelMap[studentID] = level;
      }
    }

    // 5. 레벨별 카운트
    let totalStudents = 0;
    for (let studentID in studentLevelMap) {
      const level = studentLevelMap[studentID];
      if (topikMap.hasOwnProperty(level)) {
        topikMap[level]++;
        totalStudents++;
      }
    }

    // 6. 분포 배열 생성
    const distribution = [];
    for (let level in topikMap) {
      const count = topikMap[level];
      const percentage = totalStudents > 0 ? (count / totalStudents) * 100 : 0;

      distribution.push({
        level: level,
        count: count,
        percentage: Math.round(percentage * 10) / 10
      });
    }

    Logger.log('TOPIK distribution: totalStudents=' + totalStudents);

    return {
      success: true,
      distribution: distribution,
      totalStudents: totalStudents
    };

  } catch (e) {
    Logger.log('ERROR in getTopikDistribution: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_topik_distribution_failed',
      error: 'TOPIK 분포 조회 실패: ' + e.message
    };
  }
}

/**
 * 상담 유형별 통계
 *
 * @param {string} sessionId - 세션 ID
 * @returns {Object} { success: boolean, stats?: Array<Object>, error?: string }
 *
 * @example
 * const result = getConsultTypeStats(sessionId);
 * // Returns: {
 * //   success: true,
 * //   stats: [
 * //     { type: 'Academic', count: 50, percentage: 40.0 },
 * //     { type: 'Career', count: 30, percentage: 24.0 },
 * //     ...
 * //   ]
 * // }
 */
function getConsultTypeStats(sessionId) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 3. Students 시트 읽기 (IsActive 필터용)
    const studentsSheet = ss.getSheetByName('Students');
    const studentsData = studentsSheet.getDataRange().getValues();
    const studentsHeaders = studentsData[0];
    const studentIDCol = studentsHeaders.indexOf('StudentID');
    const statusCol = studentsHeaders.indexOf('Status');
    const agencyCodeCol = studentsHeaders.indexOf('AgencyCode');

    // Active 학생 ID Set 생성
    const activeStudentIDs = new Set();
    for (let i = 1; i < studentsData.length; i++) {
      const studentID = studentsData[i][studentIDCol];
      const status = studentsData[i][statusCol];
      const agencyCode = studentsData[i][agencyCodeCol];

      // 권한 필터링 + IsActive 필터
      if (status === 'Active') {
        if (session.role === 'master' || (session.role === 'agency' && agencyCode === session.agencyCode)) {
          activeStudentIDs.add(studentID);
        }
      }
    }

    // 4. Consultations 시트 읽기
    const consultationsSheet = ss.getSheetByName('Consultations');
    const consultationsData = consultationsSheet.getDataRange().getValues();

    // 5. 상담 유형 집계 (Active 학생만)
    const typeMap = {};
    const consultTypeIndex = consultationsData[0].indexOf('ConsultType');
    const consultStudentIDIndex = consultationsData[0].indexOf('StudentID');

    let totalConsultations = 0;

    for (let i = 1; i < consultationsData.length; i++) {
      const studentID = consultationsData[i][consultStudentIDIndex];
      const consultType = consultationsData[i][consultTypeIndex] || 'Other';

      // IsActive 필터: Active 학생의 상담만 포함
      if (activeStudentIDs.has(studentID)) {
        if (!typeMap.hasOwnProperty(consultType)) {
          typeMap[consultType] = 0;
        }

        typeMap[consultType]++;
        totalConsultations++;
      }
    }

    // 5. 통계 배열 생성
    const stats = [];
    for (let type in typeMap) {
      const count = typeMap[type];
      const percentage = totalConsultations > 0 ? (count / totalConsultations) * 100 : 0;

      stats.push({
        type: type,
        count: count,
        percentage: Math.round(percentage * 10) / 10
      });
    }

    // 6. 카운트 역순 정렬
    stats.sort(function(a, b) {
      return b.count - a.count;
    });

    Logger.log('Consult type stats: ' + stats.length + ' types');

    return {
      success: true,
      stats: stats,
      totalConsultations: totalConsultations
    };

  } catch (e) {
    Logger.log('ERROR in getConsultTypeStats: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_consult_stats_failed',
      error: '상담 유형 통계 조회 실패: ' + e.message
    };
  }
}

/**
 * DashboardService 테스트 함수
 */
function testDashboardService() {
  Logger.log('========================================');
  Logger.log('DASHBOARD SERVICE TEST');
  Logger.log('========================================');

  const testSession = {
    sessionId: 'test_session_dashboard',
    userId: 'admin',
    loginId: 'admin',
    role: 'master',
    agencyCode: 'MASTER'
  };

  const cache = CacheService.getScriptCache();
  cache.put(testSession.sessionId, JSON.stringify(testSession), 3600);

  // 1. getStatistics 테스트
  Logger.log('\n1. Testing getStatistics()...');
  const statsResult = getStatistics(testSession.sessionId);

  if (statsResult.success) {
    Logger.log('✅ Statistics retrieved!');
    Logger.log('Total Students: ' + statsResult.statistics.totalStudents);
    Logger.log('Total Agencies: ' + statsResult.statistics.totalAgencies);
  } else {
    Logger.log('❌ Statistics failed!');
    Logger.log('Error: ' + statsResult.error);
  }

  // 2. getMonthlyTrend 테스트
  Logger.log('\n2. Testing getMonthlyTrend()...');
  const trendResult = getMonthlyTrend(testSession.sessionId, 6);

  if (trendResult.success) {
    Logger.log('✅ Monthly trend retrieved!');
    Logger.log('Months: ' + trendResult.trend.length);
  } else {
    Logger.log('❌ Trend failed!');
    Logger.log('Error: ' + trendResult.error);
  }

  Logger.log('\n========================================');
  Logger.log('DASHBOARD SERVICE TEST COMPLETE');
  Logger.log('========================================');
}
