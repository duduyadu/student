# CTO Lead Agent Memory - AJU E&J Student Management

## Project Identity
- **Stack**: Google Apps Script + Google Sheets (8 sheets)
- **Level**: Dynamic (Tier 2 - GAS Domain Specific)
- **Feature**: gas-student-platform
- **PDCA Phase**: Do (Implementation)
- **GAS Project ID**: 1j1tnoI_AHuxe624nn5ET3s7oizWFmOKkkQp7YuoKK02DLr_tOQkmlscN

## Critical Architecture Decisions

### Session Management (CONFIRMED 2026-02-15)
- **NEVER use UserCache** in GAS web apps deployed with "Execute as: Me"
- UserCache shares the same namespace for ALL end users (scoped to script owner)
- **Use ScriptCache** with UUID-based session keys: `SESSION_{uuid}`
- **Token-based**: Client stores sessionId in sessionStorage, passes to every API call
- **SPA Pattern**: doGet() always returns Login.html; client switches views
- All public API functions take `sessionId` as first parameter
- Exceptions: `login()`, `getLocaleStrings()` do not require sessionId

### API Convention
- All public functions: `functionName(sessionId, ...params)`
- Return format: `{ success: boolean, data?: any, errorKey?: string }`
- Session expired -> return `{ success: false, errorKey: 'err_session_expired' }`

## Files Modified (Session Fix)
1. `src/Auth.gs` - _validateSession(sessionId), checkSession(), logout(sessionId)
2. `src/Code.gs` - doGet() always serves Login.html
3. `src/Login.html` - SPA container (login view + app view)
4. `src/AuditService.gs` - Removed UserCache, added sessionId param
5. `src/StudentService.gs` - sessionId as first param

## Phase Status
- Phase 1: 95% (clasp push + redeploy pending)
- Phase 2-3: Complete (code + audit)
- Phase 4-9: Not started

## GAS-Specific Constraints
- 6-minute execution limit per function
- CacheService.getScriptCache() max 100KB per key, 6h TTL max
- clasp is slow but service runs fast on Google servers
- `let`/`const` are supported but `var` is safer for older V8 edge cases
