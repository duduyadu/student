/**
 * SetupI18n.gs - i18n 시트 초기 데이터 설정
 * Phase 4: 학생 CRUD 다국어 키 추가
 *
 * 사용법:
 * 1. GAS 에디터에서 이 파일 열기
 * 2. setupStudentCrudI18n() 함수 선택
 * 3. 실행 버튼 클릭
 * 4. 권한 승인 후 실행
 */

/**
 * Phase 4 학생 CRUD i18n 키 추가
 * 총 69개 키 (버튼 9개, 라벨 17개, 타이틀 4개, 섹션 4개, 메시지 5개, 에러 8개, 옵션 9개, 정렬 3개, 플레이스홀더 10개)
 */
function setupStudentCrudI18n() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEETS.I18N);

  if (!sheet) {
    Logger.log('ERROR: i18n sheet not found');
    return;
  }

  // 기존 데이터 확인 (헤더 제외)
  var lastRow = sheet.getLastRow();
  Logger.log('Current i18n rows: ' + lastRow);

  // 추가할 키 데이터 (Key, Korean, Vietnamese)
  var newKeys = [
    // 5.1 버튼 (9개)
    ['btn_add_student', '+ 학생 등록', '+ Thêm sinh viên'],
    ['btn_search', '검색', 'Tìm kiếm'],
    ['btn_edit', '수정', 'Sửa'],
    ['btn_delete', '삭제', 'Xóa'],
    ['btn_save', '저장', 'Lưu'],
    ['btn_cancel', '취소', 'Hủy'],
    ['btn_lang_ko', '한국어', 'Tiếng Hàn'],
    ['btn_lang_vi', 'Tiếng Việt', 'Tiếng Việt'],

    // 5.2 라벨 (17개)
    ['label_student_id', '학생 ID', 'Mã sinh viên'],
    ['label_name_kr', '한국 이름', 'Tên Hàn Quốc'],
    ['label_name_vn', '베트남 이름', 'Tên Việt Nam'],
    ['label_dob', '생년월일', 'Ngày sinh'],
    ['label_gender', '성별', 'Giới tính'],
    ['label_agency', '유학원', 'Cơ sở'],
    ['label_address_vn', '베트남 주소', 'Địa chỉ Việt Nam'],
    ['label_phone_kr', '한국 연락처', 'SĐT Hàn Quốc'],
    ['label_phone_vn', '베트남 연락처', 'SĐT Việt Nam'],
    ['label_email', '이메일', 'Email'],
    ['label_parent_name', '학부모 이름', 'Tên phụ huynh'],
    ['label_parent_phone', '학부모 연락처', 'SĐT phụ huynh'],
    ['label_parent_economic', '학부모 경제 상황', 'Tình hình kinh tế'],
    ['label_high_school_gpa', '고등학교 성적', 'Điểm trung học'],
    ['label_enrollment_date', '등록일', 'Ngày đăng ký'],
    ['label_status', '상태', 'Trạng thái'],
    ['label_actions', '작업', 'Thao tác'],

    // 5.3 타이틀 (4개)
    ['title_student_management', '학생 관리', 'Quản lý sinh viên'],
    ['title_add_student', '학생 등록', 'Thêm sinh viên'],
    ['title_edit_student', '학생 정보 수정', 'Sửa thông tin'],
    ['title_confirm_delete', '삭제 확인', 'Xác nhận xóa'],

    // 5.4 섹션 (4개)
    ['section_basic_info', '기본 정보', 'Thông tin cơ bản'],
    ['section_contact_info', '연락처 정보', 'Thông tin liên hệ'],
    ['section_parent_info', '학부모 정보', 'Thông tin phụ huynh'],
    ['section_academic_info', '학업 정보', 'Thông tin học tập'],

    // 5.5 메시지 (5개)
    ['msg_loading', '로딩 중...', 'Đang tải...'],
    ['msg_no_students', '등록된 학생이 없습니다.', 'Không có sinh viên'],
    ['msg_save_success', '저장되었습니다.', 'Đã lưu thành công'],
    ['msg_delete_success', '삭제되었습니다.', 'Đã xóa thành công'],
    ['msg_confirm_delete', '정말로 이 학생을 삭제하시겠습니까?', 'Bạn có chắc muốn xóa?'],

    // 5.6 에러 메시지 (8개)
    ['err_required_field', '필수 항목입니다.', 'Trường bắt buộc'],
    ['err_duplicate_phone', '이미 등록된 전화번호입니다.', 'SĐT đã tồn tại'],
    ['err_duplicate_email', '이미 등록된 이메일입니다.', 'Email đã tồn tại'],
    ['err_student_not_found', '학생을 찾을 수 없습니다.', 'Không tìm thấy SV'],
    ['err_permission_denied', '권한이 없습니다.', 'Không có quyền'],
    ['err_cannot_change_id', '학생 ID는 변경할 수 없습니다.', 'Không thể đổi ID'],
    ['err_session_expired', '세션이 만료되었습니다. 다시 로그인해주세요.', 'Phiên hết hạn'],
    ['err_unknown', '오류가 발생했습니다.', 'Đã xảy ra lỗi'],

    // 5.7 옵션 (9개)
    ['option_select', '선택', 'Chọn'],
    ['option_male', '남성', 'Nam'],
    ['option_female', '여성', 'Nữ'],
    ['option_high', '상', 'Cao'],
    ['option_medium', '중', 'Trung bình'],
    ['option_low', '하', 'Thấp'],
    ['option_enrolled', '재학', 'Đang học'],
    ['option_leave', '휴학', 'Nghỉ học'],
    ['option_graduated', '졸업', 'Đã tốt nghiệp'],

    // 5.8 정렬 (3개)
    ['sort_newest', '최신 등록순', 'Mới nhất'],
    ['sort_oldest', '오래된 순', 'Cũ nhất'],
    ['sort_name_asc', '이름 가나다순', 'Tên A-Z'],

    // 5.9 플레이스홀더 (10개)
    ['placeholder_search_student', '이름, 학생ID로 검색...', 'Tìm theo tên, mã...'],
    ['placeholder_name_kr', '예: 김철수', 'VD: Kim Chul Soo'],
    ['placeholder_name_vn', '예: Nguyen Van An', 'VD: Nguyen Van An'],
    ['placeholder_address_vn', '예: Ha Noi, Vietnam', 'VD: Ha Noi, Viet Nam'],
    ['placeholder_phone_kr', '예: 010-1234-5678', 'VD: 010-1234-5678'],
    ['placeholder_phone_vn', '예: +84-912-345-678', 'VD: +84-912-345-678'],
    ['placeholder_email', '예: student@example.com', 'VD: student@example.com'],
    ['placeholder_parent_name', '예: Nguyen Van Ba', 'VD: Nguyen Van Ba'],
    ['placeholder_parent_phone', '예: +84-913-456-789', 'VD: +84-913-456-789'],
    ['placeholder_gpa', '예: 8.5', 'VD: 8.5']
  ];

  // 중복 키 확인
  var existingKeys = {};
  if (lastRow > 1) {
    var existingData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingData.length; i++) {
      existingKeys[existingData[i][0]] = true;
    }
  }

  // 중복되지 않은 키만 추가
  var keysToAdd = [];
  var skippedCount = 0;

  for (var i = 0; i < newKeys.length; i++) {
    var key = newKeys[i][0];
    if (existingKeys[key]) {
      Logger.log('SKIP: Key already exists - ' + key);
      skippedCount++;
    } else {
      keysToAdd.push(newKeys[i]);
    }
  }

  if (keysToAdd.length > 0) {
    // 시트에 추가
    var startRow = lastRow + 1;
    sheet.getRange(startRow, 1, keysToAdd.length, 3).setValues(keysToAdd);

    Logger.log('SUCCESS: Added ' + keysToAdd.length + ' new i18n keys');
    Logger.log('SKIPPED: ' + skippedCount + ' existing keys');
    Logger.log('Total keys in sheet: ' + (lastRow - 1 + keysToAdd.length));
  } else {
    Logger.log('INFO: All keys already exist. No new keys added.');
  }

  return {
    added: keysToAdd.length,
    skipped: skippedCount,
    total: lastRow - 1 + keysToAdd.length
  };
}

