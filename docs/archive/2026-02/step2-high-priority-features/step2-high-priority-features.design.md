# Step 2 - High Priority Features Design

> **Feature**: 모바일 UI + 백업/복구 + 검색 + 대시보드
> **Version**: 2.2
> **Created**: 2026-02-16
> **PDCA Phase**: Design
> **Level**: Dynamic
> **Plan Document**: [step2-high-priority-features.plan.md](../../01-plan/features/step2-high-priority-features.plan.md)

---

## 1. Feature Overview

### 1.1 Design Goals

**4개 High Priority Features**:
1. **모바일 반응형 UI + PWA** (2주) - 모바일 접근성 향상
2. **데이터 백업/복구** (1주) - 데이터 안전성 강화
3. **검색 기능 강화** (1주) - 업무 효율성 증대
4. **대시보드** (1주) - 실시간 통계 및 차트

**Prerequisites**: security-and-enhancements v2.1 완료 (Match Rate: 92%)

---

## 2. API Design

### 2.1 MobileUIService API

#### `getDeviceInfo()`

**Purpose**: 사용자 기기 정보 감지 (모바일/태블릿/데스크톱)

**Parameters**: None

**Returns**:
```javascript
{
  deviceType: string,  // "mobile" | "tablet" | "desktop"
  screenWidth: number, // px
  screenHeight: number, // px
  isTouchDevice: boolean,
  userAgent: string
}
```

**Logic Flow**:
```
1. navigator.userAgent 분석
2. screen.width 확인:
   - < 768px: "mobile"
   - 768px ~ 1023px: "tablet"
   - >= 1024px: "desktop"
3. 'ontouchstart' in window 확인 (터치 기기 여부)
4. 결과 반환
```

**Example**:
```javascript
const deviceInfo = getDeviceInfo();
// Returns: { deviceType: "mobile", screenWidth: 375, screenHeight: 667, isTouchDevice: true, userAgent: "..." }
```

---

#### `generateManifest()`

**Purpose**: PWA manifest.json 동적 생성

**Parameters**: None

**Returns**:
```javascript
{
  name: string,
  short_name: string,
  description: string,
  start_url: string,
  display: string,
  theme_color: string,
  background_color: string,
  icons: Array<{
    src: string,
    sizes: string,
    type: string
  }>
}
```

**Logic Flow**:
```
1. 시스템 설정 읽기 (SystemConfig 시트)
2. manifest 객체 생성:
   - name: "AJU E&J 학생관리"
   - short_name: "AJU E&J"
   - start_url: "/"
   - display: "standalone"
   - theme_color: "#4285f4"
   - icons: [192x192, 512x512]
3. JSON 반환
```

**Example**:
```javascript
const manifest = generateManifest();
// Returns: { name: "AJU E&J 학생관리", short_name: "AJU E&J", ... }
```

---

#### `optimizeForMobile(settings)`

**Purpose**: 모바일 최적화 설정 반환

**Parameters**:
```javascript
{
  deviceType: string // "mobile" | "tablet" | "desktop"
}
```

**Returns**:
```javascript
{
  fontSize: string,      // "14px" | "16px" | "18px"
  buttonHeight: string,  // "44px" | "40px" | "36px"
  layoutColumns: number, // 1 | 2 | 3
  enableSwipe: boolean,
  enableHamburgerMenu: boolean
}
```

**Logic Flow**:
```
1. deviceType에 따라 설정 결정:
   - mobile: fontSize 14px, buttonHeight 44px, columns 1, swipe true, hamburger true
   - tablet: fontSize 16px, buttonHeight 40px, columns 2, swipe true, hamburger false
   - desktop: fontSize 18px, buttonHeight 36px, columns 3, swipe false, hamburger false
2. 설정 객체 반환
```

**Example**:
```javascript
const settings = optimizeForMobile({ deviceType: "mobile" });
// Returns: { fontSize: "14px", buttonHeight: "44px", layoutColumns: 1, enableSwipe: true, enableHamburgerMenu: true }
```

---

### 2.2 BackupService API

#### `createBackup(sessionId)`

**Purpose**: 전체 시트 백업 생성

