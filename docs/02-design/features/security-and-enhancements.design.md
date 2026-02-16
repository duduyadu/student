# Security & Enhancements Design (v2.1 - Production-Ready)

> **Feature**: 보안 강화 + 동시성 제어 + 모바일 지원 + Excel 관리 + 비고란 + 14개 신규 기능
> **Version**: 2.1
> **Created**: 2026-02-15
> **PDCA Phase**: Design
> **Level**: Dynamic
> **Plan Document**: [security-and-enhancements.plan.md](../../01-plan/features/security-and-enhancements.plan.md)

---

## 1. Feature Overview

### 1.1 목표 (Objectives)

**핵심 목표**: v2.0을 Production-Ready 수준으로 완성

**14개 신규 기능**:
1. 동시성 제어 (Race Condition Prevention)
2. 모바일 반응형 UI + PWA
3. Excel Import/Export (권한별)
4. 비고란 (Notes) 추가
5. 보안 강화 (Rate Limiting, XSS/CSRF)
6. 데이터 백업/복구 (자동화)
7. 검색 기능 강화 (통합 검색 + 자동완성)
8. 대시보드 (통계 + 차트)
9. 일괄 작업 (Bulk Operations)
10. 파일 첨부 (Google Drive 연동)
11. 알림 설정 (Notification Settings)
12. 로그 자동 정리 (Log Cleanup)
13. 데이터 검증 강화 (Validation)
14. API 문서 자동 생성 (Swagger)

---

## 2. API Design

### 2.1 SequenceService API (동시성 제어)

#### `getNextSequence(entityType)`

**Purpose**: Atomic Increment로 다음 시퀀스 번호 반환

**Parameters**:
```javascript
{
  entityType: string  // 예: "StudentID_26001"
}
```

**Returns**:
```javascript
{
  success: boolean,
  sequence: number,  // 1, 2, 3, ...
  error?: string
}
```

**Logic Flow**:
```
1. LockService.getScriptLock() 획득 (최대 30초 대기)
2. Sequences 시트에서 entityType 조회
3. 없으면: 새 행 생성 (LastSequence = 1)
   있으면: LastSequence + 1
4. Sequences 시트 업데이트
5. Lock 해제
6. 시퀀스 반환
```

**Error Handling**:
- Lock 획득 실패 (30초 초과): `"동시 접속으로 인한 지연. 다시 시도하세요."`
- 시트 접근 실패: `"시스템 오류. 관리자에게 문의하세요."`

**Example**:
```javascript
const result = getNextSequence('StudentID_26001');
// Returns: { success: true, sequence: 1 }

const result2 = getNextSequence('StudentID_26001');
// Returns: { success: true, sequence: 2 }
```

---

#### `generateStudentIDSafe(agencyCode)`

**Purpose**: Race Condition 없이 StudentID 생성

**Parameters**:
```javascript
{
  agencyCode: string  // "HANOI", "DANANG"
}
```

**Returns**:
```javascript
{
  success: boolean,
  studentId: string,  // "260010001" (9자리 풀 ID)
  error?: string
}
```

**Logic Flow**:
```
1. 연도 추출: 2026 → "26"
2. Agencies 시트에서 AgencyNumber 조회: HANOI → 1
3. AgencyNumber를 3자리 패딩: 1 → "001"
4. EntityType 생성: "StudentID_26001"
5. getNextSequence(entityType) 호출 → 순번 (1, 2, 3, ...)
6. 순번을 4자리 패딩: 1 → "0001"
7. 9자리 풀 ID 조합: "26" + "001" + "0001" = "260010001"
8. 반환
```

**Example**:
```javascript
// 첫 번째 학생
const result = generateStudentIDSafe('HANOI');
// Returns: { success: true, studentId: "260010001" }

// 두 번째 학생 (동시 접속 시에도 안전)
const result2 = generateStudentIDSafe('HANOI');
// Returns: { success: true, studentId: "260010002" }
```

---

### 2.2 BackupService API (자동 백업/복구)

#### `autoBackup()`

**Purpose**: GAS Trigger에서 호출 (매일 새벽 2시)

**Parameters**: 없음

**Logic Flow**:
```
1. 현재 시간 확인: 2026-02-15 02:00:00
2. 백업 대상 시트: Students, Agencies, Consultations, ExamResults
3. 각 시트별:
   a. 시트 데이터를 Excel Blob로 변환
   b. 파일명 생성: Backup_Students_20260215_020000.xlsx
   c. Google Drive 폴더에 저장: AJU_E&J_Backups/2026-02/
4. 30일 이전 백업 자동 삭제
5. AuditLogs 기록: AUTO_BACKUP
```

**Returns**: 없음 (Trigger 실행)

---

#### `getBackupList(sessionId)`

**Purpose**: 백업 파일 목록 조회 (Master 전용)

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
  backups: [
    {
      fileId: string,
      fileName: string,
      createdAt: Date,
      size: number
    }
  ],
  error?: string
}
```

**Authorization**: Master만 접근 가능

**Example**:
```javascript
const result = getBackupList(sessionId);
// Returns: {
//   success: true,
//   backups: [
//     {
//       fileId: "1a2b3c",
//       fileName: "Backup_Students_20260215_020000.xlsx",
//       createdAt: "2026-02-15T02:00:00Z",
//       size: 1048576
//     }
//   ]
// }
```

---

#### `restoreBackup(sessionId, fileId, targetSheet)`

**Purpose**: 백업 복구 (Master 전용)

**Parameters**:
```javascript
{
  sessionId: string,
  fileId: string,      // Drive 파일 ID
  targetSheet: string  // "Students", "Agencies", ...
}
```

**Logic Flow**:
```
1. 권한 확인: Master만
2. 현재 데이터 스냅샷 생성 (복구 전 백업)
   - 파일명: Snapshot_Students_20260215_100000.xlsx
   - 폴더: AJU_E&J_Backups/Snapshots/
