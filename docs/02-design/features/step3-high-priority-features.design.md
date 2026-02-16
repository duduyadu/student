# Step 3 - High Priority Features Design

> **Feature**: 고급 분석 + 일정 관리 + 파일 관리
> **Version**: 3.0
> **Created**: 2026-02-16
> **PDCA Phase**: Design
> **Level**: Dynamic
> **Plan Document**: [step3-high-priority-features.plan.md](../../01-plan/features/step3-high-priority-features.plan.md)

---

## 1. Feature Overview

### 1.1 Design Goals

**3개 High Priority Features**:
1. **고급 데이터 분석 및 리포팅** (2주) - 데이터 기반 의사결정
2. **일정 관리 및 알림 시스템** (2주) - 업무 자동화
3. **파일 업로드 및 관리** (1.5주) - 문서 중앙 관리

**Prerequisites**: step2-high-priority-features 완료 (Match Rate: 93.4%)

### 1.2 Implementation Scope

**새로운 Service 파일** (3개):
- AnalyticsService.gs (5 APIs)
- ScheduleService.gs (6 APIs)
- FileService.gs (5 APIs)

**새로운 Sheet** (2개):
- Notifications (알림 이력)
- Files (파일 메타데이터)

**Frontend** (3개):
- Analytics.html (분석 대시보드)
- Calendar.html (일정 관리)
- FileManager.html (파일 관리)

**External APIs**:
- Google Calendar API v3
- Google Drive API v3
- Gmail API

---

## 2. API Design

### 2.1 AnalyticsService API

#### `getCohortAnalysis(filters)`

**Purpose**: 코호트 분석 - 입학 연도별 학생 그룹 비교

**Parameters**:
```javascript
{
  cohortType: string,     // "year" | "agency" | "custom"
  metric: string,         // "topik_improvement" | "target_change" | "consult_count"
  startYear: number,      // 2020~2026
  endYear: number,        // 2020~2026
  agencyCodes: string[]   // (optional) 유학원 필터
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    cohorts: [
      {
        cohortId: string,        // "2024" | "HANOI" | "Custom-1"
        cohortName: string,      // "2024년 입학생" | "하노이 유학원"
        studentCount: number,    // 학생 수
        metricValue: number,     // 지표 값
        metricLabel: string,     // "TOPIK 평균 향상: +1.2등급"
        breakdown: [             // 세부 분석
          { label: string, value: number }
        ]
      }
    ],
    chartData: {               // Chart.js 데이터
      labels: string[],
      datasets: [{
        label: string,
        data: number[],
        backgroundColor: string[]
      }]
    }
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증 (_validateSession)
2. 권한 검증 (master/agency)
3. Students 시트 읽기
4. cohortType에 따라 그룹핑:
   - year: EnrollmentDate 연도별
   - agency: AgencyCode별
   - custom: 사용자 정의 조건
5. ExamResults 시트 조인 (TOPIK 성적)
6. Consultations 시트 조인 (상담 횟수)
7. TargetHistory 시트 조인 (목표 변경)
8. metric 계산:
   - topik_improvement: 첫 시험 → 최신 시험 등급 차이
   - target_change: 목표 대학 변경 횟수
   - consult_count: 총 상담 횟수
9. Chart.js 데이터 생성
10. 결과 반환
```

**Example**:
```javascript
const result = getCohortAnalysis({
  cohortType: "year",
  metric: "topik_improvement",
  startYear: 2024,
  endYear: 2026
});

// Returns:
// {
//   success: true,
//   data: {
//     cohorts: [
//       { cohortId: "2024", cohortName: "2024년 입학생", studentCount: 50, metricValue: 1.2, ... },
//       { cohortId: "2025", cohortName: "2025년 입학생", studentCount: 80, metricValue: 1.5, ... },
//       { cohortId: "2026", cohortName: "2026년 입학생", studentCount: 30, metricValue: 0.8, ... }
//     ],
//     chartData: { labels: ["2024", "2025", "2026"], datasets: [...] }
//   }
// }
```

**Convention**:
- i18n 키: `analytics_cohort_*`
- Error Key: `err_analytics_cohort_failed`
- Audit Log: Type = "ANALYTICS", Action = "CohortAnalysis"

---

#### `getTrendAnalysis(period, metric)`

**Purpose**: 트렌드 분석 - 시계열 데이터 추이

**Parameters**:
```javascript
{
  period: string,         // "monthly" | "quarterly" | "yearly"
  metric: string,         // "new_students" | "topik_pass_rate" | "consult_frequency"
  startDate: string,      // "YYYY-MM-DD"
  endDate: string,        // "YYYY-MM-DD"
  agencyCodes: string[]   // (optional) 유학원 필터
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    trends: [
      {
        periodId: string,      // "2024-01" | "2024-Q1" | "2024"
        periodLabel: string,   // "2024년 1월" | "2024년 1분기" | "2024년"
        value: number,         // 지표 값
        change: number,        // 전 기간 대비 변화 (%)
        changeLabel: string    // "+15%" | "-5%"
      }
    ],
    chartData: {             // Chart.js Line 차트
      labels: string[],
      datasets: [{
        label: string,
        data: number[],
        borderColor: string,
        fill: boolean
      }]
    },
    summary: {
      average: number,
      min: number,
      max: number,
      totalGrowth: number    // 전체 기간 성장률 (%)
    }
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증
3. 날짜 범위를 period에 따라 분할:
   - monthly: 월 단위 (2024-01, 2024-02, ...)
   - quarterly: 분기 (2024-Q1, 2024-Q2, ...)
   - yearly: 연도 (2024, 2025, ...)
4. 각 기간별 데이터 집계:
   - new_students: Students.EnrollmentDate 카운트
   - topik_pass_rate: ExamResults에서 Level >= 3 비율
   - consult_frequency: Consultations 카운트
5. 전 기간 대비 변화율 계산
6. Chart.js Line 차트 데이터 생성
7. 요약 통계 (평균, 최소, 최대, 총 성장률)
8. 결과 반환
```

**Example**:
```javascript
const result = getTrendAnalysis("monthly", "new_students", "2024-01-01", "2024-12-31");

// Returns:
// {
//   success: true,
//   data: {
//     trends: [
//       { periodId: "2024-01", periodLabel: "2024년 1월", value: 15, change: 0, changeLabel: "-" },
//       { periodId: "2024-02", periodLabel: "2024년 2월", value: 18, change: 20, changeLabel: "+20%" },
//       ...
//     ],
//     chartData: { ... },
//     summary: { average: 16.5, min: 10, max: 25, totalGrowth: 35 }
//   }
// }
```

**Convention**:
- i18n 키: `analytics_trend_*`
- Error Key: `err_analytics_trend_failed`
- Performance: 1000명 데이터 < 3초

---

#### `getFunnelAnalysis(startDate, endDate)`

**Purpose**: 깔때기 분석 - 단계별 전환율 (등록 → TOPIK → 대학 입학)

