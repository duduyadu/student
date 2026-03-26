# Design: 플랫폼 코드 품질 개선

**Feature**: platform-code-quality
**Phase**: Design
**Created**: 2026-03-26
**Reference Plan**: `docs/01-plan/features/platform-code-quality.plan.md`

---

## 1. 개요

코드 분석(`bkit:code-analyzer`) 결과 72/100 점수에서 확인된 기술 부채를 해소한다. 새 기능 추가 없이 기존 코드의 품질 항목만 개선한다. 목표 점수: 85+/100.

개선 대상 3가지:
1. **i18n 하드코딩 제거**: UI 텍스트를 `t()` 호출로 교체
2. **CUD 에러 처리 보완**: 사진 업로드 DB 업데이트 누락 처리 추가
3. **TypeScript `as any` 제거**: 타입 안전성 향상

---

## 2. i18n 키 추가 설계

### 2-1. 추가 위치

`lib/i18n.ts` — 기존 i18n 사전에 신규 키 추가.

### 2-2. 추가 키 목록

| 키 | KO | VI |
|----|----|----|
| `deleteFail` | `'삭제 실패: '` | `'Xoa that bai: '` |
| `examDeleteConfirm` | `'이 시험 성적을 삭제하시겠습니까?'` | `'Ban co chac chan muon xoa ket qua thi nay?'` |
| `examDateRequired` | `'시험 날짜를 먼저 입력하세요.'` | `'Vui long nhap ngay thi truoc.'` |
| `chartTrend` | `'(chart) 추이'` | `'(chart) Xu huong'` |
| `chartRadar` | `'(chart) 레이더'` | `'(chart) Radar'` |
| `chartAiLabel` | `'(chart) AI 분석'` | `'(chart) Phan tich AI'` |

모든 키는 KO/VI 쌍으로 동시 추가 (VI 누락 금지).

### 2-3. 교체 대상 하드코딩 문자열

`app/students/[id]/page.tsx` 기준:

| 하드코딩 문자열 | 교체 키 |
|----------------|---------|
| `'저장 실패: '` | `t('saveFail', lang)` |
| `'이 시험 성적을 삭제하시겠습니까?'` | `t('examDeleteConfirm', lang)` |
| `'삭제 실패: '` | `t('deleteFail', lang)` |
| `'시험 날짜를 먼저 입력하세요.'` | `t('examDateRequired', lang)` |
| `'5MB 이하 이미지만...'` | `t('photoSizeLimit', lang)` |
| `'업로드 실패: '` | `t('uploadFail', lang)` |
| `'사진 URL 저장 실패: '` | `t('uploadFail', lang)` |
| `'학생 정보를 찾을 수 없습니다.'` | `t('noStudentInfo', lang)` |
| 차트 버튼 텍스트 3개 | `chartTrend`, `chartRadar`, `chartAiLabel` |
| `'업로드 중...'` | `t('uploading', lang)` |
| 폼 버튼 텍스트 4개 | `cancel`, `saving`, `save`, `saveComplete` |
| `'수정'`, `'삭제'` | `t('editBtn', lang)`, `t('deleteBtn', lang)` |

---

## 3. 에러 처리 설계

### 3-1. handlePhotoUpload 개선

`app/students/[id]/page.tsx` — `handlePhotoUpload` 함수.

기존 누락: Storage 업로드 성공 후 DB `update` 실패 시 에러를 무시하고 반환.

개선 패턴:
```typescript
// Storage 업로드 에러
const { error: upErr } = await supabase.storage...upload(...)
if (upErr) {
  alert(t('uploadFail', lang) + upErr.message)
  setPhotoUploading(false)
  return
}

// DB update 에러 (신규 추가)
const { error: dbErr } = await supabase
  .from('students')
  .update({ photo_url: url })
  .eq('id', id)
if (dbErr) {
  alert(t('uploadFail', lang) + dbErr.message)
  setPhotoUploading(false)
  return
}
```

에러 발생 시: 사용자 알림 → `setPhotoUploading(false)` → `return` (상태 일관성 유지).

---

## 4. TypeScript 타입 개선 설계

### 4-1. `as any` 제거 대상 및 교체 패턴

| 파일 | 기존 | 개선 |
|------|------|------|
| `app/students/page.tsx` | `(s.agency as any)?.agency_name_vn` | `s.agency?.agency_name_vn` |
| `app/students/page.tsx` | `(s as any).parent_name_vn` 등 | `s.parent_name_vn` (직접 접근) |
| `app/reports/page.tsx` | `r.agency as any` | `Array.isArray(r.agency) ? r.agency[0] : r.agency` |
| `app/portal/page.tsx` | `(student.agency as any)?.agency_name_vn` | `student.agency?.agency_name_vn` |
| `app/api/student-documents/[id]/route.ts` | `doc_type as any` | `docType as { name_kr?: string }` |

### 4-2. 범위 외 항목 (OUT OF SCOPE)

아래 파일의 `as any`는 이번 범위 외. 향후 개선 예정으로 문서화만 수행.

| 파일 | 패턴 |
|------|------|
| `app/api/add-agency-account/route.ts` | `(caller.app_metadata as any)?.role` |
| `app/api/agency-accounts/route.ts` | `(caller.app_metadata as any)?.role` |
| `app/api/reset-agency-password/route.ts` | `(caller.app_metadata as any)?.role` |
| `app/api/cron/document-alerts/route.ts` | `(doc as any).student`, `(doc as any).doc_type` |

---

## 5. 범위 외 항목 (OUT OF SCOPE)

| 항목 | 이유 |
|------|------|
| 컴포넌트 분리 (파일 크기 축소) | 기능 변경 없는 순수 분리 작업, 위험도 높음 |
| 읽기 함수(loadXxx) 에러 처리 | 빈 배열 유지로 치명적이지 않음 |
| 시험 폼 라벨 i18n (21개) | 우선순위 낮음, 다음 세션으로 이연 |
| 감사 로그 섹션 i18n (10개+) | 우선순위 낮음, 다음 세션으로 이연 |
| API 라우트 `app_metadata as any` 패턴 | 범위 외 명시 |

---

## 6. 적용 순서

```
Phase 1: lib/i18n.ts — 신규 키 6개 추가
Phase 2: app/students/[id]/page.tsx — i18n 교체 13개 + handlePhotoUpload 에러 처리
Phase 3: app/students/page.tsx — as any 6개 제거
Phase 4: app/reports/page.tsx — as any 1개 제거
Phase 5: app/portal/page.tsx — as any 1개 제거
Phase 6: app/api/student-documents/[id]/route.ts — as any 1개 제거
Phase 7: npm run build 확인
```

---

## 7. 리스크

| 리스크 | 대응 |
|--------|------|
| i18n 키 추가 시 VI 번역 누락 | KO/VI 동시 추가 필수 |
| 타입 변경으로 컴파일 오류 발생 | 수정 후 `npm run build` 확인 |
| `as any` 제거 후 런타임 동작 변화 | Supabase 조인 반환 구조 (`Array` vs `Object`) 사전 확인 |
