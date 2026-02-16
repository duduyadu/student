# Step 2 - High Priority Features Plan

> **Feature**: 모바일 UI + 백업/복구 + 검색 + 대시보드
> **Version**: 2.2
> **Created**: 2026-02-16
> **PDCA Phase**: Plan
> **Level**: Dynamic
> **Prerequisites**: security-and-enhancements v2.1 완료 (Match Rate: 92%)

---

## 1. Overview

### 1.1 Background

**Step 1 완료 현황** (security-and-enhancements v2.1):
- ✅ 동시성 제어 (SequenceService)
- ✅ 보안 강화 (RateLimitService + ValidationService)
- ✅ 비고란 추가 (Notes)
- ✅ 데이터 검증 강화 (11개 검증 함수)
- ✅ Excel Import/Export (CSV)

**Step 2 목표**: Production-Ready 핵심 기능 완성

### 1.2 Goals

**비즈니스 목표**:
1. **모바일 접근성 향상**: 스마트폰/태블릿에서 최적화된 UX
2. **데이터 안전성 강화**: 자동 백업 + 복구 기능
3. **업무 효율성 증대**: 빠른 검색 + 대시보드 통계
4. **사용자 만족도 향상**: 직관적인 인터페이스 + 실시간 데이터

**기술 목표**:
1. 반응형 웹 디자인 (320px~1440px)
2. PWA (Progressive Web App) 지원
3. Google Sheets 자동 백업 (30일 보관)
4. 통합 검색 + 자동완성
5. Chart.js 기반 대시보드

---

## 2. Feature Requirements

### 2.1 Feature #1: 모바일 반응형 UI + PWA (2주)

**Priority**: High
**Complexity**: Medium
**Estimated Effort**: 2주

#### 2.1.1 Requirements

**기능 요구사항**:
1. **반응형 레이아웃**
   - 320px (모바일 소형): 단일 컬럼, 햄버거 메뉴
   - 768px (태블릿): 2컬럼, 사이드바 토글
   - 1024px+ (데스크톱): 3컬럼, 고정 사이드바

2. **모바일 최적화 컴포넌트**
   - 터치 친화적 버튼 (최소 44px x 44px)
   - 스와이프 제스처 (탭 전환)
   - 풀 스크린 모달 (모바일에서)

3. **PWA 기능**
   - manifest.json (아이콘, 색상, 이름)
   - 홈 화면 추가 가능
   - 오프라인 알림 (Service Worker 없이)

**비기능 요구사항**:
- **성능**: 모바일 3G에서 3초 이내 로딩
- **접근성**: 터치 타겟 최소 44px
- **호환성**: iOS Safari 14+, Android Chrome 90+

#### 2.1.2 User Stories

**US-2.1.1**: 모바일 사용자 - 학생 목록 조회
```
As a 모바일 유학원 담당자,
I want to 스마트폰에서 학생 목록을 쉽게 조회하고,
So that 외출 중에도 학생 정보를 확인할 수 있다.
```

**US-2.1.2**: 태블릿 사용자 - 학생 등록
```
As a 태블릿 사용 관리자,
I want to 화면 크기에 맞게 폼이 자동 조정되고,
So that 편안하게 학생 정보를 입력할 수 있다.
```

**US-2.1.3**: PWA 사용자 - 홈 화면 추가
```
As a 자주 접속하는 사용자,
I want to 앱을 홈 화면에 추가하고,
So that 빠르게 접근할 수 있다.
```

#### 2.1.3 Acceptance Criteria

- [ ] 모든 페이지가 320px~1440px 범위에서 정상 표시
- [ ] 터치 버튼 크기 44px x 44px 이상
- [ ] 탭 전환 시 스와이프 제스처 지원
- [ ] manifest.json 파일 생성
- [ ] iOS/Android에서 홈 화면 추가 가능
- [ ] 모바일 3G에서 3초 이내 로딩

---

### 2.2 Feature #2: 데이터 백업/복구 (1주)

**Priority**: High
**Complexity**: Low
**Estimated Effort**: 1주

#### 2.2.1 Requirements

**기능 요구사항**:
1. **자동 백업**
   - 매일 자정 자동 실행 (Time Trigger)
   - 전체 시트 복사 (Students, Agencies, Consultations 등)
   - 백업 폴더: `Backups/{YYYY-MM-DD}/`

2. **백업 보관 정책**
   - 30일간 보관
   - 31일 이상 자동 삭제
   - 수동 백업 무제한 보관

3. **수동 복구**
   - Master 권한만 가능
   - 백업 날짜 선택 UI
   - 복구 전 확인 모달

**비기능 요구사항**:
- **신뢰성**: 백업 실패 시 이메일 알림
- **성능**: 백업 시간 5분 이내
- **스토리지**: Google Drive 용량 고려

#### 2.2.2 User Stories