**Parameters**:
```javascript
{
  sessionId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  backupId: string,    // "backup_2026-02-16_00-00-00"
  timestamp: string,   // ISO 8601
  sheetsCopied: number,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증 (Master 권한만)
2. Rate Limiting 확인
3. 백업 폴더 생성: "Backups/YYYY-MM-DD/"
4. 전체 시트 복사:
   - Students, Agencies, Consultations, ExamResults, TargetHistory, AuditLogs
5. 백업 ID 생성: "backup_YYYY-MM-DD_HH-mm-ss"
6. 감사 로그 기록
7. 결과 반환
```

**Error Handling**:
- 권한 없음: `err_permission_denied`
- 시트 복사 실패: `err_backup_failed`
- 6분 타임아웃: `err_timeout` (시트별 분할 백업)

**Example**:
```javascript
const result = createBackup(sessionId);
// Returns: { success: true, backupId: "backup_2026-02-16_00-00-00", timestamp: "2026-02-16T00:00:00Z", sheetsCopied: 6 }
```

---

#### `listBackups(sessionId)`

**Purpose**: 백업 목록 조회

**Parameters**:
```javascript
{
  sessionId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  backups: Array<{
    backupId: string,
    timestamp: string,
    sheetsCopied: number,
    size: number,        // bytes
    createdBy: string
  }>,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증 (Master 권한만)
2. "Backups/" 폴더 읽기
3. 각 백업 폴더 정보 수집:
   - backupId
   - timestamp
   - sheetsCopied (시트 개수)
   - size (폴더 크기)
   - createdBy (AuditLogs에서 조회)
4. timestamp 내림차순 정렬
5. 결과 반환
```

**Example**:
```javascript
const result = listBackups(sessionId);
// Returns: { success: true, backups: [{ backupId: "backup_2026-02-16_00-00-00", timestamp: "2026-02-16T00:00:00Z", sheetsCopied: 6, size: 1024000, createdBy: "admin" }, ...] }
```

---

#### `restoreFromBackup(sessionId, backupId)`

**Purpose**: 특정 백업에서 복구

**Parameters**:
```javascript
{
  sessionId: string,
  backupId: string  // "backup_2026-02-16_00-00-00"
}
```

**Returns**:
```javascript
{
  success: boolean,
  restoredSheets: number,
  timestamp: string,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증 (Master 권한만)
2. 백업 존재 확인
3. 확인 모달 필요 (클라이언트에서 처리)
4. 현재 시트 백업 생성 (복구 전 안전장치)
5. 백업 시트 → 현재 시트 복사
6. 감사 로그 기록
7. 결과 반환
```

**Error Handling**:
- 백업 없음: `err_backup_not_found`
- 복구 실패: `err_restore_failed`
- 권한 없음: `err_permission_denied`

**Example**:
```javascript
const result = restoreFromBackup(sessionId, "backup_2026-02-15_00-00-00");
// Returns: { success: true, restoredSheets: 6, timestamp: "2026-02-16T00:10:00Z" }
```

---

#### `cleanupOldBackups(sessionId, daysToKeep)`

**Purpose**: 오래된 백업 자동 삭제

**Parameters**:
```javascript
{
  sessionId: string,
  daysToKeep: number  // 기본값: 30
}
```

**Returns**:
```javascript
{
  success: boolean,
  deletedBackups: number,
  freedSpace: number,  // bytes
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증 (Master 권한만)
2. "Backups/" 폴더 읽기
3. 각 백업 생성일 확인
4. daysToKeep 이상 오래된 백업 삭제
5. 삭제된 백업 수 + 확보된 용량 계산
6. 감사 로그 기록
7. 결과 반환
```

**Example**:
```javascript
const result = cleanupOldBackups(sessionId, 30);
// Returns: { success: true, deletedBackups: 5, freedSpace: 5120000 }
```

---

#### `scheduleAutoBackup()`

**Purpose**: Time Trigger 설정 (매일 자정 백업)

**Parameters**: None

**Returns**:
```javascript
{
  success: boolean,
  triggerId: string,
  schedule: string,  // "매일 00:00"
  error?: string
}
```

**Logic Flow**:
```
1. 기존 Trigger 확인
2. 있으면 삭제
3. 새 Trigger 생성:
   - ScriptApp.newTrigger('createBackup')
   - timeBased()
   - atHour(0)  // 자정
   - everyDays(1)
   - create()
4. Trigger ID 반환
```

**Example**:
```javascript
const result = scheduleAutoBackup();
// Returns: { success: true, triggerId: "12345", schedule: "매일 00:00" }
```

---

### 2.3 SearchService API

