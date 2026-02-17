/**
 * Code.gs - 진입점
 * GAS 웹앱 메인 파일
 *
 * SPA 패턴:
 * - doGet()은 항상 Login.html을 반환
 * - Login.html이 SPA 컨테이너 역할
 * - 로그인 성공 시 클라이언트에서 Index 뷰로 전환
 * - 세션 토큰은 클라이언트 JS 변수에 보관
 */

/**
 * API 연결 테스트 (진단용)
 * 시트 접근 없이 단순 객체 반환 - 프론트-백엔드 연결 확인
 * @returns {Object} { success: true, message: string }
 */
function testApiConnection() {
  return { success: true, message: 'API connected', timestamp: new Date().toISOString() };
}

/**
 * 초간단 테스트 (진단용)
 * 아무것도 안 하고 바로 반환
 */
function testSimple() {
  return { test: 'success', number: 123 };
}

/**
 * 학생 데이터 직접 반환 (시트 접근 없이)
 */
function testStudentDataDirect() {
  return {
    success: true,
    data: [
      { StudentID: 1, NameKR: '테스트1' },
      { StudentID: 2, NameKR: '테스트2' }
    ]
  };
}

/**
 * 웹앱 진입점 - Login.html 반환 (SPA 진입점)
 * @param {Object} e - 요청 파라미터
 * @returns {HtmlOutput} HTML 페이지
 */
function doGet(e) {
  // Login.html 반환 (SPA 컨테이너)
  // 로그인 성공 시 클라이언트에서 Index 뷰로 전환
  return HtmlService.createTemplateFromFile('Login')
    .evaluate()
    .setTitle('AJU E&J 학생관리 시스템')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * HTML 파일 include 헬퍼
 * @param {string} filename - 파일명 (확장자 제외)
 * @returns {string} HTML 내용
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Index.html 콘텐츠 가져오기 (SPA 뷰 전환용)
 * @returns {string} Index.html의 body 콘텐츠
 */
function getIndexContent() {
  return HtmlService.createHtmlOutputFromFile('Index').getContent();
}

/**
 * Analytics.html 콘텐츠 가져오기 (분석 대시보드)
 * @returns {string} Analytics.html의 body 콘텐츠
 */
function getAnalyticsContent() {
  return HtmlService.createHtmlOutputFromFile('Analytics').getContent();
}

/**
 * Analytics 페이지 직접 열기 (독립 페이지)
 * @param {Object} e - 요청 파라미터 (e.parameter.sessionId)
 * @returns {HtmlOutput} Analytics HTML 페이지
 */
function openAnalytics(e) {
  var template = HtmlService.createTemplateFromFile('Analytics');

  // URL 파라미터로 sessionId 전달받기
  if (e && e.parameter && e.parameter.sessionId) {
    template.sessionId = e.parameter.sessionId;
  }

  return template.evaluate()
    .setTitle('AJU E&J - Analytics Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Calendar.html 콘텐츠 가져오기 (일정 관리)
 * @returns {string} Calendar.html의 body 콘텐츠
 */
function getCalendarContent() {
  return HtmlService.createHtmlOutputFromFile('Calendar').getContent();
}

/**
 * Calendar 페이지 직접 열기 (독립 페이지)
 * @param {Object} e - 요청 파라미터 (e.parameter.sessionId)
 * @returns {HtmlOutput} Calendar HTML 페이지
 */
function openCalendar(e) {
  var template = HtmlService.createTemplateFromFile('Calendar');

  // URL 파라미터로 sessionId 전달받기
  if (e && e.parameter && e.parameter.sessionId) {
    template.sessionId = e.parameter.sessionId;
  }

  return template.evaluate()
    .setTitle('AJU E&J - 일정 관리')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * FileManager.html 콘텐츠 가져오기 (파일 관리)
 * @returns {string} FileManager.html의 body 콘텐츠
 */
function getFileManagerContent() {
  return HtmlService.createHtmlOutputFromFile('FileManager').getContent();
}

/**
 * FileManager 페이지 직접 열기 (독립 페이지)
 * @param {Object} e - 요청 파라미터 (e.parameter.sessionId, e.parameter.studentId)
 * @returns {HtmlOutput} FileManager HTML 페이지
 */
function openFileManager(e) {
  var template = HtmlService.createTemplateFromFile('FileManager');

  // URL 파라미터로 sessionId, studentId 전달받기
  if (e && e.parameter) {
    if (e.parameter.sessionId) {
      template.sessionId = e.parameter.sessionId;
    }
    if (e.parameter.studentId) {
      template.studentId = e.parameter.studentId;
    }
  }

  return template.evaluate()
    .setTitle('AJU E&J - 파일 관리')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * BulkImport.html 콘텐츠 가져오기 (일괄 등록/내보내기)
 * @returns {string} BulkImport.html의 body 콘텐츠
 */
function getBulkImportContent() {
  return HtmlService.createHtmlOutputFromFile('BulkImport').getContent();
}

/**
 * BulkImport 페이지 직접 열기 (독립 페이지)
 * @param {Object} e - 요청 파라미터 (e.parameter.sessionId)
 * @returns {HtmlOutput} BulkImport HTML 페이지
 */
function openBulkImport(e) {
  var template = HtmlService.createTemplateFromFile('BulkImport');

  // URL 파라미터로 sessionId 전달받기
  if (e && e.parameter && e.parameter.sessionId) {
    template.sessionId = e.parameter.sessionId;
  }

  return template.evaluate()
    .setTitle('AJU E&J - 학생 일괄 등록/내보내기')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Spreadsheet 열릴 때 자동 실행 - 커스텀 메뉴 추가
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('📚 학생 관리')
    .addItem('👤 내 학생만 보기', 'showMyStudents')
    .addItem('👥 전체 학생 보기 (MASTER)', 'showAllStudents')
    .addSeparator()
    .addItem('🏢 유학원 목록 보기', 'showAgencyList')
    .addToUi();
}

/**
 * 내 학생만 보기 (현재 사용자의 유학원 학생만 필터링)
 */
function showMyStudents() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.STUDENTS);

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Students 시트를 찾을 수 없습니다.');
    return;
  }

  var userEmail = Session.getActiveUser().getEmail();

  // 사용자 이메일 → AgencyCode 매핑
  var agencyCode = getUserAgencyCode(userEmail);

  if (!agencyCode) {
    SpreadsheetApp.getUi().alert('등록되지 않은 사용자입니다.\n관리자에게 문의하세요.');
    return;
  }

  // Students 시트 활성화
  ss.setActiveSheet(sheet);

  // 필터 적용
  applyFilterToSheet(sheet, agencyCode);

  SpreadsheetApp.getUi().alert('✅ ' + agencyCode + ' 학생만 표시됩니다.');
}

/**
 * 전체 학생 보기 (MASTER 전용)
 */
function showAllStudents() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.STUDENTS);

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Students 시트를 찾을 수 없습니다.');
    return;
  }

  var userEmail = Session.getActiveUser().getEmail();
  var agencyCode = getUserAgencyCode(userEmail);

  if (agencyCode !== 'MASTER') {
    SpreadsheetApp.getUi().alert('⚠️ MASTER 권한이 필요합니다.');
    return;
  }

  // Students 시트 활성화
  ss.setActiveSheet(sheet);

  // 필터 제거 (전체 보기)
  removeFilterFromSheet(sheet);

  SpreadsheetApp.getUi().alert('✅ 전체 학생이 표시됩니다.');
}