**US-2.2.1**: 관리자 - 자동 백업
```
As a 시스템 관리자,
I want to 매일 자동으로 데이터가 백업되고,
So that 데이터 손실을 방지할 수 있다.
```

**US-2.2.2**: 관리자 - 수동 복구
```
As a 실수로 데이터를 삭제한 관리자,
I want to 특정 날짜의 백업을 복구하고,
So that 데이터를 되돌릴 수 있다.
```

#### 2.2.3 Acceptance Criteria

- [ ] 매일 자정 자동 백업 실행
- [ ] 백업 폴더에 전체 시트 복사 저장
- [ ] 31일 이상 백업 자동 삭제
- [ ] Master만 복구 기능 접근 가능
- [ ] 복구 전 확인 모달 표시
- [ ] 백업 실패 시 이메일 알림

---

### 2.3 Feature #3: 검색 기능 강화 (1주)

**Priority**: High
**Complexity**: Medium
**Estimated Effort**: 1주

#### 2.3.1 Requirements

**기능 요구사항**:
1. **통합 검색**
   - 학생 검색: 이름(KR/VN), StudentID, Email, Phone
   - 유학원 검색: 유학원명, AgencyCode
   - 상담 검색: 학생명, 상담 내용

2. **자동완성**
   - 3글자 이상 입력 시 활성화
   - 최대 10개 결과 표시
   - 키보드 네비게이션 (↑↓, Enter)

3. **고급 필터**
   - 유학원별 필터
   - 날짜 범위 필터
   - 상태별 필터 (IsActive)

**비기능 요구사항**:
- **성능**: 검색 결과 500ms 이내
- **UX**: 자동완성 응답 200ms 이내
- **권한**: 권한별 검색 범위 제한

#### 2.3.2 User Stories

**US-2.3.1**: 유학원 담당자 - 학생 빠른 검색
```
As a 유학원 담당자,
I want to 학생 이름 일부만 입력해도 자동완성으로 찾을 수 있고,
So that 빠르게 학생 정보를 조회할 수 있다.
```

**US-2.3.2**: 관리자 - 통합 검색
```
As a 관리자,
I want to 학생/유학원/상담을 하나의 검색창에서 찾을 수 있고,
So that 효율적으로 정보를 찾을 수 있다.
```

#### 2.3.3 Acceptance Criteria

- [ ] 학생/유학원/상담 통합 검색 구현
- [ ] 3글자 이상 입력 시 자동완성
- [ ] 키보드 네비게이션 지원 (↑↓, Enter)
- [ ] 검색 결과 500ms 이내 표시
- [ ] 권한별 검색 범위 제한 (Master/Agency)
- [ ] 고급 필터 (유학원별, 날짜, 상태)

---

### 2.4 Feature #4: 대시보드 (통계 + 차트) (1주)

**Priority**: High
**Complexity**: Medium
**Estimated Effort**: 1주

#### 2.4.1 Requirements

**기능 요구사항**:
1. **주요 통계**
   - 전체 학생 수 (IsActive=true)
   - 유학원 수 (IsActive=true)
   - 이번 달 상담 건수
   - 이번 달 신규 학생 수

2. **Chart.js 차트**
   - 월별 학생 등록 추이 (Line Chart)
   - 유학원별 학생 분포 (Pie Chart)
   - TOPIK 성적 분포 (Bar Chart)
   - 상담 유형별 통계 (Doughnut Chart)

3. **권한별 대시보드**
   - Master: 전체 통계
   - Agency: 소속 유학원 통계만

**비기능 요구사항**:
- **성능**: 차트 로딩 2초 이내
- **UX**: 반응형 차트 (모바일 최적화)
- **실시간성**: 페이지 로드 시 최신 데이터

#### 2.4.2 User Stories

**US-2.4.1**: 관리자 - 전체 통계 확인
```
As a 관리자,
I want to 한눈에 전체 학생/유학원 통계를 보고,
So that 현황을 빠르게 파악할 수 있다.
```

**US-2.4.2**: 관리자 - 월별 추이 분석
```
As a 관리자,
I want to 월별 학생 등록 추이를 차트로 보고,
So that 트렌드를 분석할 수 있다.
```

**US-2.4.3**: 유학원 담당자 - 소속 통계 확인
```
As a 유학원 담당자,
I want to 내 유학원 학생 통계만 보고,
So that 관리 현황을 파악할 수 있다.
```

#### 2.4.3 Acceptance Criteria

- [ ] 주요 통계 4개 표시 (학생/유학원/상담/신규)
- [ ] Chart.js 차트 4개 구현 (Line, Pie, Bar, Doughnut)
- [ ] 권한별 대시보드 분리 (Master/Agency)
- [ ] 차트 로딩 2초 이내
- [ ] 모바일 반응형 차트
- [ ] 페이지 로드 시 최신 데이터 표시

