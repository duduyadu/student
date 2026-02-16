/**
 * MobileUIService.gs
 *
 * 모바일 UI 최적화 서비스
 *
 * Features:
 * - 디바이스 정보 감지 (deviceType, screenWidth, isTouchDevice)
 * - PWA manifest.json 동적 생성
 * - 모바일 최적화 설정 (fontSize, buttonHeight, layoutColumns)
 *
 * @version 2.2
 * @since 2026-02-16
 */

/**
 * 디바이스 정보 감지
 *
 * @param {string} userAgent - User-Agent 문자열 (클라이언트에서 전달)
 * @param {number} screenWidth - 화면 너비 (px)
 * @returns {Object} { success: boolean, deviceInfo?: Object, error?: string }
 *
 * @example
 * const result = getDeviceInfo(navigator.userAgent, window.innerWidth);
 * // Returns: {
 * //   success: true,
 * //   deviceInfo: {
 * //     deviceType: 'mobile',
 * //     screenWidth: 375,
 * //     isTouchDevice: true,
 * //     os: 'iOS',
 * //     browser: 'Safari',
 * //     breakpoint: 'mobile'
 * //   }
 * // }
 */
function getDeviceInfo(userAgent, screenWidth) {
  try {
    // 1. 입력 검증
    if (!userAgent || typeof userAgent !== 'string') {
      return {
        success: false,
        errorKey: 'err_invalid_user_agent',
        error: 'User-Agent가 유효하지 않습니다.'
      };
    }

    if (!screenWidth || typeof screenWidth !== 'number' || screenWidth <= 0) {
      return {
        success: false,
        errorKey: 'err_invalid_screen_width',
        error: '화면 너비가 유효하지 않습니다.'
      };
    }

    // 2. 디바이스 타입 감지
    const deviceType = _detectDeviceType(userAgent, screenWidth);

    // 3. 터치 디바이스 감지
    const isTouchDevice = _detectTouchDevice(userAgent);

    // 4. OS 감지
    const os = _detectOS(userAgent);

    // 5. 브라우저 감지
    const browser = _detectBrowser(userAgent);

    // 6. Breakpoint 결정
    const breakpoint = _getBreakpoint(screenWidth);

    // 7. 디바이스 정보 객체 생성
    const deviceInfo = {
      deviceType: deviceType,
      screenWidth: screenWidth,
      isTouchDevice: isTouchDevice,
      os: os,
      browser: browser,
      breakpoint: breakpoint,
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      deviceInfo: deviceInfo
    };

  } catch (e) {
    Logger.log('ERROR in getDeviceInfo: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_unknown',
      error: e.message
    };
  }
}

/**
 * PWA manifest.json 동적 생성
 *
 * @param {string} lang - 언어 코드 ('ko' 또는 'vi')
 * @returns {Object} { success: boolean, manifest?: Object, error?: string }
 *
 * @example
 * const result = generateManifest('ko');
 * // Returns: {
 * //   success: true,
 * //   manifest: {
 * //     name: "AJU E&J 베트남 유학생 관리 시스템",
 * //     short_name: "AJU E&J",
 * //     ...
 * //   }
 * // }
 */
function generateManifest(lang) {
  try {
    // 1. 언어 기본값 설정
    if (!lang || (lang !== 'ko' && lang !== 'vi')) {
      lang = 'ko';
    }

    // 2. SystemConfig에서 설정 읽기
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const configSheet = ss.getSheetByName('SystemConfig');
    const configData = configSheet.getDataRange().getValues();

    const config = {};
    for (let i = 1; i < configData.length; i++) {
      const key = configData[i][0];
      const valueKO = configData[i][1];
      const valueVN = configData[i][2];
      config[key] = (lang === 'ko') ? valueKO : valueVN;
    }

    // 3. Manifest 객체 생성
    const manifest = {
      name: config['system_name'] || 'AJU E&J Student Management',
      short_name: config['system_short_name'] || 'AJU E&J',
      description: config['system_description'] || 'Student Management Platform',
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      theme_color: '#4285f4',
      background_color: '#ffffff',
      scope: '/',
      lang: lang,
      dir: 'ltr',
      categories: ['education', 'productivity', 'business'],
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ],
      shortcuts: [
        {
          name: (lang === 'ko') ? '학생 목록' : 'Danh sách học sinh',
          short_name: (lang === 'ko') ? '학생' : 'Học sinh',
          description: (lang === 'ko') ? '학생 정보 조회 및 관리' : 'Quản lý thông tin học sinh',
          url: '/?tab=students',
          icons: [{ src: '/icons/shortcut-students-96x96.png', sizes: '96x96', type: 'image/png' }]
        },
        {
          name: (lang === 'ko') ? '유학원 관리' : 'Quản lý văn phòng',
          short_name: (lang === 'ko') ? '유학원' : 'Văn phòng',
          description: (lang === 'ko') ? '유학원 정보 관리' : 'Quản lý thông tin văn phòng',
          url: '/?tab=agencies',
          icons: [{ src: '/icons/shortcut-agencies-96x96.png', sizes: '96x96', type: 'image/png' }]
        },
        {
          name: (lang === 'ko') ? '상담 기록' : 'Hồ sơ tư vấn',
          short_name: (lang === 'ko') ? '상담' : 'Tư vấn',
          description: (lang === 'ko') ? '상담 기록 조회 및 작성' : 'Xem và tạo hồ sơ tư vấn',
          url: '/?tab=consultations',
          icons: [{ src: '/icons/shortcut-consult-96x96.png', sizes: '96x96', type: 'image/png' }]
        }
      ],
      related_applications: [],
      prefer_related_applications: false,
      display_override: ['window-controls-overlay', 'standalone', 'minimal-ui']
    };

    return {
      success: true,
      manifest: manifest
    };

  } catch (e) {
    Logger.log('ERROR in generateManifest: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_unknown',
      error: e.message
    };
  }
}