#### `searchAll(sessionId, query, options)`

**Purpose**: 통합 검색 (학생/유학원/상담)

**Parameters**:
```javascript
{
  sessionId: string,
  query: string,      // 검색어
  options: {
    types: Array<string>,  // ["students", "agencies", "consultations"]
    limit: number,         // 기본값: 50
    offset: number         // 기본값: 0
  }
}
```

**Returns**:
```javascript
{
  success: boolean,
  results: {
    students: Array<{
      StudentID: string,
      NameKR: string,
      NameVN: string,
      AgencyCode: string,
      matchScore: number  // 0-100
    }>,
    agencies: Array<{
      AgencyCode: string,
      AgencyName: string,
      matchScore: number
    }>,
    consultations: Array<{
      ConsultID: string,
      StudentID: string,
      StudentName: string,
      Summary: string,
      matchScore: number
    }>
  },
  totalCount: number,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. Rate Limiting 확인
3. query Sanitize (XSS 방어)
4. 권한별 검색 범위 결정:
   - Master: 전체
   - Agency: 소속 유학원만
5. types 배열 순회하며 각 시트 검색:
   - students: NameKR, NameVN, StudentID, Email, Phone
   - agencies: AgencyName, AgencyCode
   - consultations: StudentName, Summary
6. matchScore 계산 (정확도 점수)
7. matchScore 내림차순 정렬
8. limit/offset 적용
9. 결과 반환
```

**Match Score 계산**:
```
- 완전 일치: 100점
- 시작 일치: 80점
- 포함 일치: 60점
- 부분 일치: 40점
```

**Example**:
```javascript
const result = searchAll(sessionId, "홍길동", { types: ["students"], limit: 10 });
// Returns: { success: true, results: { students: [{ StudentID: "260010001", NameKR: "홍길동", matchScore: 100, ... }], agencies: [], consultations: [] }, totalCount: 1 }
```

---

#### `autocomplete(sessionId, query, type)`

**Purpose**: 자동완성 제안

**Parameters**:
```javascript
{
  sessionId: string,
  query: string,        // 최소 3글자
  type: string          // "students" | "agencies"
}
```

**Returns**:
```javascript
{
  success: boolean,
  suggestions: Array<{
    label: string,      // 표시할 텍스트
    value: string,      // 실제 값
    type: string,       // "student" | "agency"
    id: string          // StudentID | AgencyCode
  }>,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. query 길이 확인 (< 3글자면 빈 배열 반환)
3. CacheService 확인 (캐시 키: "autocomplete_{type}_{query}")
4. 캐시 있으면 반환
5. 없으면 검색:
   - students: NameKR, NameVN, StudentID 시작 일치
   - agencies: AgencyName, AgencyCode 시작 일치
6. 최대 10개 제한
7. CacheService 저장 (60초 TTL)
8. 결과 반환
```

**Example**:
```javascript
const result = autocomplete(sessionId, "홍길", "students");
// Returns: { success: true, suggestions: [{ label: "홍길동 (260010001)", value: "홍길동", type: "student", id: "260010001" }, ...] }
```

---

#### `advancedFilter(sessionId, filters)`

**Purpose**: 고급 필터 검색

**Parameters**:
```javascript
{
  sessionId: string,
  filters: {
    agencyCode?: string,
    dateFrom?: string,      // YYYY-MM-DD
    dateTo?: string,        // YYYY-MM-DD
    isActive?: boolean,
    status?: string,        // 학생 상태
    topikLevel?: string     // TOPIK 등급
  }
}
```

**Returns**:
```javascript
{
  success: boolean,
  students: Array<StudentData>,
  count: number,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. Students 시트 읽기
3. 권한별 필터링 (Master/Agency)
4. filters 적용:
   - agencyCode: AgencyCode 일치
   - dateFrom/dateTo: RegisteredAt 범위
   - isActive: IsActive 일치
   - status: Status 일치
   - topikLevel: 최근 TOPIK 등급 일치
5. 결과 반환
```

**Example**:
```javascript
const result = advancedFilter(sessionId, { agencyCode: "HANOI", dateFrom: "2026-01-01", isActive: true });
// Returns: { success: true, students: [...], count: 15 }
```

---

### 2.4 DashboardService API

#### `getStatistics(sessionId)`

**Purpose**: 주요 통계 4개 반환