---

## 3. Technical Architecture

### 3.1 New Services

**4개 신규 Service 파일**:

1. **MobileUIService.gs** (모바일 UI)
   - `getDeviceInfo()`: 기기 정보 감지 (모바일/태블릿/데스크톱)
   - `generateManifest()`: PWA manifest.json 동적 생성
   - `optimizeForMobile()`: 모바일 최적화 설정 반환

2. **BackupService.gs** (백업/복구)
   - `createBackup()`: 전체 시트 백업 생성
   - `listBackups()`: 백업 목록 조회 (날짜별)
   - `restoreFromBackup(date)`: 특정 날짜 백업 복구
   - `cleanupOldBackups()`: 31일 이상 백업 삭제
   - `scheduleAutoBackup()`: Time Trigger 설정

3. **SearchService.gs** (검색)
   - `searchAll(query)`: 통합 검색 (학생/유학원/상담)
   - `autocomplete(query, type)`: 자동완성 제안
   - `advancedFilter(filters)`: 고급 필터 검색

4. **DashboardService.gs** (대시보드)
   - `getStatistics()`: 주요 통계 4개 반환
   - `getMonthlyTrend()`: 월별 학생 등록 추이
   - `getAgencyDistribution()`: 유학원별 학생 분포
   - `getTopikDistribution()`: TOPIK 성적 분포
   - `getConsultTypeStats()`: 상담 유형별 통계

### 3.2 Database Changes

**신규 시트**: 없음 (기존 시트 활용)

**기존 시트 수정**: 없음

### 3.3 Frontend Changes

**신규 HTML 파일**:
1. **Dashboard.html**: 대시보드 페이지
   - Chart.js CDN 로드
   - 반응형 그리드 레이아웃

**수정 HTML 파일**:
1. **Login.html**: 반응형 CSS 추가
   - Media Queries (320px, 768px, 1024px)
   - 모바일 햄버거 메뉴
   - 터치 최적화 버튼

2. **Index.html**: PWA manifest 링크 추가
   - `<link rel="manifest" href="/manifest.json">`
   - 메타 태그 (viewport, theme-color)

**신규 CSS**:
- `Responsive.css`: 반응형 스타일
- `Mobile.css`: 모바일 최적화

**신규 JSON**:
- `manifest.json`: PWA 설정

---

## 4. Implementation Plan

### 4.1 Phase 1: 모바일 UI + PWA (Week 1-2)

**Week 1: 반응형 레이아웃**
- Day 1-2: Media Queries 작성 (320px, 768px, 1024px)
- Day 3-4: 햄버거 메뉴 + 사이드바 토글
- Day 5: 터치 최적화 버튼 (44px x 44px)

**Week 2: PWA + 모바일 컴포넌트**
- Day 1-2: manifest.json 생성 + 아이콘 추가
- Day 3-4: 풀 스크린 모달 (모바일)
- Day 5: 스와이프 제스처 (탭 전환)

**Deliverables**:
- [ ] Responsive.css (500 lines)
- [ ] Mobile.css (300 lines)
- [ ] manifest.json
- [ ] 모바일 테스트 완료

---

### 4.2 Phase 2: 백업/복구 (Week 3)

**Week 3: BackupService 구현**
- Day 1-2: createBackup() + scheduleAutoBackup()
- Day 3: listBackups() + cleanupOldBackups()
- Day 4: restoreFromBackup()
- Day 5: UI 구현 (백업 목록 + 복구 버튼)

**Deliverables**:
- [ ] BackupService.gs (400 lines)
- [ ] Backup UI (Login.html 수정)
- [ ] Time Trigger 설정
- [ ] 백업 테스트 완료

---

### 4.3 Phase 3: 검색 강화 (Week 4)

**Week 4: SearchService 구현**
- Day 1-2: searchAll() + 통합 검색 UI
- Day 3: autocomplete() + 자동완성 UI
- Day 4: advancedFilter() + 필터 UI
- Day 5: 검색 성능 최적화 + 테스트

**Deliverables**:
- [ ] SearchService.gs (500 lines)
- [ ] Search UI (Login.html 수정)
- [ ] 자동완성 컴포넌트
- [ ] 검색 테스트 완료

---

### 4.4 Phase 4: 대시보드 (Week 5)

**Week 5: DashboardService + Chart.js**
- Day 1-2: DashboardService.gs (통계 함수 5개)
- Day 3-4: Dashboard.html (Chart.js 차트 4개)
- Day 5: 권한별 대시보드 분리 + 테스트

**Deliverables**:
- [ ] DashboardService.gs (600 lines)
- [ ] Dashboard.html (800 lines)
- [ ] Chart.js 통합
- [ ] 대시보드 테스트 완료

---

## 5. Testing Strategy

### 5.1 Unit Tests

