# platform-ui-improvement Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: AJU E&J Student Management Platform
> **Version**: 3.0 (Supabase Migration)
> **Analyst**: bkit-gap-detector
> **Date**: 2026-02-26
> **Design Doc**: User-provided change specification (no formal design document)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Verify that all platform UI improvements described in the change specification have been correctly implemented across 4 files: `lib/i18n.ts`, `app/students/[id]/page.tsx`, `app/page.tsx`, and `app/students/page.tsx`.

### 1.2 Analysis Scope

- **Specification**: User-provided change list (4 files, 25+ i18n keys, 9 UI changes)
- **Implementation Paths**:
  - `lib/i18n.ts`
  - `app/students/[id]/page.tsx`
  - `app/page.tsx`
  - `app/students/page.tsx`
- **Analysis Date**: 2026-02-26

---

## 2. Gap Analysis (Specification vs Implementation)

### 2.1 i18n Keys -- lib/i18n.ts

#### Tab Labels (6 keys)

| Key | Exists | KO | VI | Line | Status |
|-----|:------:|:--:|:--:|:----:|:------:|
| `tabInfoDetail` | Yes | "기본 정보" | "Thong tin co ban" | 278 | PASS |
| `tabConsultHist` | Yes | "상담 히스토리" | "Lich su tu van" | 279 | PASS |
| `tabExamDetail` | Yes | "시험 성적" | "Ket qua thi" | 280 | PASS |
| `tabEvaluation` | Yes | "선생님 평가" | "Danh gia giao vien" | 281 | PASS |
| `tabDocChecklist` | Yes | "서류 체크리스트" | "Danh sach tai lieu" | 282 | PASS |
| `tabConsentAdmin` | Yes | "개인정보 동의" | "Dong y thong tin ca nhan" | 283 | PASS |

#### Buttons (3 keys)

| Key | Exists | KO | VI | Line | Status |
|-----|:------:|:--:|:--:|:----:|:------:|
| `deleteBtn` | Yes | "삭제" | "Xoa" | 286 | PASS |
| `pdfBtn` | Yes | "생활기록부 PDF (KO+VI)" | "PDF Ho so (KO+VI)" | 287 | PASS |
| `pdfGenerating` | Yes | "PDF 생성 중..." | "Dang tao PDF..." | 288 | PASS |

#### Bulk PDF Buttons (3 keys)

| Key | Exists | KO | VI | Line | Status |
|-----|:------:|:--:|:--:|:----:|:------:|
| `pdfBulkDownload` | Yes | "PDF 일괄 다운로드" | "Tai PDF hang loat" | 291 | PASS |
| `pdfBulkSelected` | Yes | "PDF 다운로드" | "Tai PDF" | 292 | PASS |
| `pdfBulkZip` | Yes | "ZIP 생성 중..." | "Dang tao ZIP..." | 293 | PASS |

#### InfoCard Section Titles (2 keys)

| Key | Exists | KO | VI | Line | Status |
|-----|:------:|:--:|:--:|:----:|:------:|
| `sectionPersonal` | Yes | "개인 정보" | "Thong tin ca nhan" | 296 | PASS |
| `sectionVisaArc` | Yes | "비자 / 체류 / ARC" | "Visa / Cu tru / ARC" | 297 | PASS |

#### InfoRow Labels (9 keys)

| Key | Exists | KO | VI | Line | Status |
|-----|:------:|:--:|:--:|:----:|:------:|
| `languageSchool` | Yes | "재학 어학원" | "Truong ngon ngu" | 300 | PASS |
| `currentUniv` | Yes | "재학 대학교" | "Truong dai hoc" | 301 | PASS |
| `currentCompany` | Yes | "재직 회사" | "Cong ty" | 302 | PASS |
| `arcNumber` | Yes | "외국인등록번호 (ARC)" | "So ARC" | 303 | PASS |
| `arcIssueDate` | Yes | "ARC 발급일" | "Ngay cap ARC" | 304 | PASS |
| `arcExpiry` | Yes | "ARC 만료일" | "Ngay het han ARC" | 305 | PASS |
| `maleLabel` | Yes | "남성" | "Nam" | 306 | PASS |
| `femaleLabel` | Yes | "여성" | "Nu" | 307 | PASS |
| `highSchoolGpa` | Yes | "고등학교 성적" | "GPA THPT" | 308 | PASS |

#### Empty State (2 keys)

| Key | Exists | KO | VI | Line | Status |
|-----|:------:|:--:|:--:|:----:|:------:|
| `noSearchResult` | Yes | "검색 결과가 없습니다." | "Khong co ket qua tim kiem." | 311 | PASS |
| `clearFilter` | Yes | "필터 초기화" | "Xoa bo loc" | 312 | PASS |

**i18n Key Count**: 25 keys verified present in `lib/i18n.ts` (lines 277-312). The specification claimed 35 keys, but the enumerated key groups total 25. All enumerated keys are PASS.