**Parameters**:
```javascript
{
  sessionId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  statistics: {
    totalStudents: number,      // IsActive=true인 학생 수
    totalAgencies: number,      // IsActive=true인 유학원 수
    consultationsThisMonth: number,  // 이번 달 상담 건수
    newStudentsThisMonth: number     // 이번 달 신규 학생 수
  },
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. 권한별 범위 결정:
   - Master: 전체 통계
   - Agency: 소속 유학원 통계만
3. 각 통계 계산:
   - totalStudents: Students 시트에서 IsActive=true 카운트
   - totalAgencies: Agencies 시트에서 IsActive=true 카운트
   - consultationsThisMonth: Consultations 시트에서 이번 달 상담 카운트
   - newStudentsThisMonth: Students 시트에서 이번 달 RegisteredAt 카운트
4. 결과 반환
```

**Example**:
```javascript
const result = getStatistics(sessionId);
// Returns: { success: true, statistics: { totalStudents: 120, totalAgencies: 5, consultationsThisMonth: 45, newStudentsThisMonth: 8 } }
```

---

#### `getMonthlyTrend(sessionId, months)`

**Purpose**: 월별 학생 등록 추이

**Parameters**:
```javascript
{
  sessionId: string,
  months: number  // 기본값: 12 (최근 12개월)
}
```

**Returns**:
```javascript
{
  success: boolean,
  trend: Array<{
    month: string,      // "2026-02"
    count: number,      // 등록 학생 수
    cumulative: number  // 누적 학생 수
  }>,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. Students 시트 읽기
3. 권한별 필터링
4. 최근 N개월 월별 집계:
   - RegisteredAt 월별 그룹화
   - 각 월 등록 수 카운트
   - 누적 학생 수 계산
5. 월 오름차순 정렬
6. 결과 반환
```

**Example**:
```javascript
const result = getMonthlyTrend(sessionId, 6);
// Returns: { success: true, trend: [{ month: "2025-09", count: 10, cumulative: 100 }, { month: "2025-10", count: 12, cumulative: 112 }, ...] }
```

---

#### `getAgencyDistribution(sessionId)`

**Purpose**: 유학원별 학생 분포

**Parameters**:
```javascript
{
  sessionId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  distribution: Array<{
    agencyCode: string,
    agencyName: string,
    studentCount: number,
    percentage: number  // 전체 대비 비율
  }>,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. Students 시트 읽기
3. 권한별 필터링 (Master: 전체, Agency: 소속만)
4. AgencyCode별 그룹화 및 카운트
5. Agencies 시트에서 AgencyName 조회
6. 전체 대비 비율 계산
7. studentCount 내림차순 정렬
8. 결과 반환
```

**Example**:
```javascript
const result = getAgencyDistribution(sessionId);
// Returns: { success: true, distribution: [{ agencyCode: "HANOI", agencyName: "하노이 유학원", studentCount: 50, percentage: 41.7 }, ...] }
```

---

#### `getTopikDistribution(sessionId)`

**Purpose**: TOPIK 성적 분포

**Parameters**:
```javascript
{
  sessionId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  distribution: Array<{
    level: string,      // "1급", "2급", ..., "6급", "미응시"
    count: number,
    percentage: number
  }>,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. Students + ExamResults JOIN
3. 권한별 필터링
4. 각 학생의 최근 TOPIK 등급 조회
5. 등급별 그룹화 및 카운트
6. 전체 대비 비율 계산
7. 등급 오름차순 정렬 (1급 → 6급 → 미응시)
8. 결과 반환
```

**Example**:
```javascript
const result = getTopikDistribution(sessionId);
// Returns: { success: true, distribution: [{ level: "1급", count: 5, percentage: 4.2 }, { level: "2급", count: 15, percentage: 12.5 }, ...] }
```

---

#### `getConsultTypeStats(sessionId)`

**Purpose**: 상담 유형별 통계

**Parameters**:
```javascript
{
  sessionId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  stats: Array<{
    type: string,       // "정기", "비정기", "긴급"
    count: number,
    percentage: number
  }>,
  error?: string
}
```

**Logic Flow**:
```
1. 세션 검증
2. Consultations 시트 읽기
3. 권한별 필터링
4. Type별 그룹화 및 카운트
5. 전체 대비 비율 계산
6. count 내림차순 정렬
7. 결과 반환
```