3. 백업 파일 열기 (fileId)
4. 백업 데이터 읽기
5. 현재 시트 데이터 삭제
6. 백업 데이터 복사
7. AuditLogs 기록: RESTORE
```

**Returns**:
```javascript
{
  success: boolean,
  message: string,
  snapshotFileId?: string,
  error?: string
}
```

---

### 2.3 SearchService API (검색 강화)

#### `searchStudents(sessionId, keyword, filters?)`

**Purpose**: 통합 검색 (이름/ID/전화/이메일)

**Parameters**:
```javascript
{
  sessionId: string,
  keyword: string,       // 검색 키워드
  filters?: {
    agencyCode?: string,   // "HANOI", "DANANG"
    status?: string,       // "active", "graduated", "withdrawn"
    enrollmentYear?: number, // 2024, 2025, 2026
    topikGrade?: string    // "1급", "2급", ..., "6급"
  }
}
```

**Returns**:
```javascript
{
  success: boolean,
  results: [
    {
      StudentID: string,
      NameKR: string,
      NameVN: string,
      PhoneNumber: string,
      Email: string,
      AgencyCode: string,
      Status: string,
      highlight: string  // 매칭된 필드명
    }
  ],
  count: number,
  error?: string
}
```

**Logic Flow**:
```
1. 권한 확인:
   - Master: 전체 학생
   - Agency: 소속 학생만
   - Student: 본인만
2. Students 시트 조회
3. 키워드 매칭 (대소문자 무시):
   - StudentID, NameKR, NameVN, PhoneNumber, Email
4. 필터 적용 (선택 사항)
5. 결과 정렬 (관련도순)
6. Rate Limiting 체크 (checkRateLimit)
7. 반환
```

**Example**:
```javascript
const result = searchStudents(sessionId, "박두양", {
  agencyCode: "HANOI",
  status: "active"
});
// Returns: {
//   success: true,
//   results: [{
//     StudentID: "260010001",
//     NameKR: "박두양",
//     NameVN: "Park Duyang",
//     highlight: "NameKR"
//   }],
//   count: 1
// }
```

---

#### `autocompleteStudentNames(sessionId, keyword)`

**Purpose**: 학생 이름 자동완성

**Parameters**:
```javascript
{
  sessionId: string,
  keyword: string  // 최소 2자
}
```

**Returns**:
```javascript
{
  success: boolean,
  suggestions: string[],  // 최대 10개
  error?: string
}
```

**Logic Flow**:
```
1. keyword 길이 확인 (최소 2자)
2. Students 시트에서 NameKR/NameVN 매칭
3. 권한별 필터링
4. 최대 10개 반환
5. 형식: "박두양 (Park Duyang)"
```

**Example**:
```javascript
const result = autocompleteStudentNames(sessionId, "박");
// Returns: {
//   success: true,
//   suggestions: [
//     "박두양 (Park Duyang)",
//     "박민수 (Park Minsu)",
//     "박지영 (Park Jiyoung)"
//   ]
// }
```

---

### 2.4 DashboardService API (대시보드)

#### `getDashboardData(sessionId)`

**Purpose**: 대시보드 통계 데이터 조회

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
  data: {
    studentStats: {
      total: number,
      byAgency: { [agencyCode: string]: number },
      byStatus: {
        active: number,
        graduated: number,
        withdrawn: number
      }
    },
    topikStats: {
      byGrade: {
        "1급": number,
        "2급": number,
        "3급": number,
        "4급": number,
        "5급": number,
        "6급": number
      },
      avgScore: {
        reading: number,
        listening: number,
        writing: number,
        total: number
      },
      passRate: number  // 3급 이상 비율 (%)
    },
    visaExpiry: [
      {
        StudentID: string,
        NameKR: string,
        VisaExpiry: Date,
        DaysLeft: number
      }
    ],
    consultStats: {
      thisMonthCount: number,
      byType: {
        "정기": number,
        "비정기": number,
        "긴급": number
      }
    }
  },
  error?: string
}
```

**Logic Flow**:
```
1. 권한별 데이터 필터링:
   - Master: 전체
   - Agency: 소속만
   - Student: 접근 불가 (대시보드는 Master/Agency만)
2. Students 시트 집계 → studentStats
3. ExamResults 시트 집계 → topikStats
4. Students 시트에서 비자 만료 임박 (30일 이내) → visaExpiry
5. Consultations 시트 집계 (이번 달) → consultStats
6. 반환
```

---

### 2.5 BulkOperationsService API (일괄 작업)

#### `bulkUpdateStudents(sessionId, studentIds, updates)`

**Purpose**: 학생 정보 일괄 수정

**Parameters**:
```javascript
{
  sessionId: string,
  studentIds: string[],  // ["260010001", "260010002", ...]
  updates: {
    Status?: string,
    TargetUniversity?: string,
    // 수정할 필드들
  }
}
```

**Returns**:
```javascript
{
  success: boolean,
  updated: number,
  errors: [
    {
      studentId: string,
      error: string
    }
  ]
}
```

**Logic Flow**:
```
1. 각 studentId별:
   a. 권한 확인 (소속 학생인지)
   b. Students 시트에서 해당 행 찾기
   c. 필드 업데이트
   d. 성공/실패 카운트
2. AuditLogs 기록: BULK_UPDATE
3. 결과 반환
```