/**
 * i18n 시트 전체 확인
 */
function checkI18nSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEETS.I18N);

  if (!sheet) {
    Logger.log('ERROR: i18n sheet not found');
    return;
  }

  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(1, 1, lastRow, 3).getValues();

  Logger.log('===== i18n Sheet Status =====');
  Logger.log('Total rows: ' + lastRow);
  Logger.log('Header: ' + data[0].join(' | '));
  Logger.log('Sample keys:');

  for (var i = 1; i < Math.min(6, data.length); i++) {
    Logger.log('  ' + data[i][0] + ': ' + data[i][1] + ' / ' + data[i][2]);
  }

  if (data.length > 6) {
    Logger.log('  ... and ' + (data.length - 6) + ' more keys');
  }
}

/**
 * Phase 4 유학원 관리 i18n 키 추가
 * 총 21개 키 (버튼 1개, 라벨 6개, 타이틀 2개, 메시지 4개, 에러 4개, 옵션 2개, 플레이스홀더 2개)
 */
function setupAgencyManagementI18n() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEETS.I18N);

  if (!sheet) {
    Logger.log('ERROR: i18n sheet not found');
    return;
  }

  // 기존 데이터 확인 (헤더 제외)
  var lastRow = sheet.getLastRow();
  Logger.log('Current i18n rows: ' + lastRow);

  // 추가할 키 데이터 (Key, Korean, Vietnamese)
  var newKeys = [
    // 버튼
    ['btn_add_agency', '+ 유학원 등록', '+ Thêm cơ sở'],

    // 라벨
    ['label_agency_code', '유학원 코드', 'Mã cơ sở'],
    ['label_agency_name', '유학원명', 'Tên cơ sở'],
    ['label_login_id', '로그인 ID', 'ID đăng nhập'],
    ['label_password', '비밀번호', 'Mật khẩu'],
    ['label_role', '역할', 'Vai trò'],
    ['label_created_at', '등록일', 'Ngày đăng ký'],

    // 타이틀
    ['title_add_agency', '유학원 등록', 'Thêm cơ sở'],
    ['title_edit_agency', '유학원 정보 수정', 'Sửa thông tin cơ sở'],

    // 탭
    ['tab_agency_management', '유학원 관리', 'Quản lý cơ sở'],

    // 메시지
    ['msg_no_agencies', '등록된 유학원이 없습니다.', 'Không có cơ sở'],
    ['msg_confirm_delete_agency', '정말로 이 유학원을 삭제하시겠습니까?', 'Bạn có chắc muốn xóa cơ sở này?'],

    // 에러 메시지
    ['err_duplicate_agency_code', '이미 등록된 유학원 코드입니다.', 'Mã cơ sở đã tồn tại'],
    ['err_duplicate_login_id', '이미 사용 중인 로그인 ID입니다.', 'ID đã được sử dụng'],
    ['err_agency_not_found', '유학원을 찾을 수 없습니다.', 'Không tìm thấy cơ sở'],
    ['err_cannot_change_code', '유학원 코드는 변경할 수 없습니다.', 'Không thể đổi mã cơ sở'],
    ['err_cannot_delete_master', 'MASTER 계정은 삭제할 수 없습니다.', 'Không thể xóa tài khoản MASTER'],

    // 옵션
    ['option_role_agency', '유학원', 'Cơ sở'],
    ['option_role_branch', '한국 지점', 'Chi nhánh Hàn Quốc'],

    // 플레이스홀더
    ['placeholder_search_agency', '유학원명, 코드로 검색...', 'Tìm theo tên, mã...'],
    ['placeholder_agency_code', '예: HANOI', 'VD: HANOI'],
    ['placeholder_agency_name', '예: 하노이 유학원', 'VD: Trung tâm Hà Nội'],
    ['placeholder_login_id', '예: hanoi_admin', 'VD: hanoi_admin'],
    ['placeholder_password', '비밀번호를 입력하세요', 'Nhập mật khẩu']
  ];

  // 중복 키 확인
  var existingKeys = {};
  if (lastRow > 1) {
    var existingData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingData.length; i++) {
      existingKeys[existingData[i][0]] = true;
    }
  }

  // 중복되지 않은 키만 추가
  var keysToAdd = [];
  var skippedCount = 0;

  for (var i = 0; i < newKeys.length; i++) {
    var key = newKeys[i][0];
    if (existingKeys[key]) {
      Logger.log('SKIP: Key already exists - ' + key);
      skippedCount++;
    } else {
      keysToAdd.push(newKeys[i]);
    }
  }

  if (keysToAdd.length > 0) {
    // 시트에 추가
    var startRow = lastRow + 1;
    sheet.getRange(startRow, 1, keysToAdd.length, 3).setValues(keysToAdd);

    Logger.log('SUCCESS: Added ' + keysToAdd.length + ' new agency i18n keys');
    Logger.log('SKIPPED: ' + skippedCount + ' existing keys');
    Logger.log('Total keys in sheet: ' + (lastRow - 1 + keysToAdd.length));
  } else {
    Logger.log('INFO: All keys already exist. No new keys added.');
  }

  return {
    added: keysToAdd.length,
    skipped: skippedCount,
    total: lastRow - 1 + keysToAdd.length
  };
}

