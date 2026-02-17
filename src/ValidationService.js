/**
 * ValidationService.gs
 *
 * 런타임 데이터 검증 및 보안 필터링 서비스
 *
 * Features:
 * - XSS 방어 (HTML Sanitization)
 * - 생년월일 검증
 * - 전화번호 검증 및 형식화
 * - 이메일 검증 및 중복 확인
 *
 * @version 2.1
 * @since 2026-02-15
 */

/**
 * XSS 방어: HTML 태그 제거
 *
 * @param {string} input - 사용자 입력 문자열
 * @returns {string} Sanitized 문자열
 *
 * @example
 * sanitizeInput('<script>alert("XSS")</script>Hello');
 * // Returns: "Hello"
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  // 1. <script> 태그 제거 (대소문자 구분 없음)
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. 모든 HTML 태그 제거
  sanitized = sanitized.replace(/<[^>]+>/g, '');

  // 3. 연속 공백 제거 및 트림
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * 생년월일 검증
 *
 * @param {string} dob - 생년월일 (YYYY-MM-DD)
 * @returns {Object} { valid: boolean, error?: string }
 *
 * @example
 * validateDateOfBirth('2008-10-15');
 * // Returns: { valid: true }
 *
 * validateDateOfBirth('1970-01-01');
 * // Returns: { valid: false, error: '만 18세 이상이어야 합니다.' }
 */