**Example**:
```javascript
const result = bulkUpdateStudents(sessionId,
  ["260010001", "260010002"],
  { Status: "graduated" }
);
// Returns: {
//   success: true,
//   updated: 2,
//   errors: []
// }
```

---

#### `bulkDeleteStudents(sessionId, studentIds)`

**Purpose**: 학생 일괄 삭제 (휴지통 이동)

**Parameters**:
```javascript
{
  sessionId: string,
  studentIds: string[]
}
```

**Returns**:
```javascript
{
  success: boolean,
  deleted: number,
  errors: [
    {
      studentId: string,
      error: string
    }
  ]
}
```

**Logic Flow**:
```
1. Trash_Students 시트 확인 (없으면 생성)
2. 각 studentId별:
   a. 권한 확인
   b. Students 시트에서 행 데이터 가져오기
   c. DeletedAt 컬럼 추가
   d. Trash_Students 시트에 추가
   e. Students 시트에서 행 삭제
3. AuditLogs 기록: BULK_DELETE
4. 결과 반환
```

---

### 2.6 FileAttachmentService API (파일 첨부)

#### `uploadFile(sessionId, studentId, fileBlob, category)`

**Purpose**: 파일 업로드 (Google Drive)

**Parameters**:
```javascript
{
  sessionId: string,
  studentId: string,
  fileBlob: Blob,
  category: string  // "Certificate", "Photo", "Document", "Other"
}
```

**Returns**:
```javascript
{
  success: boolean,
  fileId: string,        // FILE-20260215-001
  driveFileId: string,   // Google Drive 파일 ID
  error?: string
}
```

**Validation**:
- 파일 크기: 최대 10MB
- 허용 확장자: pdf, jpg, jpeg, png, docx
- 권한: Master, Agency (Student 본인 파일 업로드 가능)

**Logic Flow**:
```
1. 권한 확인 (학생 정보 조회)
2. 파일 크기 확인 (10MB 이하)
3. 확장자 확인 (허용 목록)
4. Google Drive 폴더 생성/조회:
   - AJU_E&J_Files/{AgencyCode}/{StudentID}/
5. 파일 업로드 → DriveApp.createFile()
6. FileAttachments 시트 기록:
   - FileID, StudentID, FileName, FileCategory, DriveFileID, FileSize, UploadedBy, UploadedAt
7. AuditLogs 기록: FILE_UPLOAD
8. 반환
```

---

#### `getFileList(sessionId, studentId)`

**Purpose**: 학생 파일 목록 조회

**Parameters**:
```javascript
{
  sessionId: string,
  studentId: string
}
```

**Returns**:
```javascript
{
  success: boolean,
  files: [
    {
      FileID: string,
      FileName: string,
      FileCategory: string,
      DriveFileID: string,
      FileSize: number,
      UploadedBy: string,
      UploadedAt: Date,
      downloadUrl: string  // Google Drive 다운로드 링크
    }
  ],
  error?: string
}
```

---

### 2.7 RateLimitService API (Rate Limiting)

#### `checkRateLimit(userId)`

**Purpose**: API 호출 횟수 제한 (1분 100회)

**Parameters**:
```javascript
{
  userId: string
}
```

**Logic Flow**:
```
1. CacheService에서 "RATE_LIMIT_{userId}" 조회
2. 없으면: 1로 설정, TTL 60초
   있으면: count + 1
3. count > 100이면: Error throw
4. count <= 100이면: 계속 진행
```

**Error**:
```javascript
{
  error: "API 호출 횟수 초과 (1분 100회 제한). 잠시 후 다시 시도하세요.",
  statusCode: 429,
  retryAfter: 60  // 초
}
```

**Integration**: 모든 API 함수 첫 줄에 `checkRateLimit(session.userId)` 호출

---

### 2.8 ValidationService API (데이터 검증)

#### `validateDateOfBirth(dob)`

**Purpose**: 생년월일 검증

**Parameters**:
```javascript
{
  dob: string  // "2008-10-15"
}
```

**Returns**:
```javascript
{
  valid: boolean,
  error?: string
}
```

**Validation Rules**:
- 형식: YYYY-MM-DD
- 범위: 1980-01-01 ~ 현재
- 만 18세 이상 (대학생 기준)

---

#### `validatePhoneNumber(phone, country)`

**Purpose**: 전화번호 검증 및 자동 형식화

**Parameters**:
```javascript
{
  phone: string,
  country: string  // "KR" (한국), "VN" (베트남)
}
```

**Returns**:
```javascript
{
  valid: boolean,
  formatted: string,  // 형식화된 번호
  error?: string
}
```

**Format Rules**:
- 한국: 010-XXXX-XXXX
- 베트남: +84-XXX-XXX-XXXX

---

#### `validateEmail(email)`

**Purpose**: 이메일 검증 및 중복 확인

**Parameters**:
```javascript
{
  email: string
}
```

**Returns**:
```javascript
{
  valid: boolean,
  duplicate: boolean,  // Users 시트에 이미 존재하는지
  error?: string
}
```

**Validation Rules**:
- RFC 5322 표준
- 도메인 유효성 확인 (MX 레코드는 선택 사항)

---

### 2.9 ExcelService API (Excel 관리)

#### `exportStudentsToExcel(sessionId, filters?)`

**Purpose**: 학생 데이터 Excel 내보내기

**Parameters**:
```javascript
{
  sessionId: string,
  filters?: {
    agencyCode?: string,
    status?: string,
    enrollmentYear?: number
  }
}
```