/**
 * 유학원 목록 보기
 */
function showAgencyList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.AGENCIES);

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Agencies 시트를 찾을 수 없습니다.');
    return;
  }

  // Agencies 시트 활성화
  ss.setActiveSheet(sheet);

  SpreadsheetApp.getUi().alert('✅ 유학원 목록이 표시됩니다.');
}

/**
 * 사용자 이메일 → AgencyCode 매핑
 */
function getUserAgencyCode(email) {
  // duyang22@gmail.com → MASTER
  if (email === 'duyang22@gmail.com') {
    return 'MASTER';
  }

  // 다른 사용자 추가 시 여기에 추가
  // if (email === 'hanoi@example.com') return 'HANOI';
  // if (email === 'danang@example.com') return 'DANANG';

  return null;
}

/**
 * 시트에 필터 적용
 */
function applyFilterToSheet(sheet, agencyCode) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1) {
    return;
  }

  // 기존 필터 제거
  var existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }

  // AgencyCode 컬럼 찾기
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var agencyCodeCol = headers.indexOf('AgencyCode') + 1;

  if (agencyCodeCol === 0) {
    return;
  }

  // 새 필터 생성
  var range = sheet.getRange(1, 1, lastRow, lastCol);
  var filter = range.createFilter();

  // AgencyCode 필터 조건 설정
  var criteria = SpreadsheetApp.newFilterCriteria()
    .whenTextEqualTo(agencyCode)
    .build();
  filter.setColumnFilterCriteria(agencyCodeCol, criteria);
}

/**
 * 시트에서 필터 제거
 */
function removeFilterFromSheet(sheet) {
  var existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }
}
