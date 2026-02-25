# bkit-gap-detector Agent Memory

## Project: AJU E&J Student Management Platform

### Tech Stack
- Original Design: Google Apps Script (JavaScript) + Google Sheets
- Current Implementation: Next.js 14 (App Router) + Supabase (PostgreSQL + RLS) + TypeScript
- Frontend: React + Tailwind CSS
- Auth: Supabase Auth (JWT)
- i18n: Inline TypeScript object (lib/i18n.ts)

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

- 2026-02-22: gas-student-platform (Full System) Gap Analysis v1.0
  - Overall Match Rate: 81% (FAIL < 90%)
  - Critical Gap: Audit Logging (10% score) - no app-level audit trail
  - Medium Gaps: Account Lockout (missing), ARC/SIM mgmt (missing), Data Encryption (missing)
  - 6 missing features, 23 additional features, 8 changed features
  - Implementing audit logging alone would raise score to ~90%

- 2026-02-22: gas-student-platform (Full System) Gap Analysis v2.0 (Post Act-1)
  - Overall Match Rate: 91% (PASS >= 90%) -- was 81%, +10%
  - Audit Logging: 92% (was 10%, +82%) - DB triggers + API + viewer + app-level logging
  - Admin ARC: 90% (was 50%, +40%) - ARC fields in DB + forms + detail view
  - i18n: 86% (was 88%, -2%) - edit/detail pages remain hardcoded Korean
  - Remaining: Account Lockout, Data Encryption, LOGOUT audit, SIM mgmt
  - 2 of 7 MISSING items resolved, ready for completion report
  - Output: docs/03-analysis/gas-student-platform.analysis.md

- 2026-02-22: student-life-record Gap Analysis v1.0
  - Overall Match Rate: 87% (FAIL < 90%), adjusted 93% if inline-as-equivalent
  - DB Schema: 98%, Types: 100%, Components: 75%, API: 67%, UI: 88-100%, PDF: 95%
  - Critical: mock-exam-import calcLevel uses TOPIK II (6-grade) instead of TOPIK I (2-grade)
  - Missing: AspirationTracker, /api/evaluation-templates, consult virtualization
  - Changed: 4 components inline in parent instead of separate files
  - 3 actions to reach 90%: fix calcLevel, implement AspirationTracker, add consult pagination
  - Output: docs/03-analysis/student-life-record.analysis.md

- 2026-02-22: student-life-record Gap Analysis v2.0 (Post calcLevel fix)
  - Overall Match Rate: 90% (PASS >= 90%) -- was 87%, +3%
  - Mock Exam API: 92% (was 85%, +7%) - calcLevel fixed to TOPIK I
  - Critical Issues: 0 (was 1, resolved)
  - Remaining MISSING: AspirationTracker, /api/evaluation-templates, consult virtualization, TOPIK app bridge
  - 4 MISSING items, 3 ADDED items, 5 CHANGED items (functional equivalent)
  - Ready for completion report or optional improvements to reach 93%+
  - Output: docs/03-analysis/student-life-record.analysis.md

- 2026-02-16: step2-high-priority-features Gap Analysis v4.0
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
- [RESOLVED] gas-student-platform: Audit Logging (10% -> 92%) - v2.0
- [RESOLVED] gas-student-platform: ARC Info Management (50% -> 90%) - v2.0
- gas-student-platform: Account Lockout (MAX_LOGIN_ATTEMPTS=5) not implemented
- gas-student-platform: Data Encryption (encryptData/decryptData) not at app layer
- gas-student-platform: LOGOUT events not logged in audit_logs
- gas-student-platform: SIM Info Management missing (Low priority)
- gas-student-platform: edit/detail pages have zero i18n t() calls (hardcoded Korean)
- gas-student-platform: ARC labels in new form use inline ternary instead of i18n keys
- [RESOLVED] student-life-record: mock-exam-import calcLevel TOPIK II -> TOPIK I - v2.0
- student-life-record: AspirationTracker.tsx not implemented (aspiration_history unused in UI)
- student-life-record: Consult virtualization (100+ records) not implemented
- student-life-record: /api/evaluation-templates API not created (direct Supabase query)
- student-life-record: All UI text hardcoded Korean (no i18n calls)

- 2026-02-22: pdf-vi-bulk Gap Analysis v1.0
  - Overall Match Rate: 100% (20/20 PASS >= 90%)
  - Checklist: All 20 items verified PASS
  - LifeRecordDocument: T dictionary ko/vi (35+ keys), lang prop with default 'ko'
  - /api/life-record-pdf: lang query param, VI filename
  - /api/life-record-pdf-bulk: POST, jszip ZIP, both option, studentIds loop
  - Student detail: Promise.all KO+VI parallel, button "생활기록부 PDF (KO+VI)"
  - Student list: selectedIds Set, toggleSelect, toggleSelectAll, handleBulkPdf, checkboxes, conditional button
  - 3 bonus items: orgSub key, filename sanitization, JSON error handling
  - No gaps found, ready for completion report
  - Output: docs/03-analysis/pdf-vi-bulk.analysis.md

- 2026-02-24: visa-document-checklist Gap Analysis v1.0
  - Overall Match Rate: 97% (PASS >= 90%)
  - 116 total items: 112 PASS, 2 CHANGED, 2 MISSING
  - DB Schema: 100% (document_types, student_documents, document_alert_logs all match)
  - TypeScript Types: 100% (DocCategory, DocStatus, DocumentType, StudentDocument)
  - API Endpoints: 100% (6 endpoints all match design)
  - Portal UI: 88% (Info tab summary card in docs tab instead of info tab, file size limit missing)
  - Admin UI: 100% (DocumentChecklist with category tabs, status dropdown, reject modal)
  - Cron/Alerts: 86% (missing status_changed email on approve/reject)
  - Convention: 100%
  - MISSING: status-changed email alert, file size 10MB limit
  - CHANGED: RLS WITH CHECK self-reference, Info tab summary card location, Admin KO-only i18n, Cron UTC vs KST
  - Ready for completion report
  - Output: docs/03-analysis/visa-document-checklist.analysis.md