**Example**:
```javascript
const result = getConsultTypeStats(sessionId);
// Returns: { success: true, stats: [{ type: "정기", count: 80, percentage: 66.7 }, { type: "비정기", count: 30, percentage: 25.0 }, ...] }
```

---

## 3. Frontend Design

### 3.1 Responsive Layout

#### Media Queries

**Breakpoints**:
```css
/* Mobile (320px ~ 767px) */
@media (max-width: 767px) {
  .container { width: 100%; padding: 10px; }
  .sidebar { display: none; }
  .hamburger-menu { display: block; }
  .button { height: 44px; min-width: 44px; }
  .font-size { font-size: 14px; }
}

/* Tablet (768px ~ 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .container { width: 750px; padding: 15px; }
  .sidebar { width: 200px; }
  .hamburger-menu { display: none; }
  .button { height: 40px; }
  .font-size { font-size: 16px; }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container { width: 1000px; padding: 20px; }
  .sidebar { width: 250px; }
  .hamburger-menu { display: none; }
  .button { height: 36px; }
  .font-size { font-size: 18px; }
}
```

#### Grid Layout

**Mobile (1 Column)**:
```
┌─────────────────┐
│   Header        │
├─────────────────┤
│   Content       │
│   (Full Width)  │
└─────────────────┘
```

**Tablet (2 Columns)**:
```
┌─────────────────────────┐
│   Header                │
├──────────┬──────────────┤
│ Sidebar  │   Content    │
│ (200px)  │   (Flex 1)   │
└──────────┴──────────────┘
```

**Desktop (3 Columns)**:
```
┌─────────────────────────────┐
│   Header                    │
├──────────┬─────────┬────────┤
│ Sidebar  │ Content │ Widget │
│ (250px)  │ (Flex)  │ (300px)│
└──────────┴─────────┴────────┘
```

---

### 3.2 PWA manifest.json

**Structure**:
```json
{
  "name": "AJU E&J 베트남 유학생 관리 시스템",
  "short_name": "AJU E&J",
  "description": "베트남 유학생 통합 관리 플랫폼",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#4285f4",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**HTML Link**:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#4285f4">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="apple-touch-icon" href="/icons/icon-192x192.png">
```

---

### 3.3 Chart.js 차트 설계

#### Line Chart (월별 학생 등록 추이)

**Configuration**:
```javascript
{
  type: 'line',
  data: {
    labels: ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'],
    datasets: [{
      label: '월별 등록 학생 수',
      data: [10, 12, 15, 8, 20, 18],
      borderColor: '#4285f4',
      backgroundColor: 'rgba(66, 133, 244, 0.1)',
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 5 } }
    }
  }
}
```

---

#### Pie Chart (유학원별 학생 분포)

**Configuration**:
```javascript
{
  type: 'pie',
  data: {
    labels: ['하노이 유학원', '다낭 유학원', '호치민 유학원', '기타'],
    datasets: [{
      data: [50, 30, 25, 15],
      backgroundColor: ['#4285f4', '#34a853', '#fbbc04', '#ea4335']
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'right' },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.label + ': ' + context.parsed + '명 (' + Math.round(context.parsed / context.dataset.data.reduce((a,b) => a+b, 0) * 100) + '%)';
          }
        }
      }
    }
  }
}
```

---

#### Bar Chart (TOPIK 성적 분포)

**Configuration**:
```javascript
{
  type: 'bar',
  data: {
    labels: ['1급', '2급', '3급', '4급', '5급', '6급', '미응시'],
    datasets: [{
      label: 'TOPIK 등급별 학생 수',
      data: [5, 15, 25, 30, 20, 10, 15],
      backgroundColor: ['#e8eaf6', '#c5cae9', '#9fa8da', '#7986cb', '#5c6bc0', '#3f51b5', '#ccc']
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index' }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 5 } }
    }
  }
}
```

---

#### Doughnut Chart (상담 유형별 통계)

**Configuration**:
```javascript
{
  type: 'doughnut',
  data: {
    labels: ['정기 상담', '비정기 상담', '긴급 상담'],
    datasets: [{
      data: [80, 30, 10],
      backgroundColor: ['#4285f4', '#fbbc04', '#ea4335']
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.label + ': ' + context.parsed + '건 (' + Math.round(context.parsed / context.dataset.data.reduce((a,b) => a+b, 0) * 100) + '%)';
          }
        }
      }
    }
  }
}
```

---

### 3.4 검색 UI/UX

#### 통합 검색창