**Parameters**:
```javascript
{
  startDate: string,      // "YYYY-MM-DD"
  endDate: string,        // "YYYY-MM-DD"
  agencyCodes: string[]   // (optional) 유학원 필터
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    funnel: [
      {
        stage: string,        // "enrollment" | "topik_3plus" | "university_admission"
        stageLabel: string,   // "등록" | "TOPIK 3급 이상" | "대학 입학"
        count: number,        // 해당 단계 학생 수
        percentage: number,   // 전체 대비 비율 (%)
        conversionRate: number, // 이전 단계 대비 전환율 (%)
        dropoffRate: number,  // 이탈률 (%)
        dropoffCount: number  // 이탈 학생 수
      }
    ],
    chartData: {            // Chart.js Funnel/Bar 차트
      labels: string[],
      datasets: [{
        label: string,
        data: number[],
        backgroundColor: string[]
      }]
    },
    insights: {
      bottleneck: string,   // 가장 큰 이탈 구간
      overallConversion: number  // 전체 전환율 (%)
    }
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증
3. Stage 1: 등록
   - Students 시트에서 EnrollmentDate 범위 내 학생 카운트
4. Stage 2: TOPIK 3급 이상
   - ExamResults 시트에서 Level >= "TOPIK 3" 학생 필터링
5. Stage 3: 대학 입학 (가정: Status = "Graduated" or TargetHistory에 입학 기록)
   - Students.Status = "Graduated" 카운트
6. 각 단계별 비율 및 전환율 계산:
   - percentage: (stage_count / stage1_count) * 100
   - conversionRate: (stage_count / prev_stage_count) * 100
   - dropoffRate: 100 - conversionRate
7. Bottleneck 식별 (가장 낮은 전환율)
8. Chart.js 데이터 생성
9. 결과 반환
```

**Example**:
```javascript
const result = getFunnelAnalysis("2024-01-01", "2024-12-31");

// Returns:
// {
//   success: true,
//   data: {
//     funnel: [
//       { stage: "enrollment", stageLabel: "등록", count: 100, percentage: 100, conversionRate: 100, dropoffRate: 0, dropoffCount: 0 },
//       { stage: "topik_3plus", stageLabel: "TOPIK 3급 이상", count: 70, percentage: 70, conversionRate: 70, dropoffRate: 30, dropoffCount: 30 },
//       { stage: "university_admission", stageLabel: "대학 입학", count: 50, percentage: 50, conversionRate: 71.4, dropoffRate: 28.6, dropoffCount: 20 }
//     ],
//     chartData: { ... },
//     insights: { bottleneck: "topik_3plus", overallConversion: 50 }
//   }
// }
```

**Convention**:
- i18n 키: `analytics_funnel_*`
- Error Key: `err_analytics_funnel_failed`

---

#### `generateCustomReport(template, filters)`

**Purpose**: 사용자 정의 보고서 생성

**Parameters**:
```javascript
{
  template: string,       // "weekly" | "monthly" | "custom"
  filters: {
    agencyCodes: string[],
    dateFrom: string,     // "YYYY-MM-DD"
    dateTo: string,
    includeCohort: boolean,
    includeTrend: boolean,
    includeFunnel: boolean,
    includeStudentList: boolean
  },
  format: string          // "html" | "pdf" | "excel"
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    reportId: string,     // "REPORT-YYYYMMDD-XXXXX"
    reportName: string,   // "주간 리포트 (2024-01-01 ~ 2024-01-07)"
    generatedAt: string,  // ISO 8601
    sections: [
      {
        sectionType: string,  // "cohort" | "trend" | "funnel" | "studentList"
        sectionTitle: string,
        data: object        // 각 분석 결과
      }
    ],
    downloadUrl: string   // (format = "pdf" | "excel") Google Drive 다운로드 링크
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증
3. template에 따라 기본 필터 설정:
   - weekly: 최근 7일
   - monthly: 최근 30일
   - custom: 사용자 지정
4. 포함할 섹션별로 API 호출:
   - includeCohort → getCohortAnalysis()
   - includeTrend → getTrendAnalysis()
   - includeFunnel → getFunnelAnalysis()
   - includeStudentList → StudentService.getStudentList()
5. 섹션 데이터 병합
6. format에 따라 출력:
   - html: HTML 문자열 반환
   - pdf: exportReportToPDF() 호출
   - excel: CSV 생성 (BackupService 활용)
7. reportId 생성 (REPORT-YYYYMMDD-XXXXX)
8. 결과 반환
```

**Example**:
```javascript
const result = generateCustomReport("weekly", {
  agencyCodes: ["HANOI"],
  includeCohort: true,
  includeTrend: true
}, "html");

// Returns:
// {
//   success: true,
//   data: {
//     reportId: "REPORT-20240116-12345",
//     reportName: "주간 리포트 (2024-01-10 ~ 2024-01-16)",
//     generatedAt: "2024-01-16T10:00:00Z",
//     sections: [
//       { sectionType: "cohort", sectionTitle: "코호트 분석", data: {...} },
//       { sectionType: "trend", sectionTitle: "트렌드 분석", data: {...} }
//     ],
//     downloadUrl: null
//   }
// }
```

**Convention**:
- i18n 키: `analytics_report_*`
- Error Key: `err_analytics_report_failed`

---

#### `exportReportToPDF(reportData)`

**Purpose**: 보고서를 PDF로 변환 및 Google Drive 업로드

**Parameters**:
```javascript
{
  reportId: string,
  reportName: string,
  sections: array,        // generateCustomReport()의 sections
  logo: string            // (optional) Base64 이미지
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    fileId: string,       // Google Drive File ID
    fileName: string,     // "report-20240116-12345.pdf"
    fileUrl: string,      // Google Drive 공유 링크
    fileSize: number      // Bytes
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. HTML 템플릿 생성:
   - 헤더: 로고, 제목, 생성일
   - 섹션별 내용:
     - 코호트: 표 + 차트 이미지
     - 트렌드: 차트 이미지 + 요약
     - 깔때기: 차트 이미지 + Insights
     - 학생 목록: 표
   - 푸터: 저작권, 생성 정보
3. Chart.js 차트를 이미지로 변환 (html2canvas 사용)
4. jsPDF로 PDF 생성:
   - addPage()로 페이지 추가
   - addImage()로 차트 삽입
   - text()로 텍스트 추가
5. PDF를 Blob으로 변환
6. Google Drive API로 업로드:
   - 폴더: "Reports" (자동 생성)
   - 권한: "anyone with link" (읽기 전용)
7. 파일 ID 및 공유 링크 반환
```

**Example**:
```javascript
const result = exportReportToPDF({
  reportId: "REPORT-20240116-12345",
  reportName: "주간 리포트",
  sections: [...]
});

// Returns:
// {
//   success: true,
//   data: {
//     fileId: "1a2b3c4d5e6f7g8h9i0j",
//     fileName: "report-20240116-12345.pdf",
//     fileUrl: "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view",
//     fileSize: 524288
//   }
// }
```

**Convention**:
- i18n 키: `analytics_pdf_*`
- Error Key: `err_analytics_pdf_failed`
- Dependencies: jsPDF, html2canvas, Drive API

---

### 2.2 ScheduleService API

#### `createCalendarEvent(eventData)`

**Purpose**: Google Calendar에 일정 생성

