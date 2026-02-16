# Step 3 - High Priority Features Plan

> **Feature**: 고급 분석 + 일정 관리 + 파일 관리
> **Version**: 3.0
> **Created**: 2026-02-16
> **PDCA Phase**: Plan
> **Level**: Dynamic
> **Prerequisites**: step2-high-priority-features 완료 (Match Rate: 93.4%)

---

## 1. Overview

### 1.1 Background

**Step 2 완료 현황** (step2-high-priority-features):
- ✅ 모바일 반응형 UI + PWA
- ✅ 백업/복구 시스템 (자동 백업 30일 보관)
- ✅ 통합 검색 + 자동완성
- ✅ Chart.js 대시보드 (4개 차트)
- ✅ Match Rate: 93.4%

**Step 3 목표**: 데이터 활용 및 업무 자동화

### 1.2 Goals

**비즈니스 목표**:
1. **데이터 기반 의사결정**: 고급 분석 리포트로 학생 관리 개선
2. **업무 자동화**: 일정 알림으로 비자/시험 관리 누락 방지
3. **문서 중앙 관리**: 증명서/서류 파일 체계적 보관 및 조회
4. **업무 효율성 향상**: 자동 알림 + 파일 관리로 시간 절약

**기술 목표**:
1. 고급 데이터 분석 (Cohort, Trend, Funnel Analysis)
2. Google Calendar API 연동 일정 관리
3. Google Drive API 연동 파일 업로드
4. 알림톡/SMS API 연동 (외부 서비스)
5. 자동 리포트 생성 (PDF Export)

---

## 2. Feature Requirements

### 2.1 Feature #1: 고급 데이터 분석 및 리포팅 (2주)

**Priority**: High
**Complexity**: High
**Estimated Effort**: 2주

#### 2.1.1 Requirements

**기능 요구사항**:
1. **Cohort Analysis (코호트 분석)**
   - 입학 연도별 학생 그룹 분석
   - TOPIK 성적 향상률 추적
   - 목표 대학 변경 패턴 분석
   - 상담 횟수와 성과 상관관계

2. **Trend Analysis (트렌드 분석)**
   - 월별/분기별 신규 학생 추이
   - TOPIK 시험 합격률 추이
   - 상담 유형별 빈도 변화
   - 유학원별 성장률 비교

3. **Funnel Analysis (깔때기 분석)**
   - 등록 → TOPIK → 대학 입학 전환율
   - 단계별 이탈률 분석
   - 병목 구간 식별

4. **Custom Report Generator**
   - 사용자 정의 보고서 템플릿
   - 날짜 범위/필터 선택
   - PDF/Excel 다운로드
   - 자동 이메일 발송 (주간/월간)

**비기능 요구사항**:
- **성능**: 1000명 학생 데이터 분석 <5초
- **정확도**: 통계 계산 오차율 <0.1%
- **확장성**: 최대 10,000명 지원

#### 2.1.2 User Stories

**US-3.1.1**: 관리자 - 코호트 분석
```
As a 학생 관리 책임자,
I want to 2024년/2025년/2026년 입학생의 TOPIK 성적 향상률을 비교하고,
So that 효과적인 교육 프로그램을 기획할 수 있다.
```

**US-3.1.2**: 유학원 담당자 - 트렌드 분석
```
As a 유학원 담당자,
I want to 우리 유학원의 월별 신규 학생 추이를 확인하고,
So that 마케팅 전략을 조정할 수 있다.
```

**US-3.1.3**: 관리자 - 자동 리포트
```
As a 한국 지점 관리자,
I want to 매주 월요일 아침 주간 리포트를 이메일로 받고,
So that 빠르게 현황을 파악할 수 있다.
```

#### 2.1.3 Acceptance Criteria

- [ ] 코호트 분석: 연도별/유학원별 그룹 비교 가능
- [ ] 트렌드 분석: 월별/분기별 차트 자동 생성
- [ ] 깔때기 분석: 단계별 전환율 시각화
- [ ] Custom Report: 필터/날짜 선택 → PDF 다운로드
- [ ] 자동 발송: 주간/월간 리포트 이메일 전송
- [ ] 성능: 1000명 데이터 5초 이내 처리

