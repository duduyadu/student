# Plan: platform-code-quality

> AJU E&J 플랫폼 코드 품질 개선 — 기술 부채 해소

**Feature**: platform-code-quality
**Created**: 2026-02-28
**Status**: Plan
**Priority**: Medium
**Estimated Scope**: Medium (5~10개 파일)

---

## 1. 배경 및 목적

코드 분석(`bkit:code-analyzer`) 결과 72/100 점수 확인. 주요 기술 부채:

- **CUD 에러 미처리**: 쓰기 작업 실패 시 사용자에게 알림 없음 (일부 수정 완료)
- **i18n 하드코딩**: CLAUDE.md 규칙("모든 UI 텍스트는 i18n 테이블에서 참조") 위반
- **TypeScript 타입 미흡**: `as any` 캐스팅, undefined 타입 처리 부족
- **파일 크기 과대**: 일부 컴포넌트 300줄 초과 (권장 상한)

## 2. 범위 및 목표

### IN SCOPE
- [ ] **에러 처리 보완**: `handlePhotoUpload` DB update 에러 처리 추가
- [ ] **i18n 적용**: 하드코딩 한국어 문자열 → i18n 키 전환 (우선순위 높은 것)
  - `app/students/[id]/page.tsx` 내 "시험 기록이 없습니다", "동의 이력이 없습니다", "비고", "시험 성적 수정/추가" 등
  - `app/students/[id]/_components/` 내 하드코딩 문자열
- [ ] **TypeScript 개선**: `student.agency as any` → 타입 정의 추가
- [ ] **에러 처리 보완**: 전체 API Route 에러 응답 일관성 확인

### OUT OF SCOPE
- 컴포넌트 분리/리팩토링 (파일 크기) — 별도 기능 추가 없이 순수 분리 작업은 위험도 높음
- 읽기(loadXxx) 함수 에러 처리 — 빈 배열 유지로 치명적이지 않음
- 새 기능 추가

### 완료 기준
- i18n 하드코딩 0건 (신규 추가분 기준)
- CUD 에러 처리 100%
- TypeScript strict 오류 0건
- 코드 품질 점수 85+/100

## 3. 우선순위 항목

| 항목 | 파일 | 심각도 | 작업 |
|------|------|--------|------|
| `handlePhotoUpload` DB update 에러 | `app/students/[id]/page.tsx` | 중간 | 에러 처리 추가 |
| 시험 탭 하드코딩 i18n | `app/students/[id]/page.tsx` | 중간 | i18n 키 6~8개 추가 |
| 동의 탭 하드코딩 i18n | `app/students/[id]/page.tsx` | 낮음 | i18n 키 3~4개 추가 |
| `student.agency as any` 타입 | `lib/types.ts` | 낮음 | Agency 조인 타입 정의 |
| ConsultTimeline i18n 확인 | `_components/ConsultTimeline.tsx` | 낮음 | 하드코딩 체크 |
| EvaluationPanel i18n 확인 | `_components/EvaluationPanel.tsx` | 낮음 | 하드코딩 체크 |

## 4. 구현 접근법

### Phase 1: 에러 처리 (빠른 수정)
```typescript
// handlePhotoUpload: Storage 업로드 후 DB update 에러 처리
const { error: dbErr } = await supabase.from('students').update({ photo_url: url }).eq('id', id)
if (dbErr) { alert('사진 URL 저장 실패: ' + dbErr.message) }
```

### Phase 2: i18n 키 추가
`lib/i18n.ts`에 신규 키 추가 후 하드코딩 교체:
```typescript
// 추가할 키 예시
exam_no_records: { ko: '시험 기록이 없습니다.', vi: 'Không có kết quả thi.' }
exam_form_add:   { ko: '시험 성적 추가', vi: 'Thêm kết quả thi' }
exam_form_edit:  { ko: '시험 성적 수정', vi: 'Chỉnh sửa kết quả thi' }
notes_label:     { ko: '비고', vi: 'Ghi chú' }
consent_none:    { ko: '동의 이력이 없습니다.', vi: 'Không có lịch sử đồng ý.' }
```

### Phase 3: TypeScript 타입 개선
```typescript
// lib/types.ts - Student에 agency 조인 타입 추가
export interface StudentWithAgency extends Student {
  agency: Pick<Agency, 'agency_code' | 'agency_name_kr'> | null
}
```

## 5. 리스크

| 리스크 | 대응 |
|--------|------|
| i18n 키 변경 시 VI 번역 누락 | KO/VI 동시 추가 필수 |
| 타입 변경으로 기존 코드 컴파일 오류 | 수정 후 `npm run build` 확인 |

## 6. 참고

- 코드 분석 결과: 2026-02-28 `bkit:code-analyzer` (72/100)
- 관련 버그 수정: commit `41dce98` (exam_results constraint 인코딩 + 에러 처리)
- CLAUDE.md: "모든 UI 텍스트는 i18n 테이블에서 참조 (하드코딩 절대 금지)"
