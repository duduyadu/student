/**
 * RateLimitService.gs
 *
 * API Rate Limiting 서비스
 *
 * Features:
 * - CacheService 기반 Rate Limiting
 * - 1분 100회 제한
 * - 429 Too Many Requests 에러 반환
 *
 * @version 2.1
 * @since 2026-02-15
 */

/**
 * Rate Limit 설정
 */
const RATE_LIMIT = {
  MAX_REQUESTS: 100,    // 최대 요청 횟수
  WINDOW_SECONDS: 60,   // 시간 윈도우 (초)
  RETRY_AFTER: 60       // 재시도 대기 시간 (초)
};

/**
 * API 호출 횟수 체크 (1분 100회 제한)
 *
 * @param {string} userId - 사용자 ID (LoginID 또는 AgencyCode)
 * @throws {Error} Rate Limit 초과 시 에러 throw
 *
 * @example
 * checkRateLimit('HANOI');
 * // Rate Limit 통과 시: 아무것도 반환 안 함
 * // Rate Limit 초과 시: Error throw (statusCode: 429)
 */
function checkRateLimit(userId) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = `RATE_LIMIT_${userId}`;

    // 1. 현재 카운트 조회
    const currentCount = cache.get(cacheKey);

    if (!currentCount) {
      // 2. 첫 요청: 카운트 1로 설정, TTL 60초
      cache.put(cacheKey, '1', RATE_LIMIT.WINDOW_SECONDS);
      return; // Rate Limit 통과
    }

    // 3. 카운트 증가
    const count = parseInt(currentCount, 10);

    if (count >= RATE_LIMIT.MAX_REQUESTS) {
      // 4. Rate Limit 초과
      const error = new Error('API 호출 횟수 초과 (1분 100회 제한). 잠시 후 다시 시도하세요.');
      error.statusCode = 429;
      error.retryAfter = RATE_LIMIT.RETRY_AFTER;
      error.errorKey = 'err_rate_limit';
      throw error;
    }

    // 5. 카운트 업데이트
    cache.put(cacheKey, String(count + 1), RATE_LIMIT.WINDOW_SECONDS);

  } catch (e) {
    // Rate Limit 에러는 그대로 throw
    if (e.statusCode === 429) {
      throw e;
    }

    // CacheService 에러는 로그만 (Rate Limit 우회)
    Logger.log('checkRateLimit Warning: ' + e.message);
    // CacheService 장애 시 Rate Limit 통과 (서비스 가용성 우선)
  }
}

/**
 * Rate Limit 수동 초기화 (관리자 전용)
 *
 * @param {string} userId - 초기화할 사용자 ID
 * @returns {Object} { success: boolean, message: string }
 *
 * @example
 * // GAS 에디터에서 실행:
 * resetRateLimit('HANOI');
 */