**Parameters**:
```javascript
{
  studentId: string,
  eventType: string,      // "visa_expiry" | "topik_exam" | "consultation"
  title: string,
  description: string,
  startDateTime: string,  // ISO 8601 "2024-01-16T10:00:00+09:00"
  endDateTime: string,
  reminders: [            // (optional) 알림 설정
    { method: "email", minutes: 1440 },  // 1일 전
    { method: "popup", minutes: 60 }     // 1시간 전
  ]
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    eventId: string,      // Google Calendar Event ID
    calendarId: string,   // "primary" or custom calendar
    eventUrl: string,     // Google Calendar 링크
    createdAt: string
  },
  error: string,
  errorKey: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증 (master/agency)
3. studentId 유효성 검사
4. Google Calendar API 호출:
   - CalendarApp.getDefaultCalendar() 또는 특정 Calendar
   - createEvent(title, startTime, endTime, options)
5. Event ID 및 URL 생성
6. 감사 로그 기록
7. 결과 반환
```

**Example**:
```javascript
const result = createCalendarEvent({
  studentId: "260010001",
  eventType: "visa_expiry",
  title: "[비자 만료] 학생 26-001 - 홍길동",
  description: "비자 연장 신청 필요",
  startDateTime: "2024-06-15T09:00:00+09:00",
  endDateTime: "2024-06-15T10:00:00+09:00",
  reminders: [{ method: "email", minutes: 1440 }]
});

// Returns:
// {
//   success: true,
//   data: {
//     eventId: "abc123def456",
//     calendarId: "primary",
//     eventUrl: "https://calendar.google.com/event?eid=...",
//     createdAt: "2024-01-16T10:00:00Z"
//   }
// }
```

**Convention**:
- i18n 키: `schedule_event_created`
- Error Key: `err_schedule_create_failed`
- Audit Log: Type = "SCHEDULE", Action = "CreateEvent"

---

#### `listCalendarEvents(startDate, endDate)`

**Purpose**: 일정 목록 조회 (월간/주간/일간 뷰)

**Parameters**:
```javascript
{
  startDate: string,      // "YYYY-MM-DD"
  endDate: string,        // "YYYY-MM-DD"
  eventTypes: string[],   // (optional) ["visa_expiry", "topik_exam", "consultation"]
  studentIds: string[]    // (optional) 특정 학생 필터
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    events: [
      {
        eventId: string,
        studentId: string,
        studentName: string,
        eventType: string,
        title: string,
        description: string,
        startDateTime: string,
        endDateTime: string,
        status: string,     // "confirmed" | "cancelled"
        eventUrl: string
      }
    ],
    totalCount: number
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증
3. Google Calendar API 호출:
   - CalendarApp.getDefaultCalendar()
   - getEvents(startDate, endDate)
4. eventTypes 필터 적용 (제목 또는 description에 [비자 만료], [TOPIK 시험] 포함 여부)
5. studentIds 필터 적용
6. 권한별 필터링:
   - master: 모든 일정
   - agency: 자기 유학원 학생 일정만
7. 결과 정렬 (startDateTime 오름차순)
8. 반환
```

**Example**:
```javascript
const result = listCalendarEvents("2024-01-01", "2024-01-31", ["visa_expiry"]);

// Returns:
// {
//   success: true,
//   data: {
//     events: [
//       {
//         eventId: "abc123",
//         studentId: "260010001",
//         studentName: "홍길동",
//         eventType: "visa_expiry",
//         title: "[비자 만료] 학생 26-001 - 홍길동",
//         description: "비자 연장 신청 필요",
//         startDateTime: "2024-01-15T09:00:00+09:00",
//         endDateTime: "2024-01-15T10:00:00+09:00",
//         status: "confirmed",
//         eventUrl: "https://calendar.google.com/event?eid=..."
//       },
//       ...
//     ],
//     totalCount: 5
//   }
// }
```

**Convention**:
- i18n 키: `schedule_list_*`
- Error Key: `err_schedule_list_failed`

---

#### `updateCalendarEvent(eventId, eventData)`

**Purpose**: 일정 수정

**Parameters**:
```javascript
{
  eventId: string,
  title: string,          // (optional)
  description: string,    // (optional)
  startDateTime: string,  // (optional)
  endDateTime: string,    // (optional)
  reminders: array        // (optional)
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    eventId: string,
    updatedAt: string
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증
3. eventId로 일정 조회
4. 권한 확인 (본인이 생성한 일정인지, 또는 master)
5. Google Calendar API 호출:
   - event.setTitle(title)
   - event.setDescription(description)
   - event.setTime(startDateTime, endDateTime)
6. 감사 로그 기록
7. 결과 반환
```

**Convention**:
- i18n 키: `schedule_event_updated`
- Error Key: `err_schedule_update_failed`

---

#### `deleteCalendarEvent(eventId)`

**Purpose**: 일정 삭제

**Parameters**:
```javascript
{
  eventId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    eventId: string,
    deletedAt: string
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증 (master 또는 본인 생성 일정)
3. Google Calendar API 호출:
   - event.deleteEvent()
4. 감사 로그 기록
5. 결과 반환
```

**Convention**:
- i18n 키: `schedule_event_deleted`
- Error Key: `err_schedule_delete_failed`

---

#### `sendNotification(type, studentId, daysB전)`

**Purpose**: 알림 발송 (이메일/SMS)

**Parameters**:
```javascript
{
  type: string,           // "visa_expiry" | "topik_exam" | "consultation"
  studentId: string,
  daysBefore: number,     // 30 | 14 | 7 | 1 | 0
  channel: string,        // "email" | "sms" | "both"
  customMessage: string   // (optional) 사용자 정의 메시지
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    notificationId: string,  // "NOTI-YYYYMMDD-XXXXX"
    sentAt: string,
    sentTo: string,          // 이메일 또는 전화번호
    channel: string,
    status: string           // "sent" | "failed"
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증 (Time Trigger의 경우 bypass)
2. studentId로 학생 정보 조회
3. type에 따라 메시지 템플릿 선택:
   - visa_expiry: "비자가 {daysBefore}일 후 만료됩니다. 연장 신청을 서둘러주세요."
   - topik_exam: "TOPIK 시험이 {daysBefore}일 후입니다. 준비하세요!"
   - consultation: "상담 일정이 {daysBefore}일 후입니다."
4. i18n 적용 (학생 언어: KO/VN)
5. channel에 따라 발송:
   - email: GmailApp.sendEmail()
   - sms: 외부 API (Aligo/Coolsms/Twilio)
6. Notifications 시트에 이력 기록:
   - NotificationID, StudentID, Type, Channel, SentAt, Status, ErrorMsg
7. 발송 결과 반환
```

**Example**:
```javascript
const result = sendNotification("visa_expiry", "260010001", 30, "email");

// Returns:
// {
//   success: true,
//   data: {
//     notificationId: "NOTI-20240116-12345",
//     sentAt: "2024-01-16T10:00:00Z",
//     sentTo: "student@example.com",
//     channel: "email",
//     status: "sent"
//   }
// }
```

**Convention**:
- i18n 키: `notification_{type}_template`
- Error Key: `err_notification_send_failed`
- Sheet: Notifications

---

#### `getNotificationHistory(filters)`

**Purpose**: 알림 이력 조회

