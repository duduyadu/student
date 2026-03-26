# 상담 기록 타임라인 설계 문서

**Feature**: consultation-records
**Status**: 구현 완료
**컴포넌트**: `app/students/[id]/_components/ConsultTimeline.tsx`
**타입 정의**: `lib/types.ts` — `Consultation`, `ConsultCategory`, `CounselorRole`

---

## 1. 상담 분류 체계

### 주제 카테고리 (ConsultCategory)

| 값 | 표시명 | 색상 |
|----|--------|------|
| `score` | 성적 | 파란색 (`bg-blue-100 text-blue-700`) |
| `attitude` | 태도 | 주황색 (`bg-orange-100 text-orange-700`) |
| `career` | 진로 | 보라색 (`bg-purple-100 text-purple-700`) |
| `visa` | 비자 | 빨간색 (`bg-red-100 text-red-700`) |
| `life` | 생활 | 초록색 (`bg-green-100 text-green-700`) |
| `family` | 가정 | 황색 (`bg-amber-100 text-amber-700`) |
| `other` | 기타 | 슬레이트 (`bg-slate-100 text-slate-600`) |

### 상담자 역할 (CounselorRole)

| 값 | 표시명 |
|----|--------|
| `teacher` | 선생님 |
| `manager` | 매니저 |
| `director` | 원장 |
| `counselor` | 상담사 |

### 상담 유형 (consult_type)

자유 텍스트 필드. 기본값은 `'정기'`. 예: 긴급, 전화, 방문 등.

---

## 2. 공개/비공개 정책

상담 기록마다 `is_public: boolean` 필드로 대사관 제출 공개 여부를 개별 지정한다.

| 구분 | 설명 | UI 표시 |
|------|------|---------|
| `is_public = true` | 대사관 제출용 공개 기록 | 초록 왼쪽 테두리, 초록 점, `📌 공개` 배지 |
| `is_public = false` | 내부 관리용 비공개 기록 | 회색 왼쪽 테두리, 회색 점, `🔒 비공개` 배지 |

**PDF 생성 규칙**: `is_public = true` 인 항목만 생활기록부 PDF 섹션2에 포함된다.

```typescript
// LifeRecordDocument.tsx
const publicConsults = consultations.filter(c => c.is_public)
```

---

## 3. 데이터 모델

### `consultations` 테이블

```sql
consultations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  consult_date     DATE NOT NULL,
  consult_type     TEXT,                          -- 기본값: '정기'
  topic_category   TEXT,                          -- ConsultCategory 중 하나
  counselor_name   TEXT,
  counselor_role   TEXT,                          -- CounselorRole 중 하나
  is_public        BOOLEAN NOT NULL DEFAULT FALSE,
  aspiration_univ  TEXT,                          -- 이 시점 희망 대학 스냅샷
  aspiration_major TEXT,                          -- 이 시점 희망 학과 스냅샷
  summary          TEXT,                          -- 상담 내용
  improvement      TEXT,                          -- 개선 사항
  next_goal        TEXT,                          -- 다음 목표
  extra_data       JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
)
```

### TypeScript 인터페이스

```typescript
// lib/types.ts
export type ConsultCategory = 'score' | 'attitude' | 'career' | 'visa' | 'life' | 'family' | 'other'
export type CounselorRole   = 'teacher' | 'manager' | 'director' | 'counselor'

export interface Consultation {
  id: string
  student_id: string
  consult_type?: string
  summary?: string
  improvement?: string
  next_goal?: string
  consult_date: string
  is_public: boolean
  topic_category?: ConsultCategory
  counselor_name?: string
  counselor_role?: CounselorRole
  aspiration_univ?: string
  aspiration_major?: string
  extra_data: Record<string, unknown>
  created_at: string
}
```

---

## 4. CRUD API 패턴

Supabase 클라이언트를 컴포넌트에서 직접 호출한다. 별도 API Route 없음. RLS 정책이 권한을 자동 검증한다.

### 조회 (부모 컴포넌트에서 로드)

```typescript
const { data, error } = await supabase
  .from('consultations')
  .select('*')
  .eq('student_id', studentId)
  .order('consult_date', { ascending: false })
```