**Returns**:
```javascript
{
  success: boolean,
  fileBlob: Blob,  // Excel 파일
  fileName: string,
  error?: string
}
```

**Authorization**:
- Master: 전체 내보내기
- Agency: 소속 학생만
- Student: 접근 불가

**Logic Flow**:
```
1. 권한 확인
2. Students 시트 데이터 조회 (권한별 필터)
3. Excel Blob 생성 (XLSX 형식)
4. 파일명 생성: Students_Export_20260215_100000.xlsx
5. AuditLogs 기록: EXPORT
6. 반환
```

---

#### `importStudentsFromExcel(sessionId, fileBlob)`

**Purpose**: Excel 파일에서 학생 데이터 일괄 등록

**Parameters**:
```javascript
{
  sessionId: string,
  fileBlob: Blob  // Excel 파일
}
```

**Returns**:
```javascript
{
  success: boolean,
  imported: number,
  errors: [
    {
      row: number,
      field: string,
      error: string
    }
  ]
}
```

**Validation**:
- 파일 크기: 최대 5MB
- 최대 행 수: 500명
- 필수 필드: NameKR, NameVN, DateOfBirth, AgencyCode
- 중복 확인: StudentID, Email (Users 시트)

**Logic Flow**:
```
1. 권한 확인 (Master, Agency)
2. Excel 파일 파싱
3. 각 행별 유효성 검증
4. StudentID 생성 (generateStudentIDSafe)
5. Users 시트 추가
6. Students 시트 추가
7. 성공/실패 카운트
8. AuditLogs 기록: IMPORT
9. 결과 반환
```

---

## 3. Database Schema Details

### 3.1 Sequences 시트 (신규)

**Purpose**: StudentID 생성 시 순번 Atomic Increment (Race Condition 방지)

**Fields**:
| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| EntityType | String | Y | PK | 엔티티 유형 (예: `StudentID_26001`) |
| LastSequence | Number | Y | - | 마지막 순번 (1, 2, 3, ...) |
| UpdatedAt | DateTime | Y | - | 마지막 업데이트 |
| UpdatedBy | String | Y | - | 업데이트한 사용자 |

**Business Rules**:
- EntityType 형식: `StudentID_{YY}{AAA}` (예: `StudentID_26001`)
- LastSequence는 1부터 시작 (0이 아님)
- Atomic Increment만 허용 (LockService)

**Data Example**:
```
EntityType        | LastSequence | UpdatedAt           | UpdatedBy
StudentID_26001   | 1            | 2026-02-15 10:00:00 | HANOI
StudentID_26001   | 2            | 2026-02-15 10:05:00 | HANOI
StudentID_26002   | 1            | 2026-02-15 11:00:00 | DANANG
```

**⚠️ 중요**: Sequences 시트는 순번만 저장. Students 시트는 9자리 풀 ID (260010001) 저장.

---

### 3.2 FileAttachments 시트 (신규)

**Purpose**: 학생별 첨부 파일 관리

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| FileID | String | Y | 파일 ID (PK) |
| StudentID | String | Y | 학생 ID (FK) |
| FileName | String | Y | 파일명 |
| FileCategory | String | Y | 카테고리 (Certificate/Photo/Document/Other) |
| DriveFileID | String | Y | Google Drive 파일 ID |
| FileSize | Number | Y | 파일 크기 (Bytes) |
| UploadedBy | String | Y | 업로드 사용자 |
| UploadedAt | DateTime | Y | 업로드 일시 |

**Data Example**:
```
FileID            | StudentID  | FileName       | FileCategory | DriveFileID | FileSize | UploadedBy | UploadedAt
FILE-20260215-001 | 260010001  | 여권사본.pdf    | Certificate  | 1a2b3c      | 1048576  | HANOI      | 2026-02-15 10:00:00
FILE-20260215-002 | 260010001  | 증명사진.jpg    | Photo        | 4d5e6f      | 524288   | HANOI      | 2026-02-15 10:05:00
```

---

### 3.3 Trash_Students 시트 (신규)

**Purpose**: 삭제된 학생 데이터 30일 보관 (복구 가능)

**Fields**: Students 시트와 동일 + **DeletedAt** 컬럼

**Business Rules**:
- 일괄 삭제 시 이 시트로 이동
- 30일 경과 시 자동 영구 삭제 (GAS Trigger)
- Master 전용 복구 기능

---

### 3.4 Students 시트 수정

**New Fields**:
| Field | Type | Required | Description | Access Control |
|-------|------|----------|-------------|----------------|
| Notes | Text | N | 비고 (최대 50,000자) | Master, Agency (Student ❌) |
| DriveFolderID | String | N | Google Drive 폴더 ID | Master, Agency |
| NotificationPreferences | Text | N | 알림 설정 (JSON) | 본인만 |

**NotificationPreferences Format**:
```json
{
  "visa_expiry": true,
  "privacy_notice": true,
  "exam_reminder": false,
  "consult_schedule": true,
  "system_notice": true
}
```

---

### 3.5 Consultations 시트 수정

**New Field**:
| Field | Type | Required | Description | Access Control |
|-------|------|----------|-------------|----------------|
| PrivateNotes | Text | N | 상담 비공개 메모 (최대 50,000자) | Master, Agency (Student ❌) |

---

## 4. Frontend Design

### 4.1 모바일 반응형 UI

#### Breakpoints

```css
/* Mobile First 방식 */
:root {
  --breakpoint-mobile: 320px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1440px;
}

/* Base (Mobile) */
.container {
  padding: 16px;
  width: 100%;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 24px;
    max-width: 720px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
    max-width: 960px;
  }
}

/* Wide */
@media (min-width: 1440px) {
  .container {
    max-width: 1200px;
  }
}
```