**Parameters**:
```javascript
{
  studentId: string,      // (optional)
  type: string,           // (optional)
  startDate: string,      // (optional)
  endDate: string,        // (optional)
  status: string          // (optional) "sent" | "failed"
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    notifications: [
      {
        notificationId: string,
        studentId: string,
        studentName: string,
        type: string,
        channel: string,
        sentAt: string,
        sentTo: string,
        status: string,
        errorMsg: string    // (status = "failed")
      }
    ],
    totalCount: number,
    successRate: number   // (%)
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증
3. Notifications 시트 읽기
4. 필터 적용 (studentId, type, startDate, endDate, status)
5. 권한별 필터링:
   - master: 모든 이력
   - agency: 자기 유학원 학생만
6. Students 시트 조인 (학생 이름)
7. 성공률 계산 (sent / total * 100)
8. 결과 정렬 (sentAt 내림차순)
9. 반환
```

**Convention**:
- i18n 키: `notification_history_*`
- Error Key: `err_notification_history_failed`

---

### 2.3 FileService API

#### `uploadFile(studentId, category, file)`

**Purpose**: Google Drive에 파일 업로드

**Parameters**:
```javascript
{
  studentId: string,
  category: string,       // "certificate" | "admin" | "photo" | "other"
  file: {
    name: string,
    mimeType: string,     // "image/jpeg" | "image/png" | "application/pdf"
    content: Blob         // Base64 or Blob
  }
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    fileId: string,       // Files 시트의 FileID
    driveFileId: string,  // Google Drive File ID
    fileName: string,
    fileUrl: string,      // Google Drive 공유 링크
    uploadedAt: string
  },
  error: string,
  errorKey: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증 (master/agency, 본인 학생만)
3. 파일 유효성 검사:
   - 크기: image (10MB), pdf (50MB)
   - 형식: JPG, PNG, PDF
   - 바이러스 검사 (Drive API 자동)
4. 폴더 구조 생성 (없으면 자동 생성):
   - "StudentFiles/{studentId}/{category}/"
5. Google Drive API 업로드:
   - DriveApp.createFile(name, content, mimeType)
   - setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
6. Files 시트에 메타데이터 저장:
   - FileID (FIL-YYYYMMDD-XXXXX)
   - StudentID, Category, FileName, DriveFileID, UploadedAt, UploadedBy
7. 감사 로그 기록
8. 결과 반환
```

**Example**:
```javascript
const result = uploadFile("260010001", "certificate", {
  name: "고등학교_졸업장.pdf",
  mimeType: "application/pdf",
  content: pdfBlob
});

// Returns:
// {
//   success: true,
//   data: {
//     fileId: "FIL-20240116-12345",
//     driveFileId: "1a2b3c4d5e6f7g8h9i0j",
//     fileName: "고등학교_졸업장.pdf",
//     fileUrl: "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view",
//     uploadedAt: "2024-01-16T10:00:00Z"
//   }
// }
```

**Convention**:
- i18n 키: `file_upload_success`
- Error Key: `err_file_upload_failed`, `err_file_size_exceeded`, `err_file_invalid_format`
- Sheet: Files

---

#### `listFiles(studentId, category)`

**Purpose**: 파일 목록 조회

**Parameters**:
```javascript
{
  studentId: string,
  category: string        // (optional) "certificate" | "admin" | "photo" | "other"
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    files: [
      {
        fileId: string,
        fileName: string,
        category: string,
        fileSize: number,     // Bytes
        mimeType: string,
        uploadedAt: string,
        uploadedBy: string,
        fileUrl: string,
        thumbnailUrl: string  // (이미지만)
      }
    ],
    totalCount: number,
    totalSize: number       // Bytes
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증 (master/agency, 본인 학생만)
3. Files 시트 읽기
4. studentId 필터 적용
5. category 필터 적용 (optional)
6. Google Drive API로 파일 정보 보강:
   - 파일 크기 (getSize())
   - 썸네일 URL (getThumbnail()) - 이미지만
7. 결과 정렬 (uploadedAt 내림차순)
8. 총 용량 계산
9. 반환
```

**Convention**:
- i18n 키: `file_list_*`
- Error Key: `err_file_list_failed`

---

#### `downloadFile(fileId)`

**Purpose**: 파일 다운로드 URL 생성

**Parameters**:
```javascript
{
  fileId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    fileId: string,
    fileName: string,
    downloadUrl: string,  // Google Drive 다운로드 링크
    expiresAt: string     // (optional) 링크 만료 시간
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증 (master/agency, 본인 학생만)
3. Files 시트에서 fileId 조회
4. driveFileId로 Google Drive 파일 접근
5. 다운로드 URL 생성:
   - https://drive.google.com/uc?export=download&id={driveFileId}
6. 감사 로그 기록 (파일 다운로드)
7. 결과 반환
```

**Convention**:
- i18n 키: `file_download_*`
- Error Key: `err_file_download_failed`
- Audit Log: Type = "FILE", Action = "Download"

---

#### `deleteFile(fileId)`

**Purpose**: 파일 삭제 (Google Drive + Files 시트)

**Parameters**:
```javascript
{
  fileId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    fileId: string,
    deletedAt: string
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증 (master/agency만 가능)
3. Files 시트에서 fileId 조회
4. driveFileId로 Google Drive 파일 삭제:
   - DriveApp.getFileById(driveFileId).setTrashed(true)
5. Files 시트에서 행 삭제
6. 감사 로그 기록
7. 결과 반환
```

**Convention**:
- i18n 키: `file_delete_success`
- Error Key: `err_file_delete_failed`
- Audit Log: Type = "FILE", Action = "Delete"

---

#### `getFileThumbnail(fileId)`

**Purpose**: 이미지 파일 썸네일 URL 반환

**Parameters**:
```javascript
{
  fileId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    fileId: string,
    thumbnailUrl: string,
    fullSizeUrl: string
  },
  error: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한 검증
3. Files 시트에서 fileId 조회
4. mimeType 확인 (image/jpeg, image/png만 가능)
5. Google Drive API로 썸네일 생성:
   - DriveApp.getFileById(driveFileId).getThumbnail()
   - 크기: 200x200px
6. 원본 URL도 함께 반환
7. 결과 반환
```

**Convention**:
- i18n 키: `file_thumbnail_*`
- Error Key: `err_file_thumbnail_failed`, `err_file_not_image`

---

## 3. Database Schema

### 3.1 Notifications Sheet

**Purpose**: 알림 발송 이력 및 상태 추적

**Columns**:
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| NotificationID | String | 알림 ID (PK) | "NOTI-20240116-12345" |
| StudentID | String | 학생 ID (FK → Students) | "260010001" |
| Type | String | 알림 유형 | "visa_expiry" \| "topik_exam" \| "consultation" |
| Channel | String | 발송 채널 | "email" \| "sms" \| "both" |
| SentAt | DateTime | 발송 시각 | "2024-01-16 10:00:00" |
| SentTo | String | 수신자 (이메일/전화) | "student@example.com" |
| Status | String | 발송 상태 | "sent" \| "failed" |
| ErrorMsg | String | 실패 시 오류 메시지 | "SMTP connection failed" |
| DaysBefore | Number | 며칠 전 알림인지 | 30 \| 14 \| 7 \| 1 \| 0 |
| CreatedAt | DateTime | 생성 시각 | "2024-01-16 10:00:00" |

**Indexes**: NotificationID (PK), StudentID (FK)

**Data Retention**: 180일 (6개월) 후 자동 삭제

