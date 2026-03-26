# 선생님 평가 설계 문서

**Feature**: teacher-evaluation
**Status**: 구현 완료
**컴포넌트**: `app/students/[id]/_components/EvaluationPanel.tsx`
**타입 정의**: `lib/types.ts` — `TeacherEvaluation`, `EvaluationTemplate`

---

## 1. 평가 템플릿 구조

### `evaluation_templates` 테이블

평가 항목을 동적으로 정의한다. 컴포넌트는 DB에서 가져온 템플릿 배열에 따라 폼과 목록을 렌더링한다.

```sql
evaluation_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key   TEXT NOT NULL UNIQUE,    -- 점수 맵의 키 (예: 'diligence')
  label_kr    TEXT NOT NULL,            -- 한국어 라벨 (예: '성실도')
  label_vn    TEXT,                     -- 베트남어 라벨 (선택)
  field_type  TEXT NOT NULL,            -- 'rating' | 'text' | 'boolean'
  max_value   INTEGER NOT NULL DEFAULT 5,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
)
```

### TypeScript 인터페이스

```typescript
export interface EvaluationTemplate {
  id: string
  field_key: string
  label_kr: string
  label_vn?: string
  field_type: 'rating' | 'text' | 'boolean'
  max_value: number
  is_active: boolean
  sort_order: number
}
```

### 사용 패턴

현재 구현에서는 `field_type === 'rating'` 인 템플릿만 별점 UI로 렌더링한다.

```typescript
const ratingTemplates = templates.filter(t => t.field_type === 'rating')
```

`overall_comment` 필드는 PDF 렌더링 시 `ratingTemplates`에서 제외한다:

```typescript
// LifeRecordDocument.tsx
const ratingTemplates = templates.filter(t => t.field_key !== 'overall_comment')
```

---

## 2. 별점 평가 로직 및 평균 계산

### 점수 저장 방식

각 평가 레코드의 `scores` 컬럼은 JSONB로 저장되며, `field_key → 점수` 매핑이다.

```json
{
  "diligence": 4,
  "attitude": 5,
  "participation": 3,
  "progress": 4
}
```

### 기본값 초기화

폼을 열 때 rating 타입 템플릿의 모든 키를 `0`으로 초기화한다.

```typescript
function buildDefaultScores(templates: EvaluationTemplate[]): Record<string, number> {
  return Object.fromEntries(
    templates.filter(t => t.field_type === 'rating').map(t => [t.field_key, 0])
  )
}
```

수정 시에는 기존 값에 기본값을 병합하여 누락 키를 보완한다:

```typescript
const merged = { ...buildDefaultScores(templates), ...(ev.scores as Record<string, number>) }
```

### 평균 계산

`0`인 항목(미입력)을 제외하고, 입력된 별점의 산술 평균을 소수점 첫째 자리까지 계산한다.

```typescript
function calcAvg(scores: Record<string, number | string>): number {
  const vals = Object.values(scores).map(Number).filter(n => !isNaN(n) && n > 0)
  if (!vals.length) return 0
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}
```

UI에서는 카드 우상단에 `평균 {avg}/5` 형태로 표시한다. 평균이 `0`이면 표시하지 않는다.

---

## 3. 공개(대사관 제출용)/비공개 분리

### is_public 필드

| 구분 | 설명 | UI 표시 |
|------|------|---------|
| `is_public = true` | 대사관 제출용 공개 평가 | 초록 왼쪽 테두리, `📌 공개` 배지 |
| `is_public = false` | 내부 관리용 비공개 평가 | 회색 왼쪽 테두리, `🔒 비공개` 배지 |

### overall_comment vs internal_memo

| 필드 | 공개 여부 | PDF 포함 |
|------|-----------|---------|
| `overall_comment` | 공개 (대사관 제출 포함) | 포함 |
| `internal_memo` | 비공개 (내부 관리 전용) | 제외 |

`internal_memo`는 폼에서 점선 테두리(`border-dashed`)로 시각적으로 구분하며, "대사관 제출 제외" 문구를 함께 표시한다.

### PDF 생성 규칙

```typescript
// LifeRecordDocument.tsx
const publicEvals = evaluations.filter(e => e.is_public)
```

`is_public = true` 인 평가 레코드만 PDF 섹션3에 포함한다. 각 레코드에서:
- `overall_comment` 포함
- `internal_memo` 항상 제외
- `scores` 중 값 > 0 인 항목만 점수 바로 표시

