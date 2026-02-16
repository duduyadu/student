/**
 * AnalyticsService.gs - 고급 데이터 분석 및 리포팅
 * Step 3 High Priority Features - Week 1-2
 *
 * APIs:
 * - getCohortAnalysis(sessionId, filters)
 * - getTrendAnalysis(sessionId, params)
 * - getFunnelAnalysis(sessionId, params)       // Day 3-4
 * - generateCustomReport(sessionId, template)  // Day 3-4
 * - exportReportToPDF(sessionId, reportData)   // Day 5-7
 */

// ==================== COHORT ANALYSIS ====================

/**
 * 코호트 분석 - 입학 연도별/유학원별 학생 그룹 비교
 * @param {string} sessionId - 세션 ID
 * @param {Object} filters - 필터 조건
 *   - cohortType: "year" | "agency" | "custom"
 *   - metric: "topik_improvement" | "target_change" | "consult_count"
 *   - startYear: number (2020~2026)
 *   - endYear: number (2020~2026)
 *   - agencyCodes: string[] (optional)
 * @returns {Object} { success: boolean, data: { cohorts, chartData }, error, errorKey }
 */
function getCohortAnalysis(sessionId, filters) {
  try {
    // 1. 세션 검증
    var session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 권한 검증 (master/agency만)
    if (session.role !== 'master' && session.role !== 'agency') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. 파라미터 검증
    if (!filters || !filters.cohortType || !filters.metric) {
      return { success: false, errorKey: 'err_invalid_params' };
    }

    var cohortType = filters.cohortType;  // "year" | "agency" | "custom"
    var metric = filters.metric;          // "topik_improvement" | "target_change" | "consult_count"
    var startYear = filters.startYear || 2020;
    var endYear = filters.endYear || new Date().getFullYear();
    var agencyCodes = filters.agencyCodes || [];

    // 5. Students 시트 읽기
    var students = _getAllRows(SHEETS.STUDENTS);

    // 5.1 권한별 필터링
    if (session.role === 'agency') {
      students = students.filter(function(s) {
        return s.AgencyCode === session.agencyCode;
      });
    }

    // 5.2 활성 학생만
    students = students.filter(function(s) {
      return s.IsActive !== false && String(s.IsActive).toUpperCase() !== 'FALSE';
    });

    // 5.3 유학원 필터 적용
    if (agencyCodes.length > 0) {
      students = students.filter(function(s) {
        return agencyCodes.indexOf(s.AgencyCode) >= 0;
      });
    }

    // 6. ExamResults, Consultations, TargetHistory 시트 읽기
    var examResults = _getAllRows(SHEETS.EXAM_RESULTS);
    var consultations = _getAllRows(SHEETS.CONSULTATIONS);
    var targetHistory = _getAllRows(SHEETS.TARGET_HISTORY);

    // 7. cohortType에 따라 그룹핑
    var cohorts = _groupByCohort(students, cohortType, startYear, endYear);

    // 8. 각 코호트별 metric 계산
    var cohortData = [];
    for (var i = 0; i < cohorts.length; i++) {
      var cohort = cohorts[i];
      var cohortStudents = cohort.students;
      var metricValue = 0;
      var metricLabel = '';
      var breakdown = [];

      if (metric === 'topik_improvement') {
        // TOPIK 평균 향상도 계산
        var improvements = _calculateTOPIKImprovement(cohortStudents, examResults);
        metricValue = improvements.average;
        metricLabel = 'TOPIK 평균 향상: ' + (metricValue >= 0 ? '+' : '') + metricValue.toFixed(1) + '등급';
        breakdown = improvements.breakdown;

      } else if (metric === 'target_change') {
        // 목표 대학 변경 횟수
        var changes = _calculateTargetChanges(cohortStudents, targetHistory);
        metricValue = changes.average;
        metricLabel = '평균 목표 변경: ' + metricValue.toFixed(1) + '회';
        breakdown = changes.breakdown;

      } else if (metric === 'consult_count') {
        // 상담 횟수
        var counts = _calculateConsultCounts(cohortStudents, consultations);
        metricValue = counts.average;
        metricLabel = '평균 상담 횟수: ' + metricValue.toFixed(1) + '회';
        breakdown = counts.breakdown;
      }

      cohortData.push({
        cohortId: cohort.id,
        cohortName: cohort.name,
        studentCount: cohortStudents.length,
        metricValue: metricValue,
        metricLabel: metricLabel,
        breakdown: breakdown
      });
    }

    // 9. Chart.js 데이터 생성
    var chartData = {
      labels: cohortData.map(function(c) { return c.cohortName; }),
      datasets: [{
        label: metricLabel || metric,
        data: cohortData.map(function(c) { return c.metricValue; }),
        backgroundColor: _generateColors(cohortData.length)
      }]
    };

    // 10. 감사 로그
    _saveAuditLog(session.loginId, 'ANALYTICS', 'CohortAnalysis', JSON.stringify(filters), sessionId);

    return {
      success: true,
      data: {
        cohorts: cohortData,
        chartData: chartData
      }
    };

  } catch (e) {
    Logger.log('ERROR in getCohortAnalysis: ' + e.message);
    _saveAuditLog(session ? session.loginId : 'unknown', 'ERROR', 'CohortAnalysis', e.message, sessionId);
    return { success: false, error: e.message, errorKey: 'err_analytics_cohort_failed' };
  }
}

// ==================== TREND ANALYSIS ====================

/**
 * 트렌드 분석 - 시계열 데이터 추이
 * @param {string} sessionId - 세션 ID
 * @param {Object} params - 파라미터
 *   - period: "monthly" | "quarterly" | "yearly"
 *   - metric: "new_students" | "topik_pass_rate" | "consult_frequency"
 *   - startDate: "YYYY-MM-DD"
 *   - endDate: "YYYY-MM-DD"
 *   - agencyCodes: string[] (optional)
 * @returns {Object} { success: boolean, data: { trends, chartData, summary }, error, errorKey }
 */
