export type Lang = 'ko' | 'vi'

export const T = {
  loading:        { ko: '로딩 중...',    vi: 'Đang tải...' },
  logout:         { ko: '로그아웃',      vi: 'Đăng xuất' },

  // 승인 대기
  pendingTitle:   { ko: '승인 대기 중',  vi: 'Chờ phê duyệt' },
  pendingDesc:    { ko: '등록 신청이 접수되었습니다.\n관리자 승인 후 서비스를 이용하실 수 있습니다.',
                    vi: 'Đơn đăng ký của bạn đã được tiếp nhận.\nBạn có thể sử dụng dịch vụ sau khi quản trị viên phê duyệt.' },
  noStudentInfo:  { ko: '학생 정보를 찾을 수 없습니다.', vi: 'Không tìm thấy thông tin sinh viên.' },

  // 탭
  tabInfo:        { ko: '내 정보',        vi: 'Thông tin' },
  tabConsult:     { ko: '상담 기록',      vi: 'Tư vấn' },
  tabExam:        { ko: '시험 성적',      vi: 'Kết quả thi' },
  tabAccount:     { ko: '계정 설정',      vi: 'Tài khoản' },

  // 버튼
  editInfo:       { ko: '정보 수정',      vi: 'Chỉnh sửa' },
  save:           { ko: '저장',           vi: 'Lưu' },
  saving:         { ko: '저장 중...',     vi: 'Đang lưu...' },
  cancel:         { ko: '취소',           vi: 'Hủy' },

  // 섹션 제목
  basicInfo:      { ko: '기본 정보',          vi: 'Thông tin cơ bản' },
  contactInfo:    { ko: '연락처',             vi: 'Liên hệ' },
  visaInfo:       { ko: '비자 / 체류 정보',   vi: 'Thông tin visa / lưu trú' },
  studyInfo:      { ko: '학업 정보',          vi: 'Thông tin học tập' },
  editTitle:      { ko: '정보 수정',          vi: 'Chỉnh sửa thông tin' },
  editSubNote:    { ko: '(연락처·비자·주소만 수정 가능)', vi: '(Chỉ sửa được SĐT, visa, địa chỉ)' },
  editNote:       { ko: '이름·유학원·학적 정보 수정은 담당 유학원 또는 AJU E&J에 문의하세요.',
                    vi: 'Để sửa tên, trung tâm hoặc thông tin học tập, vui lòng liên hệ trung tâm hoặc AJU E&J.' },

  // 필드명
  dob:            { ko: '생년월일',           vi: 'Ngày sinh' },
  gender:         { ko: '성별',               vi: 'Giới tính' },
  genderM:        { ko: '남 (M)',             vi: 'Nam (M)' },
  genderF:        { ko: '여 (F)',             vi: 'Nữ (F)' },
  agency:         { ko: '유학원',             vi: 'Trung tâm du học' },
  email:          { ko: '이메일',             vi: 'Email' },
  topikLevel:     { ko: '토픽 등급',          vi: 'Cấp TOPIK' },
  phoneVn:        { ko: '베트남 연락처',       vi: 'SĐT Việt Nam' },
  phoneKr:        { ko: '한국 연락처',         vi: 'SĐT Hàn Quốc' },
  addressVn:      { ko: '현재 주소 (베트남)',  vi: 'Địa chỉ hiện tại (VN)' },
  visaType:       { ko: '비자 종류',           vi: 'Loại visa' },
  visaExpiry:     { ko: '비자 만료일',         vi: 'Ngày hết hạn visa' },
  daysLeft:       { ko: '남은 기간',           vi: 'Còn lại' },
  targetUniv:     { ko: '목표 대학',           vi: 'Trường mục tiêu' },
  targetMajor:    { ko: '목표 학과',           vi: 'Ngành mục tiêu' },
  gpa:            { ko: '고교 GPA',            vi: 'GPA THPT' },
  enrollDate:     { ko: '등록일',              vi: 'Ngày đăng ký' },

  // 비자 알림
  visaUrgent:     { ko: '🚨 비자 만료 임박! ',         vi: '🚨 Visa sắp hết hạn! ' },
  visaWarn30:     { ko: '⚠️ 비자 갱신 준비 필요 ',     vi: '⚠️ Cần chuẩn bị gia hạn visa ' },
  visaWarn90:     { ko: '📋 비자 갱신 준비 시작 권장 ', vi: '📋 Nên bắt đầu chuẩn bị gia hạn visa ' },
  expiryDate:     { ko: '만료일',              vi: 'Ngày hết hạn' },

  // 상담 탭
  noConsult:      { ko: '상담 기록이 없습니다.', vi: 'Chưa có lịch sử tư vấn.' },
  consultContent: { ko: '상담 내용',            vi: 'Nội dung tư vấn' },
  improvement:    { ko: '개선 사항',            vi: 'Cải thiện' },
  nextGoal:       { ko: '다음 목표',            vi: 'Mục tiêu tiếp theo' },

  // 성적 탭
  noExam:         { ko: '시험 성적이 없습니다.', vi: 'Chưa có kết quả thi.' },
  reading:        { ko: '읽기',                 vi: 'Đọc' },
  listening:      { ko: '듣기',                 vi: 'Nghe' },
  writing:        { ko: '쓰기',                 vi: 'Viết' },
  total:          { ko: '총점',                 vi: 'Tổng điểm' },

  // 계정 설정 탭
  changePassword: { ko: '비밀번호 변경',          vi: 'Đổi mật khẩu' },
  newPw:          { ko: '새 비밀번호',            vi: 'Mật khẩu mới' },
  newPwHint:      { ko: '(8자 이상)',             vi: '(ít nhất 8 ký tự)' },
  confirmPw:      { ko: '새 비밀번호 확인',        vi: 'Xác nhận mật khẩu' },
  changing:       { ko: '변경 중...',             vi: 'Đang đổi...' },
  pwChanged:      { ko: '비밀번호가 변경되었습니다.', vi: 'Mật khẩu đã được thay đổi.' },
  pwMin8:         { ko: '비밀번호는 8자 이상이어야 합니다.', vi: 'Mật khẩu phải ít nhất 8 ký tự.' },
  pwMismatch:     { ko: '비밀번호가 일치하지 않습니다.', vi: 'Mật khẩu không khớp.' },
  consentHistory: { ko: '개인정보 동의 이력',     vi: 'Lịch sử đồng ý' },
  consentSignup:  { ko: '가입 동의',              vi: 'Đồng ý đăng ký' },
  changeFail:     { ko: '변경 실패: ',            vi: 'Đổi thất bại: ' },
  saveFail:       { ko: '저장 실패: ',            vi: 'Lưu thất bại: ' },

  // 사진
  changePhoto:    { ko: '사진 변경',              vi: 'Thay đổi ảnh' },
  uploading:      { ko: '업로드 중...',           vi: 'Đang tải...' },
  enterNewPw:     { ko: '새 비밀번호 입력',        vi: 'Nhập mật khẩu mới' },
  enterConfirmPw: { ko: '동일한 비밀번호 입력',    vi: 'Nhập lại mật khẩu' },

  // ─── 공통 네비게이션 ───
  navDashboard:   { ko: '대시보드',              vi: 'Bảng điều khiển' },
  navStudents:    { ko: '학생 관리',             vi: 'Quản lý sinh viên' },
  navReports:     { ko: '통계',                  vi: 'Thống kê' },
  navAgencies:    { ko: '유학원 관리',            vi: 'Quản lý trung tâm' },
  appTitle:       { ko: 'AJU E&J 학생관리',      vi: 'AJU E&J Quản lý sinh viên' },
  processing:     { ko: '처리 중...',             vi: 'Đang xử lý...' },

  // ─── 대시보드 ───
  dashTitle:      { ko: '대시보드',              vi: 'Bảng điều khiển' },
  pendingNew:     { ko: '신규 가입 승인 대기',    vi: 'Chờ phê duyệt đăng ký mới' },
  selectAll:      { ko: '전체 선택',              vi: 'Chọn tất cả' },
  deselectAll:    { ko: '전체 해제',              vi: 'Bỏ chọn tất cả' },
  approveSelected:{ ko: '선택 승인',              vi: 'Phê duyệt đã chọn' },
  approveBtn:     { ko: '승인',                  vi: 'Phê duyệt' },
  statStudents:   { ko: '전체 학생',              vi: 'Tổng sinh viên' },
  statAgencies:   { ko: '유학원 수',              vi: 'Số trung tâm' },
  statConsults:   { ko: '상담 기록',              vi: 'Lịch sử tư vấn' },
  statNewMonth:   { ko: '이번달 신규',            vi: 'Mới tháng này' },
  studentStatus:  { ko: '학생 현황',              vi: 'Tình trạng sinh viên' },
  visa7:          { ko: '🚨 비자 만료 7일 이내 — 즉시 조치 필요', vi: '🚨 Visa hết hạn trong 7 ngày — Cần xử lý ngay' },
  visa30:         { ko: '⚠️ 비자 만료 30일 이내 — 갱신 서류 준비', vi: '⚠️ Visa hết hạn trong 30 ngày — Chuẩn bị hồ sơ gia hạn' },
  visa90:         { ko: '📋 비자 만료 31~90일 이내 — 준비 시작 권장', vi: '📋 Visa hết hạn trong 31~90 ngày — Nên bắt đầu chuẩn bị' },
  quickStudents:  { ko: '학생 목록',              vi: 'Danh sách sinh viên' },
  quickStudentsDesc:{ ko: '전체 유학생 목록 조회', vi: 'Xem danh sách sinh viên' },
  quickNew:       { ko: '학생 등록',              vi: 'Đăng ký sinh viên' },
  quickNewDesc:   { ko: '새 유학생 신규 등록',    vi: 'Đăng ký sinh viên mới' },
  quickReports:   { ko: '통계 보기',              vi: 'Xem thống kê' },
  quickReportsDesc:{ ko: '상태별 · 유학원별 분석', vi: 'Phân tích theo trạng thái · trung tâm' },

  // ─── 학생 목록 ───
  studentList:    { ko: '학생 목록',              vi: 'Danh sách sinh viên' },
  exportExcel:    { ko: '엑셀 내보내기',          vi: 'Xuất Excel' },
  importBulk:     { ko: '일괄 등록',              vi: 'Nhập hàng loạt' },
  addStudent:     { ko: '+ 학생 등록',            vi: '+ Đăng ký sinh viên' },
  searchName:     { ko: '이름 검색 (한국어 / 베트남어)', vi: 'Tìm tên (KR / VN)' },
  allAgencies:    { ko: '전체 유학원',             vi: 'Tất cả trung tâm' },
  allStatus:      { ko: '전체 상태',              vi: 'Tất cả trạng thái' },
  colCode:        { ko: '번호',                   vi: 'Mã số' },
  colNameKr:      { ko: '이름 (KR)',              vi: 'Tên (KR)' },
  colNameVn:      { ko: '이름 (VN)',              vi: 'Tên (VN)' },
  colAgency:      { ko: '유학원',                 vi: 'Trung tâm' },
  colStatus:      { ko: '상태',                   vi: 'Trạng thái' },
  colEnrollDate:  { ko: '등록일',                 vi: 'Ngày đăng ký' },
  viewDetail:     { ko: '상세보기',               vi: 'Chi tiết' },
  unassigned:     { ko: '미배정',                 vi: 'Chưa phân công' },
  noStudents:     { ko: '등록된 학생이 없습니다.', vi: 'Không có sinh viên nào.' },
  addFirstStudent:{ ko: '첫 번째 학생 등록하기',   vi: 'Đăng ký sinh viên đầu tiên' },

  // ─── 로그인 ───
  loginSubtitle:  { ko: '베트남 유학생 관리 시스템', vi: 'Hệ thống quản lý du học sinh Việt Nam' },
  loginEmail:     { ko: '이메일',                 vi: 'Email' },
  loginPassword:  { ko: '비밀번호',               vi: 'Mật khẩu' },
  loginBtn:       { ko: '로그인',                 vi: 'Đăng nhập' },
  loggingIn:      { ko: '로그인 중...',            vi: 'Đang đăng nhập...' },
  loginError:     { ko: '이메일 또는 비밀번호가 올바르지 않습니다.', vi: 'Email hoặc mật khẩu không đúng.' },
  forgotPassword: { ko: '비밀번호 찾기',           vi: 'Quên mật khẩu' },
  registerLink:   { ko: '학생 등록 신청 →',        vi: 'Đăng ký du học sinh →' },
  pwPlaceholder:  { ko: '비밀번호 입력',           vi: 'Nhập mật khẩu' },

  // ─── 회원가입 ───
  registerTitle:  { ko: '학생 등록 신청',          vi: 'Đăng ký du học sinh' },
  registerSubtitle:{ ko: 'AJU E&J 유학생 관리 시스템', vi: 'Hệ thống quản lý AJU E&J' },
  sectionBasic:   { ko: '기본 정보',               vi: 'Thông tin cơ bản' },
  sectionAccount: { ko: '계정 정보',               vi: 'Thông tin tài khoản' },
  fieldNameKr:    { ko: '한국 이름',               vi: 'Tên tiếng Hàn' },
  fieldNameVn:    { ko: '베트남 이름',             vi: 'Tên tiếng Việt' },
  fieldPhoneVn:   { ko: '베트남 전화번호',          vi: 'SĐT Việt Nam' },
  fieldStudyStep: { ko: '유학 단계',               vi: 'Giai đoạn du học' },
  fieldAgency:    { ko: '유학원',                  vi: 'Trung tâm du học' },
  noSelect:       { ko: '선택 안 함',              vi: 'Không chọn' },
  fieldEmail:     { ko: '이메일',                  vi: 'Email' },
  emailHint:      { ko: '로그인 ID로 사용됩니다',   vi: 'Dùng để đăng nhập' },
  fieldPassword:  { ko: '비밀번호',                vi: 'Mật khẩu' },
  fieldPassword2: { ko: '비밀번호 확인',            vi: 'Xác nhận mật khẩu' },
  pw8hint:        { ko: '8자 이상',                vi: 'Ít nhất 8 ký tự' },
  pw2hint:        { ko: '동일한 비밀번호 입력',     vi: 'Nhập lại mật khẩu' },
  privacyTitle:   { ko: '개인정보 수집·이용 동의',  vi: 'Đồng ý thu thập và sử dụng thông tin cá nhân' },
  privacyAgree:   { ko: '위 개인정보 수집·이용에 동의합니다', vi: 'Tôi đồng ý với việc thu thập và sử dụng thông tin cá nhân trên' },
  submitRegister: { ko: '등록 신청',               vi: 'Gửi đăng ký' },
  submitProcessing:{ ko: '처리 중...',             vi: 'Đang xử lý...' },
  alreadyAccount: { ko: '이미 계정이 있으신가요?',  vi: 'Đã có tài khoản?' },
  loginNow:       { ko: '로그인',                  vi: 'Đăng nhập' },
  registerRequired:{ ko: '필수 항목을 모두 입력해 주세요. (이름, 생년월일, 전화번호, 이메일, 비밀번호)',
                      vi: 'Vui lòng điền đầy đủ thông tin bắt buộc. (Tên, ngày sinh, SĐT, email, mật khẩu)' },
  privacyRequired:{ ko: '개인정보 수집·이용에 동의해 주세요.', vi: 'Vui lòng đồng ý với chính sách thu thập thông tin cá nhân.' },
  registerDoneTitle:{ ko: '등록 신청 완료',         vi: 'Đăng ký thành công' },
  registerDoneDesc:{ ko: '등록 신청이 완료되었습니다.\n관리자 승인 후 로그인하실 수 있습니다.',
                     vi: 'Đơn đăng ký của bạn đã được gửi.\nBạn có thể đăng nhập sau khi quản trị viên phê duyệt.' },
  registerDoneNote:{ ko: '승인 완료 시 등록하신 이메일로 로그인하여 본인 정보를 확인할 수 있습니다.',
                     vi: 'Sau khi được phê duyệt, hãy đăng nhập bằng email đã đăng ký để xem thông tin.' },
  goToLogin:      { ko: '로그인 페이지로 이동',     vi: 'Đến trang đăng nhập' },

  // ─── 학생 신규 등록 (admin) ───
  newStudentTitle:{ ko: '학생 신규 등록',           vi: 'Đăng ký sinh viên mới' },
  backToList:     { ko: '← 목록으로',              vi: '← Về danh sách' },
  sectionContact: { ko: '연락처',                  vi: 'Liên hệ' },
  sectionParent:  { ko: '학부모 정보',              vi: 'Thông tin phụ huynh' },
  sectionStudy:   { ko: '학업 정보',               vi: 'Thông tin học tập' },
  sectionVisa:    { ko: '비자 / 체류',              vi: 'Visa / Lưu trú' },
  sectionNotes:   { ko: '비고',                    vi: 'Ghi chú' },
  fieldGender:    { ko: '성별',                    vi: 'Giới tính' },
  fieldAgencyAdmin:{ ko: '유학원',                 vi: 'Trung tâm du học' },
  fieldStatusAdmin:{ ko: '상태',                   vi: 'Trạng thái' },
  fieldPhoneKr:   { ko: '한국 연락처',              vi: 'SĐT Hàn Quốc' },
  fieldGpa:       { ko: '고등학교 성적 (GPA)',      vi: 'GPA THPT' },
  fieldEnrollDate:{ ko: '유학원 등록일',            vi: 'Ngày đăng ký trung tâm' },
  fieldTargetUniv:{ ko: '목표 대학',               vi: 'Trường mục tiêu' },
  fieldTargetMajor:{ ko: '목표 학과',              vi: 'Ngành mục tiêu' },
  fieldParentName:{ ko: '학부모 이름 (VN)',         vi: 'Tên phụ huynh (VN)' },
  fieldParentPhone:{ ko: '학부모 연락처 (VN)',      vi: 'SĐT phụ huynh (VN)' },
  fieldVisaType:  { ko: '비자 종류',               vi: 'Loại visa' },
  fieldVisaExpiry:{ ko: '비자 만료일',              vi: 'Ngày hết hạn visa' },
  fieldNotes:     { ko: '특이사항, 추가 메모...',   vi: 'Ghi chú đặc biệt...' },
  saveStudent:    { ko: '학생 등록',               vi: 'Đăng ký sinh viên' },
  cancelBtn2:     { ko: '취소',                    vi: 'Hủy' },
  requiredMsg:    { ko: '이름(한국어), 이름(베트남어), 생년월일은 필수입니다.', vi: 'Tên (tiếng Hàn), Tên (tiếng Việt), Ngày sinh là bắt buộc.' },

  // ─── 통계 ───
  reportTitle:    { ko: '통계',                       vi: 'Thống kê' },
  statsByStatus:  { ko: '상태별 학생 분포',            vi: 'Phân bổ theo trạng thái' },
  monthlyTrend:   { ko: '월별 등록 추이',              vi: 'Xu hướng đăng ký hàng tháng' },
  statsByAgency:  { ko: '유학원별 학생 수',            vi: 'Sinh viên theo trung tâm' },
  totalN:         { ko: '전체',                       vi: 'Tổng' },

  // ─── 유학원 관리 ───
  agencyMgmtTitle:  { ko: '유학원 관리',              vi: 'Quản lý trung tâm' },
  addAgency:        { ko: '+ 유학원 등록',            vi: '+ Đăng ký trung tâm' },
  closeForm:        { ko: '✕ 닫기',                   vi: '✕ Đóng' },
  agencyNewTitle:   { ko: '유학원 신규 등록',          vi: 'Đăng ký trung tâm mới' },
  autoCode:         { ko: '코드 자동 부여',            vi: 'Mã tự động' },
  agencyNameVn:     { ko: '유학원명 (베트남어)',        vi: 'Tên trung tâm (Tiếng Việt)' },
  agencyNameKr:     { ko: '유학원명 (한국어)',          vi: 'Tên trung tâm (Tiếng Hàn)' },
  contactPerson:    { ko: '담당자 이름',               vi: 'Người phụ trách' },
  contactPhone:     { ko: '담당자 연락처',             vi: 'SĐT người phụ trách' },
  accountOptional:  { ko: '로그인 계정 생성 (선택)',   vi: 'Tạo tài khoản đăng nhập (tùy chọn)' },
  noAccountNote:    { ko: '입력하지 않으면 유학원 정보만 저장됩니다.',
                      vi: 'Nếu không điền, chỉ lưu thông tin trung tâm.' },
  saveAgency:       { ko: '유학원 등록',               vi: 'Đăng ký trung tâm' },
  editAgencyTitle:  { ko: '유학원 정보 수정',          vi: 'Sửa thông tin trung tâm' },
  activeStatus:     { ko: '활성',                     vi: 'Hoạt động' },
  inactiveStatus:   { ko: '비활성',                   vi: 'Ngừng' },
  editBtn:          { ko: '수정',                     vi: 'Sửa' },
  activateBtn:      { ko: '활성화',                   vi: 'Kích hoạt' },
  deactivateBtn:    { ko: '비활성화',                  vi: 'Ngừng hoạt động' },
  noAgencies:       { ko: '등록된 유학원이 없습니다.', vi: 'Chưa có trung tâm nào.' },
  agencyRequired:   { ko: '유학원명 (베트남어)은 필수입니다.',
                      vi: 'Tên trung tâm (Tiếng Việt) là bắt buộc.' },
  accountCreateFail:{ ko: '계정 생성 실패: ',         vi: 'Tạo tài khoản thất bại: ' },
} as const

export const t = (key: keyof typeof T, lang: Lang): string => T[key][lang]

// 학생 상태 번역 (DB 값은 한국어로 저장, 표시만 번역)
export const STATUS_VI: Record<string, string> = {
  '유학전':   'Chờ du học',
  '어학연수': 'Học tiếng Hàn',
  '대학교':   'Đại học',
  '취업':     'Việc làm',
}
export const statusLabel = (status: string, lang: Lang): string =>
  lang === 'vi' ? (STATUS_VI[status] ?? status) : status

// 월 표시 번역 (숫자 → "1월" or "T.1")
export const monthLabel = (month: number, lang: Lang): string =>
  lang === 'vi' ? `T.${month}` : `${month}월`