---

## 4. 역할별 작성 권한

평가자 역할(evaluator_role)은 다음 3종으로 구성한다.

| 값 | 표시명 | 설명 |
|----|--------|------|
| `teacher` | 선생님 | 일반 수업 담당 교사 |
| `manager` | 매니저 | 학사 관리 담당 |
| `director` | 원장 | 기관 대표 |

RLS 정책은 현재 구현에서 `student_id` 기반으로 agency/master 접근 권한을 검증하며, `evaluator_role` 별 추가 제한은 DB 레벨에서 적용하지 않는다. 역할 필드는 기록 목적으로 저장된다.

---

## 5. 데이터 모델

### `teacher_evaluations` 테이블

```sql
teacher_evaluations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  eval_date       DATE NOT NULL,
  eval_period     TEXT,            -- 예: '2026-02 월말평가 1차'
  evaluator_name  TEXT NOT NULL,
  evaluator_role  TEXT NOT NULL,   -- 'teacher' | 'manager' | 'director'
  scores          JSONB NOT NULL DEFAULT '{}',
  overall_comment TEXT,            -- 공개 종합 의견
  internal_memo   TEXT,            -- 비공개 내부 메모 (PDF 제외)
  is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
)
```

### TypeScript 인터페이스

```typescript
export interface TeacherEvaluation {
  id: string
  student_id: string
  eval_date: string
  eval_period?: string
  evaluator_name: string
  evaluator_role: string
  scores: Record<string, number | string>
  overall_comment?: string
  internal_memo?: string
  is_public: boolean
  created_at: string
  updated_at: string
}
```

---

## 6. CRUD API 패턴

Supabase 클라이언트를 컴포넌트에서 직접 호출한다. 별도 API Route 없음.

### 조회 (부모 컴포넌트에서 로드)

```typescript
const { data: evaluations } = await supabase
  .from('teacher_evaluations')
  .select('*')
  .eq('student_id', studentId)
  .order('eval_date', { ascending: false })

const { data: templates } = await supabase
  .from('evaluation_templates')
  .select('*')
  .eq('is_active', true)
  .order('sort_order')
```

`EvaluationPanel`은 `evaluations`와 `templates` 두 prop을 모두 받는다.

### 생성

```typescript
const payload = {
  student_id:      studentId,
  eval_date:       form.eval_date,
  eval_period:     form.eval_period || null,
  evaluator_name:  form.evaluator_name,
  evaluator_role:  form.evaluator_role,
  is_public:       form.is_public,
  scores:          form.scores,
  overall_comment: form.overall_comment || null,
  internal_memo:   form.internal_memo || null,
}
await supabase.from('teacher_evaluations').insert(payload)
```

### 수정

```typescript
await supabase.from('teacher_evaluations').update(payload).eq('id', editId)
```

### 삭제

```typescript
await supabase.from('teacher_evaluations').delete().eq('id', id)
```

저장/수정/삭제 완료 후 부모 컴포넌트의 `onRefresh()` 콜백으로 데이터를 재조회한다.

---

## 7. UI 컴포넌트 구조

```
EvaluationPanel
├── 툴바
│   └── + 평가 추가 버튼
├── 입력 폼 (showForm = true 시 렌더)
│   ├── 평가 날짜 / 평가 구분 (eval_period)
│   ├── 평가자 이름 / 역할
│   ├── 공개 여부 토글 (비공개 | 공개)
│   ├── 정량 평가 — ratingTemplates 기반 동적 렌더링
│   │   └── StarRating 컴포넌트 (field_key별, 0~max_value)
│   ├── 종합 의견 (overall_comment, 공개)
│   └── 내부 메모 (internal_memo, 비공개, 점선 테두리)
└── 평가 목록
    └── 카드 (공개: 초록, 비공개: 회색 왼쪽 테두리)
        ├── 날짜 / eval_period 배지 / 공개 배지 / 평가자명
        ├── 평균 별점 (avg > 0 시 우상단)
        ├── 항목별 별점 (StarRating readonly 모드)
        └── overall_comment (internal_memo는 목록에 표시하지 않음)
```

### StarRating 컴포넌트

`components/StarRating.tsx` 에 구현. `value`, `max`, `onChange`, `readonly`, `size` prop을 지원한다.