**Example Row**:
```
NotificationID: NOTI-20240116-12345
StudentID: 260010001
Type: visa_expiry
Channel: email
SentAt: 2024-01-16 10:00:00
SentTo: hong@example.com
Status: sent
ErrorMsg: (null)
DaysBefore: 30
CreatedAt: 2024-01-16 10:00:00
```

---

### 3.2 Files Sheet

**Purpose**: 파일 메타데이터 및 Google Drive 연결 정보

**Columns**:
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| FileID | String | 파일 ID (PK) | "FIL-20240116-12345" |
| StudentID | String | 학생 ID (FK → Students) | "260010001" |
| Category | String | 파일 카테고리 | "certificate" \| "admin" \| "photo" \| "other" |
| FileName | String | 파일명 | "고등학교_졸업장.pdf" |
| DriveFileID | String | Google Drive 파일 ID | "1a2b3c4d5e6f7g8h9i0j" |
| MimeType | String | MIME 타입 | "application/pdf" |
| FileSize | Number | 파일 크기 (Bytes) | 524288 |
| UploadedAt | DateTime | 업로드 시각 | "2024-01-16 10:00:00" |
| UploadedBy | String | 업로더 세션 ID | "sess-abc123" |

**Indexes**: FileID (PK), StudentID (FK), DriveFileID

**Data Retention**: 학생 졸업 후 3년 보관

**Example Row**:
```
FileID: FIL-20240116-12345
StudentID: 260010001
Category: certificate
FileName: 고등학교_졸업장.pdf
DriveFileID: 1a2b3c4d5e6f7g8h9i0j
MimeType: application/pdf
FileSize: 524288
UploadedAt: 2024-01-16 10:00:00
UploadedBy: sess-abc123
```

---

## 4. Frontend Design

### 4.1 Analytics.html

**Purpose**: 고급 분석 대시보드 (Cohort/Trend/Funnel)

**UI Components**:
1. **분석 유형 탭**
   - 코호트 분석
   - 트렌드 분석
   - 깔때기 분석
   - 사용자 정의 리포트

2. **필터 패널** (좌측 사이드바)
   - 날짜 범위 선택 (Date Picker)
   - 유학원 선택 (Multi-Select)
   - 분석 지표 선택 (Dropdown)
   - "분석 실행" 버튼

3. **차트 영역** (중앙)
   - Chart.js 차트 (Line/Bar/Pie/Funnel)
   - 범례 및 툴팁
   - 이미지 다운로드 버튼

4. **데이터 테이블** (하단)
   - 분석 결과 표
   - 정렬/필터링 가능
   - CSV 내보내기 버튼

5. **리포트 생성** (우측 패널)
   - 포함할 섹션 선택 (Checkbox)
   - 포맷 선택 (HTML/PDF/Excel)
   - "리포트 생성" 버튼

**Responsive**:
- 모바일: 세로 스택, 차트 축소
- 태블릿: 2컬럼
- 데스크톱: 3컬럼 레이아웃

**i18n Keys**:
- `analytics_cohort_title`: "코호트 분석"
- `analytics_trend_title`: "트렌드 분석"
- `analytics_funnel_title`: "깔때기 분석"
- `analytics_filter_daterange`: "날짜 범위"
- `analytics_filter_agency`: "유학원"
- `analytics_btn_run`: "분석 실행"
- `analytics_btn_export_csv`: "CSV 내보내기"
- `analytics_btn_generate_report`: "리포트 생성"

---

### 4.2 Calendar.html

**Purpose**: 일정 관리 및 알림 설정

**UI Components**:
1. **캘린더 뷰** (중앙)
   - 월간/주간/일간 뷰 토글
   - Google Calendar 스타일
   - 일정 클릭 → 상세 모달

2. **일정 추가** (상단 버튼)
   - "일정 추가" 버튼
   - 모달: 제목, 설명, 시작/종료 시간, 알림 설정

3. **일정 목록** (좌측 사이드바)
   - 오늘/내일/이번 주 일정
   - 유형별 필터 (비자/TOPIK/상담)
   - 클릭 → 상세 모달

4. **알림 설정** (우측 패널)
   - 자동 알림 활성화/비활성화
   - 비자 만료: D-30/14/7/1
   - TOPIK 시험: D-30/7/1
   - 상담 일정: D-1, 당일 09:00
   - 알림 채널 선택 (이메일/SMS)

5. **알림 이력** (하단)
   - 최근 발송 이력 (성공/실패)
   - 재발송 버튼

**Responsive**:
- 모바일: 캘린더만, 사이드바 숨김
- 태블릿: 2컬럼
- 데스크톱: 3컬럼

**i18n Keys**:
- `calendar_title`: "일정 관리"
- `calendar_btn_add_event`: "일정 추가"
- `calendar_view_month`: "월간"
- `calendar_view_week`: "주간"
- `calendar_view_day`: "일간"
- `calendar_event_type_visa`: "비자 만료"
- `calendar_event_type_topik`: "TOPIK 시험"
- `calendar_event_type_consult`: "상담 일정"
- `calendar_notification_settings`: "알림 설정"
- `calendar_notification_history`: "알림 이력"

---

### 4.3 FileManager.html

**Purpose**: 파일 업로드 및 관리

**UI Components**:
1. **파일 업로드** (상단)
   - "파일 업로드" 버튼 (클릭 → 파일 선택)
   - Drag & Drop 영역
   - 업로드 프로그레스 바
   - 카테고리 선택 (Dropdown)

2. **파일 목록** (중앙)
   - 카드 뷰 (썸네일 + 파일명 + 정보)
   - 리스트 뷰 (표 형식)
   - 카테고리별 탭 (전체/증명서/행정/사진/기타)

3. **파일 카드** (개별)
   - 썸네일 (이미지) 또는 아이콘 (PDF)
   - 파일명
   - 크기, 업로드 날짜
   - 액션: 다운로드, 삭제, 미리보기

4. **미리보기 모달**
   - 이미지: 확대/축소
   - PDF: Google Drive Viewer iframe

5. **용량 표시** (하단)
   - 학생별 총 용량
   - 프로그레스 바 (15GB 무료 한도 대비)

**Responsive**:
- 모바일: 1컬럼 카드
- 태블릿: 2컬럼 카드
- 데스크톱: 3-4컬럼 카드

**i18n Keys**:
- `file_title`: "파일 관리"
- `file_btn_upload`: "파일 업로드"
- `file_drag_drop`: "파일을 드래그하거나 클릭하세요"
- `file_category_certificate`: "증명서"
- `file_category_admin`: "행정"
- `file_category_photo`: "사진"
- `file_category_other`: "기타"
- `file_btn_download`: "다운로드"
- `file_btn_delete`: "삭제"
- `file_btn_preview`: "미리보기"
- `file_total_size`: "총 용량"

---

## 5. External API Integration

### 5.1 Google Calendar API v3

**Setup**:
1. GCP Console에서 Calendar API 활성화
2. OAuth 2.0 클라이언트 ID 생성 (Web Application)
3. 승인된 리디렉션 URI 추가
4. GAS 프로젝트에 Scope 추가:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

**Authentication**:
```javascript
// OAuth 2.0 Flow
function authorizeCalendar() {
  const service = OAuth2.createService('calendar')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')
    .setClientId('YOUR_CLIENT_ID')
    .setClientSecret('YOUR_CLIENT_SECRET')
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('https://www.googleapis.com/auth/calendar');

  if (!service.hasAccess()) {
    const authorizationUrl = service.getAuthorizationUrl();
    return HtmlService.createHtmlOutput('<a href="' + authorizationUrl + '" target="_blank">Authorize</a>');
  }
}
```

