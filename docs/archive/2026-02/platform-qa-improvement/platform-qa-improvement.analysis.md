# Design-Implementation Gap Analysis Report: platform-qa-improvement

> **Summary**: QA 분석 보고서 기반 19건 수정사항에 대한 구현 검증
>
> **Author**: bkit-gap-detector
> **Created**: 2026-02-26
> **Last Modified**: 2026-02-26
> **Status**: Approved

---

## Analysis Overview

- **Analysis Target**: platform-qa-improvement (QA 수정 19건)
- **Design Document**: `docs/03-analysis/platform-qa-improvement.analysis.md` (원본 QA 보고서)
- **Implementation Path**: `app/`, `app/api/`
- **Analysis Date**: 2026-02-26
- **Analysis Version**: v1.0 (Post-Implementation Gap Check)

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| BUG Fixes (5) | 100% (5/5) | PASS |
| I18N Fixes (4) | 100% (4/4) | PASS |
| UI Fixes (2) | 100% (2/2) | PASS |
| SEC Fixes (2) | 100% (2/2) | PASS |
| **Overall** | **100% (13/13)** | **PASS** |

> Note: 원본 QA 보고서에는 19건이 기재되어 있으나, 검증 대상으로 명시된 항목은 13건 (BUG 5 + I18N 4 + UI 2 + SEC 2). 나머지 6건 (I18N-05~I18N-08, UI-01, UI-03)은 검증 대상에서 제외되었음.

---

## Detailed Verification Results

### BUG Fixes (5/5 PASS)

#### BUG-01: 학생 상세 페이지 - 언어 전환 없음 -- PASS

**Design**: `useLang`, `LangToggle`, `t()` 추가

**Implementation** (`app/students/[id]/page.tsx`):
- Line 10: `import { useLang } from '@/lib/useLang'` -- Present
- Line 11: `import { LangToggle } from '@/components/LangToggle'` -- Present
- Line 12: `import { t, statusLabel } from '@/lib/i18n'` -- Present
- Line 212: `const [lang, toggleLang] = useLang()` -- Present
- Line 299: `<LangToggle lang={lang} onToggle={toggleLang} />` -- Present in header
- Line 284: `{t('loading', lang)}` -- Using t() for loading text
- Line 296: `{t('appTitle', lang)}` -- Using t() for app title
- Line 301: `{t('logout', lang)}` -- Using t() for logout
- Lines 309-314: Navigation uses `{t('navDashboard', lang)}`, `{t('navStudents', lang)}`, etc.
- Line 320: `{t('backToList', lang)}` -- Using t() for back link

**Verdict**: PASS -- `useLang`, `LangToggle`, `t()` all properly integrated.

---

#### BUG-02: 학생 상세 탭 - 모바일 스크롤 불가 -- PASS

**Design**: `w-fit` -> `overflow-x-auto max-w-full`

**Implementation** (`app/students/[id]/page.tsx`):
- Line 387: `className="flex gap-1 mb-4 bg-white rounded-2xl p-1 shadow-sm overflow-x-auto max-w-full"`

**Verdict**: PASS -- `w-fit` removed, replaced with `overflow-x-auto max-w-full`.

---

#### BUG-03: ScoreBox - 4칸 그리드에 3개만 렌더링 -- PASS

**Design**: `grid-cols-4` -> `grid-cols-3`

**Implementation** (`app/students/[id]/page.tsx`):
- Line 608: `<div className="grid grid-cols-3 gap-3">`

**Verdict**: PASS -- Changed from `grid-cols-4` to `grid-cols-3` matching 3 ScoreBox items (총점/읽기/듣기).

---

#### BUG-04: 포털 탈퇴 확인 텍스트 이중 언어 혼용 -- PASS

**Design**: 이중 언어 혼용 문자열을 `t('withdrawConfirm')` i18n 키로 교체

**Implementation** (`app/portal/page.tsx`):
- Line 575: `{t('withdrawConfirm', lang)}`
- i18n.ts Line 275: `withdrawConfirm: { ko: '정말 탈퇴하시겠습니까?', vi: 'Bạn có chắc chắn muốn xóa tài khoản?' }`

**Verdict**: PASS -- Dual-language string replaced with `t('withdrawConfirm', lang)`. Each language has its own separate string in the i18n dictionary.

---

#### BUG-05: 유학원 등록 시 agency_number 충돌 가능성 -- PASS

**Design**: `agencies.length + 1` -> `Math.max(...agencies.map(a => a.agency_number)) + 1`

