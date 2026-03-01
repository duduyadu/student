# Design: dashboard-enhancement

## 개요
메인 대시보드(`/`)를 개선하여 비자 만료 임박 수, 서류 반려 수, TOPIK 등급 도넛 차트, 최근 활동 피드를 추가한다.

## 구현 파일
- `app/page.tsx` — 대시보드 메인

## Acceptance Criteria

| AC | 항목 | 기준 |
|----|------|------|
| AC-01 | 통계 카드 4개 | 전체 학생 / 이번달 신규 / 비자 만료 30일 이내 / 서류 반려 |
| AC-02 | 비자 30일 카드 | warn7.length + warn30.length 합산 표시 |
| AC-03 | 서류 반려 카드 | docStats.rejected 값 표시 |
| AC-04 | TOPIK 도넛 차트 | recharts PieChart (SSR:false), 미취득/1급/2급+ 3개 세그먼트 |
| AC-05 | 도넛 차트 색상 | 미취득=slate, 1급=blue, 2급+=green |
| AC-06 | 최근 활동 피드 | 상담 + 신규 학생 최신 순 최대 8건 |
| AC-07 | 활동 피드 아이콘 | 상담=💬, 신규=🆕 |
| AC-08 | StatCard red 색상 | bg-red-50 text-red-600 지원 |
| AC-09 | TypeScript 오류 없음 | npx tsc --noEmit 통과 |

## 데이터 로딩 함수

| 함수 | 역할 |
|------|------|
| `loadTopikDist()` | exam_results에서 학생별 최신 level 집계 → PieChart 데이터 |
| `loadRecentActivity()` | consultations + students 최근 8건 병합 |

## i18n 키 (lib/i18n.ts)
- `statVisa30`: 비자 만료 30일 / Visa hết hạn 30n
- `statRejected`: 서류 반려 / Hồ sơ bị từ chối
- `topikDistTitle`: TOPIK 등급 분포 / Phân bố cấp TOPIK
- `topikNone`: 미취득 / Chưa có cấp
- `topikLevel1`: 1급 / Cấp 1
- `topikLevel2`: 2급+ / Cấp 2+
- `recentActTitle`: 최근 활동 / Hoạt động gần đây
- `actConsult`: 상담 / Tư vấn
- `actNewStudent`: 신규 등록 / Đăng ký mới