function resetRateLimit(userId) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = `RATE_LIMIT_${userId}`;

    cache.remove(cacheKey);

    Logger.log(`Rate Limit reset for user: ${userId}`);

    return {
      success: true,
      message: `${userId}의 Rate Limit이 초기화되었습니다.`
    };
  } catch (e) {
    Logger.log('resetRateLimit Error: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * 현재 Rate Limit 상태 조회 (디버깅용)
 *
 * @param {string} userId - 사용자 ID
 * @returns {Object} { count: number, maxRequests: number, windowSeconds: number }
 *
 * @example
 * // GAS 에디터에서 실행:
 * checkRateLimitStatus('HANOI');
 */
function checkRateLimitStatus(userId) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = `RATE_LIMIT_${userId}`;

    const currentCount = cache.get(cacheKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    Logger.log('========================================');
    Logger.log(`RATE LIMIT STATUS - ${userId}`);
    Logger.log('========================================');
    Logger.log(`Current Count: ${count} / ${RATE_LIMIT.MAX_REQUESTS}`);
    Logger.log(`Window: ${RATE_LIMIT.WINDOW_SECONDS}초`);
    Logger.log(`Remaining: ${RATE_LIMIT.MAX_REQUESTS - count}회`);
    Logger.log('========================================');

    return {
      userId: userId,
      count: count,
      maxRequests: RATE_LIMIT.MAX_REQUESTS,
      windowSeconds: RATE_LIMIT.WINDOW_SECONDS,
      remaining: Math.max(0, RATE_LIMIT.MAX_REQUESTS - count)
    };
  } catch (e) {
    Logger.log('checkRateLimitStatus Error: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Rate Limit 테스트 (100회 연속 호출)
 *
 * ⚠️ 주의: 테스트 환경에서만 실행하세요.
 *
 * @example
 * // GAS 에디터에서 실행:
 * testRateLimit();
 */
function testRateLimit() {
  const testUserId = 'TEST_USER';
  const testCount = 105; // 100회 제한 + 5회 초과

  Logger.log('========================================');
  Logger.log(`Rate Limit 테스트 시작 (${testCount}회 호출)`);
  Logger.log('========================================');

  // 1. Rate Limit 초기화
  resetRateLimit(testUserId);

  let successCount = 0;
  let failCount = 0;

  // 2. 연속 호출
  for (let i = 1; i <= testCount; i++) {
    try {
      checkRateLimit(testUserId);
      successCount++;

      if (i % 10 === 0) {
        Logger.log(`${i}회 호출 성공`);
      }
    } catch (e) {
      failCount++;
      Logger.log(`${i}회 호출 실패: ${e.message} (statusCode: ${e.statusCode})`);
    }
  }

  // 3. 결과 출력
  Logger.log('========================================');
  Logger.log('테스트 결과');
  Logger.log('========================================');
  Logger.log(`총 호출: ${testCount}회`);
  Logger.log(`성공: ${successCount}회`);
  Logger.log(`실패 (429 Rate Limit): ${failCount}회`);
  Logger.log(`예상 성공: ${RATE_LIMIT.MAX_REQUESTS}회`);
  Logger.log(`예상 실패: ${testCount - RATE_LIMIT.MAX_REQUESTS}회`);
  Logger.log('========================================');

  if (successCount === RATE_LIMIT.MAX_REQUESTS && failCount === (testCount - RATE_LIMIT.MAX_REQUESTS)) {
    Logger.log('✅ Rate Limit 테스트 통과!');
    return { success: true, message: 'Rate Limit이 정상 작동합니다.' };
  } else {
    Logger.log('❌ Rate Limit 테스트 실패!');
    return { success: false, message: 'Rate Limit이 예상대로 작동하지 않습니다.' };
  }
}

/**
 * 모든 Rate Limit 초기화 (관리자 전용)
 *
 * ⚠️ 주의: CacheService는 개별 키 전체 조회가 불가능하므로,
 * 이 함수는 알려진 사용자 ID 목록을 기반으로만 작동합니다.
 *
 * @example
 * // GAS 에디터에서 실행:
 * resetAllRateLimits();
 */
function resetAllRateLimits() {
  try {
    // 1. Agencies 시트에서 모든 AgencyCode 조회
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const agenciesSheet = ss.getSheetByName('Agencies');
    const data = agenciesSheet.getDataRange().getValues();
    const headers = data[0];

    const agencyCodeCol = headers.indexOf('AgencyCode') + 1;
    const userIds = [];

    for (let i = 1; i < data.length; i++) {
      const agencyCode = data[i][agencyCodeCol - 1];
      if (agencyCode) {
        userIds.push(agencyCode);
      }
    }

    // 2. 각 사용자 Rate Limit 초기화
    const cache = CacheService.getScriptCache();
    let resetCount = 0;

    for (let userId of userIds) {
      const cacheKey = `RATE_LIMIT_${userId}`;
      cache.remove(cacheKey);
      resetCount++;
    }

    Logger.log(`${resetCount}명의 Rate Limit이 초기화되었습니다.`);

    return {
      success: true,
      message: `${resetCount}명의 Rate Limit이 초기화되었습니다.`,
      userIds: userIds
    };
  } catch (e) {
    Logger.log('resetAllRateLimits Error: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}