/**
 * 모바일 최적화 설정 생성
 *
 * @param {Object} settings - 디바이스 설정 { deviceType, screenWidth }
 * @returns {Object} { success: boolean, optimization?: Object, error?: string }
 *
 * @example
 * const result = optimizeForMobile({ deviceType: 'mobile', screenWidth: 375 });
 * // Returns: {
 * //   success: true,
 * //   optimization: {
 * //     fontSize: 14,
 * //     buttonHeight: 44,
 * //     layoutColumns: 1,
 * //     cardPadding: 16,
 * //     touchTargetMin: 44,
 * //     enableSwipe: true,
 * //     enablePullToRefresh: true,
 * //     showHamburgerMenu: true
 * //   }
 * // }
 */
function optimizeForMobile(settings) {
  try {
    // 1. 입력 검증
    if (!settings || typeof settings !== 'object') {
      return {
        success: false,
        errorKey: 'err_invalid_settings',
        error: '설정 객체가 유효하지 않습니다.'
      };
    }

    const deviceType = settings.deviceType || 'desktop';
    const screenWidth = settings.screenWidth || 1024;

    // 2. 디바이스 타입별 최적화 설정
    let optimization = {};

    if (deviceType === 'mobile' || screenWidth < 768) {
      // Mobile 최적화
      optimization = {
        fontSize: 14,
        fontSizeSmall: 12,
        fontSizeLarge: 16,
        buttonHeight: 44,
        inputHeight: 44,
        layoutColumns: 1,
        cardPadding: 16,
        containerPadding: 16,
        touchTargetMin: 44,
        enableSwipe: true,
        enablePullToRefresh: true,
        showHamburgerMenu: true,
        showFAB: true,
        useBottomSheet: true,
        tableScrollable: true,
        navPosition: 'top',
        breakpoint: 'mobile'
      };

    } else if (deviceType === 'tablet' || (screenWidth >= 768 && screenWidth < 1024)) {
      // Tablet 최적화
      optimization = {
        fontSize: 15,
        fontSizeSmall: 13,
        fontSizeLarge: 17,
        buttonHeight: 48,
        inputHeight: 48,
        layoutColumns: 2,
        cardPadding: 20,
        containerPadding: 24,
        touchTargetMin: 44,
        enableSwipe: true,
        enablePullToRefresh: false,
        showHamburgerMenu: false,
        showFAB: true,
        useBottomSheet: false,
        tableScrollable: false,
        navPosition: 'top',
        breakpoint: 'tablet'
      };

    } else {
      // Desktop 최적화
      optimization = {
        fontSize: 16,
        fontSizeSmall: 14,
        fontSizeLarge: 18,
        buttonHeight: 40,
        inputHeight: 40,
        layoutColumns: 3,
        cardPadding: 24,
        containerPadding: 32,
        touchTargetMin: 32,
        enableSwipe: false,
        enablePullToRefresh: false,
        showHamburgerMenu: false,
        showFAB: false,
        useBottomSheet: false,
        tableScrollable: false,
        navPosition: 'sidebar',
        breakpoint: 'desktop'
      };
    }

    // 3. CSS Custom Properties 생성 (클라이언트에서 적용)
    optimization.cssVariables = {
      '--font-size-base': optimization.fontSize + 'px',
      '--font-size-small': optimization.fontSizeSmall + 'px',
      '--font-size-large': optimization.fontSizeLarge + 'px',
      '--button-height': optimization.buttonHeight + 'px',
      '--input-height': optimization.inputHeight + 'px',
      '--touch-target-min': optimization.touchTargetMin + 'px',
      '--container-padding': optimization.containerPadding + 'px',
      '--card-padding': optimization.cardPadding + 'px'
    };

    return {
      success: true,
      optimization: optimization
    };

  } catch (e) {
    Logger.log('ERROR in optimizeForMobile: ' + e.message);
    return {
      success: false,
      errorKey: e.errorKey || 'err_unknown',
      error: e.message
    };
  }
}

