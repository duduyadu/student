/**
 * Helpers.gs - 유틸리티 함수
 * Phase 2 구현
 */

/**
 * Smart ID 생성 (YYAAASSSSS)
 *
 * @deprecated v2.1 - Use generateStudentIDSafe() instead (Race Condition 방지)
 * @param {string} agencyCode - 유학원 코드
 * @returns {string} Smart ID (예: 260010001)
 *
 * Format: YY(2) + AgencyNumber(3) + SEQ(4)
 * - YY: 등록 연도 2자리 (26)
 * - AgencyNumber: 유학원 번호 3자리 (001, 002, ...)
 * - SEQ: 해당 유학원 내 순번 4자리 (0001, 0002, ...)
 *
 * ⚠️ 주의: 이 함수는 Race Condition이 있습니다.
 * 동시 접속 환경에서는 generateStudentIDSafe()를 사용하세요.
 *
 * 하위 호환성을 위해 유지되며, 내부적으로 generateStudentIDSafe()를 호출합니다.
 */
function generateSmartId(agencyCode) {
  // v2.1: generateStudentIDSafe()로 위임
  const result = generateStudentIDSafe(agencyCode);

  if (!result.success) {
    // 에러 시 예외 발생 (기존 동작 유지)
    throw new Error(result.error || 'Failed to generate Student ID');
  }

  return result.studentId;
}

/**
 * 비밀번호 해시 (SHA-256 + Salt)
 * @param {string} password - 평문 비밀번호
 * @returns {string} 해시값
 */
function hashPassword(password) {
  const saltedPassword = password + MASTER_SALT;
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    saltedPassword,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64Encode(hash);
}

/**
 * 민감 데이터 암호화 (XOR)
 * @param {string} plainText - 평문
 * @returns {string} Base64 인코딩된 암호문
 */
function encryptData(plainText) {
  if (!plainText) return '';

  const keyBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    MASTER_SALT,
    Utilities.Charset.UTF_8
  );

  const encrypted = _simpleEncrypt(plainText, keyBytes);
  return Utilities.base64Encode(encrypted);
}

/**
 * 민감 데이터 복호화
 * @param {string} cipherText - Base64 암호문
 * @returns {string} 평문
 */
function decryptData(cipherText) {
  if (!cipherText) return '';

  const keyBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    MASTER_SALT,
    Utilities.Charset.UTF_8
  );

  const encrypted = Utilities.base64Decode(cipherText);
  return _simpleDecrypt(encrypted, keyBytes);
}

/**
 * 간단한 XOR 암호화 (내부 함수)
 */
function _simpleEncrypt(text, keyBytes) {
  const textBytes = Utilities.newBlob(text).getBytes();
  const result = [];

  for (let i = 0; i < textBytes.length; i++) {
    result.push(textBytes[i] ^ keyBytes[i % keyBytes.length]);
  }

  return result;
}

/**
 * 간단한 XOR 복호화 (내부 함수)
 */
function _simpleDecrypt(encryptedBytes, keyBytes) {
  const result = [];

  for (let i = 0; i < encryptedBytes.length; i++) {
    result.push(encryptedBytes[i] ^ keyBytes[i % keyBytes.length]);
  }

  return Utilities.newBlob(result).getDataAsString();
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD HH:mm:ss)
 * @param {Date} date - Date 객체
 * @returns {string} 포맷된 문자열
 */
function formatDate(date) {
  if (!date) return '';

  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');

  return year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
}

/**
 * 현재 시간 반환 (KST)
 * @returns {string} YYYY-MM-DD HH:mm:ss
 */
function getCurrentTimestamp() {
  return formatDate(new Date());
}

/**
 * UUID 생성
 * @returns {string} UUID
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * FileID 생성 (FIL-YYYYMMDD-XXXXX)
 * @returns {string} FileID
 */
function generateFileID() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = year + month + day;

  // 5자리 랜덤 숫자
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');

  return 'FIL-' + dateStr + '-' + random;
}

/**
 * 행 삭제 (물리적 삭제)
 * @param {string} sheetName - 시트 이름
 * @param {string} keyColumn - 검색 컬럼명
 * @param {*} keyValue - 검색 값
 * @returns {boolean} 성공 여부
 */
function _hardDeleteRow(sheetName, keyColumn, keyValue) {
  const sheet = _getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) return false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][keyIndex] === keyValue) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