---

### 2.2 Student Detail Page -- app/students/[id]/page.tsx

#### Improvement 1: Status badge uses statusLabel()

| Item | Expected | Actual (Line) | Status |
|------|----------|---------------|:------:|
| Status badge text | `statusLabel(student.status, lang)` | `{statusLabel(student.status, lang)}` (line 353) | PASS |
| Import | `statusLabel` from `@/lib/i18n` | `import { t, statusLabel } from '@/lib/i18n'` (line 12) | PASS |

#### Improvement 2: Tab labels use t() with whitespace-nowrap

| Tab | i18n Call | whitespace-nowrap | Line | Status |
|-----|-----------|:-----------------:|:----:|:------:|
| Info | `t('tabInfoDetail', lang)` | Yes (line 397) | 389 | PASS |
| Consult | `t('tabConsultHist', lang)` | Yes (line 397) | 390 | PASS |
| Exam | `t('tabExamDetail', lang)` | Yes (line 397) | 391 | PASS |
| Evaluation | `t('tabEvaluation', lang)` | Yes (line 397) | 392 | PASS |
| Docs | `t('tabDocChecklist', lang)` | Yes (line 397) | 393 | PASS |
| Consent | `t('tabConsentAdmin', lang)` | Yes (line 397) | 394 | PASS |

Container also has `overflow-x-auto max-w-full` (line 387) for scrollable tabs on mobile.

#### Improvement 3: Buttons use t()

| Button | i18n Call | Line | Status |
|--------|-----------|:----:|:------:|
| Edit | `t('editBtn', lang)` | 378 | PASS |
| Delete | `t('deleteBtn', lang)` | 381 | PASS |
| PDF (normal) | `t('pdfBtn', lang)` | 375 | PASS |
| PDF (loading) | `t('pdfGenerating', lang)` | 375 | PASS |

#### Improvement 4: InfoCard titles use t()

| Card | i18n Call | Line | Status |
|------|-----------|:----:|:------:|
| Personal | `t('sectionPersonal', lang)` | 406 | PASS |
| Parent | `t('sectionParent', lang)` | 413 | PASS |
| Study | `t('sectionStudy', lang)` | 417 | PASS |
| Visa/ARC | `t('sectionVisaArc', lang)` | 433 | PASS |

#### Improvement 5: InfoRow labels use t()

| Field | i18n Call | Line | Status |
|-------|-----------|:----:|:------:|
| dob | `t('dob', lang)` | 407 | PASS |
| gender | `t('gender', lang)` + `t('maleLabel'/'femaleLabel', lang)` | 408 | PASS |
| email | `t('email', lang)` | 409 | PASS |
| phoneKr | `t('phoneKr', lang)` | 410 | PASS |
| phoneVn | `t('phoneVn', lang)` | 411 | PASS |
| fieldParentName | `t('fieldParentName', lang)` | 414 | PASS |
| fieldParentPhone | `t('fieldParentPhone', lang)` | 415 | PASS |
| languageSchool | `t('languageSchool', lang)` | 418 | PASS |
| currentUniv | `t('currentUniv', lang)` | 419 | PASS |
| currentCompany | `t('currentCompany', lang)` | 420 | PASS |
| highSchoolGpa | `t('highSchoolGpa', lang)` | 421 | PASS |
| fieldEnrollDate | `t('fieldEnrollDate', lang)` | 422 | PASS |
| fieldTargetUniv | `t('fieldTargetUniv', lang)` | 423 | PASS |
| fieldTargetMajor | `t('fieldTargetMajor', lang)` | 424 | PASS |
| topikLevel | `t('topikLevel', lang)` | 426 | PASS |
| fieldVisaType | `t('fieldVisaType', lang)` | 434 | PASS |
| fieldVisaExpiry | `t('fieldVisaExpiry', lang)` | 435 | PASS |
| arcNumber | `t('arcNumber', lang)` | 436 | PASS |
| arcIssueDate | `t('arcIssueDate', lang)` | 437 | PASS |
| arcExpiry | `t('arcExpiry', lang)` | 438 | PASS |

---

### 2.3 Dashboard Page -- app/page.tsx

#### Improvement 1: Status breakdown mobile grid

| Item | Expected | Actual (Line) | Status |
|------|----------|---------------|:------:|
| Status card grid | `grid-cols-2 sm:grid-cols-4` | `grid-cols-2 sm:grid-cols-4` (line 393) | PASS |
| Was previously | `grid-cols-4` | Confirmed changed | PASS |

#### Improvement 2: Doc stats mobile grid

| Item | Expected | Actual (Line) | Status |
|------|----------|---------------|:------:|
| Doc stats grid | `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` | `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` (line 330) | PASS |
| Was previously | `grid-cols-5` | Confirmed changed | PASS |

---

### 2.4 Student List Page -- app/students/page.tsx

#### Improvement 1: PDF button texts use t()

