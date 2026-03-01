# bkit-gap-detector Agent Memory

## Project: AJU E&J Student Management Platform

### Tech Stack
- Next.js 14 (App Router) + Supabase (PostgreSQL + RLS) + TypeScript
- Frontend: React + Tailwind CSS
- Auth: Supabase Auth (JWT)
- i18n: Inline TypeScript object (lib/i18n.ts)

### Key Patterns
- Service layer: supabase.from() direct calls (no REST API wrapper)
- RLS for data isolation, UI guards for role-based access
- All public functions: camelCase, private: _camelCase
- i18n keys: snake_case in lib/i18n.ts
- Types: PascalCase interfaces in lib/types.ts
- DB tables/columns: snake_case

### Analysis Summary (see analysis-history.md for details)

| Date | Feature | Rate | Status |
|------|---------|:----:|:------:|
| 02-15 | security-and-enhancements | 92% | PASS |
| 02-16 | step2-high-priority-features v4 | 93.4% | PASS |
| 02-22 | gas-student-platform v2 | 91% | PASS |
| 02-22 | student-life-record v2 | 90% | PASS |
| 02-22 | pdf-vi-bulk | 100% | PASS |
| 02-24 | visa-document-checklist | 97% | PASS |
| 02-26 | platform-qa-improvement | 100% | PASS |
| 02-26 | platform-ui-improvement | 100% | PASS |
| 02-26 | platform-pdf-improvement | 100% | PASS |
| 03-01 | platform-code-quality | 100% | PASS |
| 03-01 | pdf-official-design | 100% | PASS |
| 03-01 | student-portal-enhancement | 100% | PASS |
| 03-01 | dashboard-enhancement | 100% | PASS |
| 03-01 | topik-schedule-sync | 100% | PASS |

### Latest Analysis: topik-schedule-sync (2026-03-01)
- 10/10 AC PASS, schema 8/8, functions 4/4, UI 7/7
- D-day card with 3-tier color (red/amber/blue at 7/30 days)
- Admin TOPIK tab on reports page (master-only, lazy-loaded)
- Form: 6 fields (round/exam_date/exam_type/reg_start/reg_end/region)
- Bonus: past schedule opacity, D-day badges, lazy loading
- Optional: i18n for hardcoded Korean in TOPIK tab/D-day card
- Output: docs/03-analysis/topik-schedule-sync.analysis.md

### Recurring Patterns
- Hardcoded Korean text is the most common low-priority gap
- DB migrations done via Supabase MCP (not always .sql files in repo)
- UI role guards complement RLS policies
- Convention compliance consistently 100% in recent features

### Files Reference
- Types: lib/types.ts
- i18n: lib/i18n.ts
- Student detail: app/students/[id]/page.tsx
- Reports/Admin: app/reports/page.tsx
- Analysis output: docs/03-analysis/{feature}.analysis.md