---

### 2.2 Feature #2: 일정 관리 및 알림 시스템 (2주)

**Priority**: High
**Complexity**: Medium
**Estimated Effort**: 2주

#### 2.2.1 Requirements

**기능 요구사항**:
1. **일정 관리 (Calendar Integration)**
   - Google Calendar API 연동
   - 이벤트 생성: 비자 만료일, TOPIK 시험일, 상담 예정
   - 일정 조회: 월간/주간/일간 뷰
   - 일정 수정/삭제

2. **자동 알림 시스템**
   - **비자 만료 알림**: D-30, D-14, D-7, D-1
   - **TOPIK 시험 알림**: D-30, D-7, D-1
   - **상담 일정 알림**: D-1, 당일 오전 9시
   - **알림 채널**: 이메일 (기본) + 알림톡/SMS (선택)

3. **알림 관리**
   - 알림 설정: 채널 선택, 시간 설정
   - 알림 이력: 발송 성공/실패 로그
   - 재발송: 실패 시 수동 재발송

**비기능 요구사항**:
- **신뢰성**: 알림 발송 성공률 >95%
- **정확성**: 예정 시간 ±5분 이내 발송
- **확장성**: 동시 1000건 알림 처리

#### 2.2.2 User Stories

**US-3.2.1**: 관리자 - 비자 만료 알림
```
As a 한국 지점 관리자,
I want to 비자 만료 30일 전 자동 알림을 받고,
So that 학생이 불법 체류하지 않도록 사전 조치할 수 있다.
```

**US-3.2.2**: 학생 - 시험 일정 알림
```
As a 베트남 유학생,
I want to TOPIK 시험 7일 전 알림을 받고,
So that 시험 준비를 제때 할 수 있다.
```

**US-3.2.3**: 유학원 담당자 - 상담 일정 알림
```
As a 유학원 상담사,
I want to 상담 예정일 하루 전 알림을 받고,
So that 상담 준비를 미리 할 수 있다.
```

#### 2.2.3 Acceptance Criteria

- [ ] Google Calendar 연동: 일정 CRUD 가능
- [ ] 비자 만료 알림: D-30/14/7/1 자동 발송
- [ ] TOPIK 시험 알림: D-30/7/1 자동 발송
- [ ] 상담 일정 알림: D-1, 당일 오전 9시 발송
- [ ] 알림 이력: 발송 성공/실패 로그 조회
- [ ] 재발송: 실패 건 수동 재발송 가능
- [ ] 성능: 1000건 알림 10분 이내 처리

---

### 2.3 Feature #3: 파일 업로드 및 관리 (1.5주)

**Priority**: High
**Complexity**: Medium
**Estimated Effort**: 1.5주

#### 2.3.1 Requirements

**기능 요구사항**:
1. **파일 업로드 (Google Drive API)**
   - 증명서: 고등학교 졸업장, 성적표
   - 행정: 비자 사본, 외국인 등록증 사본
   - 기타: 사진, 상담 기록 첨부
   - 최대 파일 크기: 10MB (이미지), 50MB (PDF)
   - 허용 형식: JPG, PNG, PDF

2. **파일 관리**
   - 학생별 폴더 자동 생성
   - 파일 목록 조회 (카테고리별)
   - 파일 다운로드
   - 파일 삭제 (권한 제어)

3. **파일 미리보기**
   - 이미지: 썸네일 + 확대
   - PDF: Google Drive Viewer 연동

**비기능 요구사항**:
- **보안**: 파일 업로드 시 바이러스 검사 (Drive API 자동)
- **성능**: 10MB 파일 업로드 <30초
- **용량**: Google Drive 무료 15GB 한도 고려

#### 2.3.2 User Stories

**US-3.3.1**: 유학원 담당자 - 증명서 업로드
```
As a 유학원 담당자,
I want to 학생의 고등학교 졸업장을 업로드하고,
So that 대학 지원 시 빠르게 제출할 수 있다.
```