**각 Service별 테스트 함수**:
- `testMobileUIService()`: 기기 감지, manifest 생성
- `testBackupService()`: 백업 생성, 복구, 삭제
- `testSearchService()`: 통합 검색, 자동완성, 필터
- `testDashboardService()`: 통계, 차트 데이터

### 5.2 Integration Tests

**시트 연동 테스트**:
- 백업 시트 생성 확인
- 검색 결과 정확도 확인
- 대시보드 통계 정합성 확인

### 5.3 User Acceptance Tests

**모바일 테스트**:
- [ ] iPhone SE (320px) 테스트
- [ ] iPad (768px) 테스트
- [ ] Android 스마트폰 테스트

**기능 테스트**:
- [ ] 백업/복구 시나리오 테스트
- [ ] 검색/자동완성 시나리오 테스트
- [ ] 대시보드 차트 렌더링 테스트

---

## 6. Success Criteria

### 6.1 Functional Criteria

- [ ] 모든 페이지 320px~1440px 반응형
- [ ] PWA 홈 화면 추가 가능
- [ ] 매일 자정 자동 백업 실행
- [ ] 백업 복구 정상 작동
- [ ] 통합 검색 500ms 이내
- [ ] 자동완성 200ms 이내
- [ ] 대시보드 차트 2초 이내 로딩

### 6.2 Non-Functional Criteria

**성능**:
- 모바일 3G: 3초 이내 로딩
- 검색: 500ms 이내
- 차트: 2초 이내

**접근성**:
- 터치 타겟: 44px x 44px 이상
- 키보드 네비게이션 지원

**호환성**:
- iOS Safari 14+
- Android Chrome 90+
- Desktop Chrome/Firefox/Edge

### 6.3 Quality Criteria

- **Code Coverage**: Unit Tests 80% 이상
- **Code Quality**: ESLint 0 errors
- **Performance**: Lighthouse Mobile Score 80+

---

## 7. Dependencies

### 7.1 External Libraries

**Chart.js** (v4.4.0):
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

**Hammer.js** (v2.0.8) - 스와이프 제스처:
```html
<script src="https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js"></script>
```

### 7.2 Google Apps Script APIs

- **DriveApp**: 백업 폴더/파일 관리
- **ScriptApp**: Time Trigger 설정
- **CacheService**: 검색 결과 캐싱
- **SpreadsheetApp**: 시트 복사, 통계 계산

### 7.3 Prerequisites

- **Step 1 완료**: security-and-enhancements v2.1 (Match Rate 92%)
- **Google Drive 용량**: 최소 500MB 권장
- **Time Trigger 권한**: 매일 자정 백업용

---

## 8. Risks & Mitigation

### 8.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Chart.js CDN 불안정 | High | Low | 로컬 복사본 준비 |
| 백업 시간 초과 (6분 제한) | High | Medium | 시트별 분할 백업 |
| 검색 성능 저하 (데이터 증가) | Medium | High | CacheService 활용 + 인덱싱 |
| 모바일 브라우저 호환성 | Medium | Low | Polyfill 추가 |

### 8.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| 사용자 모바일 미사용 | Low | Low | 데스크톱 우선 유지 |
| 백업 스토리지 부족 | High | Medium | 31일 자동 삭제 |
| 검색 기능 미사용 | Low | Low | 사용자 교육 |

---

## 9. Timeline

| Week | Phase | Deliverables | Progress |
|------|-------|--------------|----------|
| 1-2 | 모바일 UI + PWA | Responsive.css, manifest.json | 0% |
| 3 | 백업/복구 | BackupService.gs, Backup UI | 0% |
| 4 | 검색 강화 | SearchService.gs, Search UI | 0% |
| 5 | 대시보드 | DashboardService.gs, Dashboard.html | 0% |

**Total Duration**: 5주

---

## 10. Next Steps

### 10.1 Immediate Actions

1. **Design Phase 시작**
   ```bash
   /pdca design step2-high-priority-features
   ```

2. **i18n 키 준비**
   - 모바일 UI: 20개
   - 백업/복구: 15개
   - 검색: 25개
   - 대시보드: 30개
   - **총 90개 i18n 키**

3. **Chart.js 학습**
   - Line Chart 예제
   - Pie Chart 예제
   - Bar Chart 예제
   - Doughnut Chart 예제

### 10.2 Design Phase Focus

**주요 설계 항목**:
1. **API Design**: 4개 Service (Mobile, Backup, Search, Dashboard)
2. **Database Schema**: 변경 없음 (기존 시트 활용)
3. **Frontend Design**: 반응형 레이아웃, PWA manifest, 차트 구조
4. **Security Design**: 백업 권한 (Master만), 검색 권한별 범위

---

**Created**: 2026-02-16
**Author**: PDCA System
**Status**: Ready for Design Phase
