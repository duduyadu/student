# Analytics Module - i18n Keys (36개)

> Analytics 대시보드에서 사용하는 다국어 키 정의

## 키 목록 (Key-KR-VN)

### 페이지 제목 (1개)
| Key | KR | VN |
|-----|----|----|
| title_analytics_dashboard | 통합 분석 대시보드 | Bảng Phân Tích Tổng Hợp |

### 탭 네비게이션 (4개)
| Key | KR | VN |
|-----|----|----|
| nav_tab_cohort | 코호트 분석 | Phân Tích Nhóm |
| nav_tab_trend | 트렌드 분석 | Phân Tích Xu Hướng |
| nav_tab_funnel | 깔때기 분석 | Phân Tích Kênh |
| nav_tab_custom_report | 사용자 정의 리포트 | Báo Cáo Tùy Chỉnh |

### 버튼 (5개)
| Key | KR | VN |
|-----|----|----|
| btn_run_analysis | 분석 실행 | Chạy Phân Tích |
| btn_export_csv | CSV 내보내기 | Xuất CSV |
| btn_download_pdf | PDF 다운로드 | Tải PDF |
| btn_reset_filters | 초기화 | Đặt Lại |
| btn_refresh | 새로고침 | Làm Mới |

### 필터 라벨 (15개)
| Key | KR | VN |
|-----|----|----|
| label_filter_panel | 필터 설정 | Cài Đặt Bộ Lọc |
| label_period_range | 기간 범위 | Phạm Vi Thời Gian |
| label_metric | 지표 선택 | Chọn Chỉ Số |
| label_agency_select | 유학원 선택 | Chọn Văn Phòng |
| label_date_range_start | 시작일 | Ngày Bắt Đầu |
| label_date_range_end | 종료일 | Ngày Kết Thúc |
| label_cohort_type | 코호트 유형 | Loại Nhóm |
| label_cohort_metric | 코호트 지표 | Chỉ Số Nhóm |
| label_start_year | 시작 연도 | Năm Bắt Đầu |
| label_end_year | 종료 연도 | Năm Kết Thúc |
| label_trend_metric | 트렌드 지표 | Chỉ Số Xu Hướng |
| label_trend_period | 트렌드 기간 | Khoảng Thời Gian |
| label_funnel_year | 분석 연도 | Năm Phân Tích |
| label_report_template | 리포트 템플릿 | Mẫu Báo Cáo |
| label_report_date_range | 날짜 범위 | Khoảng Ngày |

### 차트 & 테이블 (2개)
| Key | KR | VN |
|-----|----|----|
| label_chart_title | 차트 보기 | Xem Biểu Đồ |
| label_data_table | 데이터 테이블 | Bảng Dữ Liệu |

### 메시지 (9개)
| Key | KR | VN |
|-----|----|----|
| msg_loading_data | 데이터 로딩 중... | Đang Tải Dữ Liệu... |
| msg_analysis_success | 분석이 완료되었습니다. | Phân tích hoàn tất. |
| msg_analysis_failed | 분석에 실패했습니다. | Phân tích thất bại. |
| msg_no_data | 데이터가 없습니다. | Không có dữ liệu. |
| msg_export_success | 내보내기 완료 | Xuất thành công |
| msg_export_failed | 내보내기 실패 | Xuất thất bại |
| msg_pdf_generating | PDF 생성 중... | Đang tạo PDF... |
| msg_pdf_success | PDF 다운로드 완료 | Tải PDF thành công |
| msg_pdf_failed | PDF 생성 실패 | Tạo PDF thất bại |

---

## 사용 방법

### GAS에서 i18n 시트에 추가
```javascript
// I18nService.gs의 setupAnalyticsI18n() 함수 실행
function setupAnalyticsI18n() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('i18n');

  var keys = [
    ['title_analytics_dashboard', '통합 분석 대시보드', 'Bảng Phân Tích Tổng Hợp'],
    ['nav_tab_cohort', '코호트 분석', 'Phân Tích Nhóm'],
    // ... (36개 전체)
  ];

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, keys.length, 3).setValues(keys);

  Logger.log('✅ Analytics i18n keys added: ' + keys.length);
}
```

### Analytics.html에서 사용
```html
<button id="btn-run-analysis">
  <span data-i18n="btn_run_analysis">분석 실행</span>
</button>

<script>
  // 다국어 적용
  function applyI18n(lang) {
    google.script.run
      .withSuccessHandler(function(strings) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
          var key = el.getAttribute('data-i18n');
          if (strings[key]) {
            el.textContent = strings[key];
          }
        });
      })
      .getLocaleStrings(lang);
  }
</script>
```

---

**Generated**: 2026-02-16
**Total Keys**: 36개
**Languages**: KR, VN
