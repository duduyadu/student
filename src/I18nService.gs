/**
 * I18nService.gs - 다국어 엔진
 * Phase 2 구현
 */

/**
 * 특정 언어의 모든 i18n 문자열 가져오기
 * @param {string} locale - 'ko' 또는 'vi'
 * @returns {Object} {success: boolean, data?: Object, error?: string}
 */
function getLocaleStrings(locale) {
  try {
    if (locale !== 'ko' && locale !== 'vi') {
      return { success: false, errorKey: 'err_invalid_locale' };
    }

    // 캐시 확인
    const cache = CacheService.getScriptCache();
    const cacheKey = 'i18n_' + locale;
    const cached = cache.get(cacheKey);

    if (cached) {
      return { success: true, data: JSON.parse(cached) };
    }

    // i18n 시트 읽기
    const i18nData = _loadI18nSheet(locale);

    // 캐시 저장 (5분)
    cache.put(cacheKey, JSON.stringify(i18nData), CACHE_TTL);

    return { success: true, data: i18nData };

  } catch (e) {
    Logger.log('ERROR in getLocaleStrings: ' + e.message);
    return { success: false, errorKey: 'err_i18n_load' };
  }
}

/**
 * i18n 시트 로드 (Private)
 * @param {string} locale - 'ko' 또는 'vi'
 * @returns {Object} Key-Value 객체
 */
