# UI Style — Toss 스타일 전환 Plan

**Feature**: ui-style-toss
**Phase**: Plan
**Status**: In Progress
**Created**: 2026-03-26

---

## 1. 목표

현재 "준-Toss" 상태의 UI를 완전한 Toss 스타일로 완성한다.
전체 리디자인 없이 핵심 3가지 변경으로 체감 품질을 크게 향상시킨다.

---

## 2. 현재 상태 분석

| 항목 | 현재 | 목표 |
|------|------|------|
| 폰트 | Segoe UI (시스템) | Noto Sans KR (설치됨, 미활성) |
| Primary 색상 | blue-600 (#2563EB) + indigo-600 혼재 | #3182F6 단일 통일 |
| StatCard | 컬러 배경 (bg-blue-50 등) | 흰 배경 + 숫자만 액센트 |
| 전체 배경 | bg-slate-100 | bg-gray-50 (#F9FAFB) |
| 입력 포커스 | ring-2 ring-blue-500 | border-[#3182F6], ring 제거 |

---

## 3. 구현 범위

### Phase 1 — 기반 (globals.css)
- `Noto Sans KR` 폰트 활성화
- CSS 변수 `--toss-blue: #3182F6` 정의
- 전체 배경색 `#F9FAFB`

### Phase 2 — 컬러 통일 (전체 파일)
- `blue-600` / `indigo-600` / `violet-600` → `[#3182F6]` 일괄 교체
- `hover:blue-700` → `hover:[#1B64DA]`
- `focus:ring-blue-500` → `focus:border-[#3182F6]`

### Phase 3 — StatCard / DocStatItem 재설계
- `app/page.tsx` 하단 StatCard: 컬러 배경 → 흰 배경 + 액센트 숫자
- DocStatItem: 동일 패턴 적용

### Phase 4 — 세부 polish
- 입력 필드: `bg-slate-50` 기본, `bg-white` 포커스 전환
- 버튼 active 피드백: `active:scale-[0.98]`
- 헤더 네비 액티브: `border-b-2` 두께 통일
- 이모지 아이콘 → lucide-react 아이콘 교체 (선택)

---

## 4. 변경 파일 목록

| 파일 | 변경 내용 | 우선순위 |
|------|-----------|----------|
| `app/globals.css` | 폰트, CSS 변수, 배경색 | 최상 |
| `app/page.tsx` | StatCard, DocStatItem | 상 |
| `components/Layout/AppLayout.tsx` | 헤더, 네비 스타일 | 상 |
| `app/login/page.tsx` | 배경, 버튼, 입력 | 상 |
| `app/auth/reset-password/page.tsx` | 동일 패턴 | 중 |
| `app/auth/reset-password-request/page.tsx` | 동일 패턴 | 중 |
| `app/students/page.tsx` | 버튼, 필터, 테이블 | 상 |
| `app/students/[id]/page.tsx` | 탭, 카드 | 중 |
| `app/agencies/page.tsx` | 버튼, 카드 | 중 |
| `app/reports/page.tsx` | 탭, 차트 | 중 |
| `app/portal/page.tsx` | 포털은 현행 유지 (학생용) | 낮음 |
| `components/LangToggle.tsx` | 경계선 스타일 | 낮음 |

---

## 5. 디자인 토큰

```css
/* Toss 색상 토큰 */
--toss-blue:       #3182F6;
--toss-blue-hover: #1B64DA;
--toss-blue-light: #EBF3FE;
--toss-gray-bg:    #F9FAFB;
--toss-border:     #E5E7EB;
--toss-text:       #111827;
--toss-subtext:    #6B7280;
```

---

## 6. 완료 기준

- [ ] Noto Sans KR 한국어/베트남어 렌더링 확인
- [ ] 전체 파란 버튼이 #3182F6으로 통일됨
- [ ] StatCard가 흰 배경 + 액센트 숫자 방식으로 전환됨
- [ ] 로그인/비밀번호 재설정 페이지 Toss 느낌
- [ ] TypeScript 오류 0개
- [ ] 기존 기능 회귀 없음