**Implementation** (`app/agencies/page.tsx`):
- Line 147: `const nextNumber = agencies.length > 0 ? Math.max(...agencies.map(a => a.agency_number)) + 1 : 1`
- Line 303 (display): `{String(agencies.length > 0 ? Math.max(...agencies.map(a => a.agency_number)) + 1 : 1).padStart(3, '0')}`

**Verdict**: PASS -- Both the actual insert logic and the display preview use `Math.max()` with fallback to `1` for empty arrays.

---

### I18N Fixes (4/4 PASS)

#### I18N-01: 학생 상세 페이지 전체 - i18n 미적용 -- PASS

**Design**: 하드코딩 텍스트 -> `t()` 함수 적용

**Implementation** (`app/students/[id]/page.tsx`):
| Original Hardcoded | Current Code | Line |
|----|----|----|
| `'로딩 중...'` | `{t('loading', lang)}` | 284 |
| `'AJU E&J 학생관리'` | `{t('appTitle', lang)}` | 296 |
| `'로그아웃'` | `{t('logout', lang)}` | 301 |
| `'대시보드'` | `{t('navDashboard', lang)}` | 309 |
| `'학생 관리'` | `{t('navStudents', lang)}` | 310 |
| `'통계'` | `{t('navReports', lang)}` | 311 |
| `'유학원 관리'` | `{t('navAgencies', lang)}` | 313 |
| `'← 목록으로'` | `{t('backToList', lang)}` | 320 |

**Verdict**: PASS -- All 8 hardcoded strings replaced with `t()` calls. (Note: This overlaps with BUG-01 since the root cause was the missing `useLang` hook.)

---

#### I18N-02: 대시보드 - 서류 현황 카드 i18n 미적용 -- PASS

**Design**: 하드코딩 서류 상태 텍스트 -> i18n 키 사용

**Implementation** (`app/page.tsx`):
- Line 332: `{t('docPending', lang)}` -- was '미제출'
- Line 338: `{t('docSubmitted', lang)}` -- was '제출됨'
- Line 344: `{t('docReviewing', lang)}` -- was '검토중'
- Line 350: `{t('docApproved', lang)}` -- was '승인'
- Line 356: `{t('docRejected', lang)}` -- was '반려'
- Line 379: `{t('docTotalLabel', lang)} {total}{t('docCountUnit', lang)}` -- was '전체 {total}건'
- Line 380: `{t('docApprovalLabel', lang)} {approvedPct}%` -- was '승인 {approvedPct}%'

**i18n keys verified**:
- `docPending: { ko: '미제출', vi: 'Chưa nộp' }`
- `docSubmitted: { ko: '제출됨', vi: 'Đã nộp' }`
- `docReviewing: { ko: '검토중', vi: 'Đang xét' }`
- `docApproved: { ko: '승인', vi: 'Đã duyệt' }`
- `docRejected: { ko: '반려', vi: 'Từ chối' }`
- `docTotalLabel: { ko: '전체', vi: 'Tổng số' }`
- `docCountUnit: { ko: '건', vi: 'hồ sơ' }`
- `docApprovalLabel: { ko: '승인', vi: 'Đã duyệt' }`

**Verdict**: PASS -- All 7 document status strings use i18n keys with proper Vietnamese translations.

---

#### I18N-03: 유학원 관리 - 인라인 폼 i18n 미적용 -- PASS

**Design**: 인라인 폼 하드코딩 텍스트 -> i18n 키 사용

**Implementation** (`app/agencies/page.tsx`):
| Original Hardcoded | Current Code | Line |
|----|----|----|
| `'계정 있음'` | `{t('hasAccount', lang)}` | 416 |
| `'계정 없음'` | `{t('noAccount', lang)}` | 416 |
| `'새 계정 추가'` | `{t('addAccountBtn', lang)}` | 437 |
| `'비밀번호 재설정'` | `{t('resetPwBtn', lang)}` | 432 |
| `'계정 이메일'` | `{t('accountEmailLbl', lang)}` | 457 |
| `'새 비밀번호'` | `{t('newPasswordLbl', lang)}` | 488 |
| `'이메일'` | `{t('fieldEmail', lang)}` | 328 |
| `'비밀번호 (8자 이상)'` | `{t('fieldPassword', lang)}` | 332 |
| `'새 계정 추가' (title)` | `{t('addAccountTitle', lang)}` | 454 |
| `'비밀번호 (8자 이상)' (inline)` | `{t('accountPwLbl', lang)}` | 462 |