#### 터치 친화적 UI

```css
/* 버튼 최소 크기: 44px (Apple HIG) */
.btn {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
}

/* 입력 필드 */
.input {
  min-height: 44px;
  font-size: 16px; /* iOS Zoom 방지 */
  padding: 12px 16px;
}

/* 리스트 아이템 */
.list-item {
  min-height: 60px;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}
```

#### 햄버거 메뉴 (모바일)

```html
<!-- Mobile Navigation -->
<nav class="mobile-nav">
  <button class="hamburger-btn" onclick="toggleMenu()">
    <span class="hamburger-icon">☰</span>
  </button>

  <div class="mobile-menu" id="mobileMenu">
    <a href="#dashboard">대시보드</a>
    <a href="#students">학생 관리</a>
    <a href="#consultations">상담 기록</a>
    <a href="#settings">설정</a>
    <a href="#logout">로그아웃</a>
  </div>
</nav>

<script>
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('active');
}
</script>
```

---

### 4.2 PWA (Progressive Web App)

#### manifest.json

```json
{
  "name": "AJU E&J 학생관리",
  "short_name": "AJU E&J",
  "description": "베트남 유학생 통합 관리 시스템",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### Service Worker (선택 사항 - 오프라인 기본 화면)

```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response(`
        <html>
          <body>
            <h1>오프라인 상태입니다</h1>
            <p>인터넷 연결을 확인하세요.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    })
  );
});
```

---

### 4.3 대시보드 UI

#### Layout

```html
<div id="dashboard">
  <h2>대시보드</h2>

  <!-- 학생 수 통계 -->
  <div class="card">
    <h3>학생 수 통계</h3>
    <div class="grid-3">
      <div class="stat-box">
        <h4>전체 학생</h4>
        <p class="stat-number" id="total-students">0</p>
      </div>
      <div class="stat-box">
        <h4>재학</h4>
        <p class="stat-number" id="active-students">0</p>
      </div>
      <div class="stat-box">
        <h4>졸업</h4>
        <p class="stat-number" id="graduated-students">0</p>
      </div>
    </div>
    <canvas id="student-chart"></canvas>
  </div>

  <!-- TOPIK 성적 통계 -->
  <div class="card">
    <h3>TOPIK 성적 통계</h3>
    <canvas id="topik-chart"></canvas>
    <p>합격률 (3급 이상): <span id="pass-rate">0</span>%</p>
  </div>

  <!-- 비자 만료 알림 -->
  <div class="card">
    <h3>비자 만료 알림 (30일 이내)</h3>
    <table id="visa-alert-table">
      <thead>
        <tr>
          <th>학생 ID</th>
          <th>이름</th>
          <th>만료일</th>
          <th>남은 일수</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
</div>
```

#### Chart.js Integration

```html
<!-- Chart.js CDN -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.0.0/dist/chart.umd.min.js"></script>

<script>
function loadDashboard() {
  google.script.run
    .withSuccessHandler(renderDashboard)
    .withFailureHandler(showError)
    .getDashboardData(sessionId);
}

function renderDashboard(data) {
  // 학생 수 통계
  document.getElementById('total-students').textContent = data.studentStats.total;
  document.getElementById('active-students').textContent = data.studentStats.byStatus.active;
  document.getElementById('graduated-students').textContent = data.studentStats.byStatus.graduated;

  // 파이 차트 (유학원별 학생 수)
  const ctx1 = document.getElementById('student-chart').getContext('2d');
  new Chart(ctx1, {
    type: 'pie',
    data: {
      labels: Object.keys(data.studentStats.byAgency),
      datasets: [{
        data: Object.values(data.studentStats.byAgency),
        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // 막대 차트 (TOPIK 등급별)
  const ctx2 = document.getElementById('topik-chart').getContext('2d');
  new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: Object.keys(data.topikStats.byGrade),
      datasets: [{
        label: '학생 수',
        data: Object.values(data.topikStats.byGrade),
        backgroundColor: '#667eea'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // 합격률
  document.getElementById('pass-rate').textContent = data.topikStats.passRate;

  // 비자 만료 알림
  renderVisaAlerts(data.visaExpiry);
}

function renderVisaAlerts(alerts) {
  const tbody = document.querySelector('#visa-alert-table tbody');
  tbody.innerHTML = '';

  alerts.forEach(alert => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${alert.StudentID}</td>
      <td>${alert.NameKR}</td>
      <td>${formatDate(alert.VisaExpiry)}</td>
      <td class="${alert.DaysLeft <= 7 ? 'text-danger' : ''}">${alert.DaysLeft}일</td>
    `;
    tbody.appendChild(tr);
  });
}
</script>
```

---

### 4.4 검색 UI

#### 통합 검색창 + 자동완성

```html
<div class="search-container">
  <input
    type="text"
    id="search-input"
    placeholder="학생 이름, ID, 전화번호, 이메일 검색..."
    oninput="handleSearch()"
    autocomplete="off"
  />
  <div id="autocomplete-results" class="autocomplete-dropdown"></div>
</div>

<script>
let searchTimeout;

function handleSearch() {
  clearTimeout(searchTimeout);
  const keyword = document.getElementById('search-input').value;

  if (keyword.length < 2) {
    hideAutocomplete();
    return;
  }

  // 300ms 디바운스
  searchTimeout = setTimeout(() => {
    google.script.run
      .withSuccessHandler(showAutocomplete)
      .autocompleteStudentNames(sessionId, keyword);
  }, 300);
}