**HTML Structure**:
```html
<div class="search-container">
  <input type="text" id="search-input" placeholder="학생/유학원/상담 검색 (최소 3글자)" />
  <div id="autocomplete-dropdown" class="autocomplete-dropdown"></div>
  <button id="search-button" class="btn-primary">검색</button>
</div>

<div class="search-filters">
  <select id="filter-agency">
    <option value="">유학원 전체</option>
    <!-- 동적 로드 -->
  </select>
  <input type="date" id="filter-date-from" />
  <input type="date" id="filter-date-to" />
  <select id="filter-status">
    <option value="">상태 전체</option>
    <option value="true">활성</option>
    <option value="false">비활성</option>
  </select>
</div>

<div id="search-results" class="search-results"></div>
```

**CSS**:
```css
.search-container {
  position: relative;
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

#search-input {
  flex: 1;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  display: none;
}

.autocomplete-dropdown.show {
  display: block;
}

.autocomplete-item {
  padding: 10px;
  cursor: pointer;
}

.autocomplete-item:hover,
.autocomplete-item.active {
  background-color: #f0f0f0;
}
```

**JavaScript (자동완성)**:
```javascript
let currentFocus = -1;

document.getElementById('search-input').addEventListener('input', function() {
  const query = this.value;

  if (query.length < 3) {
    hideAutocomplete();
    return;
  }

  // Debounce (200ms)
  clearTimeout(this.autocompleteTimer);
  this.autocompleteTimer = setTimeout(() => {
    google.script.run
      .withSuccessHandler(showAutocomplete)
      .autocomplete(sessionId, query, 'students');
  }, 200);
});

// 키보드 네비게이션 (↑↓, Enter)
document.getElementById('search-input').addEventListener('keydown', function(e) {
  const dropdown = document.getElementById('autocomplete-dropdown');
  const items = dropdown.querySelectorAll('.autocomplete-item');

  if (e.key === 'ArrowDown') {
    currentFocus++;
    if (currentFocus >= items.length) currentFocus = 0;
    setActive(items);
  } else if (e.key === 'ArrowUp') {
    currentFocus--;
    if (currentFocus < 0) currentFocus = items.length - 1;
    setActive(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (currentFocus > -1 && items[currentFocus]) {
      items[currentFocus].click();
    }
  }
});

function setActive(items) {
  items.forEach((item, index) => {
    item.classList.toggle('active', index === currentFocus);
  });
}
```

---

## 4. Database Schema

**신규 시트**: 없음 (기존 시트 활용)

**기존 시트 수정**: 없음

---

## 5. Implementation Order

### Week 1-2: 모바일 UI + PWA

**Day 1-2**: Responsive.css
```
1. Media Queries 작성 (320px, 768px, 1024px)
2. 터치 친화적 버튼 (44px x 44px)
3. 모바일 햄버거 메뉴
4. 테스트: iPhone SE, iPad, Desktop
```

**Day 3-4**: Mobile.css
```
1. 사이드바 토글 애니메이션
2. 풀 스크린 모달 (모바일)
3. 스와이프 제스처 (Hammer.js)
4. 테스트: 터치 이벤트
```

**Day 5-7**: PWA
```
1. manifest.json 생성
2. 아이콘 준비 (192x192, 512x512)
3. MobileUIService.gs 구현
4. 테스트: 홈 화면 추가
```

**Day 8-10**: 통합 테스트
```
1. 모바일 3G 속도 테스트
2. 크로스 브라우저 테스트
3. 터치 네비게이션 테스트
```

---

### Week 3: 백업/복구

**Day 1-2**: BackupService.gs (Core)
```
1. createBackup() 구현
2. scheduleAutoBackup() 구현
3. Time Trigger 설정
4. 테스트: 백업 생성
```

**Day 3**: BackupService.gs (Management)
```
1. listBackups() 구현
2. cleanupOldBackups() 구현
3. 테스트: 백업 목록, 삭제
```

**Day 4**: BackupService.gs (Restore)
```
1. restoreFromBackup() 구현
2. 복구 전 안전 백업
3. 테스트: 복구 시나리오
```

**Day 5**: Backup UI
```
1. Login.html에 백업 탭 추가
2. 백업 목록 표시
3. 복구 버튼 + 확인 모달
4. 테스트: UI 동작
```

---

### Week 4: 검색 강화

