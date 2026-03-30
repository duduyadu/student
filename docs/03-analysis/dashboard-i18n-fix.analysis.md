# Gap Analysis: dashboard-i18n-fix

**Date**: 2026-03-30
**Analyst**: gap-detector agent
**Match Rate**: 100% (after locale fix)

---

## Summary

| Category | Items | Pass | Status |
|----------|:-----:|:----:|:------:|
| HIGH-1: Health monitor i18n | 8 | 8 | ✅ PASS |
| HIGH-2: 명 counter i18n | 7 | 7 | ✅ PASS |
| i18n new keys (lib/i18n.ts) | 9 | 9 | ✅ PASS |
| MEDIUM-4: useAdminAuth getUser() | 1 | 1 | ✅ PASS |
| SECURITY: cron getServiceClient() | 2 | 2 | ✅ PASS |
| DOCS: CLAUDE.md | 2 | 2 | ✅ PASS |
| Activity feed locale | 1 | 1 | ✅ PASS |
| **Total** | **30** | **30** | **100%** |

---

## Verified Items

### HIGH-1: Health monitor hardcoded strings → i18n (`app/page.tsx`)

| String | i18n Key | Line |
|--------|----------|:----:|
| API 상태 모니터 | `healthMonitorTitle` | 635 |
| 확인 중... | `healthChecking` | 641 |
| 새로고침 | `healthRefresh` | 641 |
| API 상태 확인 중... | `healthLoadingMsg` | 646 |
| 상태 정보를 불러올 수 없습니다. | `healthLoadError` | 650 |
| 전체 정상 | `healthAllOk` | 657 |
| 일부 오류 | `healthPartialError` | 657 |
| 기준 | `healthTimeSuffix` | 660 |

Locale: `lang === 'vi' ? 'vi-VN' : 'ko-KR'` ✅

### HIGH-2: `명` counter (7 places) → `t('unitPerson', lang)`

Lines 311, 326, 394, 535, 547, 574, 601 — all replaced.

### New i18n keys (`lib/i18n.ts` lines 411–419)

`unitPerson`, `healthMonitorTitle`, `healthChecking`, `healthRefresh`,
`healthLoadingMsg`, `healthLoadError`, `healthAllOk`, `healthPartialError`,
`healthTimeSuffix` — all present with `ko` + `vi` values.

### MEDIUM-4: `lib/useAdminAuth.ts`

```typescript
const { data: { user: authUser } } = await supabase.auth.getUser()
if (!authUser) { router.push('/login'); return }
const { data: { session } } = await supabase.auth.getSession()
```
Server-side JWT verification before local session read. ✅

### SECURITY: Cron routes

- `app/api/cron/visa-alerts/route.ts`: `getServiceClient()` inside `GET()` handler ✅
- `app/api/cron/document-alerts/route.ts`: same ✅

### DOCS: CLAUDE.md

- Status: `✅ v3.0 운영 중` ✅
- Database: `PostgreSQL with RLS (13 tables)` ✅

### Activity feed locale (`app/page.tsx:424`)

`toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'ko-KR', ...)` ✅

---

## Conclusion

모든 HIGH/MEDIUM/SECURITY 이슈 수정 완료. Match Rate **100%**.