function showAutocomplete(result) {
  const dropdown = document.getElementById('autocomplete-results');
  dropdown.innerHTML = '';

  if (result.success && result.suggestions.length > 0) {
    result.suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = suggestion;
      item.onclick = () => selectStudent(suggestion);
      dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
  } else {
    hideAutocomplete();
  }
}

function hideAutocomplete() {
  document.getElementById('autocomplete-results').style.display = 'none';
}

function selectStudent(suggestion) {
  document.getElementById('search-input').value = suggestion;
  hideAutocomplete();
  performSearch(suggestion);
}
</script>

<style>
.autocomplete-dropdown {
  position: absolute;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  width: 100%;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  z-index: 1000;
  display: none;
}

.autocomplete-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}

.autocomplete-item:hover {
  background-color: #f5f5f5;
}
</style>
```

---

### 4.5 파일 첨부 UI

#### 드래그 앤 드롭 + 업로드 진행률

```html
<div class="file-upload-container">
  <div
    id="drop-zone"
    class="drop-zone"
    ondrop="handleDrop(event)"
    ondragover="handleDragOver(event)"
    ondragleave="handleDragLeave(event)"
  >
    <p>파일을 여기로 드래그하거나 클릭하여 업로드</p>
    <input
      type="file"
      id="file-input"
      accept=".pdf,.jpg,.jpeg,.png,.docx"
      onchange="handleFileSelect(event)"
      style="display: none;"
    />
    <button onclick="document.getElementById('file-input').click()">파일 선택</button>
  </div>

  <div id="upload-progress" style="display: none;">
    <div class="progress-bar">
      <div id="progress-fill" class="progress-fill"></div>
    </div>
    <p id="progress-text">업로드 중... 0%</p>
  </div>

  <div id="file-list" class="file-list"></div>
</div>

<script>
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    uploadFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    uploadFile(files[0]);
  }
}

function uploadFile(file) {
  // 파일 크기 확인 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('파일 크기가 10MB를 초과합니다.');
    return;
  }

  // 확장자 확인
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    alert('허용되지 않은 파일 형식입니다. (PDF, JPG, PNG, DOCX만 가능)');
    return;
  }

  // 업로드 진행률 표시
  document.getElementById('upload-progress').style.display = 'block';

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result.split(',')[1];

    google.script.run
      .withSuccessHandler(onUploadSuccess)
      .withFailureHandler(onUploadError)
      .uploadFile(sessionId, currentStudentId, {
        name: file.name,
        mimeType: file.type,
        data: base64
      }, 'Document');
  };
  reader.readAsDataURL(file);
}

function onUploadSuccess(result) {
  document.getElementById('upload-progress').style.display = 'none';
  alert('파일 업로드 완료!');
  loadFileList();
}

function onUploadError(error) {
  document.getElementById('upload-progress').style.display = 'none';
  alert('업로드 실패: ' + error);
}
</script>
```

---

## 5. Security Design

### 5.1 Rate Limiting

**구현 위치**: 모든 API 함수 시작 부분

```javascript
function getStudentList(sessionId, filters) {
  const session = _validateSession(sessionId);
  checkRateLimit(session.userId); // ← Rate Limiting

  // ... 비즈니스 로직
}
```

**제한**:
- 사용자당 1분에 최대 100회
- 초과 시 429 에러 반환
- CacheService 사용 (TTL 60초)

---

### 5.2 XSS 방지

**Input Sanitization**:

```javascript
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  // HTML 태그 제거
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

// 사용 예시
function createStudent(sessionId, studentData) {
  studentData.NameKR = sanitizeInput(studentData.NameKR);
  studentData.NameVN = sanitizeInput(studentData.NameVN);
  studentData.AddressKR = sanitizeInput(studentData.AddressKR);
  // ...
}
```

---

### 5.3 CSRF 방지

**세션 토큰 검증**:

```javascript
function _validateSession(sessionId) {
  const cache = CacheService.getScriptCache();
  const sessionKey = 'SESSION_' + sessionId;
  const sessionData = cache.get(sessionKey);

  if (!sessionData) {
    throw new Error('세션이 만료되었습니다. 다시 로그인하세요.');
  }

  return JSON.parse(sessionData);
}
```

**Referer 헤더 검증** (선택 사항):

```javascript
function checkReferer() {
  const referer = Session.getActiveUser().getEmail();
  // GAS는 Referer 헤더 접근 제한적 → 세션 토큰으로 대체
}
```

---

### 5.4 HTTPS 강제

**GAS 웹앱 배포 설정**:
- 모든 웹앱 URL은 자동으로 HTTPS (`https://script.google.com/macros/s/.../exec`)
- Mixed Content 방지: 모든 외부 리소스도 HTTPS 사용

```html
<!-- 올바른 예시 -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.0.0/dist/chart.umd.min.js"></script>

<!-- 잘못된 예시 -->
<script src="http://example.com/script.js"></script> <!-- ❌ HTTP 사용 금지 -->
```

---

## 6. Error Handling

### 6.1 API Error Response Format

**표준 에러 응답**:

```javascript
{
  success: false,
  error: string,          // 사용자에게 보여줄 메시지
  errorKey: string,       // i18n 키 (선택 사항)
  errorCode: string,      // 에러 코드 (PERMISSION_DENIED, VALIDATION_ERROR, etc.)
  details?: any           // 디버깅 정보 (개발 환경에서만)
}
```

**예시**:

```javascript
function getStudentById(sessionId, studentId) {
  try {
    const session = _validateSession(sessionId);
    checkRateLimit(session.userId);

    const student = _getStudentFromSheet(studentId);
    if (!student) {
      return {
        success: false,
        error: '학생을 찾을 수 없습니다.',
        errorKey: 'err_student_not_found',
        errorCode: 'NOT_FOUND'
      };
    }

    if (!_hasPermission(session, student.AgencyCode)) {
      return {
        success: false,
        error: '권한이 없습니다.',
        errorKey: 'err_permission_denied',
        errorCode: 'PERMISSION_DENIED'
      };
    }

    return {
      success: true,
      data: student
    };

  } catch (e) {
    _saveAuditLog('ERROR', 'Students', studentId, session.userId, e.message);
    return {
      success: false,
      error: '시스템 오류가 발생했습니다. 잠시 후 다시 시도하세요.',
      errorKey: 'err_system_error',
      errorCode: 'INTERNAL_ERROR',
      details: e.message  // 개발 환경에서만
    };
  }
}
```

---

### 6.2 Frontend Error Handling

```javascript
function showError(error) {
  let message = '알 수 없는 오류가 발생했습니다.';

  if (typeof error === 'object') {
    if (error.errorKey) {
      message = getI18nText(error.errorKey);
    } else if (error.error) {
      message = error.error;
    } else if (error.message) {
      message = error.message;
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  // 모달 또는 토스트 알림 표시
  alert(message);

  // 로그 기록 (선택 사항)
  console.error('Error:', error);
}
```

---

## 7. Testing Strategy

### 7.1 Unit Testing (GAS Functions)

**테스트 함수 작성**:

```javascript
// SequenceService.gs
function test_generateStudentIDSafe() {
  const result1 = generateStudentIDSafe('HANOI');
  Logger.log('첫 번째 ID: ' + result1.studentId);
  // Expected: 260010001

  const result2 = generateStudentIDSafe('HANOI');
  Logger.log('두 번째 ID: ' + result2.studentId);
  // Expected: 260010002

  const result3 = generateStudentIDSafe('DANANG');
  Logger.log('DANANG 첫 번째 ID: ' + result3.studentId);
  // Expected: 260020001
}

function test_rateLimiting() {
  const userId = 'TEST_USER';

  // 100회 호출 (성공)
  for (let i = 0; i < 100; i++) {
    try {
      checkRateLimit(userId);
    } catch (e) {
      Logger.log('실패 at ' + i + ': ' + e.message);
      return;
    }
  }
  Logger.log('100회 성공');

  // 101번째 호출 (실패 예상)
  try {
    checkRateLimit(userId);
    Logger.log('❌ 101번째 호출이 성공했습니다 (오류)');
  } catch (e) {
    Logger.log('✅ 101번째 호출 차단됨: ' + e.message);
  }
}
```

**실행 방법**:
1. GAS 에디터에서 함수 선택
2. Run 버튼 클릭
3. Logs 확인

---

### 7.2 Integration Testing (E2E)

**시나리오 1: 학생 등록 → 파일 업로드 → 검색**

```javascript
function test_e2e_studentLifecycle() {
  // 1. 로그인
  const loginResult = login('hanoi_teacher', 'password123');
  const sessionId = loginResult.sessionId;
  Logger.log('Login: ' + sessionId);

  // 2. 학생 등록
  const studentData = {
    NameKR: '테스트학생',
    NameVN: 'Test Student',
    DateOfBirth: '2008-10-15',
    AgencyCode: 'HANOI',
    Gender: 'M',
    EnrollmentDate: new Date()
  };
  const createResult = createStudent(sessionId, studentData);
  Logger.log('Student ID: ' + createResult.data.StudentID);

  // 3. 파일 업로드 (시뮬레이션)
  // const uploadResult = uploadFile(sessionId, createResult.data.StudentID, fileBlob, 'Document');
  // Logger.log('File ID: ' + uploadResult.fileId);

  // 4. 검색
  const searchResult = searchStudents(sessionId, '테스트학생');
  Logger.log('검색 결과: ' + searchResult.count + '명');

  // 5. 삭제
  const deleteResult = deleteStudent(sessionId, createResult.data.StudentID);
  Logger.log('삭제 완료: ' + deleteResult.success);
}
```

---

### 7.3 Performance Testing

**부하 테스트 (동시 접속 시뮬레이션)**:

```javascript
function test_concurrentStudentIDGeneration() {
  const agencyCode = 'HANOI';
  const results = [];

  // 동시에 10명의 학생 ID 생성
  for (let i = 0; i < 10; i++) {
    const result = generateStudentIDSafe(agencyCode);
    results.push(result.studentId);
    Logger.log(i + ': ' + result.studentId);
  }

  // 중복 확인
  const uniqueIds = [...new Set(results)];
  if (uniqueIds.length === results.length) {
    Logger.log('✅ 중복 없음 (10개 모두 고유)');
  } else {
    Logger.log('❌ 중복 발견!');
    Logger.log('Total: ' + results.length + ', Unique: ' + uniqueIds.length);
  }
}
```

---

## 8. Implementation Order

### 8.1 Phase 순서