**API Usage**:
```javascript
// 일정 생성
function createEvent(title, startTime, endTime) {
  const calendar = CalendarApp.getDefaultCalendar();
  const event = calendar.createEvent(title, startTime, endTime, {
    description: '학생 관리 시스템에서 생성',
    location: '서울, 대한민국',
    guests: 'admin@example.com',
    sendInvites: true
  });
  return event.getId();
}

// 일정 조회
function listEvents(startDate, endDate) {
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startDate, endDate);
  return events.map(event => ({
    id: event.getId(),
    title: event.getTitle(),
    start: event.getStartTime().toISOString(),
    end: event.getEndTime().toISOString()
  }));
}
```

**Rate Limits**:
- 무료: 1,000,000 requests/day
- Per user: 500 requests/100 seconds

---

### 5.2 Google Drive API v3

**Setup**:
1. GCP Console에서 Drive API 활성화
2. OAuth 2.0 클라이언트 ID 생성
3. GAS 프로젝트에 Scope 추가:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`

**API Usage**:
```javascript
// 파일 업로드
function uploadFile(fileName, content, mimeType) {
  const folder = DriveApp.getFoldersByName('StudentFiles').next();
  const file = folder.createFile(fileName, content, mimeType);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    id: file.getId(),
    url: file.getUrl()
  };
}

// 폴더 생성
function createFolder(folderName) {
  const parentFolder = DriveApp.getRootFolder();
  const folder = parentFolder.createFolder(folderName);
  return folder.getId();
}

// 파일 삭제
function deleteFile(fileId) {
  const file = DriveApp.getFileById(fileId);
  file.setTrashed(true);
}
```

**Rate Limits**:
- 무료: 1,000 requests/day (파일 업로드)
- Quota: 15GB 저장 공간

**Storage Strategy**:
- 학생당 평균 50MB → 300명 수용
- 초과 시 Google Workspace 유료 전환 (월 $6/user, 100GB)

---

### 5.3 Gmail API (Email Notification)

**Setup**:
1. GCP Console에서 Gmail API 활성화
2. GAS 내장 GmailApp 사용 (별도 인증 불필요)

**API Usage**:
```javascript
// 이메일 발송
function sendEmail(to, subject, body) {
  GmailApp.sendEmail(to, subject, body, {
    htmlBody: body,
    name: 'AJU E&J 학생관리시스템',
    replyTo: 'noreply@ajuenj.com'
  });
}

// 이메일 템플릿 (다국어)
function getEmailTemplate(type, lang, params) {
  const templates = {
    visa_expiry: {
      ko: `<h2>비자 만료 알림</h2><p>안녕하세요, ${params.studentName}님.</p><p>비자가 <strong>${params.daysBefore}일</strong> 후 만료됩니다.</p>`,
      vi: `<h2>Thông báo hết hạn visa</h2><p>Xin chào ${params.studentName},</p><p>Visa của bạn sẽ hết hạn sau <strong>${params.daysBefore} ngày</strong>.</p>`
    },
    topik_exam: {
      ko: `<h2>TOPIK 시험 알림</h2><p>안녕하세요, ${params.studentName}님.</p><p>TOPIK 시험이 <strong>${params.daysBefore}일</strong> 후입니다.</p>`,
      vi: `<h2>Thông báo thi TOPIK</h2><p>Xin chào ${params.studentName},</p><p>Kỳ thi TOPIK còn <strong>${params.daysBefore} ngày</strong>.</p>`
    }
  };
  return templates[type][lang];
}
```

**Rate Limits**:
- 무료: 100 emails/day
- Google Workspace: 2,000 emails/day

---

### 5.4 SMS API (Aligo/Coolsms/Twilio)

**선택적 통합** (유료 서비스)

**Aligo (국내 SMS)**:
```javascript
function sendSMS_Aligo(to, message) {
  const url = 'https://apis.aligo.in/send/';
  const payload = {
    key: 'YOUR_API_KEY',
    user_id: 'YOUR_USER_ID',
    sender: '02-1234-5678',
    receiver: to,
    msg: message,
    msg_type: 'SMS'
  };

  const options = {
    method: 'post',
    payload: payload
  };

  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}
```

**Twilio (베트남 SMS)**:
```javascript
function sendSMS_Twilio(to, message) {
  const accountSid = 'YOUR_ACCOUNT_SID';
  const authToken = 'YOUR_AUTH_TOKEN';
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const payload = {
    From: '+12345678900',
    To: to,
    Body: message
  };

  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(accountSid + ':' + authToken)
    },
    payload: payload
  };

  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}
