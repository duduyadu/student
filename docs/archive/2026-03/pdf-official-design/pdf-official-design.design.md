# Design: pdf-official-design

## Overview
생활기록부 PDF를 공문서 스타일로 개선. Gemini 피드백 기반으로 색상, 타이포그래피, UI 요소를 관공서/공식 문서 수준으로 격상.

**Target File**: `components/pdf/LifeRecordDocument.tsx`

---

## Design Requirements

### DR-01: 색상 팔레트
| 항목 | 기존 | 변경 |
|------|------|------|
| 배경(pageBg) | `#FFFFFF` (순백) | `#FDFAF6` (크림/웜화이트) |
| 메인 네이비(navyDark) | `#1A237E` | `#0D1B3E` (딥 다크 네이비) |
| 보조 네이비(navy) | `#283593` | `#1A2D5A` |
| 골드(신규) | — | `#8B6914` (포인트 골드) |
| 연골드(신규) | — | `#C9A84C` (골드 border용) |
| labelBg | `#F1F3F4` | `#F0EDE6` (크림톤 맞춤) |
| stripe | `#F8F9FA` | `#F7F3EC` (크림톤 줄무늬) |
| border | `#DADCE0` | `#D4CFC7` (웜톤) |

### DR-02: 헤더 구분선
- 메인 헤더 하단: 3px 다크 네이비 선 → 그 아래 1.5px 골드 선(별도 View)
- 섹션 헤더: 기존 배경색 유지 + `borderBottom: 1.5px solid gold` 추가

### DR-03: 기관 서브타이틀 변경
- KO: `'베트남 유학생 통합 관리 플랫폼'` → `'Aju E&J Education Official Record'`
- VI: `'Nền tảng quản lý du học sinh Việt Nam'` → `'Aju E&J Education Official Record'`

### DR-04: 상담 태그(consultTag) — 공문서 스타일
- 기존: `amberBg 파스텔 + borderRadius 3` (웹 UI 느낌)
- 변경: `transparent 배경 + borderRadius 0 + 0.5px goldLight 테두리` (각진 박스)

### DR-05: 희망대학 뱃지(aspBadge) — 배경 제거
- 기존: `#EDE7F6 보라색 배경 + borderRadius 3`
- 변경: `transparent + borderRadius 0 + 2px gold 왼쪽 선`

### DR-06: 직인 원 — 얇고 정교하게
- 기존: width/height 44, border `1.5px solid navyDark`
- 변경: width/height 52, border `0.8px solid navyDark` + `marginHorizontal 4` (주변 여백)

---

## Acceptance Criteria

- [ ] AC-01: pageBg가 `#FDFAF6` (크림) 적용됨
- [ ] AC-02: navyDark가 `#0D1B3E` (딥 네이비) 적용됨
- [ ] AC-03: `C.gold` = `#8B6914` 신규 추가됨
- [ ] AC-04: 메인 헤더 아래 1.5px 골드 선(mainHeaderGoldLine) 추가됨
- [ ] AC-05: 섹션 헤더에 `borderBottom: 1.5px solid gold` 적용됨
- [ ] AC-06: orgSub → `'Aju E&J Education Official Record'` (ko, vi 모두)
- [ ] AC-07: consultTag borderRadius 0, transparent 배경, 골드 테두리
- [ ] AC-08: aspBadge 보라색 배경 제거, 골드 왼쪽 선 적용
- [ ] AC-09: 직인 원 52×52, border 0.8px
- [ ] AC-10: TypeScript 빌드 오류 없음