결과 배열을 `ConsultTimeline` 컴포넌트의 `consultations` prop으로 전달한다.

### 생성

```typescript
const payload = {
  student_id:      studentId,
  consult_date:    form.consult_date,
  consult_type:    form.consult_type || null,
  topic_category:  form.topic_category,
  counselor_name:  form.counselor_name || null,
  counselor_role:  form.counselor_role,
  is_public:       form.is_public,
  aspiration_univ: form.aspiration_univ || null,
  aspiration_major:form.aspiration_major || null,
  summary:         form.summary || null,
  improvement:     form.improvement || null,
  next_goal:       form.next_goal || null,
}
await supabase.from('consultations').insert(payload)
```

### 수정

```typescript
await supabase.from('consultations').update(payload).eq('id', editId)
```

### 삭제

```typescript
await supabase.from('consultations').delete().eq('id', id)
```

저장/수정/삭제 완료 후 부모 컴포넌트의 `onRefresh()` 콜백을 호출하여 데이터를 재조회한다.

---

## 5. 페이지네이션

서버 측 페이지네이션 없이 클라이언트 측 슬라이스 방식을 사용한다.

```typescript
const PAGE_SIZE = 20

// 필터 적용 후 슬라이스
const filtered = showPublicOnly
  ? consultations.filter(c => c.is_public)
  : consultations

const visible   = filtered.slice(0, visibleCount)   // 현재 표시 항목
const remaining = filtered.length - visibleCount      // 남은 항목 수
```

- 초기 표시: 최신순 20개
- "더보기" 버튼 클릭 시: `visibleCount += PAGE_SIZE`
- 필터 전환(전체 ↔ 공개만) 시: `visibleCount`를 `PAGE_SIZE`로 초기화

---

## 6. 희망 대학 스냅샷 기록

상담 기록에는 해당 상담 시점의 희망 대학/학과를 스냅샷으로 저장할 수 있다. 이는 `aspiration_history` 테이블과 독립적으로 상담 맥락을 보존하기 위한 용도이다.

- `aspiration_univ`: 상담 당시 희망 대학명 (선택 입력)
- `aspiration_major`: 상담 당시 희망 학과명 (선택 입력)

UI에서는 두 필드 중 하나라도 입력된 경우 인디고 배지로 표시한다:

```
🎯 희망: A대학교 · 무역학과
```

PDF에서도 공개 상담 기록의 희망 대학 스냅샷을 `aspBadge` 스타일로 렌더링한다.

---

## 7. PDF 생성 시 포함 규칙

생활기록부 PDF의 섹션2 "상담 기록"에는 다음 조건을 만족하는 항목만 포함한다.

| 조건 | 포함 여부 |
|------|-----------|
| `is_public = true` | 포함 |
| `is_public = false` | 제외 |

포함 필드:
- `consult_date` (날짜)
- `topic_category` (카테고리 배지, KO/VI 이중언어)
- `counselor_name` (상담자명)
- `aspiration_univ` + `aspiration_major` (희망 대학 스냅샷)
- `summary` (상담 내용)
- `improvement` (개선 사항)
- `next_goal` (다음 목표)

`is_public = false` 항목의 모든 내용은 PDF에 포함되지 않는다.

---

## 8. UI 컴포넌트 구조

```
ConsultTimeline
├── 툴바
│   ├── 필터 버튼 (전체 | 공개만)
│   └── + 상담 추가 버튼
├── 입력 폼 (showForm = true 시 렌더)
│   ├── 날짜 / 상담자 이름
│   ├── 상담자 역할 / 주제 카테고리
│   ├── 공개 여부 토글 (비공개 | 공개)
│   ├── 희망 대학 스냅샷 (선택)
│   ├── 상담 내용 (textarea)
│   └── 개선 사항 / 다음 목표
└── 타임라인 목록
    ├── 세로 연결선 (절대 위치)
    ├── 타임라인 점 (공개: 초록, 비공개: 회색)
    ├── 카드 (공개: 초록 왼쪽 테두리, 비공개: 회색 테두리)
    └── 더보기 버튼 (remaining > 0 시)
```