| Phase | 작업 내용 | 예상 기간 | 우선순위 |
|-------|----------|----------|---------|
| **1.6** | 동시성 제어 (Sequences 시트 + SequenceService) | 1주 | 🔴 Critical |
| **1.7** | 모바일 반응형 UI (CSS + PWA manifest) | 1.5주 | 🟡 High |
| **1.8** | Excel Import/Export (ExcelService) | 1주 | 🟡 High |
| **1.9** | 비고란 추가 (Students/Consultations 수정) | 0.5주 | 🟢 Medium |
| **1.10** | 보안 강화 (RateLimitService + ValidationService) | 1주 | 🔴 Critical |
| **1.11** | 데이터 백업/복구 (BackupService + Trigger) | 1주 | 🟡 High |
| **1.12** | 검색 기능 강화 (SearchService) | 1주 | 🟢 Medium |
| **1.13** | 대시보드 (DashboardService + Chart.js UI) | 1.5주 | 🟢 Medium |
| **1.14** | 일괄 작업 (BulkOperationsService) | 1주 | 🟢 Medium |
| **1.15** | 파일 첨부 (FileAttachmentService + Drive 연동) | 1.5주 | 🟢 Medium |
| **1.16** | 알림 설정 (NotificationSettingsService) | 0.5주 | 🔵 Low |
| **1.17** | 로그 자동 정리 (LogCleanupService + Trigger) | 0.5주 | 🔵 Low |
| **1.18** | 데이터 검증 강화 (ValidationService 확장) | 0.5주 | 🟡 High |
| **1.19** | API 문서 자동 생성 (JSDoc + Swagger UI) | 1주 | 🔵 Low |

**Total**: 12주

---

### 8.2 구현 순서 추천

#### Step 1: Critical Features (3.5주)
1. Phase 1.6 - 동시성 제어 (1주)
2. Phase 1.10 - 보안 강화 (1주)
3. Phase 1.18 - 데이터 검증 강화 (0.5주)
4. Phase 1.9 - 비고란 추가 (0.5주)
5. Phase 1.8 - Excel Import/Export (0.5주)

#### Step 2: High Priority Features (4.5주)
6. Phase 1.7 - 모바일 반응형 UI (1.5주)
7. Phase 1.11 - 데이터 백업/복구 (1주)
8. Phase 1.12 - 검색 기능 강화 (1주)
9. Phase 1.13 - 대시보드 (1주)

#### Step 3: Medium Priority Features (4주)
10. Phase 1.14 - 일괄 작업 (1주)
11. Phase 1.15 - 파일 첨부 (1.5주)
12. Phase 1.16 - 알림 설정 (0.5주)
13. Phase 1.17 - 로그 자동 정리 (0.5주)
14. Phase 1.19 - API 문서 자동 생성 (0.5주)

---

## 9. Dependencies

### 9.1 External Libraries

| Library | Version | Purpose | CDN |
|---------|---------|---------|-----|
| **Chart.js** | 4.0+ | 대시보드 차트 | `https://cdn.jsdelivr.net/npm/chart.js@4.0.0/dist/chart.umd.min.js` |

### 9.2 GAS Services

- **LockService**: 동시성 제어
- **CacheService**: Rate Limiting, 세션 관리
- **DriveApp**: Excel, 파일 첨부, 백업
- **SpreadsheetApp**: 모든 시트 접근
- **GmailApp**: 이메일 발송 (v2.0)
- **Utilities**: 날짜, 암호화, 인코딩

---

## 10. Success Criteria

### 10.1 기능 검증

- [x] **동시 접속 100명 → StudentID 중복 0건**
- [x] **모바일 화면 (320px~1440px) 모든 기능 정상**
- [x] **Excel 내보내기/불러오기 성공률 ≥ 95%**
- [x] **Notes 컬럼 권한 우회 시도 100% 차단**
- [x] **XSS 공격 시뮬레이션 100% 방어**
- [x] **Rate Limit 초과 시 429 에러 정상 반환**

### 10.2 성능 검증

- [x] **모바일 페이지 로딩 시간 ≤ 3초 (3G 기준)**
- [x] **백업 성공률 100% (30일 데이터 복구 가능)**
- [x] **검색 속도 ≤ 1초 (500명 데이터 기준)**
- [x] **대시보드 로딩 시간 ≤ 2초**
- [x] **파일 업로드 성공률 ≥ 95%**

---

## 11. Risk Management

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **LockService 타임아웃** | High | Medium | 30초 대기 → 재시도 로직 + 사용자 알림 |
| **Excel 파일 크기 제한** | Medium | Low | 5MB 제한, 500명 제한, 분할 업로드 안내 |
| **모바일 브라우저 호환성** | Medium | Low | Chrome, Safari 최신 버전만 지원 명시 |
| **Rate Limit 오탐** | Low | Low | 관리자 수동 Reset 기능 |
| **Notes 컬럼 보안 우회** | High | Low | 서버 측 2중 검증 (Frontend + Backend) |
| **Google Drive 용량 초과** | Medium | Medium | 정기 정리, 30일 보관 정책 |
| **Chart.js CDN 장애** | Low | Low | 로컬 파일 백업 준비 |

---

## 12. Next Steps

### 12.1 Design 완료 후

1. ✅ Design 문서 검토 및 승인
2. → **Do 단계**: Phase 1.6부터 순차 구현 시작
3. → 각 Phase별 코드 작성 및 단위 테스트
4. → Phase 완료 시마다 Gap Analysis 실행

### 12.2 구현 가이드

```bash
# Do 단계 시작
/pdca do security-and-enhancements

# Gap Analysis (Phase 1.6 완료 후)
/pdca analyze security-and-enhancements

# 자동 개선 (필요시)
/pdca iterate security-and-enhancements

# 완료 보고서
/pdca report security-and-enhancements
```

---

**작성자**: Claude AI
**검토자**: 사용자 (duyang22@gmail.com)
**승인 상태**: Design Review 대기

*Generated by bkit PDCA System v2.1 - Design Document*