**Day 1-2**: SearchService.gs (Core)
```
1. searchAll() 구현
2. matchScore 계산 로직
3. 권한별 검색 범위 제한
4. 테스트: 통합 검색
```

**Day 3**: SearchService.gs (Autocomplete)
```
1. autocomplete() 구현
2. CacheService 통합
3. 테스트: 자동완성 속도
```

**Day 4**: Search UI
```
1. 통합 검색창 구현
2. 자동완성 드롭다운
3. 키보드 네비게이션 (↑↓, Enter)
4. 테스트: UI 동작
```

**Day 5**: Advanced Filter
```
1. advancedFilter() 구현
2. 필터 UI (유학원/날짜/상태)
3. 테스트: 필터 조합
```

---

### Week 5: 대시보드

**Day 1-2**: DashboardService.gs
```
1. getStatistics() 구현
2. getMonthlyTrend() 구현
3. getAgencyDistribution() 구현
4. getTopikDistribution() 구현
5. getConsultTypeStats() 구현
6. 테스트: 통계 정확도
```

**Day 3-4**: Dashboard.html (Charts)
```
1. Chart.js CDN 로드
2. Line Chart (월별 추이)
3. Pie Chart (유학원 분포)
4. Bar Chart (TOPIK 분포)
5. Doughnut Chart (상담 유형)
6. 테스트: 차트 렌더링
```

**Day 5**: 권한별 대시보드
```
1. Master vs Agency 대시보드 분리
2. 반응형 차트 (모바일 최적화)
3. 통합 테스트
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**각 Service별 테스트 함수**:
```javascript
// MobileUIService
function testMobileUIService() {
  const deviceInfo = getDeviceInfo();
  Logger.log('Device Type: ' + deviceInfo.deviceType);

  const manifest = generateManifest();
  Logger.log('Manifest: ' + JSON.stringify(manifest));

  const settings = optimizeForMobile({ deviceType: 'mobile' });
  Logger.log('Settings: ' + JSON.stringify(settings));
}

// BackupService
function testBackupService() {
  const backup = createBackup(testSessionId);
  Logger.log('Backup Created: ' + backup.backupId);

  const backups = listBackups(testSessionId);
  Logger.log('Backups Count: ' + backups.backups.length);

  const cleanup = cleanupOldBackups(testSessionId, 30);
  Logger.log('Deleted: ' + cleanup.deletedBackups);
}

// SearchService
function testSearchService() {
  const results = searchAll(testSessionId, '홍길동', { types: ['students'] });
  Logger.log('Search Results: ' + results.totalCount);

  const suggestions = autocomplete(testSessionId, '홍길', 'students');
  Logger.log('Suggestions: ' + suggestions.suggestions.length);
}

// DashboardService
function testDashboardService() {
  const stats = getStatistics(testSessionId);
  Logger.log('Statistics: ' + JSON.stringify(stats.statistics));

  const trend = getMonthlyTrend(testSessionId, 6);
  Logger.log('Trend: ' + trend.trend.length);
}
```

---

### 6.2 Integration Tests

**시트 연동 테스트**:
```
1. 백업 시트 생성 확인
   - Backups/2026-02-16/ 폴더 존재
   - 6개 시트 복사 완료

2. 검색 결과 정확도
   - "홍길동" 검색 → StudentID 260010001 반환
   - matchScore 100점 확인

3. 대시보드 통계 정합성
   - totalStudents = Students 시트 IsActive=true 카운트
   - 월별 추이 = RegisteredAt 월별 집계
```

---

### 6.3 User Acceptance Tests

**모바일 테스트**:
```
1. iPhone SE (320px)
   - 햄버거 메뉴 표시
   - 버튼 44px x 44px 확인
   - 스와이프 제스처 동작

2. iPad (768px)
   - 사이드바 토글 동작
   - 2컬럼 레이아웃 확인

3. Android 스마트폰
   - PWA 홈 화면 추가
   - 터치 네비게이션
```

**기능 테스트**:
```
1. 백업/복구 시나리오
   - 수동 백업 생성
   - 백업 목록 조회
   - 특정 날짜 복구
   - 31일 이상 백업 삭제

2. 검색/자동완성 시나리오
   - 3글자 입력 → 자동완성
   - 키보드 ↑↓ 네비게이션
   - Enter 키로 선택
   - 통합 검색 결과 표시

3. 대시보드 차트 시나리오
   - 4개 차트 모두 렌더링
   - 반응형 차트 (모바일)
   - Master vs Agency 대시보드