**US-3.3.2**: 관리자 - 비자 사본 관리
```
As a 한국 지점 관리자,
I want to 학생의 비자 사본을 확인하고,
So that 비자 연장 시 필요한 정보를 파악할 수 있다.
```

**US-3.3.3**: 유학원 담당자 - 파일 다운로드
```
As a 유학원 담당자,
I want to 학생의 모든 서류를 한 번에 다운로드하고,
So that 대학 지원 시 편리하게 제출할 수 있다.
```

#### 2.3.3 Acceptance Criteria

- [ ] 파일 업로드: JPG, PNG, PDF 지원 (최대 10MB/50MB)
- [ ] 폴더 구조: `학생ID/카테고리/파일명` 자동 생성
- [ ] 파일 목록: 카테고리별 필터링 가능
- [ ] 파일 다운로드: 개별/전체 다운로드 지원
- [ ] 파일 삭제: master/agency 권한만 가능
- [ ] 미리보기: 이미지 썸네일, PDF Viewer 연동
- [ ] 성능: 10MB 파일 30초 이내 업로드

---

## 3. Technical Design

### 3.1 Architecture

**새로운 Service 파일** (3개):
1. **AnalyticsService.gs**
   - getCohortAnalysis(filters)
   - getTrendAnalysis(period, metric)
   - getFunnelAnalysis(startDate, endDate)
   - generateCustomReport(template, filters)
   - exportReportToPDF(reportData)