/* ========================================
   PRIVATE HELPER FUNCTIONS
   ======================================== */

/**
 * 디바이스 타입 감지
 * @private
 */
function _detectDeviceType(userAgent, screenWidth) {
  const ua = userAgent.toLowerCase();

  // Mobile 감지
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }

  // Tablet 감지
  if (/tablet|ipad|playbook|silk/i.test(ua) || (screenWidth >= 768 && screenWidth < 1024)) {
    return 'tablet';
  }

  // Desktop
  return 'desktop';
}

/**
 * 터치 디바이스 감지
 * @private
 */
function _detectTouchDevice(userAgent) {
  const ua = userAgent.toLowerCase();
  return /mobile|tablet|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
}

/**
 * OS 감지
 * @private
 */
function _detectOS(userAgent) {
  const ua = userAgent.toLowerCase();

  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/windows phone/i.test(ua)) return 'Windows Phone';
  if (/mac os/i.test(ua)) return 'macOS';
  if (/windows/i.test(ua)) return 'Windows';
  if (/linux/i.test(ua)) return 'Linux';

  return 'Unknown';
}

/**
 * 브라우저 감지
 * @private
 */
function _detectBrowser(userAgent) {
  const ua = userAgent.toLowerCase();

  if (/edge|edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/msie|trident/i.test(ua)) return 'Internet Explorer';

  return 'Unknown';
}

/**
 * Breakpoint 결정
 * @private
 */
function _getBreakpoint(screenWidth) {
  if (screenWidth < 768) return 'mobile';
  if (screenWidth >= 768 && screenWidth < 1024) return 'tablet';
  if (screenWidth >= 1024 && screenWidth < 1440) return 'desktop';
  return 'large-desktop';
}

/**
 * MobileUIService 테스트 함수
 *
 * @example
 * // GAS 에디터에서 실행:
 * testMobileUIService();
 */
function testMobileUIService() {
  Logger.log('========================================');
  Logger.log('MOBILE UI SERVICE TEST');
  Logger.log('========================================');

  // 1. getDeviceInfo 테스트
  Logger.log('\n1. Testing getDeviceInfo()...');
  const deviceResult = getDeviceInfo(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    375
  );

  if (deviceResult.success) {
    Logger.log('✅ getDeviceInfo 성공!');
    Logger.log('디바이스 정보: ' + JSON.stringify(deviceResult.deviceInfo, null, 2));
  } else {
    Logger.log('❌ getDeviceInfo 실패!');
    Logger.log('에러: ' + deviceResult.error);
  }

  // 2. generateManifest 테스트
  Logger.log('\n2. Testing generateManifest()...');
  const manifestResult = generateManifest('ko');

  if (manifestResult.success) {
    Logger.log('✅ generateManifest 성공!');
    Logger.log('Manifest (첫 500자): ' + JSON.stringify(manifestResult.manifest).substring(0, 500));
  } else {
    Logger.log('❌ generateManifest 실패!');
    Logger.log('에러: ' + manifestResult.error);
  }

  // 3. optimizeForMobile 테스트
  Logger.log('\n3. Testing optimizeForMobile()...');
  const optimizeResult = optimizeForMobile({
    deviceType: 'mobile',
    screenWidth: 375
  });

  if (optimizeResult.success) {
    Logger.log('✅ optimizeForMobile 성공!');
    Logger.log('최적화 설정: ' + JSON.stringify(optimizeResult.optimization, null, 2));
  } else {
    Logger.log('❌ optimizeForMobile 실패!');
    Logger.log('에러: ' + optimizeResult.error);
  }

  Logger.log('\n========================================');
  Logger.log('MOBILE UI SERVICE TEST COMPLETE');
  Logger.log('========================================');
}