function getTrendAnalysis(sessionId, params) {
  try {
    // 1. 세션 검증
    var session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 권한 검증
    if (session.role !== 'master' && session.role !== 'agency') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. 파라미터 검증
    if (!params || !params.period || !params.metric || !params.startDate || !params.endDate) {
      return { success: false, errorKey: 'err_invalid_params' };
    }

    var period = params.period;      // "monthly" | "quarterly" | "yearly"
    var metric = params.metric;      // "new_students" | "topik_pass_rate" | "consult_frequency"
    var startDate = new Date(params.startDate);
    var endDate = new Date(params.endDate);
    var agencyCodes = params.agencyCodes || [];

    // 5. 날짜 범위를 period에 따라 분할
    var periods = _generatePeriods(period, startDate, endDate);

    // 6. 데이터 시트 읽기
    var students = _getAllRows(SHEETS.STUDENTS);
    var examResults = _getAllRows(SHEETS.EXAM_RESULTS);
    var consultations = _getAllRows(SHEETS.CONSULTATIONS);

    // 6.1 권한별 필터링
    if (session.role === 'agency') {
      students = students.filter(function(s) {
        return s.AgencyCode === session.agencyCode;
      });
    }

    // 6.2 유학원 필터 적용
    if (agencyCodes.length > 0) {
      students = students.filter(function(s) {
        return agencyCodes.indexOf(s.AgencyCode) >= 0;
      });
    }

    // 7. 각 기간별 데이터 집계
    var trends = [];
    var previousValue = null;

    for (var i = 0; i < periods.length; i++) {
      var p = periods[i];
      var value = 0;

      if (metric === 'new_students') {
        // 신규 학생 수
        value = _countNewStudents(students, p.startDate, p.endDate);

      } else if (metric === 'topik_pass_rate') {
        // TOPIK 합격률 (Level >= 3)
        value = _calculateTOPIKPassRate(students, examResults, p.startDate, p.endDate);

      } else if (metric === 'consult_frequency') {
        // 상담 빈도
        value = _countConsultations(consultations, p.startDate, p.endDate);
      }

      // 전 기간 대비 변화율 계산
      var change = 0;
      var changeLabel = '-';
      if (previousValue !== null && previousValue !== 0) {
        change = ((value - previousValue) / previousValue) * 100;
        changeLabel = (change >= 0 ? '+' : '') + change.toFixed(1) + '%';
      }

      trends.push({
        periodId: p.id,
        periodLabel: p.label,
        value: value,
        change: change,
        changeLabel: changeLabel
      });

      previousValue = value;
    }

    // 8. Chart.js Line 차트 데이터 생성
    var chartData = {
      labels: trends.map(function(t) { return t.periodLabel; }),
      datasets: [{
        label: _getMetricLabel(metric),
        data: trends.map(function(t) { return t.value; }),
        borderColor: '#4285F4',
        backgroundColor: 'rgba(66, 133, 244, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };

    // 9. 요약 통계 계산
    var values = trends.map(function(t) { return t.value; });
    var summary = {
      average: _calculateAverage(values),
      min: Math.min.apply(null, values),
      max: Math.max.apply(null, values),
      totalGrowth: trends.length > 1 ? trends[trends.length - 1].change : 0
    };

    // 10. 감사 로그
    _saveAuditLog(session.loginId, 'ANALYTICS', 'TrendAnalysis', JSON.stringify(params), sessionId);

    return {
      success: true,
      data: {
        trends: trends,
        chartData: chartData,
        summary: summary
      }
    };

  } catch (e) {
    Logger.log('ERROR in getTrendAnalysis: ' + e.message);
    _saveAuditLog(session ? session.loginId : 'unknown', 'ERROR', 'TrendAnalysis', e.message, sessionId);
    return { success: false, error: e.message, errorKey: 'err_analytics_trend_failed' };
  }
}

// ==================== FUNNEL ANALYSIS ====================

/**
 * 깔때기 분석 - 단계별 전환율 (등록 → TOPIK → 대학 입학)
 * @param {string} sessionId - 세션 ID
 * @param {Object} params - 파라미터
 *   - startDate: "YYYY-MM-DD"
 *   - endDate: "YYYY-MM-DD"
 *   - agencyCodes: string[] (optional)
 * @returns {Object} { success: boolean, data: { funnel, chartData, insights }, error, errorKey }
 */
function getFunnelAnalysis(sessionId, params) {
  try {
    // 1. 세션 검증
    var session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 권한 검증
    if (session.role !== 'master' && session.role !== 'agency') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. 파라미터 검증
    if (!params || !params.startDate || !params.endDate) {
      return { success: false, errorKey: 'err_invalid_params' };
    }

    var startDate = new Date(params.startDate);
    var endDate = new Date(params.endDate);
    var agencyCodes = params.agencyCodes || [];

    // 5. 데이터 시트 읽기
    var students = _getAllRows(SHEETS.STUDENTS);
    var examResults = _getAllRows(SHEETS.EXAM_RESULTS);

    // 5.1 권한별 필터링
    if (session.role === 'agency') {
      students = students.filter(function(s) {
        return s.AgencyCode === session.agencyCode;
      });
    }

    // 5.2 유학원 필터 적용
    if (agencyCodes.length > 0) {
      students = students.filter(function(s) {
        return agencyCodes.indexOf(s.AgencyCode) >= 0;
      });
    }

    // 5.3 날짜 범위 필터 (EnrollmentDate)
    var enrolledStudents = students.filter(function(s) {
      if (!s.EnrollmentDate) return false;
      var enrollDate = new Date(s.EnrollmentDate);
      return enrollDate >= startDate && enrollDate <= endDate;
    });

    // 6. Stage 1: 등록
    var stage1Count = enrolledStudents.length;

    // 7. Stage 2: TOPIK 3급 이상
    var topikPassedStudentIds = {};
    for (var i = 0; i < examResults.length; i++) {
      var exam = examResults[i];
      var level = _topikLevelToNumber(exam.Level);
      if (level >= 3) {
        topikPassedStudentIds[exam.StudentID] = true;
      }
    }

    var stage2Students = enrolledStudents.filter(function(s) {
      return topikPassedStudentIds[s.StudentID];
    });
    var stage2Count = stage2Students.length;

    // 8. Stage 3: 대학 입학 (Status = "Graduated")
    var stage3Students = stage2Students.filter(function(s) {
      return s.Status === 'Graduated' || s.Status === 'graduated';
    });
    var stage3Count = stage3Students.length;

    // 9. 각 단계별 비율 및 전환율 계산
    var funnel = [];

    // Stage 1
    funnel.push({
      stage: 'enrollment',
      stageLabel: '등록',
      count: stage1Count,
      percentage: 100,
      conversionRate: 100,
      dropoffRate: 0,
      dropoffCount: 0
    });

    // Stage 2
    var stage2Percentage = stage1Count > 0 ? (stage2Count / stage1Count) * 100 : 0;
    var stage2ConversionRate = stage1Count > 0 ? (stage2Count / stage1Count) * 100 : 0;
    var stage2DropoffRate = 100 - stage2ConversionRate;
    var stage2DropoffCount = stage1Count - stage2Count;

    funnel.push({
      stage: 'topik_3plus',
      stageLabel: 'TOPIK 3급 이상',
      count: stage2Count,
      percentage: stage2Percentage,
      conversionRate: stage2ConversionRate,
      dropoffRate: stage2DropoffRate,
      dropoffCount: stage2DropoffCount
    });

    // Stage 3
    var stage3Percentage = stage1Count > 0 ? (stage3Count / stage1Count) * 100 : 0;
    var stage3ConversionRate = stage2Count > 0 ? (stage3Count / stage2Count) * 100 : 0;
    var stage3DropoffRate = 100 - stage3ConversionRate;
    var stage3DropoffCount = stage2Count - stage3Count;

    funnel.push({
      stage: 'university_admission',
      stageLabel: '대학 입학',
      count: stage3Count,
      percentage: stage3Percentage,
      conversionRate: stage3ConversionRate,
      dropoffRate: stage3DropoffRate,
      dropoffCount: stage3DropoffCount
    });

    // 10. Bottleneck 식별 (가장 낮은 전환율)
    var bottleneck = 'enrollment';
    var lowestConversionRate = 100;
    for (var i = 1; i < funnel.length; i++) {
      if (funnel[i].conversionRate < lowestConversionRate) {
        lowestConversionRate = funnel[i].conversionRate;
        bottleneck = funnel[i].stage;
      }
    }

    var overallConversion = stage1Count > 0 ? (stage3Count / stage1Count) * 100 : 0;

    // 11. Chart.js 데이터 생성
    var chartData = {
      labels: funnel.map(function(f) { return f.stageLabel; }),
      datasets: [{
        label: '학생 수',
        data: funnel.map(function(f) { return f.count; }),
        backgroundColor: ['#4285F4', '#FBBC04', '#34A853']
      }]
    };

    // 12. 감사 로그
    _saveAuditLog(session.loginId, 'ANALYTICS', 'FunnelAnalysis', JSON.stringify(params), sessionId);

    return {
      success: true,
      data: {
        funnel: funnel,
        chartData: chartData,
        insights: {
          bottleneck: bottleneck,
          overallConversion: overallConversion
        }
      }
    };

  } catch (e) {
    Logger.log('ERROR in getFunnelAnalysis: ' + e.message);
    _saveAuditLog(session ? session.loginId : 'unknown', 'ERROR', 'FunnelAnalysis', e.message, sessionId);
    return { success: false, error: e.message, errorKey: 'err_analytics_funnel_failed' };
  }
}

// ==================== CUSTOM REPORT ====================

/**
 * 사용자 정의 보고서 생성
 * @param {string} sessionId - 세션 ID
 * @param {Object} config - 설정
 *   - template: "weekly" | "monthly" | "custom"
 *   - filters: { agencyCodes, dateFrom, dateTo, includeCohort, includeTrend, includeFunnel, includeStudentList }
 *   - format: "html" | "pdf" | "excel"
 * @returns {Object} { success: boolean, data: { reportId, reportName, generatedAt, sections, downloadUrl }, error, errorKey }
 */
function generateCustomReport(sessionId, config) {
  try {
    // 1. 세션 검증
    var session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 권한 검증
    if (session.role !== 'master' && session.role !== 'agency') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. 파라미터 검증
    if (!config || !config.template) {
      return { success: false, errorKey: 'err_invalid_params' };
    }

    var template = config.template;  // "weekly" | "monthly" | "custom"
    var filters = config.filters || {};
    var format = config.format || 'html';

    // 5. template에 따라 기본 필터 설정
    var now = new Date();
    var dateFrom, dateTo;

    if (template === 'weekly') {
      // 최근 7일
      dateTo = now;
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filters.dateFrom = filters.dateFrom || _formatDate(dateFrom);
      filters.dateTo = filters.dateTo || _formatDate(dateTo);

    } else if (template === 'monthly') {
      // 최근 30일
      dateTo = now;
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filters.dateFrom = filters.dateFrom || _formatDate(dateFrom);
      filters.dateTo = filters.dateTo || _formatDate(dateTo);

    } else if (template === 'custom') {
      // 사용자 지정
      if (!filters.dateFrom || !filters.dateTo) {
        return { success: false, errorKey: 'err_invalid_date_range' };
      }
    }

    // 6. reportId 생성
    var timestamp = Utilities.formatDate(now, 'GMT+9', 'yyyyMMdd');
    var randomSuffix = Math.floor(Math.random() * 100000);
    var reportId = 'REPORT-' + timestamp + '-' + String(randomSuffix).padStart(5, '0');

    // 7. reportName 생성
    var reportName = '';
    if (template === 'weekly') {
      reportName = '주간 리포트 (' + filters.dateFrom + ' ~ ' + filters.dateTo + ')';
    } else if (template === 'monthly') {
      reportName = '월간 리포트 (' + filters.dateFrom + ' ~ ' + filters.dateTo + ')';
    } else {
      reportName = '사용자 정의 리포트 (' + filters.dateFrom + ' ~ ' + filters.dateTo + ')';
    }

    // 8. 포함할 섹션별로 API 호출
    var sections = [];

    // 8.1 Cohort 분석
    if (filters.includeCohort) {
      var cohortResult = getCohortAnalysis(sessionId, {
        cohortType: 'year',
        metric: 'topik_improvement',
        startYear: new Date(filters.dateFrom).getFullYear(),
        endYear: new Date(filters.dateTo).getFullYear(),
        agencyCodes: filters.agencyCodes
      });

      if (cohortResult.success) {
        sections.push({
          sectionType: 'cohort',
          sectionTitle: '코호트 분석',
          data: cohortResult.data
        });
      }
    }

    // 8.2 Trend 분석
    if (filters.includeTrend) {
      var trendResult = getTrendAnalysis(sessionId, {
        period: 'monthly',
        metric: 'new_students',
        startDate: filters.dateFrom,
        endDate: filters.dateTo,
        agencyCodes: filters.agencyCodes
      });

      if (trendResult.success) {
        sections.push({
          sectionType: 'trend',
          sectionTitle: '트렌드 분석',
          data: trendResult.data
        });
      }
    }

    // 8.3 Funnel 분석
    if (filters.includeFunnel) {
      var funnelResult = getFunnelAnalysis(sessionId, {
        startDate: filters.dateFrom,
        endDate: filters.dateTo,
        agencyCodes: filters.agencyCodes
      });

      if (funnelResult.success) {
        sections.push({
          sectionType: 'funnel',
          sectionTitle: '깔때기 분석',
          data: funnelResult.data
        });
      }
    }

    // 8.4 학생 목록
    if (filters.includeStudentList) {
      var studentResult = getStudentList(sessionId, {
        sortBy: 'EnrollmentDate',
        sortOrder: 'desc'
      });

      if (studentResult.success) {
        // 날짜 범위 필터 적용
        var filteredStudents = studentResult.data.filter(function(s) {
          if (!s.EnrollmentDate) return false;
          var enrollDate = new Date(s.EnrollmentDate);
          var from = new Date(filters.dateFrom);
          var to = new Date(filters.dateTo);
          return enrollDate >= from && enrollDate <= to;
        });

        sections.push({
          sectionType: 'studentList',
          sectionTitle: '학생 목록',
          data: filteredStudents
        });
      }
    }

    // 9. format에 따라 출력
    var downloadUrl = null;

    if (format === 'html') {
      // HTML 문자열 반환 (현재는 데이터만 반환, 실제 HTML 생성은 Frontend에서)
      // 추후 HtmlService로 템플릿 렌더링 가능

    } else if (format === 'pdf') {
      // PDF 생성 (Day 5-7에서 구현)
      // exportReportToPDF() 호출
      downloadUrl = 'PDF 생성은 Day 5-7에서 구현 예정';

    } else if (format === 'excel') {
      // CSV 생성 (BackupService 활용)
      downloadUrl = 'Excel 생성은 추후 구현 예정';
    }

    // 10. 감사 로그
    _saveAuditLog(session.loginId, 'ANALYTICS', 'CustomReport', reportId, sessionId);

    return {
      success: true,
      data: {
        reportId: reportId,
        reportName: reportName,
        generatedAt: now.toISOString(),
        sections: sections,
        downloadUrl: downloadUrl
      }
    };

  } catch (e) {
    Logger.log('ERROR in generateCustomReport: ' + e.message);
    _saveAuditLog(session ? session.loginId : 'unknown', 'ERROR', 'CustomReport', e.message, sessionId);
    return { success: false, error: e.message, errorKey: 'err_analytics_report_failed' };
  }
}

// ==================== PDF EXPORT ====================

/**
 * 보고서를 PDF로 변환 및 Google Drive 업로드
 * @param {string} sessionId - 세션 ID
 * @param {Object} reportData - 보고서 데이터
 *   - reportId: string
 *   - reportName: string
 *   - sections: array (generateCustomReport()의 sections)
 *   - logo: string (optional, Base64 이미지)
 * @returns {Object} { success: boolean, data: { fileId, fileName, fileUrl, fileSize }, error, errorKey }
 */
function exportReportToPDF(sessionId, reportData) {
  try {
    // 1. 세션 검증
    var session = _validateSession(sessionId);

    // 2. Rate Limiting
    checkRateLimit(session.userId);

    // 3. 권한 검증
    if (session.role !== 'master' && session.role !== 'agency') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 4. 파라미터 검증
    if (!reportData || !reportData.reportId || !reportData.reportName || !reportData.sections) {
      return { success: false, errorKey: 'err_invalid_params' };
    }

    var reportId = reportData.reportId;
    var reportName = reportData.reportName;
    var sections = reportData.sections;

    // 5. Google Docs 생성
    var doc = DocumentApp.create('Report-Temp-' + reportId);
    var body = doc.getBody();

    // 6. 헤더 추가
    var header = body.appendParagraph('AJU E&J 베트남 유학생 관리 시스템');
    header.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    header.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    body.appendParagraph(reportName)
      .setHeading(DocumentApp.ParagraphHeading.HEADING2)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    var now = new Date();
    var generatedAt = Utilities.formatDate(now, 'GMT+9', 'yyyy-MM-dd HH:mm:ss');
    body.appendParagraph('생성일시: ' + generatedAt)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    body.appendHorizontalRule();
    body.appendParagraph(''); // 빈 줄

    // 7. 섹션별 내용 렌더링
    for (var i = 0; i < sections.length; i++) {
      var section = sections[i];

      // 섹션 제목
      var sectionTitle = body.appendParagraph(section.sectionTitle);
      sectionTitle.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      body.appendParagraph(''); // 빈 줄

      // 섹션 타입별 렌더링
      if (section.sectionType === 'cohort') {
        _renderCohortSection(body, section.data);
      } else if (section.sectionType === 'trend') {
        _renderTrendSection(body, section.data);
      } else if (section.sectionType === 'funnel') {
        _renderFunnelSection(body, section.data);
      } else if (section.sectionType === 'studentList') {
        _renderStudentListSection(body, section.data);
      }

      body.appendParagraph(''); // 섹션 간 빈 줄
      body.appendHorizontalRule();
      body.appendParagraph(''); // 빈 줄
    }

    // 8. 푸터 추가
    body.appendParagraph(''); // 빈 줄
    var footer = body.appendParagraph('© 2024 AJU E&J. All rights reserved.');
    footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    footer.setItalic(true);

    // 9. PDF로 변환
    var docId = doc.getId();
    var pdfBlob = DriveApp.getFileById(docId).getAs('application/pdf');
    var fileName = reportId + '.pdf';
    pdfBlob.setName(fileName);

    // 10. Google Drive에 업로드
    var uploadResult = _uploadToDrive(pdfBlob, reportId);

    // 11. 임시 Google Docs 삭제
    DriveApp.getFileById(docId).setTrashed(true);

    // 12. 감사 로그
    _saveAuditLog(session.loginId, 'ANALYTICS', 'ExportPDF', reportId, sessionId);

    return {
      success: true,
      data: {
        fileId: uploadResult.fileId,
        fileName: fileName,
        fileUrl: uploadResult.fileUrl,
        fileSize: pdfBlob.getBytes().length
      }
    };

  } catch (e) {
    Logger.log('ERROR in exportReportToPDF: ' + e.message);
    _saveAuditLog(session ? session.loginId : 'unknown', 'ERROR', 'ExportPDF', e.message, sessionId);
    return { success: false, error: e.message, errorKey: 'err_analytics_pdf_failed' };
  }
}

/**
 * 코호트 섹션 렌더링
 */
function _renderCohortSection(body, cohortData) {
  if (!cohortData || !cohortData.cohorts) {
    body.appendParagraph('데이터 없음');
    return;
  }

  var cohorts = cohortData.cohorts;

  // 표 생성 (헤더 + 데이터)
  var table = body.appendTable();

  // 헤더 행
  var headerRow = table.appendTableRow();
  headerRow.appendTableCell('코호트');
  headerRow.appendTableCell('학생 수');
  headerRow.appendTableCell('지표 값');
  headerRow.appendTableCell('설명');

  // 헤더 스타일
  for (var i = 0; i < 4; i++) {
    var cell = headerRow.getCell(i);
    cell.setBackgroundColor('#4285F4');
    cell.getChild(0).asParagraph().setForegroundColor('#FFFFFF').setBold(true);
  }

  // 데이터 행
  for (var i = 0; i < cohorts.length; i++) {
    var cohort = cohorts[i];
    var dataRow = table.appendTableRow();
    dataRow.appendTableCell(cohort.cohortName || '-');
    dataRow.appendTableCell(String(cohort.studentCount || 0));
    dataRow.appendTableCell(cohort.metricValue ? cohort.metricValue.toFixed(2) : '0');
    dataRow.appendTableCell(cohort.metricLabel || '-');
  }

  // 표 스타일
  table.setBorderWidth(1);
  table.setBorderColor('#CCCCCC');
}

/**
 * 트렌드 섹션 렌더링
 */
function _renderTrendSection(body, trendData) {
  if (!trendData || !trendData.trends) {
    body.appendParagraph('데이터 없음');
    return;
  }

  var trends = trendData.trends;
  var summary = trendData.summary;

  // 요약 정보
  if (summary) {
    var summaryText = '평균: ' + summary.average.toFixed(2) +
                      ' | 최소: ' + summary.min +
                      ' | 최대: ' + summary.max +
                      ' | 총 성장률: ' + summary.totalGrowth.toFixed(2) + '%';
    var summaryPara = body.appendParagraph(summaryText);
    summaryPara.setItalic(true);
    body.appendParagraph(''); // 빈 줄
  }

  // 표 생성
  var table = body.appendTable();

  // 헤더 행
  var headerRow = table.appendTableRow();
  headerRow.appendTableCell('기간');
  headerRow.appendTableCell('값');
  headerRow.appendTableCell('변화율');

  // 헤더 스타일
  for (var i = 0; i < 3; i++) {
    var cell = headerRow.getCell(i);
    cell.setBackgroundColor('#FBBC04');
    cell.getChild(0).asParagraph().setForegroundColor('#FFFFFF').setBold(true);
  }

  // 데이터 행
  for (var i = 0; i < trends.length; i++) {
    var trend = trends[i];
    var dataRow = table.appendTableRow();
    dataRow.appendTableCell(trend.periodLabel || '-');
    dataRow.appendTableCell(trend.value ? trend.value.toFixed(2) : '0');
    dataRow.appendTableCell(trend.changeLabel || '-');
  }

  // 표 스타일
  table.setBorderWidth(1);
  table.setBorderColor('#CCCCCC');
}

/**
 * 깔때기 섹션 렌더링
 */
function _renderFunnelSection(body, funnelData) {
  if (!funnelData || !funnelData.funnel) {
    body.appendParagraph('데이터 없음');
    return;
  }

  var funnel = funnelData.funnel;
  var insights = funnelData.insights;

  // Insights
  if (insights) {
    var insightsText = '전체 전환율: ' + insights.overallConversion.toFixed(2) + '%' +
                       ' | Bottleneck: ' + _getStageLabelKR(insights.bottleneck);
    var insightsPara = body.appendParagraph(insightsText);
    insightsPara.setBold(true);
    insightsPara.setForegroundColor('#EA4335');
    body.appendParagraph(''); // 빈 줄
  }

  // 표 생성
  var table = body.appendTable();

  // 헤더 행
  var headerRow = table.appendTableRow();
  headerRow.appendTableCell('단계');
  headerRow.appendTableCell('학생 수');
  headerRow.appendTableCell('전환율');
  headerRow.appendTableCell('이탈률');
  headerRow.appendTableCell('이탈 학생 수');

  // 헤더 스타일
  for (var i = 0; i < 5; i++) {
    var cell = headerRow.getCell(i);
    cell.setBackgroundColor('#34A853');
    cell.getChild(0).asParagraph().setForegroundColor('#FFFFFF').setBold(true);
  }

  // 데이터 행
  for (var i = 0; i < funnel.length; i++) {
    var stage = funnel[i];
    var dataRow = table.appendTableRow();
    dataRow.appendTableCell(stage.stageLabel || '-');
    dataRow.appendTableCell(String(stage.count || 0));
    dataRow.appendTableCell(stage.conversionRate ? stage.conversionRate.toFixed(2) + '%' : '0%');
    dataRow.appendTableCell(stage.dropoffRate ? stage.dropoffRate.toFixed(2) + '%' : '0%');
    dataRow.appendTableCell(String(stage.dropoffCount || 0));
  }

  // 표 스타일
  table.setBorderWidth(1);
  table.setBorderColor('#CCCCCC');
}

/**
 * 학생 목록 섹션 렌더링
 */
function _renderStudentListSection(body, students) {
  if (!students || students.length === 0) {
    body.appendParagraph('데이터 없음');
    return;
  }

  // 최대 50명까지만 표시
  var displayStudents = students.slice(0, 50);
  if (students.length > 50) {
    body.appendParagraph('※ 총 ' + students.length + '명 중 최근 50명만 표시됩니다.');
    body.appendParagraph(''); // 빈 줄
  }

  // 표 생성
  var table = body.appendTable();

  // 헤더 행
  var headerRow = table.appendTableRow();
  headerRow.appendTableCell('학생 ID');
  headerRow.appendTableCell('이름 (한글)');
  headerRow.appendTableCell('이름 (베트남어)');
  headerRow.appendTableCell('유학원');
  headerRow.appendTableCell('등록일');

  // 헤더 스타일
  for (var i = 0; i < 5; i++) {
    var cell = headerRow.getCell(i);
    cell.setBackgroundColor('#AB47BC');
    cell.getChild(0).asParagraph().setForegroundColor('#FFFFFF').setBold(true);
  }

  // 데이터 행
  for (var i = 0; i < displayStudents.length; i++) {
    var student = displayStudents[i];
    var dataRow = table.appendTableRow();
    dataRow.appendTableCell(student.StudentID || '-');
    dataRow.appendTableCell(student.NameKR || '-');
    dataRow.appendTableCell(student.NameVN || '-');
    dataRow.appendTableCell(student.AgencyCode || '-');
    dataRow.appendTableCell(student.EnrollmentDate ? _formatDate(new Date(student.EnrollmentDate)) : '-');
  }

  // 표 스타일
  table.setBorderWidth(1);
  table.setBorderColor('#CCCCCC');
}

/**
 * Google Drive에 PDF 업로드 및 공유
 */
function _uploadToDrive(pdfBlob, reportId) {
  try {
    // Reports 폴더 생성 또는 가져오기
    var rootFolder = DriveApp.getRootFolder();
    var folders = rootFolder.getFoldersByName('Reports');
    var reportsFolder;

    if (folders.hasNext()) {
      reportsFolder = folders.next();
    } else {
      reportsFolder = rootFolder.createFolder('Reports');
    }

    // PDF 파일 업로드
    var file = reportsFolder.createFile(pdfBlob);

    // 공유 설정 (anyone with link, reader)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 파일 URL
    var fileUrl = file.getUrl();
    var fileId = file.getId();

    return {
      fileId: fileId,
      fileUrl: fileUrl
    };

  } catch (e) {
    Logger.log('ERROR in _uploadToDrive: ' + e.message);
    throw new Error('Drive upload failed: ' + e.message);
  }
}

/**
 * Stage 영문명을 한글로 변환
 */
function _getStageLabelKR(stage) {
  var labels = {
    'enrollment': '등록',
    'topik_3plus': 'TOPIK 3급 이상',
    'university_admission': '대학 입학'
  };
  return labels[stage] || stage;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * cohortType에 따라 학생 그룹핑
 */
function _groupByCohort(students, cohortType, startYear, endYear) {
  var cohorts = [];

  if (cohortType === 'year') {
    // 입학 연도별 그룹핑
    for (var year = startYear; year <= endYear; year++) {
      var cohortStudents = students.filter(function(s) {
        if (!s.EnrollmentDate) return false;
        var enrollYear = new Date(s.EnrollmentDate).getFullYear();
        return enrollYear === year;
      });

      cohorts.push({
        id: String(year),
        name: year + '년 입학생',
        students: cohortStudents
      });
    }

  } else if (cohortType === 'agency') {
    // 유학원별 그룹핑
    var agencyMap = {};
    for (var i = 0; i < students.length; i++) {
      var s = students[i];
      if (!s.AgencyCode) continue;

      if (!agencyMap[s.AgencyCode]) {
        agencyMap[s.AgencyCode] = {
          id: s.AgencyCode,
          name: _getAgencyName(s.AgencyCode),
          students: []
        };
      }
      agencyMap[s.AgencyCode].students.push(s);
    }

    for (var code in agencyMap) {
      cohorts.push(agencyMap[code]);
    }

  } else if (cohortType === 'custom') {
    // 사용자 정의 (추후 구현)
    cohorts.push({
      id: 'Custom-1',
      name: '사용자 정의 그룹',
      students: students
    });
  }

  return cohorts;
}

/**
 * TOPIK 평균 향상도 계산
 */
function _calculateTOPIKImprovement(students, examResults) {
  var improvements = [];
  var breakdown = [];

  for (var i = 0; i < students.length; i++) {
    var studentId = students[i].StudentID;
    var studentExams = examResults.filter(function(e) {
      return e.StudentID === studentId;
    });

    if (studentExams.length < 2) continue;

    // 날짜순 정렬
    studentExams.sort(function(a, b) {
      return new Date(a.ExamDate) - new Date(b.ExamDate);
    });

    var firstLevel = _topikLevelToNumber(studentExams[0].Level);
    var lastLevel = _topikLevelToNumber(studentExams[studentExams.length - 1].Level);
    var improvement = lastLevel - firstLevel;

    improvements.push(improvement);
    breakdown.push({
      label: students[i].NameKR || students[i].StudentID,
      value: improvement
    });
  }

  var average = improvements.length > 0 ? _calculateAverage(improvements) : 0;

  return {
    average: average,
    breakdown: breakdown
  };
}

/**
 * 목표 대학 변경 횟수 계산
 */
function _calculateTargetChanges(students, targetHistory) {
  var changes = [];
  var breakdown = [];

  for (var i = 0; i < students.length; i++) {
    var studentId = students[i].StudentID;
    var studentHistory = targetHistory.filter(function(h) {
      return h.StudentID === studentId;
    });

    var changeCount = studentHistory.length;
    changes.push(changeCount);
    breakdown.push({
      label: students[i].NameKR || students[i].StudentID,
      value: changeCount
    });
  }

  var average = changes.length > 0 ? _calculateAverage(changes) : 0;

  return {
    average: average,
    breakdown: breakdown
  };
}

/**
 * 상담 횟수 계산
 */
function _calculateConsultCounts(students, consultations) {
  var counts = [];
  var breakdown = [];

  for (var i = 0; i < students.length; i++) {
    var studentId = students[i].StudentID;
    var studentConsults = consultations.filter(function(c) {
      return c.StudentID === studentId;
    });

    var count = studentConsults.length;
    counts.push(count);
    breakdown.push({
      label: students[i].NameKR || students[i].StudentID,
      value: count
    });
  }

  var average = counts.length > 0 ? _calculateAverage(counts) : 0;

  return {
    average: average,
    breakdown: breakdown
  };
}

/**
 * period에 따라 기간 분할
 */
function _generatePeriods(period, startDate, endDate) {
  var periods = [];

  if (period === 'monthly') {
    // 월별
    var current = new Date(startDate);
    while (current <= endDate) {
      var year = current.getFullYear();
      var month = current.getMonth() + 1;
      var periodId = year + '-' + (month < 10 ? '0' + month : month);
      var periodLabel = year + '년 ' + month + '월';

      var periodStart = new Date(year, month - 1, 1);
      var periodEnd = new Date(year, month, 0, 23, 59, 59);

      periods.push({
        id: periodId,
        label: periodLabel,
        startDate: periodStart,
        endDate: periodEnd
      });

      current.setMonth(current.getMonth() + 1);
    }

  } else if (period === 'quarterly') {
    // 분기별
    var current = new Date(startDate);
    while (current <= endDate) {
      var year = current.getFullYear();
      var quarter = Math.floor(current.getMonth() / 3) + 1;
      var periodId = year + '-Q' + quarter;
      var periodLabel = year + '년 ' + quarter + '분기';

      var qStartMonth = (quarter - 1) * 3;
      var qEndMonth = qStartMonth + 2;
      var periodStart = new Date(year, qStartMonth, 1);
      var periodEnd = new Date(year, qEndMonth + 1, 0, 23, 59, 59);

      periods.push({
        id: periodId,
        label: periodLabel,
        startDate: periodStart,
        endDate: periodEnd
      });

      current.setMonth(current.getMonth() + 3);
    }

  } else if (period === 'yearly') {
    // 연도별
    var startYear = startDate.getFullYear();
    var endYear = endDate.getFullYear();
    for (var year = startYear; year <= endYear; year++) {
      var periodId = String(year);
      var periodLabel = year + '년';
      var periodStart = new Date(year, 0, 1);
      var periodEnd = new Date(year, 11, 31, 23, 59, 59);

      periods.push({
        id: periodId,
        label: periodLabel,
        startDate: periodStart,
        endDate: periodEnd
      });
    }
  }

  return periods;
}

/**
 * 신규 학생 수 계산
 */
function _countNewStudents(students, startDate, endDate) {
  var count = 0;
  for (var i = 0; i < students.length; i++) {
    if (!students[i].EnrollmentDate) continue;
    var enrollDate = new Date(students[i].EnrollmentDate);
    if (enrollDate >= startDate && enrollDate <= endDate) {
      count++;
    }
  }
  return count;
}

/**
 * TOPIK 합격률 계산 (Level >= 3)
 */
function _calculateTOPIKPassRate(students, examResults, startDate, endDate) {
  var totalExams = 0;
  var passedExams = 0;

  for (var i = 0; i < students.length; i++) {
    var studentId = students[i].StudentID;
    var studentExams = examResults.filter(function(e) {
      if (e.StudentID !== studentId) return false;
      if (!e.ExamDate) return false;
      var examDate = new Date(e.ExamDate);
      return examDate >= startDate && examDate <= endDate;
    });

    for (var j = 0; j < studentExams.length; j++) {
      totalExams++;
      var level = _topikLevelToNumber(studentExams[j].Level);
      if (level >= 3) {
        passedExams++;
      }
    }
  }

  return totalExams > 0 ? (passedExams / totalExams) * 100 : 0;
}

/**
 * 상담 빈도 계산
 */
function _countConsultations(consultations, startDate, endDate) {
  var count = 0;
  for (var i = 0; i < consultations.length; i++) {
    if (!consultations[i].ConsultDate) continue;
    var consultDate = new Date(consultations[i].ConsultDate);
    if (consultDate >= startDate && consultDate <= endDate) {
      count++;
    }
  }
  return count;
}

/**
 * TOPIK 레벨 문자열을 숫자로 변환
 */
function _topikLevelToNumber(level) {
  if (!level) return 0;
  var levelStr = String(level).toUpperCase();
  if (levelStr.indexOf('1') >= 0) return 1;
  if (levelStr.indexOf('2') >= 0) return 2;
  if (levelStr.indexOf('3') >= 0) return 3;
  if (levelStr.indexOf('4') >= 0) return 4;
  if (levelStr.indexOf('5') >= 0) return 5;
  if (levelStr.indexOf('6') >= 0) return 6;
  return 0;
}

/**
 * 유학원 이름 가져오기
 */
function _getAgencyName(agencyCode) {
  try {
    var agencies = _getAllRows(SHEETS.AGENCIES);
    for (var i = 0; i < agencies.length; i++) {
      if (agencies[i].AgencyCode === agencyCode) {
        return agencies[i].NameKR || agencyCode;
      }
    }
    return agencyCode;
  } catch (e) {
    return agencyCode;
  }
}

/**
 * metric에 따라 라벨 반환
 */
function _getMetricLabel(metric) {
  var labels = {
    'new_students': '신규 학생 수',
    'topik_pass_rate': 'TOPIK 합격률 (%)',
    'consult_frequency': '상담 횟수'
  };
  return labels[metric] || metric;
}

/**
 * 평균 계산
 */
function _calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  var sum = 0;
  for (var i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum / numbers.length;
}

/**
 * 차트 색상 배열 생성
 */
function _generateColors(count) {
  var colors = [
    '#4285F4', '#EA4335', '#FBBC04', '#34A853', '#FF6D00',
    '#AB47BC', '#00ACC1', '#7CB342', '#FB8C00', '#5E35B1'
  ];

  var result = [];
  for (var i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
function _formatDate(date) {
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  return year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day);
}

// ==================== UNIT TESTS ====================

/**
 * Unit Test: getCohortAnalysis()
 */
function testCohortAnalysis() {
  Logger.log('========================================');
  Logger.log('TEST: getCohortAnalysis()');
  Logger.log('========================================');

  try {
    // Test 1: Year 기반 코호트 분석
    Logger.log('\n[Test 1] Year-based Cohort Analysis');
    var sessionId = CacheService.getScriptCache().get('test_session_id'); // 테스트용 세션 ID 필요
    if (!sessionId) {
      Logger.log('⚠️  Test session not found. Please login first.');
      return;
    }

    var result1 = getCohortAnalysis(sessionId, {
      cohortType: 'year',
      metric: 'topik_improvement',
      startYear: 2024,
      endYear: 2026
    });

    Logger.log('Result 1:');
    Logger.log(JSON.stringify(result1, null, 2));

    if (result1.success) {
      Logger.log('✅ Test 1 PASSED');
      Logger.log('Cohorts found: ' + result1.data.cohorts.length);
    } else {
      Logger.log('❌ Test 1 FAILED: ' + result1.errorKey);
    }

    // Test 2: Agency 기반 코호트 분석
    Logger.log('\n[Test 2] Agency-based Cohort Analysis');
    var result2 = getCohortAnalysis(sessionId, {
      cohortType: 'agency',
      metric: 'consult_count',
      startYear: 2024,
      endYear: 2026
    });

    Logger.log('Result 2:');
    Logger.log(JSON.stringify(result2, null, 2));

    if (result2.success) {
      Logger.log('✅ Test 2 PASSED');
    } else {
      Logger.log('❌ Test 2 FAILED: ' + result2.errorKey);
    }

    Logger.log('\n========================================');
    Logger.log('TEST COMPLETED: getCohortAnalysis()');
    Logger.log('========================================');

  } catch (e) {
    Logger.log('❌ TEST ERROR: ' + e.message);
  }
}

/**
 * Unit Test: getTrendAnalysis()
 */
function testTrendAnalysis() {
  Logger.log('========================================');
  Logger.log('TEST: getTrendAnalysis()');
  Logger.log('========================================');

  try {
    var sessionId = CacheService.getScriptCache().get('test_session_id');
    if (!sessionId) {
      Logger.log('⚠️  Test session not found. Please login first.');
      return;
    }

    // Test 1: 월별 신규 학생 트렌드
    Logger.log('\n[Test 1] Monthly New Students Trend');
    var result1 = getTrendAnalysis(sessionId, {
      period: 'monthly',
      metric: 'new_students',
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });

    Logger.log('Result 1:');
    Logger.log(JSON.stringify(result1, null, 2));

    if (result1.success) {
      Logger.log('✅ Test 1 PASSED');
      Logger.log('Trends found: ' + result1.data.trends.length);
      Logger.log('Summary: ' + JSON.stringify(result1.data.summary));
    } else {
      Logger.log('❌ Test 1 FAILED: ' + result1.errorKey);
    }

    // Test 2: 분기별 TOPIK 합격률
    Logger.log('\n[Test 2] Quarterly TOPIK Pass Rate');
    var result2 = getTrendAnalysis(sessionId, {
      period: 'quarterly',
      metric: 'topik_pass_rate',
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });

    Logger.log('Result 2:');
    Logger.log(JSON.stringify(result2, null, 2));

    if (result2.success) {
      Logger.log('✅ Test 2 PASSED');
    } else {
      Logger.log('❌ Test 2 FAILED: ' + result2.errorKey);
    }

    Logger.log('\n========================================');
    Logger.log('TEST COMPLETED: getTrendAnalysis()');
    Logger.log('========================================');

  } catch (e) {
    Logger.log('❌ TEST ERROR: ' + e.message);
  }
}

/**
 * Unit Test: getFunnelAnalysis()
 */
function testFunnelAnalysis() {
  Logger.log('========================================');
  Logger.log('TEST: getFunnelAnalysis()');
  Logger.log('========================================');

  try {
    var sessionId = CacheService.getScriptCache().get('test_session_id');
    if (!sessionId) {
      Logger.log('⚠️  Test session not found. Please login first.');
      return;
    }

    // Test 1: 2024년 전체 깔때기 분석
    Logger.log('\n[Test 1] Full Year 2024 Funnel Analysis');
    var result1 = getFunnelAnalysis(sessionId, {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });

    Logger.log('Result 1:');
    Logger.log(JSON.stringify(result1, null, 2));

    if (result1.success) {
      Logger.log('✅ Test 1 PASSED');
      Logger.log('Funnel stages: ' + result1.data.funnel.length);
      Logger.log('Overall conversion: ' + result1.data.insights.overallConversion.toFixed(2) + '%');
      Logger.log('Bottleneck: ' + result1.data.insights.bottleneck);

      // 각 단계별 상세 정보
      for (var i = 0; i < result1.data.funnel.length; i++) {
        var stage = result1.data.funnel[i];
        Logger.log('\n  Stage ' + (i + 1) + ': ' + stage.stageLabel);
        Logger.log('    Count: ' + stage.count);
        Logger.log('    Percentage: ' + stage.percentage.toFixed(2) + '%');
        Logger.log('    Conversion Rate: ' + stage.conversionRate.toFixed(2) + '%');
        Logger.log('    Dropoff Rate: ' + stage.dropoffRate.toFixed(2) + '%');
        Logger.log('    Dropoff Count: ' + stage.dropoffCount);
      }
    } else {
      Logger.log('❌ Test 1 FAILED: ' + result1.errorKey);
    }

    // Test 2: 특정 유학원 깔때기 분석
    Logger.log('\n[Test 2] Specific Agency Funnel Analysis');
    var result2 = getFunnelAnalysis(sessionId, {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      agencyCodes: ['HANOI']
    });

    Logger.log('Result 2:');
    Logger.log(JSON.stringify(result2, null, 2));

    if (result2.success) {
      Logger.log('✅ Test 2 PASSED');
      Logger.log('Overall conversion: ' + result2.data.insights.overallConversion.toFixed(2) + '%');
    } else {
      Logger.log('❌ Test 2 FAILED: ' + result2.errorKey);
    }

    Logger.log('\n========================================');
    Logger.log('TEST COMPLETED: getFunnelAnalysis()');
    Logger.log('========================================');

  } catch (e) {
    Logger.log('❌ TEST ERROR: ' + e.message);
  }
}

/**
 * Unit Test: generateCustomReport()
 */
function testCustomReport() {
  Logger.log('========================================');
  Logger.log('TEST: generateCustomReport()');
  Logger.log('========================================');

  try {
    var sessionId = CacheService.getScriptCache().get('test_session_id');
    if (!sessionId) {
      Logger.log('⚠️  Test session not found. Please login first.');
      return;
    }

    // Test 1: 주간 리포트 (HTML)
    Logger.log('\n[Test 1] Weekly Report (HTML)');
    var result1 = generateCustomReport(sessionId, {
      template: 'weekly',
      filters: {
        includeCohort: true,
        includeTrend: true,
        includeFunnel: true
      },
      format: 'html'
    });

    Logger.log('Result 1:');
    Logger.log(JSON.stringify(result1, null, 2));

    if (result1.success) {
      Logger.log('✅ Test 1 PASSED');
      Logger.log('Report ID: ' + result1.data.reportId);
      Logger.log('Report Name: ' + result1.data.reportName);
      Logger.log('Sections: ' + result1.data.sections.length);

      for (var i = 0; i < result1.data.sections.length; i++) {
        var section = result1.data.sections[i];
        Logger.log('  - ' + section.sectionTitle + ' (' + section.sectionType + ')');
      }
    } else {
      Logger.log('❌ Test 1 FAILED: ' + result1.errorKey);
    }

    // Test 2: 월간 리포트 (모든 섹션 포함)
    Logger.log('\n[Test 2] Monthly Report (All Sections)');
    var result2 = generateCustomReport(sessionId, {
      template: 'monthly',
      filters: {
        includeCohort: true,
        includeTrend: true,
        includeFunnel: true,
        includeStudentList: true
      },
      format: 'html'
    });

    Logger.log('Result 2:');
    Logger.log(JSON.stringify(result2, null, 2));

    if (result2.success) {
      Logger.log('✅ Test 2 PASSED');
      Logger.log('Sections: ' + result2.data.sections.length);
    } else {
      Logger.log('❌ Test 2 FAILED: ' + result2.errorKey);
    }

    // Test 3: 사용자 정의 리포트
    Logger.log('\n[Test 3] Custom Report (Specific Date Range)');
    var result3 = generateCustomReport(sessionId, {
      template: 'custom',
      filters: {
        dateFrom: '2024-06-01',
        dateTo: '2024-08-31',
        includeCohort: true,
        includeTrend: true
      },
      format: 'html'
    });

    Logger.log('Result 3:');
    Logger.log(JSON.stringify(result3, null, 2));

    if (result3.success) {
      Logger.log('✅ Test 3 PASSED');
      Logger.log('Report Name: ' + result3.data.reportName);
    } else {
      Logger.log('❌ Test 3 FAILED: ' + result3.errorKey);
    }

    Logger.log('\n========================================');
    Logger.log('TEST COMPLETED: generateCustomReport()');
    Logger.log('========================================');

  } catch (e) {
    Logger.log('❌ TEST ERROR: ' + e.message);
  }
}

/**
 * Unit Test: exportReportToPDF()
 */
function testExportReportToPDF() {
  Logger.log('========================================');
  Logger.log('TEST: exportReportToPDF()');
  Logger.log('========================================');

  try {
    var sessionId = CacheService.getScriptCache().get('test_session_id');
    if (!sessionId) {
      Logger.log('⚠️  Test session not found. Please login first.');
      return;
    }

    // Test 1: 주간 리포트 PDF 생성
    Logger.log('\n[Test 1] Weekly Report PDF Export');

    // Step 1: 리포트 데이터 생성
    var reportResult = generateCustomReport(sessionId, {
      template: 'weekly',
      filters: {
        includeCohort: true,
        includeTrend: true,
        includeFunnel: true
      },
      format: 'html'
    });

    if (!reportResult.success) {
      Logger.log('❌ Failed to generate report: ' + reportResult.errorKey);
      return;
    }

    Logger.log('✓ Report generated: ' + reportResult.data.reportId);

    // Step 2: PDF로 변환 및 업로드
    var pdfResult = exportReportToPDF(sessionId, reportResult.data);

    Logger.log('Result:');
    Logger.log(JSON.stringify(pdfResult, null, 2));

    if (pdfResult.success) {
      Logger.log('✅ Test 1 PASSED');
      Logger.log('File ID: ' + pdfResult.data.fileId);
      Logger.log('File Name: ' + pdfResult.data.fileName);
      Logger.log('File URL: ' + pdfResult.data.fileUrl);
      Logger.log('File Size: ' + (pdfResult.data.fileSize / 1024).toFixed(2) + ' KB');
    } else {
      Logger.log('❌ Test 1 FAILED: ' + pdfResult.errorKey);
    }

    // Test 2: 월간 리포트 PDF (모든 섹션)
    Logger.log('\n[Test 2] Monthly Report PDF (All Sections)');

    var reportResult2 = generateCustomReport(sessionId, {
      template: 'monthly',
      filters: {
        includeCohort: true,
        includeTrend: true,
        includeFunnel: true,
        includeStudentList: true
      },
      format: 'html'
    });

    if (!reportResult2.success) {
      Logger.log('❌ Failed to generate report: ' + reportResult2.errorKey);
      return;
    }

    Logger.log('✓ Report generated: ' + reportResult2.data.reportId);

    var pdfResult2 = exportReportToPDF(sessionId, reportResult2.data);

    Logger.log('Result 2:');
    Logger.log(JSON.stringify(pdfResult2, null, 2));

    if (pdfResult2.success) {
      Logger.log('✅ Test 2 PASSED');
      Logger.log('File URL: ' + pdfResult2.data.fileUrl);
      Logger.log('File Size: ' + (pdfResult2.data.fileSize / 1024).toFixed(2) + ' KB');
    } else {
      Logger.log('❌ Test 2 FAILED: ' + pdfResult2.errorKey);
    }

    // Test 3: 사용자 정의 리포트 PDF
    Logger.log('\n[Test 3] Custom Report PDF (Specific Date Range)');

    var reportResult3 = generateCustomReport(sessionId, {
      template: 'custom',
      filters: {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        includeCohort: true,
        includeTrend: true,
        includeFunnel: true
      },
      format: 'html'
    });

    if (!reportResult3.success) {
      Logger.log('❌ Failed to generate report: ' + reportResult3.errorKey);
      return;
    }

    Logger.log('✓ Report generated: ' + reportResult3.data.reportId);

    var pdfResult3 = exportReportToPDF(sessionId, reportResult3.data);

    Logger.log('Result 3:');
    Logger.log(JSON.stringify(pdfResult3, null, 2));

    if (pdfResult3.success) {
      Logger.log('✅ Test 3 PASSED');
      Logger.log('Report Name: ' + reportResult3.data.reportName);
      Logger.log('PDF URL: ' + pdfResult3.data.fileUrl);

      // Google Drive에서 확인 가능
      Logger.log('\n📁 Google Drive에서 확인:');
      Logger.log('   Reports 폴더 > ' + pdfResult3.data.fileName);
    } else {
      Logger.log('❌ Test 3 FAILED: ' + pdfResult3.errorKey);
    }

    Logger.log('\n========================================');
    Logger.log('TEST COMPLETED: exportReportToPDF()');
    Logger.log('========================================');
    Logger.log('\n💡 Tip: Google Drive "Reports" 폴더에서 생성된 PDF를 확인할 수 있습니다.');

  } catch (e) {
    Logger.log('❌ TEST ERROR: ' + e.message);
    Logger.log(e.stack);
  }
}

/**
 * 전체 Analytics 기능 통합 테스트
 */
function testAllAnalytics() {
  Logger.log('========================================');
  Logger.log('FULL INTEGRATION TEST: Analytics');
  Logger.log('========================================');

  try {
    // 1. Cohort Analysis
    Logger.log('\n[1/5] Testing Cohort Analysis...');
    testCohortAnalysis();

    // 2. Trend Analysis
    Logger.log('\n[2/5] Testing Trend Analysis...');
    testTrendAnalysis();

    // 3. Funnel Analysis
    Logger.log('\n[3/5] Testing Funnel Analysis...');
    testFunnelAnalysis();

    // 4. Custom Report
    Logger.log('\n[4/5] Testing Custom Report...');
    testCustomReport();

    // 5. PDF Export
    Logger.log('\n[5/5] Testing PDF Export...');
    testExportReportToPDF();

    Logger.log('\n========================================');
    Logger.log('✅ ALL TESTS COMPLETED!');
    Logger.log('========================================');

  } catch (e) {
    Logger.log('❌ INTEGRATION TEST ERROR: ' + e.message);
  }
}

// ============================================
// PERFORMANCE TESTS
// ============================================

/**
 * 성능 테스트 - 대용량 데이터 (1000명 학생)
 *
 * 목표:
 * - 각 API 응답 시간 < 3초
 * - 메모리 사용량 모니터링
 * - 에러 발생 여부 확인
 *
 * 사용법:
 * 1. Students 시트에 1000명 데이터 준비
 * 2. GAS 에디터에서 이 함수 실행
 * 3. 로그에서 성능 결과 확인
 */
function performanceTestAnalytics() {
  Logger.log('========================================');
  Logger.log('PERFORMANCE TEST - Analytics APIs');
  Logger.log('========================================');
  Logger.log('Target: 1000 students, < 3s per API');
  Logger.log('========================================\n');

  try {
    // 테스트 세션 생성 (MASTER 권한)
    const sessionId = 'test-perf-session-' + new Date().getTime();
    const cache = CacheService.getScriptCache();
    cache.put(
      sessionId,
      JSON.stringify({ username: 'MASTER', role: 'master', agencyCode: 'MASTER' }),
      1800
    );

    // 학생 수 확인
    const studentsSheet = _getSheet(SHEETS.STUDENTS);
    const studentCount = studentsSheet.getLastRow() - 1;
    Logger.log('📊 Total Students: ' + studentCount);

    if (studentCount < 100) {
      Logger.log('⚠️ WARNING: Only ' + studentCount + ' students found.');
      Logger.log('   For accurate performance testing, recommend 1000+ students.');
    }

    Logger.log('');

    // === Test 1: Cohort Analysis ===
    Logger.log('[1/5] Testing Cohort Analysis...');
    const cohortStart = new Date().getTime();

    const cohortFilters = {
      cohortType: 'year',
      metric: 'topik_improvement',
      startYear: 2024,
      endYear: 2026
    };

    const cohortResult = getCohortAnalysis(sessionId, cohortFilters);
    const cohortTime = (new Date().getTime() - cohortStart) / 1000;

    if (cohortResult.success) {
      Logger.log('  ✅ Success | Time: ' + cohortTime.toFixed(2) + 's');
      Logger.log('  📊 Cohorts: ' + cohortResult.data.cohorts.length);
    } else {
      Logger.log('  ❌ Failed: ' + cohortResult.error);
    }

    // === Test 2: Trend Analysis ===
    Logger.log('\n[2/5] Testing Trend Analysis...');
    const trendStart = new Date().getTime();

    const trendParams = {
      metric: 'new_students',
      period: 'monthly',
      startDate: '2024-01-01',
      endDate: '2026-12-31',
      agencyCode: null
    };

    const trendResult = getTrendAnalysis(sessionId, trendParams);
    const trendTime = (new Date().getTime() - trendStart) / 1000;

    if (trendResult.success) {
      Logger.log('  ✅ Success | Time: ' + trendTime.toFixed(2) + 's');
      Logger.log('  📊 Data Points: ' + trendResult.data.dataPoints.length);
    } else {
      Logger.log('  ❌ Failed: ' + trendResult.error);
    }

    // === Test 3: Funnel Analysis ===
    Logger.log('\n[3/5] Testing Funnel Analysis...');
    const funnelStart = new Date().getTime();

    const funnelParams = {
      year: 2025,
      agencyCode: null
    };

    const funnelResult = getFunnelAnalysis(sessionId, funnelParams);
    const funnelTime = (new Date().getTime() - funnelStart) / 1000;

    if (funnelResult.success) {
      Logger.log('  ✅ Success | Time: ' + funnelTime.toFixed(2) + 's');
      Logger.log('  📊 Total: ' + funnelResult.data.funnel.stage1.count + ' students');
    } else {
      Logger.log('  ❌ Failed: ' + funnelResult.error);
    }

    // === Test 4: Custom Report ===
    Logger.log('\n[4/5] Testing Custom Report...');
    const reportStart = new Date().getTime();

    const reportConfig = {
      template: 'monthly',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      includeDetails: true
    };

    const reportResult = generateCustomReport(sessionId, reportConfig);
    const reportTime = (new Date().getTime() - reportStart) / 1000;

    if (reportResult.success) {
      Logger.log('  ✅ Success | Time: ' + reportTime.toFixed(2) + 's');
      Logger.log('  📊 Sections: ' + (reportResult.data.sections ? reportResult.data.sections.length : 0));
    } else {
      Logger.log('  ❌ Failed: ' + reportResult.error);
    }

    // === Test 5: PDF Export ===
    Logger.log('\n[5/5] Testing PDF Export...');
    const pdfStart = new Date().getTime();

    // PDF 테스트용 간단한 리포트 데이터
    const pdfReportData = {
      title: 'Performance Test Report',
      generatedAt: new Date().toISOString(),
      sections: ['cohort', 'trend'],
      cohortData: cohortResult.success ? cohortResult.data : null,
      trendData: trendResult.success ? trendResult.data : null
    };

    const pdfResult = exportReportToPDF(sessionId, pdfReportData);
    const pdfTime = (new Date().getTime() - pdfStart) / 1000;

    if (pdfResult.success) {
      Logger.log('  ✅ Success | Time: ' + pdfTime.toFixed(2) + 's');
      Logger.log('  📄 PDF URL: ' + pdfResult.data.url);
    } else {
      Logger.log('  ❌ Failed: ' + pdfResult.error);
    }

    // === Summary ===
    Logger.log('\n========================================');
    Logger.log('PERFORMANCE TEST SUMMARY');
    Logger.log('========================================');
    Logger.log('Students: ' + studentCount);
    Logger.log('');
    Logger.log('Response Times:');
    Logger.log('  Cohort Analysis:  ' + cohortTime.toFixed(2) + 's ' + (cohortTime < 3 ? '✅' : '❌'));
    Logger.log('  Trend Analysis:   ' + trendTime.toFixed(2) + 's ' + (trendTime < 3 ? '✅' : '❌'));
    Logger.log('  Funnel Analysis:  ' + funnelTime.toFixed(2) + 's ' + (funnelTime < 3 ? '✅' : '❌'));
    Logger.log('  Custom Report:    ' + reportTime.toFixed(2) + 's ' + (reportTime < 3 ? '✅' : '❌'));
    Logger.log('  PDF Export:       ' + pdfTime.toFixed(2) + 's ' + (pdfTime < 5 ? '✅' : '❌'));
    Logger.log('');

    const totalTime = cohortTime + trendTime + funnelTime + reportTime + pdfTime;
    Logger.log('Total Time: ' + totalTime.toFixed(2) + 's');
    Logger.log('Average Time: ' + (totalTime / 5).toFixed(2) + 's');
    Logger.log('');

    const allPassed = cohortTime < 3 && trendTime < 3 && funnelTime < 3 && reportTime < 3 && pdfTime < 5;
    if (allPassed) {
      Logger.log('✅ ALL PERFORMANCE TESTS PASSED!');
    } else {
      Logger.log('⚠️ SOME TESTS EXCEEDED TARGET TIME');
    }

    Logger.log('========================================');

    return { success: true, totalTime: totalTime, average: totalTime / 5 };

  } catch (e) {
    Logger.log('❌ PERFORMANCE TEST ERROR: ' + e.message);
    Logger.log(e.stack);
    return { success: false, error: e.message };
  }
}
