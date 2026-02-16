# bkit-gap-detector Agent Memory

## Project: AJU E&J Student Management Platform

### Tech Stack
- Google Apps Script (JavaScript)
- Google Sheets (Database)
- HTML/CSS/JS Frontend (HtmlService)

### Key Patterns
- GAS has no native XLSX generation; CSV is the practical alternative
- CacheService used for Rate Limiting (TTL-based counters)
- LockService used for concurrency control (Atomic Increment)
- All public functions follow try-catch with `{ success, error, errorKey }` pattern
- Private functions prefixed with underscore: `_functionName()`
- i18n keys use snake_case: `err_rate_limit`, `err_lock_timeout`

### Analysis History
- 2026-02-15: security-and-enhancements v2.1 Step 1 Gap Analysis
  - Overall Match Rate: 92% (PASS >= 90%)
  - Output: docs/03-analysis/security-and-enhancements.analysis.md

- 2026-02-15: step2-high-priority-features Gap Analysis v1.0
  - Overall Match Rate: 90% (PASS >= 90%)

- 2026-02-16: step2-high-priority-features Gap Analysis v2.0
  - Overall Match Rate: 90.3%, SearchService: 78%

- 2026-02-16: step2-high-priority-features Gap Analysis v3.0
  - Overall Match Rate: 91.4%, SearchService: 87%

- 2026-02-16: step2-high-priority-features Gap Analysis v4.0 (Latest)
  - Overall Match Rate: 93.4% (PASS >= 90%)
  - MobileUIService (3 API): 87% (unchanged)
  - BackupService (5 API): 95% (unchanged)
  - SearchService (3 API): 91% (was 87%, +4%)
    - searchAll(): 92% (unchanged)
    - autocomplete(): 88% (unchanged)
    - advancedFilter(): 92% (was 80%, +isActive, +topikLevels filters)
  - DashboardService (5 API): 91% (was 87%, +4%)
    - getStatistics(): 85% (unchanged - IsActive still missing)
    - getMonthlyTrend(): 95% (unchanged)
    - getAgencyDistribution(): 93% (was 90%, +IsActive filter)
    - getTopikDistribution(): 88% (was 80%, +IsActive, +Agency perm)
    - getConsultTypeStats(): 95% (was 85%, +IsActive, +Agency perm)
  - Responsive CSS: 90%, Mobile CSS: 100%, PWA manifest: 98%
  - Convention Compliance: 100%
  - 12/19 gaps resolved, 4 Minor + 2 Changed remaining
  - Output: docs/03-analysis/step2-high-priority-features.analysis.md

### Known Gaps (for future reference)
- ExcelService: Missing export filters (agencyCode, status, enrollmentYear)
- ExcelService: Missing import limits (5MB size, 500 row max)
- validateEmail checks Students sheet instead of Users sheet
- VN phone format slightly different from design
- [RESOLVED] SearchService: consultations search - v2.0
- [RESOLVED] SearchService: matchScore scoring - v2.0
- [RESOLVED] SearchService: autocomplete structured return - v3.0
- [RESOLVED] SearchService: CacheService 60s TTL - v3.0
- [RESOLVED] SearchService: XSS query sanitization - v3.0
- [RESOLVED] SearchService: offset pagination - v3.0
- [RESOLVED] SearchService: advancedFilter isActive - v4.0
- [RESOLVED] SearchService: advancedFilter topikLevels - v4.0
- [RESOLVED] DashboardService: Agency permission in TOPIK/consult stats - v4.0
- [RESOLVED] DashboardService: IsActive filter in AgencyDist/TopikDist/ConsultStats - v4.0
- DashboardService: IsActive filter missing in getStatistics() only
- DashboardService: TOPIK labels use "TOPIK 1" instead of i18n "1급"
- DashboardService: TOPIK level sorting not explicit
- getDeviceInfo: params changed from none to (userAgent, screenWidth) - GAS constraint
- optimizeForMobile: fontSize/buttonHeight values differ from design