```

**비용 예상** (100명 기준):
- 알림톡: 15원/건 → 월 100건 = 1,500원
- SMS (국내): 20원/건 → 월 100건 = 2,000원
- SMS (베트남): $0.05/건 → 월 100건 = $5

---

## 6. Implementation Guide

### 6.1 Week 1-2: Analytics (Cohort/Trend/Funnel/Report)

**Day 1-2**: AnalyticsService.gs 생성
- [ ] getCohortAnalysis() 구현
- [ ] getTrendAnalysis() 구현
- [ ] Unit Test: testCohortAnalysis(), testTrendAnalysis()

**Day 3-4**: Funnel & Report
- [ ] getFunnelAnalysis() 구현
- [ ] generateCustomReport() 구현
- [ ] Unit Test: testFunnelAnalysis()

**Day 5-7**: PDF Export
- [ ] exportReportToPDF() 구현
- [ ] jsPDF + html2canvas 통합
- [ ] Google Drive 업로드 테스트

**Day 8-10**: Frontend (Analytics.html)
- [ ] 분석 유형 탭 UI
- [ ] 필터 패널 (날짜, 유학원, 지표)
- [ ] Chart.js 차트 통합 (Line, Bar, Funnel)
- [ ] 데이터 테이블 + CSV 내보내기

**Day 11-14**: Integration & Testing
- [ ] Backend-Frontend 연동
- [ ] Performance 테스트 (1000명 데이터)
- [ ] i18n 적용 (한국어/베트남어)
- [ ] clasp push & 배포

---

### 6.2 Week 3-4: Schedule (Calendar/Notification)

**Day 1-3**: Google Calendar API 설정
- [ ] GCP Console 프로젝트 생성
- [ ] Calendar API 활성화
- [ ] OAuth 2.0 클라이언트 ID 생성
- [ ] GAS Scope 추가 및 권한 승인

**Day 4-6**: ScheduleService.gs 생성
- [ ] createCalendarEvent() 구현
- [ ] listCalendarEvents() 구현
- [ ] updateCalendarEvent() 구현
- [ ] deleteCalendarEvent() 구현
- [ ] Unit Test: testCalendarCRUD()

**Day 7-10**: Notification System
- [ ] Notifications 시트 생성
- [ ] sendNotification() 구현
- [ ] 이메일 템플릿 (KO/VN)
- [ ] SMS API 통합 (Aligo/Twilio, 선택적)
- [ ] getNotificationHistory() 구현

**Day 11-13**: Time Trigger & Auto Notification
- [ ] checkUpcomingEvents() 함수 생성
- [ ] Time Trigger 설정 (매일 09:00)
- [ ] 비자 만료: D-30/14/7/1 알림
- [ ] TOPIK 시험: D-30/7/1 알림
- [ ] 상담 일정: D-1, 당일 09:00 알림

**Day 14-17**: Frontend (Calendar.html)
- [ ] 캘린더 뷰 (월간/주간/일간)
- [ ] 일정 추가/수정/삭제 UI
- [ ] 일정 목록 사이드바
- [ ] 알림 설정 패널
- [ ] 알림 이력 표시

**Day 18-21**: Integration & Testing
- [ ] Backend-Frontend 연동
- [ ] 실제 알림 발송 테스트 (이메일/SMS)
- [ ] i18n 적용
- [ ] clasp push & 배포

---

### 6.3 Week 5-6: Files (Upload/Download/Management)

**Day 1-3**: Google Drive API 설정
- [ ] GCP Console에서 Drive API 활성화
- [ ] OAuth 2.0 클라이언트 ID 재사용
- [ ] GAS Scope 추가 및 권한 승인
- [ ] 폴더 구조 생성 (StudentFiles/{studentId}/{category}/)

**Day 4-6**: FileService.gs 생성
- [ ] Files 시트 생성
- [ ] uploadFile() 구현
- [ ] 파일 유효성 검사 (크기, 형식)
- [ ] Google Drive 업로드 테스트

**Day 7-9**: File Management
- [ ] listFiles() 구현
- [ ] downloadFile() 구현
- [ ] deleteFile() 구현
- [ ] getFileThumbnail() 구현
- [ ] Unit Test: testFileCRUD()

**Day 10-12**: Frontend (FileManager.html)
- [ ] 파일 업로드 UI (Drag & Drop)
- [ ] 업로드 프로그레스 바
- [ ] 파일 목록 (카드/리스트 뷰)
- [ ] 카테고리별 탭

**Day 13-15**: File Preview & Actions
- [ ] 썸네일 표시 (이미지)
- [ ] 미리보기 모달 (이미지 확대, PDF Viewer)
- [ ] 다운로드/삭제 액션
- [ ] 용량 표시 (프로그레스 바)

**Day 16-18**: Integration & Testing
- [ ] Backend-Frontend 연동
- [ ] 파일 업로드/다운로드 테스트 (10MB, 50MB)
- [ ] 권한 테스트 (master/agency/student)
- [ ] i18n 적용
- [ ] clasp push & 배포

---

### 6.4 Week 7: Testing & QA

**Day 1-2**: Unit Testing
- [ ] AnalyticsService: 5개 API 테스트
- [ ] ScheduleService: 6개 API 테스트
- [ ] FileService: 5개 API 테스트
- [ ] Edge Case 테스트 (빈 데이터, 권한 오류)

**Day 3-4**: Integration Testing
- [ ] Google Calendar API 연동 테스트
- [ ] Google Drive API 연동 테스트
- [ ] Gmail API 이메일 발송 테스트
- [ ] SMS API 발송 테스트 (선택적)

**Day 5-6**: Performance Testing
- [ ] 1000명 데이터 분석 테스트 (목표: <5초)
- [ ] 1000건 알림 발송 테스트 (목표: <10분)
- [ ] 동시 10개 파일 업로드 테스트

**Day 7**: Gap Analysis & Bug Fix
- [ ] `/pdca analyze step3-high-priority-features` 실행
- [ ] Gap 분석 결과 확인
- [ ] Match Rate >= 90% 목표
- [ ] 발견된 버그 수정
- [ ] 최종 clasp push & 배포

---

## 7. Testing Strategy

### 7.1 Unit Testing

**AnalyticsService**:
```javascript
function testCohortAnalysis() {
  const result = getCohortAnalysis({
    cohortType: "year",
    metric: "topik_improvement",
    startYear: 2024,
    endYear: 2026
  });

  console.assert(result.success === true, "getCohortAnalysis failed");
  console.assert(result.data.cohorts.length > 0, "No cohorts returned");
  console.assert(result.data.chartData !== null, "No chart data");
}

function testTrendAnalysis() {
  const result = getTrendAnalysis("monthly", "new_students", "2024-01-01", "2024-12-31");

  console.assert(result.success === true, "getTrendAnalysis failed");
  console.assert(result.data.trends.length === 12, "Expected 12 months");
  console.assert(result.data.summary.average > 0, "Invalid average");
}

function testFunnelAnalysis() {
  const result = getFunnelAnalysis("2024-01-01", "2024-12-31");

  console.assert(result.success === true, "getFunnelAnalysis failed");
  console.assert(result.data.funnel.length === 3, "Expected 3 stages");
  console.assert(result.data.insights.bottleneck !== null, "No bottleneck identified");
}
```

**ScheduleService**:
```javascript
function testCalendarCRUD() {
  // Create
  const createResult = createCalendarEvent({
    studentId: "260010001",
    eventType: "visa_expiry",
    title: "[테스트] 비자 만료",
    description: "단위 테스트",
    startDateTime: "2024-06-15T09:00:00+09:00",
    endDateTime: "2024-06-15T10:00:00+09:00"
  });
  console.assert(createResult.success === true, "createCalendarEvent failed");
  const eventId = createResult.data.eventId;

  // Read
  const listResult = listCalendarEvents("2024-06-01", "2024-06-30");
  console.assert(listResult.data.totalCount > 0, "No events found");

  // Update
  const updateResult = updateCalendarEvent(eventId, { title: "[테스트] 비자 만료 (수정됨)" });
  console.assert(updateResult.success === true, "updateCalendarEvent failed");

  // Delete
  const deleteResult = deleteCalendarEvent(eventId);
  console.assert(deleteResult.success === true, "deleteCalendarEvent failed");
}

