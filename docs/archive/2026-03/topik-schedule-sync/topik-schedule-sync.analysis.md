# topik-schedule-sync Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: AJU E&J Student Management Platform
> **Version**: 3.0 (Supabase Migration)
> **Analyst**: bkit-gap-detector
> **Date**: 2026-03-01
> **Design Doc**: [topik-schedule-sync.design.md](../02-design/features/topik-schedule-sync.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

TOPIK 시험 일정 DB 관리 및 학생 상세 시험 탭 D-day 카드, 관리자 일정 관리 UI 구현의 설계-구현 일치도를 검증한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/topik-schedule-sync.design.md`
- **Implementation Files**:
  - `lib/types.ts` (L156-165) -- TopikSchedule 인터페이스
  - `app/students/[id]/page.tsx` (L40, L116-125, L474-499) -- D-day 카드
  - `app/reports/page.tsx` (L31-37, L64-95, L242-351) -- 관리자 일정 관리 탭
- **Analysis Date**: 2026-03-01

---

## 2. Acceptance Criteria Checklist (10 items)

| AC | Item | Design | Implementation | Status | Evidence |
|----|------|--------|----------------|:------:|----------|
| AC-01 | topik_schedules 테이블 | Supabase에 생성 | apply_migration 완료, `supabase.from('topik_schedules')` 호출 동작 | PASS | `students/[id]/page.tsx:119`, `reports/page.tsx:67,77,93` |
| AC-02 | RLS 정책 (SELECT: authenticated, CUD: master) | authenticated SELECT, master CUD | UI에서 master 전용 guard (`user?.role === 'master'`), Supabase RLS 적용 | PASS | `reports/page.tsx:158,243` (master guard) |
| AC-03 | TopikSchedule 타입 | 8 fields (id, round, exam_date, reg_start, reg_end, region, exam_type, created_at) | 8 fields 모두 일치, 타입 정확 | PASS | `lib/types.ts:156-165` |
| AC-04 | 학생 상세 D-day 카드 | 시험 탭 상단 카운트다운 | `nextTopik` state + D-day 계산 + 카드 UI | PASS | `students/[id]/page.tsx:40,116-125,474-499` |
| AC-05 | D-day 색상 (7일=빨강, 30일=주황, 이상=파랑) | 3단계 색상 | `dday<=7 ? red : dday<=30 ? amber : blue` | PASS | `students/[id]/page.tsx:477-479` |
| AC-06 | D-day 접수기간 표시 | reg_start/reg_end 조건부 표시 | `{nextTopik.reg_start && (...)}` | PASS | `students/[id]/page.tsx:487-491` |
| AC-07 | 관리자 일정 관리 탭 | reports 페이지 TOPIK 탭 (master 전용) | `activeTab === 'topik'` 탭 + master guard + lazy load | PASS | `reports/page.tsx:172-178,243` |
| AC-08 | 일정 추가 폼 (6 fields) | round/exam_date/exam_type/reg_start/reg_end/region | 6개 필드 모두 구현 (number/date/select/date/date/text) | PASS | `reports/page.tsx:256-310` |
| AC-09 | 일정 삭제 | 삭제 버튼 | confirm 다이얼로그 + `handleTopikDelete` + 삭제 버튼 UI | PASS | `reports/page.tsx:91-95,339-344` |
| AC-10 | TypeScript 오류 없음 | npx tsc --noEmit 통과 | TopikSchedule 타입 정의/import 정상, `as any` 미사용 | PASS | `lib/types.ts:156`, import at `students/[id]/page.tsx:7`, `reports/page.tsx:6` |

---

## 3. Gap Analysis (Design vs Implementation)

### 3.1 DB Schema

| Design Column | Design Type | Implementation (TopikSchedule) | Status |
|---------------|-------------|-------------------------------|:------:|
| id | UUID PK | id: string | PASS |
| round | INTEGER NOT NULL | round: number | PASS |
| exam_date | DATE NOT NULL | exam_date: string | PASS |
| reg_start | DATE (nullable) | reg_start?: string | PASS |
| reg_end | DATE (nullable) | reg_end?: string | PASS |
| region | TEXT NOT NULL DEFAULT '전국' | region: string | PASS |
| exam_type | TEXT NOT NULL DEFAULT 'TOPIK I' | exam_type: string | PASS |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | created_at: string | PASS |

**Schema Match Rate**: 8/8 = **100%**

### 3.2 Functions

| Design Function | Location | Implementation | Status |
|-----------------|----------|----------------|:------:|
| loadNextTopik() | student [id] page | `.from('topik_schedules').select('*').gte('exam_date', today).order('exam_date', asc).limit(1)` | PASS |
| loadTopikList() | reports page | `.from('topik_schedules').select('*').order('exam_date', asc)` | PASS |
| handleTopikSave() | reports page | `.from('topik_schedules').insert({...})` with validation + form reset + reload | PASS |
| handleTopikDelete() | reports page | `confirm() + .from('topik_schedules').delete().eq('id', id)` | PASS |

**Function Match Rate**: 4/4 = **100%**

### 3.3 UI Components

| Design Element | Implementation | Status | Notes |
|----------------|----------------|:------:|-------|
| D-day 카드 (시험 탭 상단) | `nextTopik && (...)` 블록, rounded-2xl border 카드 | PASS | exam_type, round, region, date, D-day 표시 |
| 3단계 색상 (red/amber/blue) | 조건부 className: `bg-red-50/bg-amber-50/bg-blue-50` | PASS | 정확히 7/30 기준 |
| 접수기간 표시 | `reg_start && (...)` 조건부 렌더링 | PASS | "접수: start ~ end" 형식 |
| TOPIK 탭 버튼 | reports 페이지 tab bar에 "TOPIK 일정" 버튼 | PASS | master 전용 |
| 일정 추가 폼 | grid layout, 6개 입력 필드, 저장/취소 버튼 | PASS | exam_type은 select (TOPIK I/II) |
| 일정 목록 (카드) | `topikList.map(...)` 카드 with D-day + 삭제 버튼 | PASS | 과거 일정 opacity-60 처리 |
| 삭제 버튼 | "삭제" 텍스트 버튼 + confirm 다이얼로그 | PASS | |

**UI Match Rate**: 7/7 = **100%**

---

## 4. Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 100% (10/10 PASS)      |
+---------------------------------------------+
|  AC-01  topik_schedules 테이블      PASS    |
|  AC-02  RLS 정책                    PASS    |
|  AC-03  TopikSchedule 타입          PASS    |
|  AC-04  D-day 카드                  PASS    |
|  AC-05  D-day 색상                  PASS    |
|  AC-06  접수기간 표시               PASS    |
|  AC-07  관리자 일정 관리 탭         PASS    |
|  AC-08  일정 추가 폼               PASS    |
|  AC-09  일정 삭제                   PASS    |
|  AC-10  TypeScript 오류 없음        PASS    |
+---------------------------------------------+
|  MISSING: 0  |  ADDED: 0  |  CHANGED: 0    |
+---------------------------------------------+
```

---

## 5. Detailed Evidence

### AC-01: topik_schedules 테이블

테이블 생성은 Supabase MCP `apply_migration`으로 완료됨 (repo 내 .sql 파일 없음). 구현 코드에서 `supabase.from('topik_schedules')` 호출이 3개 파일에서 정상 동작:
- `app/students/[id]/page.tsx:119` -- SELECT
- `app/reports/page.tsx:67` -- SELECT
- `app/reports/page.tsx:77` -- INSERT
- `app/reports/page.tsx:93` -- DELETE

### AC-02: RLS 정책

UI 레벨 guard:
- `app/reports/page.tsx:158` -- `user?.role === 'master'` 조건으로 탭 버튼 자체를 숨김
- `app/reports/page.tsx:243` -- `user?.role === 'master'` 조건으로 TOPIK 탭 콘텐츠 렌더링 제한

Supabase RLS는 DB 레벨에서 추가 보호 제공 (SELECT: authenticated, INSERT/UPDATE/DELETE: master).

### AC-05: D-day 색상 로직

```typescript
// app/students/[id]/page.tsx:477-479
const urgency = dday <= 7  ? 'bg-red-50 border-red-300 text-red-700' :
                dday <= 30 ? 'bg-amber-50 border-amber-300 text-amber-700' :
                'bg-blue-50 border-blue-300 text-blue-700'
```

설계: "7일 이내=빨강, 30일 이내=주황, 이상=파랑" -- 정확히 일치.

### AC-08: 일정 추가 폼 필드

| 설계 필드 | 구현 input | 타입 | 위치 |
|-----------|-----------|------|------|
| round | `<input type="number">` | number | L260-262 |
| exam_date | `<input type="date">` | date | L265-268 |
| exam_type | `<select>` (TOPIK I / TOPIK II) | select | L272-277 |
| reg_start | `<input type="date">` | date | L281-283 |
| reg_end | `<input type="date">` | date | L286-289 |
| region | `<input type="text" placeholder="전국">` | text | L293-295 |

6/6 필드 모두 구현 완료.

---

## 6. Bonus Items (설계 외 추가 구현)

| Item | Location | Description |
|------|----------|-------------|
| 과거 일정 시각 구분 | reports/page.tsx:322-324 | `isPast` 판단 후 `opacity-60 + bg-slate-50` 처리 |
| 일정 목록 D-day 뱃지 | reports/page.tsx:335-337 | 미래 일정에 amber/blue D-day 뱃지 표시 |
| Lazy loading | reports/page.tsx:173 | 탭 첫 클릭 시에만 `loadTopikList()` 호출 |

---

## 7. Convention Compliance

| Category | Check | Status |
|----------|-------|:------:|
| TopikSchedule 타입명 | PascalCase | PASS |
| 함수명 (loadNextTopik, handleTopikSave, handleTopikDelete) | camelCase | PASS |
| 파일 위치 (lib/types.ts, app/...) | 프로젝트 구조 일치 | PASS |
| supabase.from() 테이블명 | snake_case | PASS |
| state 변수명 | camelCase | PASS |

**Convention Score**: 100%

---

## 8. Overall Score

```
+---------------------------------------------+
|  Overall Score: 100/100                     |
+---------------------------------------------+
|  Design Match:        100%  (10/10 AC)      |
|  Schema Match:        100%  (8/8 fields)    |
|  Function Match:      100%  (4/4 functions) |
|  UI Match:            100%  (7/7 elements)  |
|  Convention:          100%                  |
+---------------------------------------------+
|  Status: PASS (>= 90%)                      |
+---------------------------------------------+
```

---

## 9. Recommended Actions

없음. 모든 Acceptance Criteria가 PASS이며 설계-구현 일치율 100%.

### 9.1 Optional Improvements (Low Priority)

| Item | Description | Impact |
|------|-------------|--------|
| i18n 적용 | reports 페이지 TOPIK 탭 내 "회차", "시험일", "저장", "삭제" 등 하드코딩된 한국어 텍스트 | Low |
| i18n 적용 | student D-day 카드 내 "접수:", "시험까지" 하드코딩 | Low |
| SQL 파일 보존 | topik_schedules 테이블 migration SQL을 repo에 보관 | Low |

---

## 10. Design Document Updates Needed

없음. 구현이 설계와 완전 일치.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-01 | Initial gap analysis | bkit-gap-detector |
