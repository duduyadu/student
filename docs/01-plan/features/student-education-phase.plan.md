# Plan: student-education-phase

> 학생 교육 단계 분류 시스템 — 온라인/오프라인 교육 파이프라인 관리

**Feature ID**: student-education-phase  
**Created**: 2026-04-05  
**Status**: Plan  
**Priority**: High  
**Project Level**: Dynamic

---

## 1. 배경 및 목적

### 현재 상황

현재 학생 분류는 `status` 필드 하나로만 관리됨:
```
['유학전', '어학연수', '대학교', '취업']
```

이 분류는 **유학 단계**(어디에 있는가)를 나타내며,  
학생이 출국 전 **어떤 교육 과정을 거치고 있는가**는 추적하지 못함.

### 요구사항

학생 등록 후 다음 교육 파이프라인을 관리해야 함:

```
학생 등록
    ↓
온라인 교육 (비대면)
    ↓ [통과/탈락]
오프라인 교육 (대면)
    ↓ [통과/탈락]
교육 수료 → 유학 진행
```

---

## 2. 핵심 결정: 별도 필드 추가

### 왜 기존 `status`를 수정하지 않는가?

| 항목 | 기존 `status` | 새 `education_phase` |
|------|-------------|---------------------|
| 의미 | 유학 단계 (어디 있는가) | 교육 과정 (어떤 교육 중인가) |
| 대상 | 전체 학생 기간 | 주로 출국 전 단계 |
| 값 예시 | 유학전, 어학연수 | 온라인교육중, 오프라인수료 |
| 변경 시 영향 | 기존 필터/UI 전체 수정 필요 | 독립적으로 추가 가능 |

**결론**: `education_phase` 컬럼을 `students` 테이블에 추가 (기존 `status` 유지)

---

## 3. education_phase 값 정의

```
null / '미시작'     → 등록만 된 상태 (기본값)
'온라인교육중'      → 온라인 교육 진행 중
'온라인수료'        → 온라인 교육 통과
'오프라인교육중'    → 오프라인 교육 진행 중
'오프라인수료'      → 오프라인 교육 통과 (교육 완료)
'교육중단'          → 온라인/오프라인 중 탈락 또는 자진 중단
```

### 정상 흐름
```
미시작 → 온라인교육중 → 온라인수료 → 오프라인교육중 → 오프라인수료
```

### 예외 흐름
```
온라인교육중 → 교육중단
오프라인교육중 → 교육중단
```

---

## 4. 구현 범위

### 4-1. DB 변경 (Supabase)
- `students` 테이블에 `education_phase VARCHAR(20) DEFAULT '미시작'` 컬럼 추가
- 마이그레이션 SQL 작성

### 4-2. 상수/타입 수정
- `lib/constants.ts`: `EDUCATION_PHASES` 배열 추가, 색상 맵 추가
- `lib/types.ts`: `EducationPhase` 타입, `Student` 인터페이스에 필드 추가

### 4-3. UI - 학생 목록 (`/students`)
- **필터 추가**: education_phase 드롭다운 필터
- **컬럼 추가**: 학생 테이블에 "교육단계" 컬럼 표시 (뱃지)
- **통계 카드**: 교육 단계별 학생 수 현황 (선택)

### 4-4. UI - 학생 상세 (`/students/[id]`)
- **기본정보 탭**: education_phase 표시 및 변경 UI (드롭다운)
- 변경 시 감사 로그 기록

### 4-5. UI - 학생 등록 (`/students/new`, `/register`)
- 신규 등록 시 기본값 `'미시작'` 자동 설정
- 관리자 등록 폼에 선택 UI (선택)

### 4-6. 포털 (`/portal`)
- 학생 본인 화면에 현재 교육 단계 표시 (읽기 전용)

### 4-7. Excel 내보내기
- 학생 목록 Excel에 "교육단계" 컬럼 추가

---

## 5. 구현하지 않는 것 (범위 외)

- 온라인/오프라인 교육 콘텐츠 관리
- 교육 통과 기준 점수 자동 판별
- 교육 일정/캘린더 기능
- 별도 교육 이력 테이블 (단순 분류만)

---

## 6. 데이터 설계

### students 테이블 변경
```sql
ALTER TABLE students 
ADD COLUMN education_phase VARCHAR(20) DEFAULT '미시작';

-- 기존 학생 데이터 마이그레이션
UPDATE students SET education_phase = '미시작' WHERE education_phase IS NULL;
```

### 타입 정의 (TypeScript)
```typescript
export const EDUCATION_PHASES = [
  '미시작', '온라인교육중', '온라인수료', '오프라인교육중', '오프라인수료', '교육중단'
] as const
export type EducationPhase = typeof EDUCATION_PHASES[number]
```

---

## 7. 영향 받는 파일

| 파일 | 변경 내용 |
|------|---------|
| `lib/constants.ts` | EDUCATION_PHASES, EDUCATION_PHASE_COLORS 추가 |
| `lib/types.ts` | EducationPhase 타입, Student.education_phase 필드 |
| `app/students/page.tsx` | 필터 + 테이블 컬럼 추가 |
| `app/students/[id]/page.tsx` | 교육단계 표시 + 수정 UI |
| `app/students/new/page.tsx` | 기본값 처리 |
| `app/portal/page.tsx` | 교육단계 표시 (읽기전용) |
| Supabase Migration SQL | education_phase 컬럼 추가 |

---

## 8. 우선순위

| 단계 | 항목 | 우선순위 |
|------|------|---------|
| 1 | DB 마이그레이션 | 필수 |
| 2 | 상수/타입 | 필수 |
| 3 | 학생 상세 - 교육단계 변경 UI | 필수 |
| 4 | 학생 목록 - 필터/컬럼 | 높음 |
| 5 | 포털 - 교육단계 표시 | 보통 |
| 6 | Excel 내보내기 컬럼 | 낮음 |

---

## 9. 예상 공수

- DB + 타입 변경: 1시간
- 학생 상세 UI: 1시간
- 학생 목록 필터/컬럼: 1시간
- 포털/Excel: 30분
- **총합**: 약 3~4시간

---

## 관련 문서

- 기존 학생 상태: `lib/constants.ts` STUDENT_STATUSES
- 학생 타입: `lib/types.ts` Student 인터페이스