function testSendNotification() {
  const result = sendNotification("visa_expiry", "260010001", 30, "email");

  console.assert(result.success === true, "sendNotification failed");
  console.assert(result.data.status === "sent", "Email not sent");
}
```

**FileService**:
```javascript
function testFileCRUD() {
  // Create test file
  const testBlob = Utilities.newBlob("Test content", "text/plain", "test.txt");

  // Upload
  const uploadResult = uploadFile("260010001", "other", {
    name: "test.txt",
    mimeType: "text/plain",
    content: testBlob
  });
  console.assert(uploadResult.success === true, "uploadFile failed");
  const fileId = uploadResult.data.fileId;

  // List
  const listResult = listFiles("260010001", "other");
  console.assert(listResult.data.totalCount > 0, "No files found");

  // Download
  const downloadResult = downloadFile(fileId);
  console.assert(downloadResult.success === true, "downloadFile failed");

  // Delete
  const deleteResult = deleteFile(fileId);
  console.assert(deleteResult.success === true, "deleteFile failed");
}
```

---

### 7.2 Integration Testing

**Google Calendar API**:
- [ ] OAuth 인증 성공
- [ ] 일정 생성 → 조회 → 수정 → 삭제 (CRUD)
- [ ] Time Zone 처리 (Asia/Seoul)
- [ ] 알림 설정 (email, popup)

**Google Drive API**:
- [ ] OAuth 인증 성공
- [ ] 폴더 생성 (StudentFiles/{studentId}/)
- [ ] 파일 업로드 (JPG, PNG, PDF)
- [ ] 권한 설정 (anyone with link)
- [ ] 파일 다운로드
- [ ] 파일 삭제 (setTrashed)

**Gmail API**:
- [ ] 이메일 발송 (HTML 포맷)
- [ ] 다국어 템플릿 (KO/VN)
- [ ] Rate Limit 준수 (100 emails/day)

**SMS API** (선택적):
- [ ] Aligo: 국내 SMS 발송
- [ ] Twilio: 베트남 SMS 발송
- [ ] 비용 확인 및 예산 관리

---

### 7.3 Performance Testing

**Analytics Performance**:
```javascript
function performanceTestAnalytics() {
  const startTime = new Date();

  const result = getCohortAnalysis({
    cohortType: "year",
    metric: "topik_improvement",
    startYear: 2020,
    endYear: 2026
  });

  const endTime = new Date();
  const duration = (endTime - startTime) / 1000; // seconds

  console.log("Cohort Analysis Duration: " + duration + "s");
  console.assert(duration < 5, "Performance target: <5s (actual: " + duration + "s)");
}
```

**Notification Performance**:
```javascript
function performanceTestNotification() {
  const startTime = new Date();

  // 100건 알림 발송 시뮬레이션
  for (let i = 0; i < 100; i++) {
    sendNotification("visa_expiry", "26001000" + (i % 10), 30, "email");
  }

  const endTime = new Date();
  const duration = (endTime - startTime) / 1000 / 60; // minutes

  console.log("100 Notifications Duration: " + duration + " min");
  console.assert(duration < 10, "Performance target: <10min (actual: " + duration + "min)");
}
```

**File Upload Performance**:
```javascript
function performanceTestFileUpload() {
  const startTime = new Date();

  // 10MB 파일 업로드
  const largeBlob = Utilities.newBlob(new Array(10 * 1024 * 1024).join("x"), "text/plain", "large.txt");
  const result = uploadFile("260010001", "other", {
    name: "large.txt",
    mimeType: "text/plain",
    content: largeBlob
  });

  const endTime = new Date();
  const duration = (endTime - startTime) / 1000; // seconds

  console.log("10MB Upload Duration: " + duration + "s");
  console.assert(duration < 30, "Performance target: <30s (actual: " + duration + "s)");
}
```

---

## 8. i18n Keys

**Analytics**:
- `analytics_cohort_title`: "코호트 분석" / "Phân tích nhóm"
- `analytics_trend_title`: "트렌드 분석" / "Phân tích xu hướng"
- `analytics_funnel_title`: "깔때기 분석" / "Phân tích phễu chuyển đổi"
- `analytics_report_title`: "사용자 정의 리포트" / "Báo cáo tùy chỉnh"
- `analytics_filter_daterange`: "날짜 범위" / "Khoảng thời gian"
- `analytics_filter_agency`: "유학원" / "Trung tâm du học"
- `analytics_btn_run`: "분석 실행" / "Chạy phân tích"
- `analytics_btn_export_csv`: "CSV 내보내기" / "Xuất CSV"
- `analytics_btn_generate_report`: "리포트 생성" / "Tạo báo cáo"
- `analytics_pdf_success`: "PDF 생성 완료" / "Tạo PDF thành công"
- `err_analytics_cohort_failed`: "코호트 분석 실패" / "Phân tích nhóm thất bại"

**Schedule**:
- `schedule_title`: "일정 관리" / "Quản lý lịch"
- `schedule_btn_add_event`: "일정 추가" / "Thêm lịch"
- `schedule_view_month`: "월간" / "Tháng"
- `schedule_view_week`: "주간" / "Tuần"
- `schedule_view_day`: "일간" / "Ngày"
- `schedule_event_type_visa`: "비자 만료" / "Hết hạn visa"
- `schedule_event_type_topik`: "TOPIK 시험" / "Thi TOPIK"
- `schedule_event_type_consult`: "상담 일정" / "Lịch tư vấn"
- `schedule_event_created`: "일정이 생성되었습니다" / "Lịch đã được tạo"
- `schedule_notification_settings`: "알림 설정" / "Cài đặt thông báo"
- `notification_visa_expiry_template`: "비자가 {daysBefore}일 후 만료됩니다." / "Visa sẽ hết hạn sau {daysBefore} ngày."
- `notification_topik_exam_template`: "TOPIK 시험이 {daysBefore}일 후입니다." / "Kỳ thi TOPIK còn {daysBefore} ngày."
- `err_schedule_create_failed`: "일정 생성 실패" / "Tạo lịch thất bại"

**File**:
- `file_title`: "파일 관리" / "Quản lý tệp"
- `file_btn_upload`: "파일 업로드" / "Tải lên tệp"
- `file_drag_drop`: "파일을 드래그하거나 클릭하세요" / "Kéo thả hoặc nhấp chọn tệp"
- `file_category_certificate`: "증명서" / "Giấy chứng nhận"
- `file_category_admin`: "행정" / "Hành chính"
- `file_category_photo`: "사진" / "Ảnh"
- `file_category_other`: "기타" / "Khác"
- `file_btn_download`: "다운로드" / "Tải xuống"
- `file_btn_delete`: "삭제" / "Xóa"
- `file_btn_preview`: "미리보기" / "Xem trước"
- `file_upload_success`: "파일이 업로드되었습니다" / "Tệp đã được tải lên"
- `file_total_size`: "총 용량" / "Dung lượng tổng"
- `err_file_upload_failed`: "파일 업로드 실패" / "Tải lên thất bại"
- `err_file_size_exceeded`: "파일 크기 초과" / "Vượt quá dung lượng"
- `err_file_invalid_format`: "지원하지 않는 형식" / "Định dạng không hỗ trợ"

---

## 9. Success Metrics

**Feature Adoption**:
- 분석 리포트 조회: 주 5회 이상
- Custom Report 생성: 월 10회 이상
- PDF 다운로드: 월 20회 이상
- 알림 발송 성공률: >95%
- 알림 읽음률: >80%
- 비자 연장 누락: 0건
- 파일 업로드: 학생당 평균 5개
- 파일 조회: 월 50회 이상

**Performance**:
- 코호트 분석: 1000명 데이터 <5초
- 트렌드 분석: 1000명 데이터 <3초
- 깔때기 분석: 1000명 데이터 <3초
- 알림 발송: 1000건 <10분
- 파일 업로드: 10MB <30초

**Quality**:
- Match Rate 목표: ≥90%
- Bug Rate: <1%
- API Error Rate: <1%
- User Satisfaction: >4.0/5.0

---

## 10. Risk Mitigation

**Google API Quota 제한**:
- Drive API: 1000 requests/day → Batch 처리로 최소화
- Calendar API: 1,000,000 requests/day → 충분
- 초과 시 유료 전환 계획

**외부 알림 서비스 비용**:
- 1차: 이메일 (무료)
- 2차: SMS (선택적 유료, 월 예산 5만원)
- 비용 초과 시 이메일만 사용

**파일 저장 용량 초과**:
- Google Drive 무료 15GB
- 학생 300명 수용 가능
- 초과 시 Google Workspace 유료 (월 $6/user)

---

**Created by**: Claude
**Project Level**: Dynamic
**Estimated Completion**: 2026-04-06 (7주 후)
**Design Lines**: 1800+
