/**
 * MASTER_SALT 생성 함수
 *
 * 사용법:
 * 1. 이 코드를 GAS 프로젝트의 Code.gs에 복사
 * 2. 함수 선택: generateSalt
 * 3. 실행 버튼 클릭
 * 4. 로그 보기 (Ctrl+Enter) → MASTER_SALT 복사
 * 5. 이 함수 삭제
 */
function generateSalt() {
  const salt = Utilities.getUuid() + Utilities.getUuid();
  Logger.log('========================================');
  Logger.log('MASTER_SALT (복사하세요):');
  Logger.log(salt);
  Logger.log('========================================');
  return salt;
}