function _loadI18nSheet(locale) {
  const sheet = _getSheet(SHEETS.I18N);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return {};

  const headers = data[0];
  const keyIndex = headers.indexOf('Key');
  const langIndex = locale === 'ko' ? headers.indexOf('Korean') : headers.indexOf('Vietnamese');

  const result = {};

  for (let i = 1; i < data.length; i++) {
    const key = data[i][keyIndex];
    const value = data[i][langIndex];
    if (key && value) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * i18n 캐시 무효화
 */
function invalidateI18nCache() {
  const cache = CacheService.getScriptCache();
  cache.remove('i18n_ko');
  cache.remove('i18n_vi');
}

/**
 * Analytics 모듈 i18n 키 추가 (36개)
 *
 * 사용법:
 * 1. GAS 에디터에서 이 함수 실행
 * 2. i18n 시트에 36개 키 자동 추가
 * 3. invalidateI18nCache() 실행하여 캐시 갱신
 *
 * @returns {Object} {success: boolean, added: number}
 */
function setupAnalyticsI18n() {
  try {
    const sheet = _getSheet(SHEETS.I18N);

    // Analytics i18n 키 정의 (Key, Korean, Vietnamese)
    const keys = [
      // 페이지 제목 (1개)
      ['title_analytics_dashboard', '통합 분석 대시보드', 'Bảng Phân Tích Tổng Hợp'],

      // 탭 네비게이션 (4개)
      ['nav_tab_cohort', '코호트 분석', 'Phân Tích Nhóm'],
      ['nav_tab_trend', '트렌드 분석', 'Phân Tích Xu Hướng'],
      ['nav_tab_funnel', '깔때기 분석', 'Phân Tích Kênh'],
      ['nav_tab_custom_report', '사용자 정의 리포트', 'Báo Cáo Tùy Chỉnh'],

      // 버튼 (5개)
      ['btn_run_analysis', '분석 실행', 'Chạy Phân Tích'],
      ['btn_export_csv', 'CSV 내보내기', 'Xuất CSV'],
      ['btn_download_pdf', 'PDF 다운로드', 'Tải PDF'],
      ['btn_reset_filters', '초기화', 'Đặt Lại'],
      ['btn_refresh', '새로고침', 'Làm Mới'],

      // 필터 라벨 (15개)
      ['label_filter_panel', '필터 설정', 'Cài Đặt Bộ Lọc'],
      ['label_period_range', '기간 범위', 'Phạm Vi Thời Gian'],
      ['label_metric', '지표 선택', 'Chọn Chỉ Số'],
      ['label_agency_select', '유학원 선택', 'Chọn Văn Phòng'],
      ['label_date_range_start', '시작일', 'Ngày Bắt Đầu'],
      ['label_date_range_end', '종료일', 'Ngày Kết Thúc'],
      ['label_cohort_type', '코호트 유형', 'Loại Nhóm'],
      ['label_cohort_metric', '코호트 지표', 'Chỉ Số Nhóm'],
      ['label_start_year', '시작 연도', 'Năm Bắt Đầu'],
      ['label_end_year', '종료 연도', 'Năm Kết Thúc'],
      ['label_trend_metric', '트렌드 지표', 'Chỉ Số Xu Hướng'],
      ['label_trend_period', '트렌드 기간', 'Khoảng Thời Gian'],
      ['label_funnel_year', '분석 연도', 'Năm Phân Tích'],
      ['label_report_template', '리포트 템플릿', 'Mẫu Báo Cáo'],
      ['label_report_date_range', '날짜 범위', 'Khoảng Ngày'],

      // 차트 & 테이블 (2개)
      ['label_chart_title', '차트 보기', 'Xem Biểu Đồ'],
      ['label_data_table', '데이터 테이블', 'Bảng Dữ Liệu'],

      // 메시지 (9개)
      ['msg_loading_data', '데이터 로딩 중...', 'Đang Tải Dữ Liệu...'],
      ['msg_analysis_success', '분석이 완료되었습니다.', 'Phân tích hoàn tất.'],
      ['msg_analysis_failed', '분석에 실패했습니다.', 'Phân tích thất bại.'],
      ['msg_no_data', '데이터가 없습니다.', 'Không có dữ liệu.'],
      ['msg_export_success', '내보내기 완료', 'Xuất thành công'],
      ['msg_export_failed', '내보내기 실패', 'Xuất thất bại'],
      ['msg_pdf_generating', 'PDF 생성 중...', 'Đang tạo PDF...'],
      ['msg_pdf_success', 'PDF 다운로드 완료', 'Tải PDF thành công'],
      ['msg_pdf_failed', 'PDF 생성 실패', 'Tạo PDF thất bại']
    ];

    // 중복 체크: 이미 존재하는 키는 건너뛰기
    const existingData = sheet.getDataRange().getValues();
    const existingKeys = existingData.slice(1).map(row => row[0]);

    const newKeys = keys.filter(key => !existingKeys.includes(key[0]));

    if (newKeys.length === 0) {
      Logger.log('⚠️ All Analytics i18n keys already exist.');
      return { success: true, added: 0, message: 'All keys already exist' };
    }

    // 시트 끝에 추가
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, newKeys.length, 3).setValues(newKeys);

    // 캐시 무효화
    invalidateI18nCache();

    Logger.log('✅ Analytics i18n keys added: ' + newKeys.length);

    return { success: true, added: newKeys.length };

  } catch (e) {
    Logger.log('ERROR in setupAnalyticsI18n: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Calendar 모듈 i18n 키 추가 (32개)
 *
 * 사용법:
 * 1. GAS 에디터에서 이 함수 실행
 * 2. i18n 시트에 32개 키 자동 추가
 * 3. invalidateI18nCache() 실행하여 캐시 갱신
 *
 * @returns {Object} {success: boolean, added: number}
 */
function setupCalendarI18n() {
  try {
    const sheet = _getSheet(SHEETS.I18N);

    // Calendar i18n 키 정의 (Key, Korean, Vietnamese)
    const keys = [
      // 페이지 제목 & 네비게이션 (4개)
      ['calendar_title', '일정 관리', 'Quản Lý Lịch Trình'],
      ['calendar_upcoming_events', '다가오는 일정', 'Sự Kiện Sắp Tới'],
      ['calendar_no_upcoming', '일정이 없습니다', 'Không có sự kiện nào'],
      ['calendar_event_filter', '일정 필터', 'Bộ Lọc Sự Kiện'],

      // 일정 유형 (3개)
      ['calendar_event_type_visa', '비자 만료', 'Hết Hạn Visa'],
      ['calendar_event_type_topik', 'TOPIK 시험', 'Kỳ Thi TOPIK'],
      ['calendar_event_type_consult', '상담 일정', 'Lịch Tư Vấn'],

      // 뷰 모드 (3개)
      ['calendar_view_month', '월간', 'Tháng'],
      ['calendar_view_week', '주간', 'Tuần'],
      ['calendar_view_day', '일간', 'Ngày'],

      // 버튼 (2개)
      ['calendar_btn_add_event', '일정 추가', 'Thêm Sự Kiện'],
      ['calendar_btn_today', '오늘', 'Hôm Nay'],

      // 요일 (7개)
      ['calendar_sun', '일', 'CN'],
      ['calendar_mon', '월', 'T2'],
      ['calendar_tue', '화', 'T3'],
      ['calendar_wed', '수', 'T4'],
      ['calendar_thu', '목', 'T5'],
      ['calendar_fri', '금', 'T6'],
      ['calendar_sat', '토', 'T7'],

      // 알림 설정 (5개)
      ['calendar_notification_settings', '알림 설정', 'Cài Đặt Thông Báo'],
      ['calendar_notification_visa', '비자 만료 알림', 'Thông Báo Visa'],
      ['calendar_notification_topik', 'TOPIK 시험 알림', 'Thông Báo TOPIK'],
      ['calendar_notification_consult', '상담 일정 알림', 'Thông Báo Tư Vấn'],
      ['calendar_notification_same_day', '당일 09:00', 'Cùng ngày 09:00'],

      // 알림 이력 (2개)
      ['calendar_notification_history', '알림 이력', 'Lịch Sử Thông Báo'],
      ['calendar_no_history', '이력이 없습니다', 'Không có lịch sử'],

      // 모달 (1개)
      ['calendar_modal_add_event', '일정 추가', 'Thêm Sự Kiện'],

      // 라벨 (2개 - 공통 키와 중복 가능, 중복 체크로 처리)
      ['label_event_type', '일정 유형', 'Loại Sự Kiện'],
      ['label_start_date', '시작 날짜', 'Ngày Bắt Đầu'],
      ['label_end_date', '종료 날짜', 'Ngày Kết Thúc']
    ];

    // 중복 체크: 이미 존재하는 키는 건너뛰기
    const existingData = sheet.getDataRange().getValues();
    const existingKeys = existingData.slice(1).map(row => row[0]);

    const newKeys = keys.filter(key => !existingKeys.includes(key[0]));

    if (newKeys.length === 0) {
      Logger.log('⚠️ All Calendar i18n keys already exist.');
      return { success: true, added: 0, message: 'All keys already exist' };
    }

    // 시트 끝에 추가
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, newKeys.length, 3).setValues(newKeys);

    // 캐시 무효화
    invalidateI18nCache();

    Logger.log('✅ Calendar i18n keys added: ' + newKeys.length);

    return { success: true, added: newKeys.length };

  } catch (e) {
    Logger.log('ERROR in setupCalendarI18n: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * FileManager i18n 키 초기화 (18개)
 * @returns {Object} { success, added, error }
 */
function setupFileI18n() {
  try {
    const sheet = _getSheet(SHEETS.I18N);

    const keys = [
      // 카테고리 (4개)
      ['file_category_certificate', '증명서', 'Giấy Chứng Nhận'],
      ['file_category_admin', '행정', 'Hành Chính'],
      ['file_category_photo', '사진', 'Ảnh'],
      ['file_category_other', '기타', 'Khác'],

      // 탭 (1개)
      ['file_tab_all', '전체', 'Tất Cả'],

      // 버튼 (3개)
      ['file_upload_btn', '파일 업로드', 'Tải Lên Tệp'],
      ['file_download_btn', '다운로드', 'Tải Xuống'],
      ['file_delete_btn', '삭제', 'Xóa'],

      // 뷰 (2개)
      ['view_grid', '카드', 'Thẻ'],
      ['view_list', '목록', 'Danh Sách'],

      // 메시지 (4개)
      ['file_upload_success', '파일이 성공적으로 업로드되었습니다', 'Tệp đã được tải lên thành công'],
      ['file_delete_confirm', '이 파일을 삭제하시겠습니까?', 'Bạn có muốn xóa tệp này không?'],
      ['file_delete_success', '파일이 삭제되었습니다', 'Tệp đã bị xóa'],
      ['file_list_empty', '파일이 없습니다', 'Không có tệp'],

      // 에러 메시지 (7개)
      ['err_file_upload_failed', '파일 업로드 실패', 'Tải lên tệp thất bại'],
      ['err_file_size_exceeded', '파일 크기 초과 (이미지 10MB, PDF 50MB)', 'Kích thước tệp vượt quá (Ảnh 10MB, PDF 50MB)'],
      ['err_file_invalid_format', '지원하지 않는 파일 형식 (JPG, PNG, PDF만 가능)', 'Định dạng tệp không được hỗ trợ (Chỉ JPG, PNG, PDF)'],
      ['err_file_not_found', '파일을 찾을 수 없습니다', 'Không tìm thấy tệp'],
      ['err_file_not_image', '이미지 파일이 아닙니다', 'Không phải tệp ảnh'],
      ['err_file_delete_failed', '파일 삭제 실패', 'Xóa tệp thất bại'],
      ['err_file_download_failed', '파일 다운로드 실패', 'Tải xuống tệp thất bại'],
      ['err_file_thumbnail_failed', '썸네일 생성 실패', 'Tạo hình thu nhỏ thất bại']
    ];

    // 중복 체크
    const existingData = sheet.getDataRange().getValues();
    const existingKeys = existingData.slice(1).map(row => row[0]);

    const newKeys = keys.filter(key => !existingKeys.includes(key[0]));

    if (newKeys.length === 0) {
      Logger.log('⚠️ All FileManager i18n keys already exist.');
      return { success: true, added: 0, message: 'All keys already exist' };
    }

    // 시트 끝에 추가
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, newKeys.length, 3).setValues(newKeys);

    // 캐시 무효화
    invalidateI18nCache();

    Logger.log('✅ FileManager i18n keys added: ' + newKeys.length);

    return { success: true, added: newKeys.length };

  } catch (e) {
    Logger.log('ERROR in setupFileI18n: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * BulkImport i18n 키 초기화 (25개)
 * @returns {Object} { success, added, error }
 */
function setupBulkI18n() {
  try {
    const sheet = _getSheet(SHEETS.I18N);

    const keys = [
      // 페이지 제목 (1개)
      ['bulk_page_title', '학생 일괄 등록/내보내기', 'Đăng Ký/Xuất Hàng Loạt'],

      // 섹션 제목 (4개)
      ['bulk_import_title', 'CSV 파일로 학생 일괄 등록', 'Đăng Ký Hàng Loạt bằng CSV'],
      ['bulk_import_desc', 'CSV 파일을 업로드하여 여러 학생의 정보를 한 번에 등록할 수 있습니다. 파일 형식은 UTF-8 인코딩의 CSV 파일이어야 합니다.', 'Bạn có thể đăng ký thông tin của nhiều sinh viên cùng lúc bằng cách tải lên tệp CSV. Tệp phải được mã hóa UTF-8.'],
      ['bulk_export_title', '학생 데이터 CSV로 내보내기', 'Xuất Dữ Liệu Sinh Viên sang CSV'],
      ['bulk_export_desc', '현재 등록된 학생 데이터를 CSV 파일로 다운로드할 수 있습니다. 역할에 따라 접근 가능한 학생 데이터만 내보내집니다.', 'Bạn có thể tải xuống dữ liệu sinh viên hiện tại dưới dạng tệp CSV. Chỉ dữ liệu mà bạn có quyền truy cập sẽ được xuất.'],

      // 업로드 (3개)
      ['bulk_upload_text', 'CSV 파일을 선택하거나 여기에 드래그하세요', 'Chọn tệp CSV hoặc kéo vào đây'],
      ['bulk_upload_hint', '클릭하여 파일 선택 또는 드래그 & 드롭', 'Nhấp để chọn tệp hoặc kéo & thả'],
      ['bulk_import_btn', 'CSV 파일 가져오기', 'Nhập Tệp CSV'],

      // 샘플 (2개)
      ['bulk_sample_title', 'CSV 템플릿 예시', 'Mẫu CSV'],
      ['bulk_download_sample', '샘플 다운로드', 'Tải Mẫu'],

      // 주의사항 (6개)
      ['bulk_note_title', '⚠️ 주의사항:', '⚠️ Lưu Ý:'],
      ['bulk_note_1', '• 첫 번째 행은 반드시 컬럼명(헤더)이어야 합니다.', '• Hàng đầu tiên phải là tên cột (header).'],
      ['bulk_note_2', '• StudentID 형식: YY-AGENCY-SEQ (예: 25-HANOI-001)', '• Định dạng StudentID: YY-AGENCY-SEQ (ví dụ: 25-HANOI-001)'],
      ['bulk_note_3', '• Gender는 M(남성) 또는 F(여성)만 가능합니다.', '• Gender chỉ có thể là M (nam) hoặc F (nữ).'],
      ['bulk_note_4', '• DOB(생년월일) 형식: YYYY-MM-DD', '• Định dạng DOB (ngày sinh): YYYY-MM-DD'],
      ['bulk_note_5', '• EnrollDate(등록일) 형식: YYYY-MM-DD', '• Định dạng EnrollDate (ngày đăng ký): YYYY-MM-DD'],

      // 통계 (3개)
      ['bulk_stat_total', '총 처리', 'Tổng Số'],
      ['bulk_stat_success', '성공', 'Thành Công'],
      ['bulk_stat_error', '실패', 'Thất Bại'],

      // 결과 목록 (2개)
      ['bulk_success_list_title', '성공 목록', 'Danh Sách Thành Công'],
      ['bulk_error_list_title', '오류 목록', 'Danh Sách Lỗi'],

      // 로딩 (2개)
      ['bulk_loading_title', '처리 중...', 'Đang Xử Lý...'],
      ['bulk_loading_hint', '잠시만 기다려 주세요', 'Vui lòng đợi'],

      // 내보내기 통계 (2개)
      ['bulk_export_total', '내보낼 학생 수', 'Số Sinh Viên'],
      ['bulk_export_role', '내 권한', 'Quyền Của Tôi'],
      ['bulk_export_btn', 'CSV 파일로 내보내기', 'Xuất sang CSV']
    ];

    // 중복 체크
    const existingData = sheet.getDataRange().getValues();
    const existingKeys = existingData.slice(1).map(row => row[0]);

    const newKeys = keys.filter(key => !existingKeys.includes(key[0]));

    if (newKeys.length === 0) {
      Logger.log('⚠️ All BulkImport i18n keys already exist.');
      return { success: true, added: 0, message: 'All keys already exist' };
    }

    // 시트 끝에 추가
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, newKeys.length, 3).setValues(newKeys);

    // 캐시 무효화
    invalidateI18nCache();

    Logger.log('✅ BulkImport i18n keys added: ' + newKeys.length);

    return { success: true, added: newKeys.length };

  } catch (e) {
    Logger.log('ERROR in setupBulkI18n: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Login v2.0 i18n 키 초기화 (7개)
 * UserType 선택, 회원가입 링크, 비밀번호 찾기 링크
 *
 * 사용법:
 * 1. GAS 에디터에서 이 함수 실행
 * 2. i18n 시트에 7개 키 자동 추가
 * 3. invalidateI18nCache() 실행하여 캐시 갱신
 *
 * @returns {Object} { success, added, error }
 */
function setupLoginV2I18n() {
  try {
    const sheet = _getSheet(SHEETS.I18N);

    const keys = [
      // UserType 선택 (4개)
      ['login_usertype_label', '사용자 유형', 'Loại Người Dùng'],
      ['option_usertype_student', '학생', 'Sinh Viên'],
      ['option_usertype_agency', '유학원 관리자', 'Quản Lý Du Học'],
      ['option_usertype_master', '시스템 관리자', 'Quản Trị Hệ Thống'],

      // 회원가입 링크 (2개)
      ['login_signup_link', '아직 계정이 없으신가요?', 'Chưa có tài khoản?'],
      ['btn_signup', '회원가입', 'Đăng Ký'],

      // 비밀번호 찾기 (1개)
      ['login_forgot_password', '비밀번호를 잊으셨나요?', 'Quên mật khẩu?']
    ];

    // 중복 체크
    const existingData = sheet.getDataRange().getValues();
    const existingKeys = existingData.slice(1).map(row => row[0]);

    const newKeys = keys.filter(key => !existingKeys.includes(key[0]));

    if (newKeys.length === 0) {
      Logger.log('⚠️ All Login v2.0 i18n keys already exist.');
      return { success: true, added: 0, message: 'All keys already exist' };
    }

    // 시트 끝에 추가
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, newKeys.length, 3).setValues(newKeys);

    // 캐시 무효화
    invalidateI18nCache();

    Logger.log('✅ Login v2.0 i18n keys added: ' + newKeys.length);

    return { success: true, added: newKeys.length };

  } catch (e) {
    Logger.log('ERROR in setupLoginV2I18n: ' + e.message);
    return { success: false, error: e.message };
  }
}