/**
 * 학생 상태 옵션 i18n 키 업데이트
 * 기존: 재학, 휴학, 졸업 → 새로운: 유학전, 어학연수, 대학교재학중, 졸업
 */
function updateStudentStatusI18n() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEETS.I18N);

  if (!sheet) {
    Logger.log('ERROR: i18n sheet not found');
    return;
  }

  var lastRow = sheet.getLastRow();

  // 새로운 상태 옵션 키
  var newKeys = [
    ['option_before_study', '유학전', 'Trước khi du học'],
    ['option_language_course', '어학연수', 'Học ngôn ngữ']
  ];

  // 기존 키 확인
  var existingKeys = {};
  if (lastRow > 1) {
    var existingData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingData.length; i++) {
      existingKeys[existingData[i][0]] = true;
    }
  }

  // option_enrolled 수정 (재학 → 대학교재학중)
  if (existingKeys['option_enrolled']) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === 'option_enrolled') {
        sheet.getRange(i + 1, 2).setValue('대학교재학중');  // Korean
        sheet.getRange(i + 1, 3).setValue('Đang học đại học');  // Vietnamese
        Logger.log('UPDATED: option_enrolled');
        break;
      }
    }
  }

  // option_leave 삭제 (더 이상 사용 안 함)
  // 실제 삭제는 수동으로 하거나, 필요시 로직 추가

  // 새 키 추가
  var keysToAdd = [];
  var skippedCount = 0;

  for (var i = 0; i < newKeys.length; i++) {
    var key = newKeys[i][0];
    if (existingKeys[key]) {
      Logger.log('SKIP: Key already exists - ' + key);
      skippedCount++;
    } else {
      keysToAdd.push(newKeys[i]);
    }
  }

  if (keysToAdd.length > 0) {
    var startRow = lastRow + 1;
    sheet.getRange(startRow, 1, keysToAdd.length, 3).setValues(keysToAdd);
    Logger.log('SUCCESS: Added ' + keysToAdd.length + ' new status i18n keys');
  }

  Logger.log('Status i18n update completed: ' + keysToAdd.length + ' added, ' + skippedCount + ' skipped');

  return {
    added: keysToAdd.length,
    skipped: skippedCount,
    updated: 1  // option_enrolled
  };
}

/**
 * 특정 키 검색
 */
function findI18nKey(searchKey) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEETS.I18N);

  if (!sheet) {
    Logger.log('ERROR: i18n sheet not found');
    return;
  }

  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(1, 1, lastRow, 3).getValues();

  Logger.log('Searching for: ' + searchKey);

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === searchKey) {
      Logger.log('FOUND at row ' + (i + 1) + ':');
      Logger.log('  Key: ' + data[i][0]);
      Logger.log('  Korean: ' + data[i][1]);
      Logger.log('  Vietnamese: ' + data[i][2]);
      return;
    }
  }

  Logger.log('NOT FOUND');
}