function validateDateOfBirth(dob) {
  try {
    // 1. 형식 검증: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dob)) {
      return {
        valid: false,
        error: '생년월일 형식이 올바르지 않습니다. (YYYY-MM-DD)'
      };
    }

    // 2. 날짜 유효성 검증
    const parts = dob.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day) {
      return {
        valid: false,
        error: '유효하지 않은 날짜입니다.'
      };
    }

    // 3. 범위 검증: 1980-01-01 ~ 현재
    const minDate = new Date(1980, 0, 1);
    const today = new Date();

    if (date < minDate) {
      return {
        valid: false,
        error: '생년월일은 1980년 이후여야 합니다.'
      };
    }

    if (date > today) {
      return {
        valid: false,
        error: '생년월일은 미래 날짜일 수 없습니다.'
      };
    }

    // 4. 만 18세 이상 검증
    const age = Math.floor((today - date) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
      return {
        valid: false,
        error: '만 18세 이상이어야 합니다.'
      };
    }

    return { valid: true };

  } catch (e) {
    Logger.log('validateDateOfBirth Error: ' + e.message);
    return {
      valid: false,
      error: '생년월일 검증 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 전화번호 검증 및 자동 형식화
 *
 * @param {string} phone - 전화번호
 * @param {string} country - 국가 코드 ("KR" 또는 "VN")
 * @returns {Object} { valid: boolean, formatted?: string, error?: string }
 *
 * @example
 * validatePhoneNumber('01012345678', 'KR');
 * // Returns: { valid: true, formatted: '010-1234-5678' }
 *
 * validatePhoneNumber('0901234567', 'VN');
 * // Returns: { valid: true, formatted: '+84-90-123-4567' }
 */
function validatePhoneNumber(phone, country) {
  try {
    // 1. 숫자만 추출
    const digitsOnly = phone.replace(/\D/g, '');

    // 2. 국가별 검증 및 형식화
    if (country === 'KR') {
      // 한국: 010-XXXX-XXXX (11자리)
      if (digitsOnly.length !== 11) {
        return {
          valid: false,
          error: '한국 전화번호는 11자리여야 합니다. (010-XXXX-XXXX)'
        };
      }

      if (!digitsOnly.startsWith('010')) {
        return {
          valid: false,
          error: '한국 휴대폰 번호는 010으로 시작해야 합니다.'
        };
      }

      const formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
      return { valid: true, formatted: formatted };

    } else if (country === 'VN') {
      // 베트남: +84-XXX-XXX-XXXX (10자리, 국가번호 제외)
      let vn_digits = digitsOnly;

      // 국가번호 84로 시작하면 제거
      if (vn_digits.startsWith('84')) {
        vn_digits = vn_digits.slice(2);
      }

      // 0으로 시작하면 제거
      if (vn_digits.startsWith('0')) {
        vn_digits = vn_digits.slice(1);
      }

      if (vn_digits.length !== 9) {
        return {
          valid: false,
          error: '베트남 전화번호는 9자리여야 합니다. (+84-XXX-XXX-XXX)'
        };
      }

      const formatted = `+84-${vn_digits.slice(0, 2)}-${vn_digits.slice(2, 5)}-${vn_digits.slice(5)}`;
      return { valid: true, formatted: formatted };

    } else {
      return {
        valid: false,
        error: '지원하지 않는 국가 코드입니다. (KR 또는 VN)'
      };
    }

  } catch (e) {
    Logger.log('validatePhoneNumber Error: ' + e.message);
    return {
      valid: false,
      error: '전화번호 검증 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 이메일 검증 및 중복 확인
 *
 * @param {string} email - 이메일 주소
 * @param {string} excludeStudentId - 중복 확인 시 제외할 StudentID (수정 시)
 * @returns {Object} { valid: boolean, duplicate?: boolean, error?: string }
 *
 * @example
 * validateEmail('student@example.com');
 * // Returns: { valid: true, duplicate: false }
 *
 * validateEmail('invalid-email');
 * // Returns: { valid: false, error: '이메일 형식이 올바르지 않습니다.' }
 */
function validateEmail(email, excludeStudentId) {
  try {
    // 1. 기본 형식 검증 (RFC 5322 간소화 버전)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email)) {
      return {
        valid: false,
        error: '이메일 형식이 올바르지 않습니다.'
      };
    }

    // 2. 중복 확인 (Students 시트)
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const studentsSheet = ss.getSheetByName('Students');
    const data = studentsSheet.getDataRange().getValues();
    const headers = data[0];

    const emailCol = headers.indexOf('Email') + 1;
    const studentIdCol = headers.indexOf('StudentID') + 1;

    for (let i = 1; i < data.length; i++) {
      const rowEmail = data[i][emailCol - 1];
      const rowStudentId = data[i][studentIdCol - 1];

      // 수정 시 본인 제외
      if (excludeStudentId && rowStudentId === excludeStudentId) {
        continue;
      }

      if (rowEmail && rowEmail.toLowerCase() === email.toLowerCase()) {
        return {
          valid: false,
          duplicate: true,
          error: '이미 사용 중인 이메일입니다.'
        };
      }
    }

    return { valid: true, duplicate: false };

  } catch (e) {
    Logger.log('validateEmail Error: ' + e.message);
    return {
      valid: false,
      error: '이메일 검증 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 학생 데이터 전체 검증 (XSS + 비즈니스 룰)
 *
 * @param {Object} studentData - 학생 데이터 객체
 * @param {boolean} isUpdate - 수정 모드 여부
 * @returns {Object} { valid: boolean, errors?: Array<string> }
 *
 * @example
 * const result = validateStudentData({
 *   NameKR: '홍길동',
 *   NameVN: 'Hong Gil Dong',
 *   DOB: '2005-10-15',
 *   Email: 'hong@example.com',
 *   PhoneKR: '01012345678'
 * });
 */
function validateStudentData(studentData, isUpdate) {
  const errors = [];

  try {
    // 1. XSS 방어: 모든 문자열 필드 Sanitize
    const stringFields = ['NameKR', 'NameVN', 'AddressKR', 'AddressVN', 'Email', 'PhoneKR', 'PhoneVN', 'ParentNameKR', 'ParentNameVN'];

    for (let field of stringFields) {
      if (studentData[field]) {
        studentData[field] = sanitizeInput(studentData[field]);
      }
    }

    // 2. 생년월일 검증
    if (studentData.DOB) {
      const dobResult = validateDateOfBirth(studentData.DOB);
      if (!dobResult.valid) {
        errors.push(dobResult.error);
      }
    }

    // 3. 이메일 검증
    if (studentData.Email) {
      const excludeId = isUpdate ? studentData.StudentID : null;
      const emailResult = validateEmail(studentData.Email, excludeId);
      if (!emailResult.valid) {
        errors.push(emailResult.error);
      }
    }

    // 4. 전화번호 검증 (한국)
    if (studentData.PhoneKR) {
      const phoneResult = validatePhoneNumber(studentData.PhoneKR, 'KR');
      if (!phoneResult.valid) {
        errors.push(phoneResult.error);
      } else {
        // 형식화된 번호로 대체
        studentData.PhoneKR = phoneResult.formatted;
      }
    }

    // 5. 전화번호 검증 (베트남)
    if (studentData.PhoneVN) {
      const phoneResult = validatePhoneNumber(studentData.PhoneVN, 'VN');
      if (!phoneResult.valid) {
        errors.push(phoneResult.error);
      } else {
        // 형식화된 번호로 대체
        studentData.PhoneVN = phoneResult.formatted;
      }
    }

    // 6. 비자 종류 검증 (Phase 1.18)
    if (studentData.VisaType) {
      const visaResult = validateVisaType(studentData.VisaType);
      if (!visaResult.valid) {
        errors.push(visaResult.error);
      }
    }

    // 7. 외국인등록증 번호 검증 (Phase 1.18)
    if (studentData.ARCNumber) {
      const arcResult = validateARC(studentData.ARCNumber);
      if (!arcResult.valid) {
        errors.push(arcResult.error);
      } else if (arcResult.formatted) {
        // 형식화된 번호로 대체
        studentData.ARCNumber = arcResult.formatted;
      }
    }

    // 8. 주소 검증 - 한국 (Phase 1.18)
    if (studentData.AddressKR) {
      const addressResult = validateAddress(studentData.AddressKR, 'KR');
      if (!addressResult.valid) {
        errors.push(addressResult.error);
      }
    }

    // 9. 주소 검증 - 베트남 (Phase 1.18)
    if (studentData.AddressVN) {
      const addressResult = validateAddress(studentData.AddressVN, 'VN');
      if (!addressResult.valid) {
        errors.push(addressResult.error);
      }
    }

    // 10. 목표 대학명 검증 (Phase 1.18)
    if (studentData.TargetUniversity) {
      const univResult = validateTargetUniversity(studentData.TargetUniversity);
      if (!univResult.valid) {
        errors.push(univResult.error);
      } else if (univResult.suggestions && univResult.suggestions.length > 0) {
        // 로그로 제안 기록 (사용자에게 선택 가이드)
        Logger.log(`Info: 대학명 제안 - ${univResult.suggestions.join(', ')}`);
      }
    }

    // 11. 결과 반환
    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors
      };
    }

    return { valid: true };

  } catch (e) {
    Logger.log('validateStudentData Error: ' + e.message);
    return {
      valid: false,
      errors: ['데이터 검증 중 오류가 발생했습니다.']
    };
  }
}

/**
 * 비자 종류 검증
 *
 * @param {string} visaType - 비자 종류
 * @returns {Object} { valid: boolean, error?: string }
 *
 * @example
 * validateVisaType('D-4-1');
 * // Returns: { valid: true }
 */
function validateVisaType(visaType) {
  try {
    if (!visaType) {
      return { valid: true }; // Optional field
    }

    // 허용된 비자 종류 목록
    const validVisaTypes = [
      'D-2',    // 유학 (대학/대학원)
      'D-4-1',  // 어학연수
      'D-4-7',  // 외국어연수
      'D-10',   // 구직
      'F-2',    // 거주
      'F-4',    // 재외동포
      'F-6'     // 결혼이민
    ];

    // 정확히 일치하거나, D-2-X 형태 허용
    const isValid = validVisaTypes.includes(visaType) ||
                    /^D-2-\d+$/.test(visaType) ||
                    /^D-4-\d+$/.test(visaType);

    if (!isValid) {
      return {
        valid: false,
        error: '유효하지 않은 비자 종류입니다. (D-2, D-4-1 등)'
      };
    }

    return { valid: true };

  } catch (e) {
    Logger.log('validateVisaType Error: ' + e.message);
    return {
      valid: false,
      error: '비자 종류 검증 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 외국인등록증 번호 검증
 *
 * @param {string} arcNumber - 외국인등록증 번호
 * @returns {Object} { valid: boolean, formatted?: string, error?: string }
 *
 * @example
 * validateARC('1234561234567');
 * // Returns: { valid: true, formatted: '123456-1234567' }
 */
function validateARC(arcNumber) {
  try {
    if (!arcNumber) {
      return { valid: true }; // Optional field
    }

    // 숫자만 추출
    const digitsOnly = arcNumber.replace(/\D/g, '');

    // 13자리 검증
    if (digitsOnly.length !== 13) {
      return {
        valid: false,
        error: '외국인등록증 번호는 13자리여야 합니다.'
      };
    }

    // 형식화: 123456-1234567
    const formatted = `${digitsOnly.slice(0, 6)}-${digitsOnly.slice(6)}`;

    return { valid: true, formatted: formatted };

  } catch (e) {
    Logger.log('validateARC Error: ' + e.message);
    return {
      valid: false,
      error: '외국인등록증 번호 검증 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 주소 검증 (길이 및 형식)
 *
 * @param {string} address - 주소
 * @param {string} country - 국가 코드 ("KR" 또는 "VN")
 * @returns {Object} { valid: boolean, error?: string }
 *
 * @example
 * validateAddress('서울시 강남구 테헤란로 123', 'KR');
 * // Returns: { valid: true }
 */
function validateAddress(address, country) {
  try {
    if (!address) {
      return { valid: true }; // Optional field
    }

    // 최소 길이 검증 (5자 이상)
    if (address.length < 5) {
      return {
        valid: false,
        error: '주소는 최소 5자 이상이어야 합니다.'
      };
    }

    // 최대 길이 검증 (200자 이하)
    if (address.length > 200) {
      return {
        valid: false,
        error: '주소는 최대 200자까지 입력 가능합니다.'
      };
    }

    // 국가별 기본 검증
    if (country === 'KR') {
      // 한국 주소: 시/도 포함 여부 간단 체크
      const koreanCities = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
      const hasKoreanCity = koreanCities.some(city => address.includes(city));

      if (!hasKoreanCity) {
        // 경고만, 에러는 아님 (세부 주소일 수 있음)
        Logger.log('Warning: 한국 주소에 시/도 정보가 없을 수 있습니다: ' + address);
      }
    }

    return { valid: true };

  } catch (e) {
    Logger.log('validateAddress Error: ' + e.message);
    return {
      valid: false,
      error: '주소 검증 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 목표 대학명 검증 (화이트리스트)
 *
 * @param {string} university - 대학명
 * @returns {Object} { valid: boolean, suggestions?: Array<string>, error?: string }
 *
 * @example
 * validateTargetUniversity('서울대학교');
 * // Returns: { valid: true }
 */
function validateTargetUniversity(university) {
  try {
    if (!university) {
      return { valid: true }; // Optional field
    }

    // 주요 대학 목록 (간소화 버전)
    const majorUniversities = [
      '서울대학교', '연세대학교', '고려대학교',
      '카이스트', 'KAIST', '포스텍', 'POSTECH',
      '성균관대학교', '한양대학교', '중앙대학교',
      '경희대학교', '한국외국어대학교', '서강대학교',
      '이화여자대학교', '건국대학교', '동국대학교',
      '홍익대학교', '숙명여자대학교', '국민대학교'
    ];

    // 정확히 일치하면 통과
    if (majorUniversities.includes(university)) {
      return { valid: true };
    }

    // 부분 일치 검색 (오타 방지)
    const suggestions = majorUniversities.filter(u =>
      u.includes(university) || university.includes(u)
    );

    if (suggestions.length > 0) {
      return {
        valid: true,
        suggestions: suggestions
      };
    }

    // 화이트리스트에 없어도 허용 (경고만)
    Logger.log('Info: 목표 대학이 주요 대학 목록에 없습니다: ' + university);
    return { valid: true };

  } catch (e) {
    Logger.log('validateTargetUniversity Error: ' + e.message);
    return {
      valid: false,
      error: '대학명 검증 중 오류가 발생했습니다.'
    };
  }
}

/**
 * XSS 테스트 (보안 검증용)
 *
 * @example
 * // GAS 에디터에서 실행:
 * testXSSDefense();
 */
function testXSSDefense() {
  Logger.log('========================================');
  Logger.log('XSS DEFENSE TEST');
  Logger.log('========================================');

  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg/onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')">',
    '<body onload=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<SCRIPT SRC=http://evil.com/xss.js></SCRIPT>'
  ];

  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < xssPayloads.length; i++) {
    const payload = xssPayloads[i];
    const sanitized = sanitizeInput(payload);

    const hasScript = sanitized.toLowerCase().includes('script') ||
                      sanitized.toLowerCase().includes('alert') ||
                      sanitized.includes('<') ||
                      sanitized.includes('>');

    if (hasScript) {
      Logger.log(`❌ Test ${i + 1} FAILED`);
      Logger.log(`   Payload: ${payload}`);
      Logger.log(`   Sanitized: ${sanitized}`);
      failCount++;
    } else {
      Logger.log(`✅ Test ${i + 1} PASSED`);
      passCount++;
    }
  }

  Logger.log('========================================');
  Logger.log(`총 테스트: ${xssPayloads.length}개`);
  Logger.log(`통과: ${passCount}개`);
  Logger.log(`실패: ${failCount}개`);
  Logger.log('========================================');

  if (failCount === 0) {
    Logger.log('✅ XSS 방어 테스트 통과!');
    return { success: true, message: 'XSS 방어가 정상 작동합니다.' };
  } else {
    Logger.log('❌ XSS 방어 테스트 실패!');
    return { success: false, message: 'XSS 방어에 취약점이 있습니다.' };
  }
}
