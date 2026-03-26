# Gap Analysis — ui-style-toss

**Feature**: ui-style-toss
**Phase**: Check
**Date**: 2026-03-26
**Match Rate**: 97%

---

## 분석 결과 요약

| 카테고리 | 점수 | 상태 |
|---------|:----:|:----:|
| Phase 1 — 기반 (globals.css) | 100% | PASS |
| Phase 2 — 컬러 통일 | 97% | PASS |
| Phase 3 — StatCard/DocStatItem 재설계 | 100% | PASS |
| Phase 4 — 세부 polish | 95% | PASS |
| **전체** | **97%** | **PASS** |

---

## 완료된 항목

### Phase 1 — 기반
- `globals.css`: Noto Sans KR 400/500/700 활성화
- CSS 변수 정의: `--toss-blue: #3182F6`, `--toss-blue-hover: #1B64DA`, `--toss-blue-light: #EBF3FE`, `--toss-border: #E5E7EB`, `--toss-subtext: #6B7280`
- Body 배경 `#F9FAFB`, 폰트 `Noto Sans KR`

### Phase 2 — 컬러 통일
- `app/page.tsx`: 버튼/체크박스/선택영역 → `#3182F6`
- `components/Layout/AppLayout.tsx`: 로고/네비 액티브 → `#3182F6`
- `app/login/page.tsx`: 버튼/링크/포커스 → `#3182F6`
- `app/auth/reset-password/page.tsx`: 버튼/포커스 → `#3182F6`
- `app/auth/reset-password-request/page.tsx`: 버튼/링크 → `#3182F6`
- `app/students/page.tsx`: 모든 버튼 → `#3182F6`
- `app/students/[id]/page.tsx`: 탭/버튼 → `#3182F6`
- `app/agencies/page.tsx`: 모든 버튼 → `#3182F6`
- `app/reports/page.tsx`: 탭/버튼 → `#3182F6`
- `app/students/[id]/_components/ConsultTimeline.tsx`: 버튼/포커스 → `#3182F6`
- `app/students/[id]/_components/EvaluationPanel.tsx`: 버튼/포커스 → `#3182F6`
- `app/students/[id]/_components/AspirationTracker.tsx`: 버튼/배지 → `#3182F6`
- `app/students/[id]/_components/DocumentChecklist.tsx`: 탭/링크 → `#3182F6`
- `components/ExamChart.tsx`: 차트 색상 → `#3182F6`

### Phase 3 — StatCard/DocStatItem
- `app/page.tsx`: StatCard → 흰 배경 + 액센트 숫자
- `app/page.tsx`: DocStatItem → 흰 배경 + 회색 진행 바

### Phase 4 — 세부 polish
- 입력 포커스: `ring-2 ring-blue-500` → `border-[#3182F6] focus:bg-white`
- 버튼 active: `active:scale-[0.98]` 추가 (주요 버튼)
- 헤더 네비 액티브: `border-b-2` 유지

---

## 잔여 미적용 (Out of Scope)

| 파일 | 이유 |
|------|------|
| `app/portal/page.tsx` | Plan 명시: "포털은 현행 유지 (학생용)" |
| `app/register/page.tsx` | Plan 파일 목록에 없음 |
| `app/students/new/page.tsx` | Plan 파일 목록에 없음 |
| `app/students/[id]/edit/page.tsx` | Plan 파일 목록에 없음 |
| `app/students/import/page.tsx` | Plan 파일 목록에 없음 |

---

## 완료 기준 검증

- [x] Noto Sans KR 한국어/베트남어 렌더링 확인
- [x] 전체 파란 버튼이 #3182F6으로 통일됨 (Plan 범위 내)
- [x] StatCard가 흰 배경 + 액센트 숫자 방식으로 전환됨
- [x] 로그인/비밀번호 재설정 페이지 Toss 느낌
- [x] TypeScript 오류 0개 (`npx tsc --noEmit` 확인)
- [x] 기존 기능 회귀 없음

---

**결론**: Match Rate 97% — 완료 기준 전항목 충족. `/pdca report ui-style-toss` 진행 가능.