| Button State | i18n Call | Line | Status |
|--------------|-----------|:----:|:------:|
| Loading | `t('pdfBulkZip', lang)` | 239 | PASS |
| With selection | `t('pdfBulkSelected', lang)` | 239 | PASS |
| No selection | `t('pdfBulkDownload', lang)` | 239 | PASS |

#### Improvement 2: Empty state separation

| Condition | Expected | Actual (Lines) | Status |
|-----------|----------|:--------------:|:------:|
| Search/filter active, no results | Magnifying glass icon + `noSearchResult` + `clearFilter` button | Lines 298-307: magnifying glass icon, `t('noSearchResult', lang)`, clearFilter button calling `setSearch(''); setAgencyFilter(''); setStatusFilter('')` | PASS |
| No data at all | Person icon + `noStudents` + add student link | Lines 309-314: person icon, `t('noStudents', lang)`, `t('addFirstStudent', lang)` link to `/students/new` | PASS |

---

## 3. Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 100%                    |
+---------------------------------------------+
|  PASS:  All items verified                   |
|  FAIL:  0 items                              |
+---------------------------------------------+
```

### Detailed Scores

| Category | Items | Verified | Score | Status |
|----------|:-----:|:--------:|:-----:|:------:|
| i18n Keys (lib/i18n.ts) | 25 | 25 | 100% | PASS |
| Status Badge (detail page) | 2 | 2 | 100% | PASS |
| Tab Labels (detail page) | 6 | 6 | 100% | PASS |
| Buttons (detail page) | 4 | 4 | 100% | PASS |
| InfoCard Titles (detail page) | 4 | 4 | 100% | PASS |
| InfoRow Labels (detail page) | 20 | 20 | 100% | PASS |
| Mobile Grid (dashboard) | 2 | 2 | 100% | PASS |
| PDF Buttons (student list) | 3 | 3 | 100% | PASS |
| Empty State (student list) | 2 | 2 | 100% | PASS |
| **Total** | **68** | **68** | **100%** | **PASS** |

---

## 4. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| i18n Compliance | 100% | PASS |
| Mobile Responsiveness | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **100%** | **PASS** |

---

## 5. Observations

### 5.1 i18n Key Count Discrepancy

The specification claimed "35 new keys added" but the enumerated key groups total 25 distinct keys. All 25 enumerated keys are correctly present. The difference of 10 may be a specification error or may count keys that already existed (such as `editBtn`, `sectionParent`, `sectionStudy` which were pre-existing).

### 5.2 Remaining Hardcoded Korean Strings

While all specified changes are implemented, the following areas in the analyzed files still contain hardcoded Korean text (outside the scope of this feature but noted for reference):

| File | Line | Hardcoded Text | Severity |
|------|:----:|----------------|:--------:|
| `app/students/[id]/page.tsx` | 285 | "학생 정보를 찾을 수 없습니다." | Low |
| `app/students/[id]/page.tsx` | 442 | "비고" (InfoCard title in notes section) | Low |
| `app/students/[id]/page.tsx` | 506 | "+ 성적 추가" / "✕ 닫기" | Low |
| `app/students/[id]/page.tsx` | 514 | "모의고사 Excel 업로드" | Low |
| `app/students/[id]/page.tsx` | 540 | "시험 성적 수정" / "시험 성적 추가" | Low |
| `app/students/[id]/page.tsx` | 579-581 | "취소" / "저장 중..." / "수정 완료" / "저장" | Low |
| `app/students/[id]/page.tsx` | 594 | "시험 기록이 없습니다." | Low |
| `app/students/[id]/page.tsx` | 604-605 | "수정" / "삭제" (exam actions) | Low |
| `app/students/[id]/page.tsx` | 639 | "동의 이력이 없습니다." | Low |
| `app/students/[id]/page.tsx` | 646-657 | "가입 동의" / "접기" / "동의 내용 보기" | Low |
| `app/students/page.tsx` | 381 | "전체" (PC table select-all label) | Low |

These are pre-existing and out of scope for this feature.

---

## 6. Differences Found

### Missing Features (Design O, Implementation X)

None.

### Added Features (Design X, Implementation O)

None.

### Changed Features (Design != Implementation)

| Item | Specification | Implementation | Impact |
|------|--------------|----------------|:------:|
| i18n key count | "35 new keys" | 25 new keys verified | None (all listed keys present) |

---

## 7. Recommended Actions

### Immediate Actions

None required. All specified changes are correctly implemented.

### Optional Improvements (Future)

1. Address remaining hardcoded Korean strings in exam form and consent tab (Section 5.2)
2. Clarify i18n key count in specification (25 vs 35)

---

## 8. Conclusion

Match Rate: **100%** (PASS >= 90%)

All 4 files have been verified against the specification. Every i18n key, every t() call, every grid class change, every button label, and both empty state variants are correctly implemented. The platform-ui-improvement feature is complete and ready for completion report.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-26 | Initial gap analysis | bkit-gap-detector |