```

---

## 7. Success Criteria

### 7.1 Functional Criteria

- [ ] 모든 페이지 320px~1440px 반응형
- [ ] PWA 홈 화면 추가 가능 (iOS/Android)
- [ ] 매일 자정 자동 백업 실행
- [ ] 백업 복구 정상 작동
- [ ] 통합 검색 500ms 이내
- [ ] 자동완성 200ms 이내
- [ ] 대시보드 차트 2초 이내 로딩
- [ ] 키보드 네비게이션 지원

### 7.2 Non-Functional Criteria

**성능**:
- 모바일 3G: 3초 이내 로딩
- 검색: 500ms 이내
- 자동완성: 200ms 이내
- 차트: 2초 이내

**접근성**:
- 터치 타겟: 44px x 44px 이상
- 키보드 네비게이션 완전 지원
- ARIA 라벨 추가

**호환성**:
- iOS Safari 14+
- Android Chrome 90+
- Desktop Chrome/Firefox/Edge

### 7.3 Quality Criteria

- **Code Coverage**: Unit Tests 80% 이상
- **Code Quality**: ESLint 0 errors
- **Performance**: Lighthouse Mobile Score 80+
- **Security**: XSS 방어, Rate Limiting 적용

---

## 8. API Summary

### 8.1 MobileUIService (3개 API)

| API | Purpose | Returns |
|-----|---------|---------|
| `getDeviceInfo()` | 기기 정보 감지 | deviceType, screenWidth, isTouchDevice |
| `generateManifest()` | PWA manifest 생성 | manifest.json 객체 |
| `optimizeForMobile(settings)` | 모바일 최적화 설정 | fontSize, buttonHeight, layoutColumns |

---

### 8.2 BackupService (5개 API)

| API | Purpose | Returns |
|-----|---------|---------|
| `createBackup(sessionId)` | 전체 시트 백업 생성 | backupId, timestamp, sheetsCopied |
| `listBackups(sessionId)` | 백업 목록 조회 | backups 배열 |
| `restoreFromBackup(sessionId, backupId)` | 특정 백업 복구 | restoredSheets, timestamp |
| `cleanupOldBackups(sessionId, days)` | 오래된 백업 삭제 | deletedBackups, freedSpace |
| `scheduleAutoBackup()` | Time Trigger 설정 | triggerId, schedule |

---

### 8.3 SearchService (3개 API)

| API | Purpose | Returns |
|-----|---------|---------|
| `searchAll(sessionId, query, options)` | 통합 검색 | students, agencies, consultations 배열 |
| `autocomplete(sessionId, query, type)` | 자동완성 제안 | suggestions 배열 (최대 10개) |
| `advancedFilter(sessionId, filters)` | 고급 필터 검색 | students 배열, count |

---

### 8.4 DashboardService (5개 API)

| API | Purpose | Returns |
|-----|---------|---------|
| `getStatistics(sessionId)` | 주요 통계 4개 | totalStudents, totalAgencies, consultations, newStudents |
| `getMonthlyTrend(sessionId, months)` | 월별 학생 등록 추이 | trend 배열 (month, count, cumulative) |
| `getAgencyDistribution(sessionId)` | 유학원별 학생 분포 | distribution 배열 (agencyCode, count, percentage) |
| `getTopikDistribution(sessionId)` | TOPIK 성적 분포 | distribution 배열 (level, count, percentage) |
| `getConsultTypeStats(sessionId)` | 상담 유형별 통계 | stats 배열 (type, count, percentage) |

---

## 9. Next Steps

### 9.1 Immediate Actions

1. **Do Phase 시작**
   ```bash
   /pdca do step2-high-priority-features
   ```

2. **i18n 키 추가** (90개)
   - 모바일 UI: 20개
   - 백업/복구: 15개
   - 검색: 25개
   - 대시보드: 30개

3. **External Libraries 로드**
   - Chart.js v4.4.0 CDN
   - Hammer.js v2.0.8 CDN

### 9.2 Implementation Focus

**Week 1-2 우선순위**:
1. Responsive.css 작성 (Media Queries)
2. 햄버거 메뉴 구현
3. PWA manifest.json 생성
4. 모바일 테스트 (iPhone, iPad, Android)

---

**Created**: 2026-02-16
**Author**: PDCA System
**Status**: Ready for Do Phase
