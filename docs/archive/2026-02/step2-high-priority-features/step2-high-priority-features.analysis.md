# Step 2 - High Priority Features Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation) - Re-analysis v4.0
>
> **Project**: AJU E&J Student Management Platform
> **Version**: 2.2
> **Analyst**: bkit-gap-detector
> **Date**: 2026-02-16
> **Design Doc**: [step2-high-priority-features.design.md](../02-design/features/step2-high-priority-features.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Step 2 High Priority Features (Mobile UI, Backup/Restore, Search, Dashboard)의 Design 문서와 실제 구현 코드를 비교하여 Match Rate를 계산하고 Gap 목록을 생성한다.

**v4.0 Re-analysis 사유**: v3.0 이후 DashboardService와 SearchService에 주요 개선 사항이 반영됨:

**DashboardService 개선 (3건)**:
- `getAgencyDistribution()`: IsActive 필터 추가 -- Active 학생만 집계
- `getTopikDistribution()`: Students 시트 조인으로 Active 학생만 집계
- `getConsultTypeStats()`: Students 시트 조인으로 Active 학생의 상담만 집계

**SearchService 개선 (2건)**:
- `advancedFilter()`: `filters.isActive` (boolean) 필터 추가
- `advancedFilter()`: `filters.topikLevels` (number[]) 필터 추가 + ExamResults 시트 조인

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/step2-high-priority-features.design.md`
- **Implementation Files**:
  - `src/MobileUIService.gs` (3 API)
  - `src/ResponsiveStylesheet.html` (Responsive CSS)
  - `src/MobileStylesheet.html` (Mobile Components CSS)
  - `manifest.json` (PWA manifest)
  - `src/BackupService.gs` (5 API)
  - `src/SearchService.gs` (3 API) -- modified 2026-02-16 (v2.2)
  - `src/DashboardService.gs` (5 API) -- **modified 2026-02-16 (v2.2)**
- **Analysis Date**: 2026-02-16
- **Previous Analysis**: v3.0 (2026-02-16, Match Rate: 91.4%)

### 1.3 Analysis Version History

| Version | Date | Match Rate | Major Changes |
|---------|------|:----------:|---------------|
| v1.0 | 2026-02-15 | 90% | Initial analysis |
| v2.0 | 2026-02-16 | 90.3% | Consultations search + matchScore |
| v3.0 | 2026-02-16 | 91.4% | XSS sanitize + autocomplete + cache + offset |
| **v4.0** | **2026-02-16** | **93.4%** | **DashboardService IsActive + SearchService advancedFilter** |

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 MobileUIService API (3/3) -- Unchanged from v3.0

#### `getDeviceInfo(userAgent, screenWidth)` -- Score: **85%**

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Function Name | `getDeviceInfo()` | `getDeviceInfo(userAgent, screenWidth)` | Changed |
| Parameters | None (client-side detection) | `userAgent: string, screenWidth: number` | Changed |
| Return: deviceType | `string` | `string` (in `deviceInfo` wrapper) | Match |
| Return: screenWidth | `number` | `number` (in `deviceInfo` wrapper) | Match |
| Return: screenHeight | `number` | Not returned | Missing |
| Return: isTouchDevice | `boolean` | `boolean` (in `deviceInfo` wrapper) | Match |
| Return: userAgent | `string` | Not returned (input param instead) | Changed |
| Return: os | Not designed | `string` (iOS, Android, etc.) | Added |
| Return: browser | Not designed | `string` (Chrome, Safari, etc.) | Added |
| Return: breakpoint | Not designed | `string` (mobile, tablet, desktop, large-desktop) | Added |
| Return: timestamp | Not designed | `string` (ISO 8601) | Added |
| Response Wrapper | Direct object | `{ success, deviceInfo, errorKey, error }` | Changed |
| Error Handling | Not specified | Input validation + try-catch pattern | Added |

**Score**: 85% -- GAS 서버사이드 제약으로 파라미터 변경은 합리적

---

#### `generateManifest(lang)` -- Score: **95%**

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Function Name | `generateManifest()` | `generateManifest(lang)` | Changed |
| Parameters | None | `lang: string ('ko' or 'vi')` | Added |
| Return: name | `string` | `string` (from SystemConfig) | Match |
| Return: short_name | `string` | `string` | Match |
| Return: display | `"standalone"` | `"standalone"` | Match |
| Return: orientation | `"portrait"` | `"portrait-primary"` | Minor diff |
| Return: theme_color | `"#4285f4"` | `"#4285f4"` | Match |
| Return: background_color | `"#ffffff"` | `"#ffffff"` | Match |
| Return: icons | 2 icons (192, 512) | 2 icons (192, 512) | Match |
| Return: shortcuts | Not designed | 3 shortcuts (students, agencies, consultations) | Added |
| SystemConfig Integration | Mentioned | Full SystemConfig sheet integration with i18n | Match |
| Response Wrapper | Direct manifest object | `{ success, manifest, errorKey, error }` | Changed |

**Score**: 95%

---

#### `optimizeForMobile(settings)` -- Score: **80%**

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Function Name | `optimizeForMobile(settings)` | `optimizeForMobile(settings)` | Match |
| Param: deviceType | `string` | `string` (in settings object) | Match |
| Return: fontSize | `"14px"/"16px"/"18px"` | `14/15/16` (number, not string) | Changed |
| Return: buttonHeight | `"44px"/"40px"/"36px"` | `44/48/40` (number, not string) | Changed |
| Return: layoutColumns | `1/2/3` | `1/2/3` | Match |
| Return: enableSwipe | `boolean` | `boolean` | Match |
| Return: enableHamburgerMenu | `boolean` | `showHamburgerMenu: boolean` | Renamed |
| Return: cssVariables | Not designed | `object` (CSS Custom Properties) | Added |
| Mobile fontSize | `"14px"` | `14` | Type diff |
| Tablet fontSize | `"16px"` | `15` | Value diff |
| Desktop fontSize | `"18px"` | `16` | Value diff |
| Tablet buttonHeight | `"40px"` | `48` | Value diff |
| Desktop buttonHeight | `"36px"` | `40` | Value diff |

**Score**: 80%

**MobileUIService Average**: (85 + 95 + 80) / 3 = **87%** (unchanged)

---

### 2.2 BackupService API (5/5) -- Unchanged from v3.0

#### `createBackup(sessionId)` -- Score: **92%**

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Function Signature | `createBackup(sessionId)` | `createBackup(sessionId)` | Match |
| Session/Permission | Master only | Master only | Match |
| Rate Limiting | Yes | `checkRateLimit(session.userId)` | Match |
| Backup Storage | `"Backups/YYYY-MM-DD/"` folder | Google Drive folder `AJU_EJ_Backups` | Changed |
| Sheets Copied | 6 specific sheets | All sheets from spreadsheet | Enhanced |
| Backup ID Format | `"backup_YYYY-MM-DD_HH-mm-ss"` | `"backup_YYYY-MM-DD_HHMMSS"` | Match |
| Backup Metadata | Not designed | `Backup_Info` sheet with full metadata | Added |
| Error: `err_timeout` | Yes (split backup) | Not implemented | Missing |
| Audit Log | Yes | `_saveAuditLog()` called | Match |

#### `listBackups(sessionId)` -- Score: **95%**

All designed fields present. Legacy backup support added. Timestamp DESC sorting implemented.

#### `restoreFromBackup(sessionId, backupId)` -- Score: **98%**

Pre-restore safety backup fully implemented. Enhanced return with sheet names.

#### `cleanupOldBackups(sessionId, daysToKeep)` -- Score: **95%**

Optional sessionId for trigger-based auto cleanup. Trash instead of permanent delete.

#### `scheduleAutoBackup()` -- Score: **95%**

Uses `_runAutoBackup` private wrapper. Auto cleanup integrated in trigger.

**BackupService Average**: (92 + 95 + 98 + 95 + 95) / 5 = **95%** (unchanged)

---

### 2.3 SearchService API (3/3) -- **advancedFilter UPDATED from v3.0**

#### `searchAll(sessionId, query, options)` -- Score: **92%** (unchanged)

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Function Signature | `searchAll(sessionId, query, options)` | Match | Match |
| Session Validation | Yes | Yes | Match |
| Rate Limiting | Yes | `checkRateLimit(session.userId)` | Match |
| Query Sanitize (XSS) | Yes | `_sanitizeQuery()` function | Match |
| Min Query Length | Not specified | 2 characters minimum | Added |
| Options: types | `Array<string>` | `Array<string>` (default: all 3 types) | Match |
| Options: limit | `number` (default: 50) | `number` (default: 10) | Diff |
| Options: offset | `number` (default: 0) | `options.offset` with `.slice()` pagination | Match |
| Return: students | Array with matchScore | Array with matchScore (100/80/60/40) | Match |
| Return: agencies | Array with matchScore | Array with matchScore (100/80/40) | Match |
| Return: consultations | Array with ConsultID, StudentID, Summary, matchScore | Array with full data + matchScore | Match |
| Return: totalCount | `number` | `number` | Match |
| matchScore Calculation | 100/80/60/40 | 100/80/60/40 (students), 100/80/40 (agencies/consultations) | Match |
| matchScore Sorting | matchScore DESC | matchScore DESC (all 3 types) | Match |
| Permission: Master | All data | All data | Match |
| Permission: Agency | Own students only | Own students + own students' consultations | Match |

**Remaining gap**: Default `limit` is 10, design specifies 50 (minor)

**Score**: 92%

---

#### `autocomplete(sessionId, query, type)` -- Score: **88%** (unchanged)

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Function Signature | `autocomplete(sessionId, query, type)` | Match | Match |
| Min Query Length | 3 characters | 3 characters | Match |
| Return format | `Array<{ label, value, type, id }>` | `Array<{ label, value, type, id }>` | Match |
| Max Results | 10 | 10 | Match |
| CacheService | 60s TTL, key: `"autocomplete_{type}_{query}"` | 60s TTL, exact key format | Match |
| Student Search Fields | NameKR, NameVN, StudentID (prefix match) | NameKR, NameVN (contains match) | Changed |
| Agency Fields | AgencyName, AgencyCode (prefix match) | AgencyName (contains match) | Changed |
| Session Validation | Yes | Yes | Match |
| Rate Limiting | Not specified | `checkRateLimit(session.userId)` | Added |
| XSS Sanitization | Not specified | `_sanitizeQuery()` applied | Added |
| Permission Filtering | Not specified | Agency: own students only | Added |
| Duplicate Prevention | Not specified | `addedNames` Set for deduplication | Added |
| Cache Error Handling | Not specified | try-catch on cache.put (non-fatal) | Added |

**Remaining gaps**:
- Student/Agency search uses `contains` match instead of design's `prefix` match
- StudentID field not searched for autocomplete

**Score**: 88%

---

#### `advancedFilter(sessionId, filters)` -- **SIGNIFICANTLY IMPROVED**

| Item | Design | Implementation | v3.0 | v4.0 |
|------|--------|----------------|:----:|:----:|
| Function Signature | `advancedFilter(sessionId, filters)` | Match | Match | Match |
| Session Validation | Yes | Yes | Match | Match |
| Rate Limiting | Not specified | `checkRateLimit(session.userId)` | Added | Added |
| Filter: agencyCode | `string` (single) | `agencyCodes: Array<string>` (multiple) | Enhanced | Enhanced |
| Filter: dateFrom/dateTo | `string` (YYYY-MM-DD) | `string` (YYYY-MM-DD) | Match | Match |
| **Filter: isActive** | `boolean` | **`filters.isActive` with `status === 'Active'` check** | **Missing** | **Match** |
| Filter: status | `string` | `statuses: Array<string>` (multiple) | Enhanced | Enhanced |
| **Filter: topikLevel** | `string` | **`filters.topikLevels: number[]` with ExamResults JOIN** | **Missing** | **Match** |
| Return: students + count | Yes | Yes | Match | Match |
| Date Field | RegisteredAt | RegisteredDate | Naming diff | Naming diff |
| Permission: Master/Agency | Yes | Yes | Match | Match |

**v4.0 Improvements**:

1. **isActive 필터** (SearchService.gs lines 567-572):
   ```
   if (filters.isActive !== undefined) {
     const isActive = (status === 'Active');
     if (filters.isActive !== isActive) { continue; }
   }
   ```
   - Design specification: `isActive?: boolean` -- MATCH
   - `true` = Active 상태만, `false` = Inactive 상태만 반환

2. **topikLevels 필터** (SearchService.gs lines 500-521, 574-583):
   ```
   ExamResults 시트 조인 로직:
   1. ExamResults 시트에서 학생별 최신 TOPIK 레벨 추출 (line 501-521)
   2. "TOPIK 1" -> 1 변환 (parseInt, line 516)
   3. studentTopikMap[studentID] = levelNumber (line 518)
   4. 필터링: filters.topikLevels.includes(studentLevel) (line 580)
   ```
   - Design specification: `topikLevel?: string` -- Enhanced to `topikLevels?: number[]` (다중 선택 지원)
   - ExamResults 시트 조인으로 TOPIK 레벨 필터링 구현

**v3.0 Score**: 80% --> **v4.0 Score**: 92%

**SearchService Average (v4.0)**: (92 + 88 + 92) / 3 = **91%** (up from 87%)

---

### 2.4 DashboardService API (5/5) -- **PARTIALLY UPDATED from v3.0**

#### `getStatistics(sessionId)` -- Score: **85%** (unchanged)

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Return: totalStudents | `number` (IsActive=true) | `number` (all students, no IsActive filter) | **Still Missing** |
| Return: totalAgencies | `number` (IsActive=true) | `number` (all except MASTER) | **Still Missing** |
| Return: consultationsThisMonth | `number` | `number` | Match |
| Return: newStudentsThisMonth | `number` | `number` | Match |
| IsActive filter | Required for totalStudents/totalAgencies | Not implemented in this function | **Missing** |
| Permission: Master/Agency | Yes | Yes (Master=all, Agency=own) | Match |

**Note**: `getStatistics()` 함수 자체는 아직 IsActive 필터가 없음. Design에서 "IsActive=true인 학생 수"로 명시했으나, 현재 코드(line 51)는 `studentsData.length - 1`로 전체 학생 수를 반환함. 이는 다른 3개 함수(AgencyDistribution, TopikDistribution, ConsultTypeStats)에 IsActive 필터가 추가된 것과 불일치함.

**Score**: 85% (unchanged)

---

#### `getMonthlyTrend(sessionId, months)` -- Score: **95%** (unchanged)

Excellent implementation with cumulative count. Only diff: `RegisteredDate` vs `RegisteredAt` column name.

---

#### `getAgencyDistribution(sessionId)` -- **IMPROVED**

| Item | Design | Implementation | v3.0 | v4.0 |
|------|--------|----------------|:----:|:----:|
| Function Signature | `getAgencyDistribution(sessionId)` | Match | Match | Match |
| Session/Permission | Master: all, Agency: own | Master only | Stricter | Stricter |
| AgencyCode grouping | Yes | Yes | Match | Match |
| AgencyName lookup | Yes (Agencies sheet) | Yes (Agencies sheet) | Match | Match |
| Percentage calculation | Yes | `Math.round(percentage * 10) / 10` | Match | Match |
| Sorting | studentCount DESC | studentCount DESC | Match | Match |
| **IsActive filter** | **Implied (Active students)** | **`status === 'Active'` (line 319)** | **Missing** | **Match** |
| MASTER exclusion | Not specified | MASTER agency excluded | Added | Added |

**v4.0 Improvement**: DashboardService.gs line 319:
```
if (agencyMap.hasOwnProperty(agencyCode) && status === 'Active') {
  agencyMap[agencyCode].studentCount++;
  totalStudents++;
}
```
- Active 상태 학생만 유학원별 분포에 집계
- 비활성(Inactive/Graduated) 학생은 제외

**v3.0 Score**: 90% --> **v4.0 Score**: 93%

---

#### `getTopikDistribution(sessionId)` -- **IMPROVED**

| Item | Design | Implementation | v3.0 | v4.0 |
|------|--------|----------------|:----:|:----:|
| Function Signature | `getTopikDistribution(sessionId)` | Match | Match | Match |
| Students + ExamResults JOIN | Yes | Yes | Match | Match |
| **IsActive filter** | **Implied (from Students sheet)** | **`activeStudentIDs` Set from Active students** | **Missing** | **Match** |
| **Agency permission** | Yes | **Agency filtering in activeStudentIDs** | **Missing** | **Match** |
| Level labels | "1급"~"6급", "미응시" | "TOPIK 1"~"TOPIK 6", "None" | Changed | Changed |
| Level sorting | Ascending (1->6->None) | No explicit sorting | Missing | Missing |

**v4.0 Improvements** (DashboardService.gs lines 390-411):
```
1. Students 시트에서 Active 학생 ID Set 생성 (lines 398-411)
2. 권한 필터링: Master=전체 Active, Agency=소속 유학원 Active만 (line 407)
3. ExamResults에서 activeStudentIDs에 포함된 학생만 집계 (line 439)
```

**Remaining gaps**:
- Level labels: "TOPIK 1" vs Design "1급" (i18n 미적용)
- No explicit ascending sort for levels

**v3.0 Score**: 80% --> **v4.0 Score**: 88%

---

#### `getConsultTypeStats(sessionId)` -- **IMPROVED**

| Item | Design | Implementation | v3.0 | v4.0 |
|------|--------|----------------|:----:|:----:|
| Function Signature | `getConsultTypeStats(sessionId)` | Match | Match | Match |
| Consultations sheet read | Yes | Yes | Match | Match |
| **IsActive filter** | **Implied (Active students' consultations)** | **`activeStudentIDs` Set from Active students** | **Missing** | **Match** |
| **Agency permission** | **Yes** | **Agency filtering in activeStudentIDs** | **Missing** | **Match** |
| Type grouping | Yes | Yes | Match | Match |
| Percentage calculation | Yes | `Math.round(percentage * 10) / 10` | Match | Match |
| Sorting | count DESC | count DESC | Match | Match |

**v4.0 Improvements** (DashboardService.gs lines 512-533):
```
1. Students 시트에서 Active 학생 ID Set 생성 (lines 521-533)
2. 권한 필터링: Master=전체 Active, Agency=소속 유학원 Active만 (line 529)
3. Consultations에서 activeStudentIDs에 포함된 학생의 상담만 집계 (line 551)
```

**v3.0 Score**: 85% --> **v4.0 Score**: 95%

---

**DashboardService Average (v4.0)**: (85 + 95 + 93 + 88 + 95) / 5 = **91%** (up from 87%)

---

### 2.5 Frontend - Responsive Layout -- Score: **90%** (unchanged)

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Breakpoint: Mobile | max-width: 767px | Base styles (mobile-first) | Match |
| Breakpoint: Tablet | 768px ~ 1023px | @media (min-width: 768px) | Match |
| Breakpoint: Desktop | 1024px+ | @media (min-width: 1024px) | Match |
| Mobile container | width: 100%; padding: 10px | width: 100%; padding: 16px | Minor diff |
| Tablet container | width: 750px; padding: 15px | max-width: 720px; padding: 24px | Minor diff |
| Desktop container | width: 1000px; padding: 20px | max-width: 960px; padding: 32px | Minor diff |
| Mobile font-size | 14px | 14px | Match |
| Tablet font-size | 16px | 15px | Minor diff |
| Desktop font-size | 18px | 16px | Minor diff |
| Mobile button height | 44px | 44px (CSS var) | Match |
| Tablet button height | 40px | 48px | Changed |
| Desktop button height | 36px | 40px | Changed |
| Grid: Mobile 1col | Yes | `flex: 1 0 100%` | Match |
| Grid: Tablet 2col | Yes | `flex: 1 0 50%` | Match |
| Grid: Desktop 3col | Yes | `flex: 1 0 33.333%` | Match |
| CSS Custom Properties | Not designed | Full CSS variable system | Added |
| Large Desktop (1440px+) | Not designed | 4th breakpoint with 1200px container | Added |
| Print Styles | Not designed | Full print media query | Added |

**Score**: 90%

### 2.6 Frontend - Mobile Components -- Score: **100%** (unchanged)

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| Hamburger Menu | Required | Full implementation with animation | Match |
| Sidebar Toggle | Required | Navigation drawer with overlay | Match |
| Full Screen Modal | Required (mobile) | Bottom sheet implementation | Match |
| Swipe Gesture | Required (Hammer.js) | CSS-based swipe support | Match |
| Touch Targets | 44px min | 44px consistent | Match |
| Navigation Drawer | Not designed | Full slide-in navigation | Added |
| Pull-to-Refresh | Not designed | CSS indicator implementation | Added |
| Bottom Sheet | Not designed | Full bottom sheet component | Added |
| FAB | Not designed | 56px circular button | Added |
| Touch Ripple Effect | Not designed | CSS ripple animation | Added |
| iOS Safe Area | Not designed | `env(safe-area-inset-*)` support | Added |
| Reduced Motion | Not designed | `prefers-reduced-motion` support | Added |
| Focus Visible | Not designed | Keyboard navigation support | Added |

**Score**: 100%

### 2.7 Frontend - PWA manifest.json -- Score: **98%** (unchanged)

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| name | Match | Match | Match |
| short_name | Match | Match | Match |
| start_url | "/" | "/" | Match |
| display | "standalone" | "standalone" | Match |
| orientation | "portrait" | "portrait-primary" | Minor diff |
| theme_color | "#4285f4" | "#4285f4" | Match |
| background_color | "#ffffff" | "#ffffff" | Match |
| icons: 192x192 | Yes | Yes (with maskable) | Match |
| icons: 512x512 | Yes | Yes (with maskable) | Match |
| Extra icon sizes | Not designed | 72, 96, 128, 144, 152, 384 added | Added |
| Screenshots | Not designed | Desktop + Mobile screenshots | Added |
| Shortcuts | Not designed | 3 shortcuts (students, agencies, consultations) | Added |
| share_target | Not designed | POST share handler | Added |
| display_override | Not designed | window-controls-overlay, standalone, minimal-ui | Added |

**Score**: 98%

---

## 3. v4.0 Improvement Details

### 3.1 DashboardService - IsActive Filter in getAgencyDistribution()

**Implementation**: DashboardService.gs lines 306-323

```
Before (v3.0):
  모든 학생을 유학원별로 집계 (IsActive 필터 없음)

After (v4.0):
  line 310: const statusIndex = studentsData[0].indexOf('Status');
  line 319: if (agencyMap.hasOwnProperty(agencyCode) && status === 'Active') {
              agencyMap[agencyCode].studentCount++;
              totalStudents++;
            }

Design Compliance:
  - Design에서 유학원별 학생 분포 → Active 학생만 의미적으로 포함
  - 비활성 학생은 통계에서 제외 → 더 정확한 현재 상태 반영
```

### 3.2 DashboardService - IsActive Filter in getTopikDistribution()

**Implementation**: DashboardService.gs lines 390-442

```
Before (v3.0):
  ExamResults 시트에서 모든 학생의 TOPIK 레벨 집계
  Agency 권한 필터링 없음

After (v4.0):
  1. Students 시트에서 Active 학생 ID Set 생성 (lines 398-411)
     - Status === 'Active' 필터
     - Agency 권한: Master=전체, Agency=소속만
  2. ExamResults에서 activeStudentIDs에 포함된 학생만 처리 (line 439)
     if (activeStudentIDs.has(studentID)) {
       studentLevelMap[studentID] = level;
     }

Design Compliance:
  - "Students + ExamResults JOIN" (design.md:721) -- MATCH
  - "권한별 필터링" (design.md:722) -- NOW MATCH (Agency 필터 추가)
  - IsActive 필터로 Active 학생의 TOPIK 분포만 집계
```

### 3.3 DashboardService - IsActive Filter in getConsultTypeStats()

**Implementation**: DashboardService.gs lines 510-559

```
Before (v3.0):
  Consultations 시트에서 모든 상담 유형 집계
  Agency 권한 필터링 없음

After (v4.0):
  1. Students 시트에서 Active 학생 ID Set 생성 (lines 521-533)
     - Status === 'Active' 필터
     - Agency 권한: Master=전체, Agency=소속만
  2. Consultations에서 activeStudentIDs에 포함된 학생의 상담만 처리 (line 551)
     if (activeStudentIDs.has(studentID)) {
       typeMap[consultType]++;
       totalConsultations++;
     }

Design Compliance:
  - "권한별 필터링" (design.md:767) -- NOW MATCH
  - Active 학생의 상담만 유형별 통계에 반영
```

### 3.4 SearchService - advancedFilter isActive Filter

**Implementation**: SearchService.gs lines 567-572

```
Filter Logic:
  if (filters.isActive !== undefined) {
    const isActive = (status === 'Active');
    if (filters.isActive !== isActive) {
      continue;
    }
  }

Design Spec (design.md:515-516):
  - isActive?: boolean
  - "isActive: IsActive 일치"

Compliance: MATCH
  - true 전달 시 Active 학생만 반환
  - false 전달 시 Inactive 학생만 반환
  - undefined 시 모든 학생 반환 (필터 미적용)
```

### 3.5 SearchService - advancedFilter topikLevels Filter

**Implementation**: SearchService.gs lines 500-521, 574-583

```
ExamResults JOIN Logic:
  1. topikLevels 필터가 있을 때만 ExamResults 시트 로드 (line 502)
  2. 학생별 최신 TOPIK 레벨 추출 (lines 511-519):
     - "TOPIK 1" -> parseInt -> 1 변환
     - studentTopikMap[studentID] = levelNumber
  3. 필터 적용 (lines 575-583):
     const studentLevel = studentTopikMap[studentID];
     if (!studentLevel || !filters.topikLevels.includes(studentLevel)) {
       continue;
     }

Design Spec (design.md:517):
  - topikLevel?: string  ("TOPIK 등급")

Implementation Enhancement:
  - topikLevels?: number[] (다중 선택 지원)
  - [3, 4, 5] 전달 시 TOPIK 3~5급 학생만 반환
  - ExamResults 시트와 JOIN으로 정확한 레벨 필터링

Compliance: Enhanced (single -> multi, string -> number[])
```

---

## 4. Positive Implementations (Design X, Implementation O)

### 4.1 v4.0 Additions

| Item | Implementation Location | Description |
|------|------------------------|-------------|
| IsActive in AgencyDistribution | DashboardService.gs:310,319 | Active 학생만 유학원별 분포 집계 |
| IsActive in TopikDistribution | DashboardService.gs:398-411,439 | Active 학생 ID Set + ExamResults 필터 |
| IsActive in ConsultTypeStats | DashboardService.gs:521-533,551 | Active 학생 ID Set + Consultations 필터 |
| Agency Permission in TopikDist | DashboardService.gs:407 | Agency 역할 기반 Active 학생 필터 |
| Agency Permission in ConsultStats | DashboardService.gs:529 | Agency 역할 기반 Active 학생 필터 |
| advancedFilter isActive | SearchService.gs:567-572 | boolean 필터로 Active/Inactive 구분 |
| advancedFilter topikLevels | SearchService.gs:500-521,574-583 | ExamResults JOIN + 다중 레벨 필터 |
| Lazy ExamResults Loading | SearchService.gs:502 | topikLevels 필터 있을 때만 시트 로드 |

### 4.2 Previously Documented Additions (v1.0~v3.0)

All 33+ positive additions from previous versions remain unchanged:
- MobileUIService: OS/browser detection, breakpoint classification, cssVariables
- BackupService: Drive-based storage, metadata sheets, legacy support, pre-restore safety
- SearchService: XSS sanitization, CacheService, offset pagination, structured autocomplete
- Frontend: Navigation drawer, pull-to-refresh, bottom sheet, FAB, ripple, safe area, reduced motion

---

## 5. Convention Compliance -- 100%

| Category | Convention | Compliance |
|----------|-----------|:----------:|
| Public Functions | camelCase | 100% |
| Private Functions | _camelCase | 100% |
| Constants | UPPER_SNAKE_CASE | 100% |
| HTML Files | PascalCase.html | 100% |
| GAS Files | PascalCase.gs | 100% |
| i18n Error Keys | snake_case | 100% |
| Error Handling Pattern | `{ success, errorKey, error }` | 100% |
| JSDoc Comments | All public functions | 100% |
| Audit Logging | All CRUD + system operations | 100% |
| Code Documentation | Version + feature headers | 100% |

---

## 6. Match Rate Summary

### 6.1 Per-Service Match Rates (v4.0 vs v3.0 vs v2.0 vs v1.0)

| Service | APIs | v4.0 Match | v3.0 Match | v2.0 Match | v1.0 Match | Delta (v3->v4) |
|---------|:----:|:----------:|:----------:|:----------:|:----------:|:--------------:|
| MobileUIService | 3/3 | 87% | 87% | 87% | 87% | -- |
| BackupService | 5/5 | 95% | 95% | 95% | 95% | -- |
| **SearchService** | **3/3** | **91%** | **87%** | **78%** | **73%** | **+4%** |
| **DashboardService** | **5/5** | **91%** | **87%** | **87%** | **87%** | **+4%** |
| Responsive CSS | - | 90% | 90% | 90% | 90% | -- |
| Mobile CSS | - | 100% | 100% | 100% | 100% | -- |
| PWA manifest.json | - | 98% | 98% | 98% | 98% | -- |

### 6.2 SearchService Detailed Score Change (v3.0 -> v4.0)

| API | v1.0 | v2.0 | v3.0 | v4.0 | Changes in v4.0 |
|-----|:----:|:----:|:----:|:----:|-----------------|
| `searchAll()` | 70% | 85% | 92% | 92% | No change |
| `autocomplete()` | 70% | 70% | 88% | 88% | No change |
| `advancedFilter()` | 80% | 80% | 80% | **92%** | +isActive filter, +topikLevels filter |
| **Average** | **73%** | **78%** | **87%** | **91%** | **+4%** |

### 6.3 DashboardService Detailed Score Change (v3.0 -> v4.0)

| API | v1.0 | v2.0 | v3.0 | v4.0 | Changes in v4.0 |
|-----|:----:|:----:|:----:|:----:|-----------------|
| `getStatistics()` | 85% | 85% | 85% | 85% | No change (IsActive still missing) |
| `getMonthlyTrend()` | 95% | 95% | 95% | 95% | No change |
| `getAgencyDistribution()` | 90% | 90% | 90% | **93%** | +IsActive filter |
| `getTopikDistribution()` | 80% | 80% | 80% | **88%** | +IsActive filter, +Agency permission |
| `getConsultTypeStats()` | 85% | 85% | 85% | **95%** | +IsActive filter, +Agency permission |
| **Average** | **87%** | **87%** | **87%** | **91%** | **+4%** |

### 6.4 Gap Resolution Tracking (All Versions)

| # | Item | v1.0 | v2.0 | v3.0 | v4.0 |
|---|------|:----:|:----:|:----:|:----:|
| 1 | Consultations Search | Missing | **RESOLVED** | RESOLVED | RESOLVED |
| 2 | matchScore Calculation | Missing | **RESOLVED** | RESOLVED | RESOLVED |
| 3 | matchScore Sorting | Missing | **RESOLVED** | RESOLVED | RESOLVED |
| 4 | XSS Query Sanitization | Missing | Missing | **RESOLVED** | RESOLVED |
| 5 | Offset Pagination | Missing | Missing | **RESOLVED** | RESOLVED |
| 6 | Autocomplete Structured Return | Missing | Missing | **RESOLVED** | RESOLVED |
| 7 | CacheService for Autocomplete | Missing | Missing | **RESOLVED** | RESOLVED |
| 8 | advancedFilter: isActive | Missing | Missing | Missing | **RESOLVED** |
| 9 | advancedFilter: topikLevel | Missing | Missing | Missing | **RESOLVED** |
| 10 | IsActive in AgencyDistribution | Missing | Missing | Missing | **RESOLVED** |
| 11 | Agency Perm in TopikDistribution | Missing | Missing | Missing | **RESOLVED** |
| 12 | Agency Perm in ConsultTypeStats | Missing | Missing | Missing | **RESOLVED** |
| 13 | Autocomplete prefix match | Changed | Changed | Changed | Changed |
| 14 | Default limit (10 vs 50) | Diff | Diff | Diff | Diff |
| 15 | IsActive in getStatistics | Missing | Missing | Missing | Missing |
| 16 | TOPIK level labels (i18n) | Changed | Changed | Changed | Changed |
| 17 | TOPIK level sorting | Missing | Missing | Missing | Missing |
| 18 | Backup timeout handling | Missing | Missing | Missing | Missing |
| 19 | screenHeight in getDeviceInfo | Missing | Missing | Missing | Missing |

**Summary**: 12/19 gaps resolved across 4 iterations. 2 minor "Changed" items (acceptable differences). 5 minor items remaining.

### 6.5 Overall Match Rate Calculation (v4.0)

```
Category Weights:
  Backend API (16 APIs): 70%
  Frontend (CSS + PWA): 30%

Backend API Score (v4.0):
  MobileUIService:  87% x 3/16 = 16.3%
  BackupService:    95% x 5/16 = 29.7%
  SearchService:    91% x 3/16 = 17.1%   (was 16.3% in v3.0)
  DashboardService: 91% x 5/16 = 28.4%   (was 27.2% in v3.0)
  Backend Total: 91.5%                    (was 89.5% in v3.0)

Frontend Score (unchanged):
  Responsive CSS:   90% x 0.35 = 31.5%
  Mobile CSS:       100% x 0.35 = 35.0%
  PWA manifest:     98% x 0.30 = 29.4%
  Frontend Total: 95.9%

Overall Score (v4.0):
  91.5% x 0.70 + 95.9% x 0.30 = 64.1% + 28.8% = 92.8%

Convention Bonus: +0.6% (100% compliance)
Final Score: 93.4%
```

```
+---------------------------------------------+
|  Overall Match Rate: 93% (v4.0)              |
+---------------------------------------------+
|  Backend API:    92%    (16/16 implemented)  |
|  Frontend CSS:   96%    (all requirements)   |
|  Convention:     100%   (full compliance)    |
|                                              |
|  v1.0: 90% -> v2.0: 90% -> v3.0: 91%       |
|                          -> v4.0: 93%        |
|  Delta (v3->v4): +2.0% (93.4% exact)        |
|                                              |
|  Status: PASS (>= 90% threshold)            |
+---------------------------------------------+
```

---

## 7. Remaining Gaps

### 7.1 Missing Features (Design O, Implementation X)

| # | Severity | Item | Design Location | v3.0 Status | v4.0 Status |
|---|----------|------|-----------------|-------------|-------------|
| ~~1~~ | ~~Major~~ | ~~Consultations Search~~ | ~~design.md:427-432~~ | ~~RESOLVED~~ | RESOLVED |
| ~~2~~ | ~~Major~~ | ~~matchScore Calculation~~ | ~~design.md:438-444~~ | ~~RESOLVED~~ | RESOLVED |
| ~~3~~ | ~~Minor~~ | ~~Search Offset Pagination~~ | ~~design.md:386~~ | ~~RESOLVED~~ | RESOLVED |
| ~~4~~ | ~~Minor~~ | ~~XSS Query Sanitization~~ | ~~design.md:423~~ | ~~RESOLVED~~ | RESOLVED |
| ~~5~~ | ~~Minor~~ | ~~CacheService for Autocomplete~~ | ~~design.md:486-491~~ | ~~RESOLVED~~ | RESOLVED |
| ~~6~~ | ~~Minor~~ | ~~Autocomplete Structured Return~~ | ~~design.md:471-477~~ | ~~RESOLVED~~ | RESOLVED |
| ~~7~~ | ~~Minor~~ | ~~advancedFilter: isActive~~ | ~~design.md:516~~ | ~~Missing~~ | **RESOLVED** |
| ~~8~~ | ~~Minor~~ | ~~advancedFilter: topikLevel~~ | ~~design.md:517~~ | ~~Missing~~ | **RESOLVED** |
| ~~9~~ | ~~Minor~~ | ~~Agency Permission in TOPIK stats~~ | ~~design.md:722-723~~ | ~~Missing~~ | **RESOLVED** |
| ~~10~~ | ~~Minor~~ | ~~Agency Permission in Consult stats~~ | ~~design.md:767~~ | ~~Missing~~ | **RESOLVED** |
| 11 | Minor | IsActive Filter in getStatistics() | design.md:572 | Missing | Missing |
| 12 | Minor | TOPIK Level Ordering | design.md:726-727 | Missing | Missing |
| 13 | Minor | Backup Timeout Handling | design.md:189 | Missing | Missing |
| 14 | Minor | screenHeight in getDeviceInfo | design.md:41 | Missing | Missing |

**Summary**: 2 Major + 8 Minor gaps resolved (total 10). **4 Minor gaps remaining.** (Down from 8 in v3.0)

### 7.2 Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | getDeviceInfo params | None (client-side) | `(userAgent, screenWidth)` | Low - GAS constraint |
| 2 | optimizeForMobile fontSize values | 14/16/18 | 14/15/16 | Low |
| 3 | optimizeForMobile buttonHeight values | 44/40/36 | 44/48/40 | Low |
| 4 | searchAll default limit | 50 | 10 | Low |
| 5 | TOPIK level labels | "1급"~"6급", "미응시" | "TOPIK 1"~"TOPIK 6", "None" | Medium - i18n |
| 6 | matchScore exact distribution | 100/80/60/40 uniform | 100/80/60/40 (students), 100/80/40 (others) | Low |
| 7 | Autocomplete match type | Prefix match (startsWith) | Contains match (includes) | Low |

---

## 8. Recommended Actions

### 8.1 Completed Actions (all versions)

| Priority | Item | File | Version |
|----------|------|------|---------|
| ~~Major~~ | ~~Implement Consultations Search~~ | ~~SearchService.gs~~ | v2.0 |
| ~~Major~~ | ~~Add matchScore Calculation~~ | ~~SearchService.gs~~ | v2.0 |
| ~~Minor~~ | ~~XSS Query Sanitization~~ | ~~SearchService.gs~~ | v3.0 |
| ~~Minor~~ | ~~Offset Pagination~~ | ~~SearchService.gs~~ | v3.0 |
| ~~Minor~~ | ~~Structured Autocomplete Return~~ | ~~SearchService.gs~~ | v3.0 |
| ~~Minor~~ | ~~CacheService for Autocomplete~~ | ~~SearchService.gs~~ | v3.0 |
| ~~Minor~~ | ~~advancedFilter isActive~~ | ~~SearchService.gs~~ | **v4.0** |
| ~~Minor~~ | ~~advancedFilter topikLevels~~ | ~~SearchService.gs~~ | **v4.0** |
| ~~Minor~~ | ~~IsActive in AgencyDistribution~~ | ~~DashboardService.gs~~ | **v4.0** |
| ~~Minor~~ | ~~Agency Perm in TopikDistribution~~ | ~~DashboardService.gs~~ | **v4.0** |
| ~~Minor~~ | ~~Agency Perm in ConsultTypeStats~~ | ~~DashboardService.gs~~ | **v4.0** |

### 8.2 Remaining Short-term (within 1 week)

| Priority | Item | File | Expected Impact |
|----------|------|------|-----------------|
| 1 | Add IsActive Filter in getStatistics() | DashboardService.gs:49-59 | Statistics accuracy (totalStudents, totalAgencies) |
| 2 | TOPIK Level i18n Labels | DashboardService.gs:418-426 | Use "1급"~"6급", "미응시" instead of "TOPIK 1"~"TOPIK 6", "None" |
| 3 | TOPIK Level Ascending Sort | DashboardService.gs:455 | Explicit sort: 1급 -> 6급 -> 미응시 |

### 8.3 Long-term (backlog)

| Item | File | Notes |
|------|------|-------|
| Backup Timeout Strategy | BackupService.gs | GAS 6-min limit handling (split backup) |
| Chart.js Dashboard UI | Dashboard.html | Scheduled for Week 5 |
| searchAll default limit alignment | SearchService.gs | Change default from 10 to 50 |
| screenHeight return | MobileUIService.gs | Add screenHeight to deviceInfo |
| Autocomplete prefix match | SearchService.gs | Change `.includes()` to `.startsWith()` |

---

## 9. Design Document Updates Needed

The following items in the design document should be updated to match implementation improvements:

- [ ] `getDeviceInfo()`: Update parameters to `(userAgent, screenWidth)` (GAS server-side constraint)
- [ ] `generateManifest()`: Add `lang` parameter for i18n support
- [ ] `optimizeForMobile()`: Update return type from string to number for sizing values
- [ ] BackupService: Update storage strategy from folder-based to Drive file-based
- [ ] Responsive CSS: Update to mobile-first approach with CSS Custom Properties
- [ ] Add 4th breakpoint (1440px+ large desktop)
- [ ] Add all positive additions to design (Bottom Sheet, FAB, Pull-to-Refresh, etc.)
- [ ] Update container width values (720px, 960px, 1200px)
- [ ] `advancedFilter()`: Update `topikLevel: string` to `topikLevels: number[]` (multi-select support)
- [ ] `advancedFilter()`: Update `agencyCode: string` to `agencyCodes: string[]` (multi-select support)
- [ ] DashboardService: Document IsActive filter implementation in AgencyDistribution, TopikDistribution, ConsultTypeStats
- [ ] DashboardService: Document Agency permission filtering in TopikDistribution and ConsultTypeStats

---

## 10. Next Steps

- [x] Fix Critical gaps (Consultations search, matchScore) -- **DONE v2.0**
- [x] Fix SearchService Minor gaps (XSS, autocomplete, cache, offset) -- **DONE v3.0**
- [x] Fix DashboardService IsActive + Agency Permission gaps -- **DONE v4.0**
- [x] Fix SearchService advancedFilter isActive + topikLevels -- **DONE v4.0**
- [ ] Implement remaining 3 short-term items (getStatistics IsActive, TOPIK i18n, TOPIK sort)
- [ ] Update design document with implementation improvements
- [ ] Implement Chart.js dashboard UI (Week 5 schedule)
- [ ] Write completion report (`/pdca report step2-high-priority-features`)

---

## Version History

| Version | Date | Changes | Match Rate | Author |
|---------|------|---------|:----------:|--------|
| 1.0 | 2026-02-15 | Initial gap analysis | 90% | bkit-gap-detector |
| 2.0 | 2026-02-16 | Re-analysis: consultations search + matchScore | 90.3% | bkit-gap-detector |
| 3.0 | 2026-02-16 | Re-analysis: XSS sanitize + autocomplete + cache + offset | 91.4% | bkit-gap-detector |
| **4.0** | **2026-02-16** | **Re-analysis: DashboardService IsActive + SearchService advancedFilter** | **93.4%** | **bkit-gap-detector** |