2. **ScheduleService.gs**
   - createCalendarEvent(eventData)
   - listCalendarEvents(startDate, endDate)
   - updateCalendarEvent(eventId, eventData)
   - deleteCalendarEvent(eventId)
   - sendNotification(type, studentId, daysBeforeㅣ
   - getNotificationHistory(filters)

3. **FileService.gs**
   - uploadFile(studentId, category, file)
   - listFiles(studentId, category)
   - downloadFile(fileId)
   - deleteFile(fileId)
   - getFileThumbnail(fileId)

**새로운 Sheet** (2개):
1. **Notifications**: 알림 이력
   - NotificationID, StudentID, Type, Channel, SentAt, Status, ErrorMsg

2. **Files**: 파일 메타데이터
   - FileID, StudentID, Category, FileName, DriveFileID, UploadedAt, UploadedBy

### 3.2 External API Integration

**Google Calendar API**:
- OAuth 2.0 인증
- Events 리소스 CRUD
- Time-driven Trigger (매일 오전 9시 알림 체크)

**Google Drive API**:
- OAuth 2.0 인증
- Files 리소스 업로드/다운로드
- 폴더 생성/관리
- 바이러스 검사 자동 실행

**알림톡/SMS API** (선택적):
- 국내: Aligo, Coolsms
- 해외: Twilio (베트남 SMS)
- Fallback: 이메일 (GmailApp)

### 3.3 Data Flow

**분석 리포트 생성**:
```
사용자 요청 → AnalyticsService
→ Students/ExamResults/Consultations 시트 읽기
→ 데이터 가공 (집계, 계산)
→ Chart.js 데이터 생성
→ PDF Export (Google Apps Script PDF)
→ 다운로드/이메일 발송
```

**알림 발송 흐름**:
```
Time Trigger (매일 09:00) → ScheduleService.checkUpcomingEvents()
→ Students 시트에서 비자/시험 날짜 조회
→ D-30/14/7/1 해당 학생 필터링
→ sendNotification() 호출
→ 이메일/알림톡/SMS 발송
→ Notifications 시트에 로그 기록
```

**파일 업로드 흐름**:
```
사용자 파일 선택 → FileService.uploadFile()
→ 파일 유효성 검사 (크기, 형식)
→ Google Drive API 업로드
→ DriveFileID 반환
→ Files 시트에 메타데이터 저장
→ 업로드 완료 알림
```

---

## 4. Implementation Plan

### 4.1 Phase 1: 고급 분석 (2주)

**Week 1**: Cohort & Trend Analysis
- [ ] AnalyticsService.gs 생성
- [ ] getCohortAnalysis() 구현
- [ ] getTrendAnalysis() 구현
- [ ] Chart.js 차트 추가 (Line, Bar)
- [ ] Frontend: Analytics.html 생성

**Week 2**: Funnel & Custom Report
- [ ] getFunnelAnalysis() 구현
- [ ] generateCustomReport() 구현
- [ ] exportReportToPDF() 구현
- [ ] 자동 이메일 발송 (Time Trigger)
- [ ] Frontend: Report Builder UI

### 4.2 Phase 2: 일정 관리 (2주)

**Week 1**: Calendar Integration
- [ ] Google Calendar API 활성화 (GCP Console)
- [ ] OAuth 2.0 설정
- [ ] ScheduleService.gs 생성
- [ ] Calendar CRUD 함수 구현
- [ ] Frontend: Calendar.html 생성

**Week 2**: Notification System
- [ ] Notifications 시트 생성
- [ ] sendNotification() 구현
- [ ] Time Trigger 설정 (매일 09:00)
- [ ] 이메일 템플릿 (한국어/베트남어)
- [ ] 알림 이력 조회 UI

### 4.3 Phase 3: 파일 관리 (1.5주)

**Week 1**: File Upload/Download
- [ ] Google Drive API 활성화 (GCP Console)
- [ ] OAuth 2.0 설정
- [ ] FileService.gs 생성
- [ ] Files 시트 생성
- [ ] uploadFile() 구현
- [ ] downloadFile() 구현

**Week 2 (0.5주)**: File Management UI
- [ ] Frontend: FileManager.html 생성
- [ ] 파일 목록 조회
- [ ] 썸네일 표시
- [ ] 업로드 프로그레스 바

---

## 5. Dependencies

### 5.1 Prerequisites

**Step 2 완료 사항**:
- ✅ MobileUIService.gs
- ✅ BackupService.gs
- ✅ SearchService.gs
- ✅ DashboardService.gs
- ✅ Responsive.css, Mobile.css
- ✅ manifest.json

**기존 Service 활용**:
- StudentService.gs (학생 데이터 조회)
- ExamService.gs (TOPIK 성적 조회)
- ConsultService.gs (상담 기록 조회)
- I18nService.gs (다국어 지원)

### 5.2 External Dependencies

**Google APIs**:
- Google Calendar API v3
- Google Drive API v3
- Gmail API (이메일 발송)

**JavaScript Libraries**:
- Chart.js 3.9 (기존 사용 중)
- jsPDF (PDF 생성)
- html2canvas (차트 → 이미지 변환)

**외부 서비스** (선택적):
- Aligo/Coolsms (국내 알림톡/SMS)
- Twilio (해외 SMS)

---

## 6. Risk Management

### 6.1 Technical Risks

**Risk 1**: Google API Quota 제한
- **Impact**: High
- **Probability**: Medium
- **Mitigation**:
  - Drive API: 일일 1000 requests (무료)
  - Calendar API: 일일 1,000,000 requests (무료)
  - 학생 100명 기준 충분, 1000명 초과 시 유료 전환 필요
  - Batch 처리로 API 호출 최소화

**Risk 2**: 외부 알림 서비스 비용
- **Impact**: Medium
- **Probability**: High
- **Mitigation**:
  - 1차: 이메일 알림 (무료)
  - 2차: 알림톡/SMS (선택적 유료)
  - 월 예산 설정 (100명 기준 월 5만원)

**Risk 3**: 파일 저장 용량 초과
- **Impact**: Medium
- **Probability**: Medium
- **Mitigation**:
  - Google Drive 무료 15GB
  - 학생 1명당 평균 50MB → 300명 수용
  - 초과 시 Google Workspace 유료 전환 (월 $6/user)

### 6.2 Schedule Risks

**Risk 4**: Google API 연동 지연
- **Impact**: High
- **Probability**: Medium
- **Mitigation**:
  - OAuth 2.0 설정 사전 완료
  - GCP Console 프로젝트 미리 생성
  - 테스트 계정으로 사전 검증

---

## 7. Success Metrics

### 7.1 Feature Adoption

**분석 리포트**:
- 주간 리포트 조회: 주 5회 이상
- Custom Report 생성: 월 10회 이상
- PDF 다운로드: 월 20회 이상

**알림 시스템**:
- 알림 발송 성공률: >95%
- 알림 읽음률: >80%
- 비자 연장 누락: 0건

**파일 관리**:
- 파일 업로드: 학생당 평균 5개
- 파일 조회: 월 50회 이상
- 다운로드 성공률: >98%

### 7.2 Performance

- 코호트 분석: 1000명 데이터 <5초
- 알림 발송: 1000건 <10분
- 파일 업로드: 10MB <30초

### 7.3 Quality

- Match Rate 목표: ≥90%
- Bug Rate: <1% (중대한 버그 0건)
- API Error Rate: <1%

---

## 8. Testing Strategy

### 8.1 Unit Testing

**분석 함수**:
- getCohortAnalysis(): 연도별 그룹 비교 정확도
- getTrendAnalysis(): 월별 집계 정확도
- getFunnelAnalysis(): 전환율 계산 정확도

**알림 함수**:
- sendNotification(): 이메일/SMS 발송 성공
- checkUpcomingEvents(): D-30/14/7/1 필터링 정확도

**파일 함수**:
- uploadFile(): 파일 크기/형식 검증
- downloadFile(): 다운로드 URL 생성

### 8.2 Integration Testing

**Google Calendar API**:
- 일정 생성 → 조회 → 수정 → 삭제
- Time Zone 처리 (Asia/Seoul)

**Google Drive API**:
- 폴더 생성 → 파일 업로드 → 다운로드 → 삭제
- 권한 관리 (anyone with link)

### 8.3 Performance Testing

- 1000명 데이터 분석 부하 테스트
- 1000건 알림 발송 부하 테스트
- 동시 10개 파일 업로드 테스트

---

## 9. Rollout Plan

### 9.1 Development Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Analytics (Cohort/Trend) | AnalyticsService.gs, Analytics.html |
| 2 | Analytics (Funnel/Report) | Report Builder, PDF Export |
| 3 | Schedule (Calendar) | ScheduleService.gs, Calendar.html |
| 4 | Schedule (Notification) | Notifications 시트, Email/SMS |
| 5 | Files (Upload/Download) | FileService.gs, Files 시트 |
| 6 | Files (Management UI) | FileManager.html, Thumbnail |
| 7 | Testing & QA | Gap Analysis, Bug Fix |

**Total Duration**: 7주 (1.75개월)

### 9.2 Deployment

1. **Phase 1**: Analytics (Week 1-2)
   - clasp push
   - Gap Analysis
   - User Acceptance Testing (UAT)

2. **Phase 2**: Schedule (Week 3-4)
   - clasp push
   - Time Trigger 설정
   - 알림 테스트 (실제 발송)

3. **Phase 3**: Files (Week 5-6)
   - clasp push
   - Drive API 권한 승인
   - 파일 업로드 테스트

4. **Final**: Integration Testing (Week 7)
   - 전체 기능 통합 테스트
   - Performance 테스트
   - 사용자 교육

---

## 10. Appendix

### 10.1 Related Documents

- `docs/02-design/features/step3-high-priority-features.design.md` (생성 예정)
- `docs/archive/2026-02/step2-high-priority-features/` (참조)

### 10.2 References

**Google APIs**:
- [Calendar API v3 Docs](https://developers.google.com/calendar/api/v3/reference)
- [Drive API v3 Docs](https://developers.google.com/drive/api/v3/reference)

**Chart.js**:
- [Chart.js Docs](https://www.chartjs.org/docs/latest/)

**jsPDF**:
- [jsPDF Docs](https://github.com/parallax/jsPDF)

### 10.3 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 3.0 | 2026-02-16 | Claude | Initial Plan for Step 3 |

---

**Created by**: bkit PDCA System
**Project Level**: Dynamic
**Estimated Completion**: 2026-04-06 (7주 후)