**Verdict**: PASS -- All inline form text uses `t()` with proper i18n keys. The `accountOptional`, `fieldEmail`, `fieldPassword`, `addAccountTitle`, `accountEmailLbl`, `accountPwLbl`, `newPasswordLbl` keys are all defined in `lib/i18n.ts` with both ko/vi translations.

---

#### I18N-04: 학생 목록 - 전체 선택 텍스트 -- PASS

**Design**: `'전체 선택 ({selectedIds.size}/{filtered.length})'` -> i18n 키 사용

**Implementation** (`app/students/page.tsx`):
- Line 314: `{t('selectAllLabel', lang)} ({selectedIds.size}/{filtered.length})`
- i18n.ts Line 272: `selectAllLabel: { ko: '전체 선택', vi: 'Chọn tất cả' }`

**Verdict**: PASS -- The label portion uses `t('selectAllLabel', lang)` and the count portion `({selectedIds.size}/{filtered.length})` remains as dynamic data.

---

### UI Fixes (2/2 PASS)

#### UI-02: 대시보드 - 학생 상태 값 그대로 표시 -- PASS

**Design**: `s.status` -> `statusLabel(s.status, lang)`

**Implementation** (`app/page.tsx`):
- Line 12: `import { t, statusLabel } from '@/lib/i18n'` -- statusLabel imported
- Line 295: `<span className="text-xs text-slate-400 ml-2">{statusLabel(s.status, lang)}</span>`

**Verdict**: PASS -- `s.status` replaced with `statusLabel(s.status, lang)` for proper i18n support.

---

#### UI-04: 이미지 없을 때 프로필 이니셜 정렬 불일치 -- PASS

**Design**: `span` -> `div` for initial letter display

**Implementation** (`app/students/page.tsx`):
- Lines 330-332 (mobile card):
  ```tsx
  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">
    {s.name_kr.charAt(0)}
  </div>
  ```
- Lines 396-398 (PC table):
  ```tsx
  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
    {s.name_kr.charAt(0)}
  </div>
  ```

**Verdict**: PASS -- Both mobile card and PC table use `<div>` (not `<span>`) for the initial letter fallback element.

---

### SEC Fixes (2/2 PASS)

#### SEC-01: life-record-pdf API - 인증 없음 -- PASS

**Design**: Bearer 토큰 검증 추가

**Implementation** (`app/api/life-record-pdf/route.ts`):
- Lines 17-21: `getAnonClient()` helper created for token verification
- Lines 23-34: Full authentication flow:
  ```typescript
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const anonClient = getAnonClient()
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  ```

**Client-side** (`app/students/[id]/page.tsx`):
- Lines 219-225: Authorization header sent with PDF request:
  ```typescript
  const { data: { session: pdfSession } } = await supabase.auth.getSession()
  headers: {
    'Content-Type': 'application/json',
    ...(pdfSession ? { 'Authorization': `Bearer ${pdfSession.access_token}` } : {}),
  }
  ```

**Verdict**: PASS -- Full Bearer token authentication implemented on server, Authorization header sent from client.

---

#### SEC-02: life-record-pdf-bulk API - 인증 확인 필요 -- PASS

**Design**: 서버에서 세션/토큰 검증 후 RLS 정책 적용

**Implementation** (`app/api/life-record-pdf-bulk/route.ts`):
- Lines 16-20: `getAnonClient()` helper created
- Lines 62-72: Full authentication flow (identical pattern to SEC-01):
  ```typescript
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const anonClient = getAnonClient()
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  ```

**Client-side** (`app/students/page.tsx`):
- Lines 134-140: Authorization header sent with bulk PDF request:
  ```typescript
  const { data: { session: pdfSession } } = await supabase.auth.getSession()
  headers: {
    'Content-Type': 'application/json',
    ...(pdfSession ? { 'Authorization': `Bearer ${pdfSession.access_token}` } : {}),
  }
  ```

**Verdict**: PASS -- Full Bearer token authentication implemented on server, Authorization header sent from client.

---

## Remaining Observations (Not in Verification Scope)

The following items were listed in the original QA report but were not included in the 13 verification targets:

| ID | Description | Current Status |
|----|-------------|----------------|
| I18N-05~08 | Additional i18n items (originally 8 listed, but only 4 targeted) | Not verified |
| UI-01 | Header/nav i18n inconsistency | Resolved as part of BUG-01/I18N-01 |
| UI-03 | Portal useLang hook unification | Not targeted (functional equivalent) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.0 | 2026-02-26 | Original QA analysis (19 issues found) | bkit-gap-detector |
| 1.0 | 2026-02-26 | Post-implementation gap check (13/13 PASS) | bkit-gap-detector |
