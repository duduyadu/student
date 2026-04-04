# Design: student-education-phase

> 학생 교육 단계 분류 시스템 — 온라인/오프라인 교육 파이프라인 관리

**Feature ID**: student-education-phase  
**Created**: 2026-04-05  
**Status**: Design  
**Based on Plan**: `docs/01-plan/features/student-education-phase.plan.md`

---

## 1. 데이터베이스 설계

### 1-1. students 테이블 컬럼 추가

```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS education_phase VARCHAR(20) DEFAULT '미시작';

COMMENT ON COLUMN students.education_phase IS '교육단계: 미시작|온라인교육중|온라인수료|오프라인교육중|오프라인수료|교육중단';

-- 기존 학생 기본값 적용
UPDATE students 
SET education_phase = '미시작' 
WHERE education_phase IS NULL;
```

### 1-2. 값 정의

| 값 | 의미 | 다음 가능한 상태 |
|----|------|----------------|
| `미시작` | 등록만 된 상태 (기본값) | 온라인교육중 |
| `온라인교육중` | 온라인 교육 진행 중 | 온라인수료, 교육중단 |
| `온라인수료` | 온라인 교육 통과 | 오프라인교육중 |
| `오프라인교육중` | 오프라인 교육 진행 중 | 오프라인수료, 교육중단 |
| `오프라인수료` | 모든 교육 완료 | (최종) |
| `교육중단` | 탈락 또는 자진 중단 | 온라인교육중 (재수강) |

---

## 2. TypeScript 타입/상수 설계

### 2-1. `lib/constants.ts` 추가 내용

```typescript
// 기존 STUDENT_STATUSES 아래에 추가
export const EDUCATION_PHASES = [
  '미시작', '온라인교육중', '온라인수료', 
  '오프라인교육중', '오프라인수료', '교육중단'
] as const
export type EducationPhase = typeof EDUCATION_PHASES[number]

export const EDUCATION_PHASE_COLORS: Record<string, string> = {
  '미시작':       'bg-slate-100 text-slate-500',
  '온라인교육중': 'bg-blue-100 text-blue-700',
  '온라인수료':   'bg-cyan-100 text-cyan-700',
  '오프라인교육중':'bg-amber-100 text-amber-700',
  '오프라인수료': 'bg-emerald-100 text-emerald-700',
  '교육중단':     'bg-red-100 text-red-600',
}

// 교육 단계 흐름 (다음 단계 안내용)
export const EDUCATION_PHASE_FLOW: Record<string, string[]> = {
  '미시작':       ['온라인교육중'],
  '온라인교육중': ['온라인수료', '교육중단'],
  '온라인수료':   ['오프라인교육중'],
  '오프라인교육중':['오프라인수료', '교육중단'],
  '오프라인수료': [],
  '교육중단':     ['온라인교육중'],
}
```

### 2-2. `lib/types.ts` 수정 내용

```typescript
// Student 인터페이스에 추가
export interface Student {
  // ... 기존 필드들 ...
  education_phase?: string  // 교육단계 (추가)
  // ...
}
```

---

## 3. UI 설계

### 3-1. 학생 목록 페이지 (`app/students/page.tsx`)

#### 필터 추가
기존 `statusFilter` 옆에 `educationFilter` 드롭다운 추가:

```
[검색창] [유학원 ▼] [유학단계 ▼] [교육단계 ▼]  ← 추가
```

#### 필터 로직 추가
```typescript
const [educationFilter, setEducationFilter] = useState('')

const filtered = students.filter(s => {
  const matchSearch = ...
  const matchAgency = ...
  const matchStatus = ...
  const matchEducation = educationFilter === '' || s.education_phase === educationFilter  // 추가
  return matchSearch && matchAgency && matchStatus && matchEducation
})
```

#### 테이블 컬럼 추가 (데스크탑)
기존 "유학단계" 뱃지 옆에 "교육단계" 뱃지 추가:

```
이름 | 유학원 | 유학단계 뱃지 | 교육단계 뱃지 | TOPIK | ...
```

뱃지 컴포넌트:
```tsx
<span className={`text-xs px-2 py-1 rounded-full font-medium ${EDUCATION_PHASE_COLORS[s.education_phase ?? '미시작']}`}>
  {s.education_phase ?? '미시작'}
</span>
```

#### 모바일 카드
기존 상태 뱃지 아래에 교육단계 뱃지 추가.

#### Excel 내보내기
`handleExport` 함수의 rows에 추가:
```typescript
'교육단계': s.education_phase ?? '미시작',
```

---

### 3-2. 학생 상세 페이지 (`app/students/[id]/page.tsx`)

#### 기본정보 탭 - 교육단계 섹션 추가

위치: 기본정보 섹션 내 "유학단계" 필드 바로 아래

```tsx
{/* 교육단계 */}
<div className="flex items-center gap-3">
  <span className="text-sm text-slate-500 w-24 shrink-0">교육단계</span>
  {isEditing ? (
    <select
      value={editData.education_phase ?? '미시작'}
      onChange={e => setEditData(prev => ({ ...prev, education_phase: e.target.value }))}
      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
    >
      {EDUCATION_PHASES.map(phase => (
        <option key={phase} value={phase}>{phase}</option>
      ))}
    </select>
  ) : (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${EDUCATION_PHASE_COLORS[student.education_phase ?? '미시작']}`}>
      {student.education_phase ?? '미시작'}
    </span>
  )}
</div>
```

#### 수정 저장 시
기존 `handleSave` 함수의 updateData에 `education_phase` 포함:
```typescript
const updateData = {
  // ... 기존 필드들 ...
  education_phase: editData.education_phase,
}
```

---

### 3-3. 학생 포털 (`app/portal/page.tsx`)

학생 본인 화면에서 교육단계 표시 (읽기 전용):

```tsx
{/* 교육 현황 카드 */}
<div className="bg-white rounded-xl border border-slate-200 p-4">
  <h3 className="text-sm font-semibold text-slate-700 mb-3">교육 현황</h3>
  <div className="flex items-center gap-2">
    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${EDUCATION_PHASE_COLORS[student.education_phase ?? '미시작']}`}>
      {student.education_phase ?? '미시작'}
    </span>
  </div>
  {/* 진행 단계 표시 */}
  <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
    {['미시작', '온라인교육중', '온라인수료', '오프라인교육중', '오프라인수료'].map((phase, idx) => (
      <span key={phase} className={`flex items-center gap-1 ${student.education_phase === phase ? 'text-blue-600 font-semibold' : ''}`}>
        {idx > 0 && <span>→</span>}
        <span>{phase}</span>
      </span>
    ))}
  </div>
</div>
```

---

### 3-4. 학생 등록 (`app/students/new/page.tsx`)

신규 등록 시 `education_phase: '미시작'` 기본값 자동 포함 (폼에 별도 UI 불필요).

---

## 4. 감사 로그 처리

교육단계 변경 시 기존 감사 로그 패턴 그대로 사용:

```typescript
// 학생 상세 페이지 handleSave 내
await supabase.from('audit_logs').insert({
  action: 'UPDATE',
  target_table: 'students',
  target_id: student.id,
  details: { 
    field: 'education_phase',
    from: student.education_phase,
    to: editData.education_phase 
  },
  // ...
})
```

---

## 5. 구현 순서 (Do Phase 체크리스트)

### Step 1: DB 마이그레이션
- [ ] Supabase SQL Editor에서 ALTER TABLE 실행
- [ ] UPDATE로 기존 학생 기본값 설정
- [ ] Supabase Dashboard에서 컬럼 확인

### Step 2: 상수/타입 수정
- [ ] `lib/constants.ts` — EDUCATION_PHASES, EDUCATION_PHASE_COLORS, EDUCATION_PHASE_FLOW 추가
- [ ] `lib/types.ts` — Student 인터페이스에 education_phase 추가

### Step 3: 학생 상세 UI
- [ ] `app/students/[id]/page.tsx` — 교육단계 표시 + 수정 드롭다운 추가
- [ ] 저장 로직에 education_phase 포함
- [ ] 감사 로그 기록 확인

### Step 4: 학생 목록 UI
- [ ] `app/students/page.tsx` — educationFilter state 추가
- [ ] 필터 드롭다운 UI 추가
- [ ] filtered 로직에 matchEducation 추가
- [ ] 테이블/카드에 교육단계 뱃지 추가
- [ ] Excel 내보내기에 컬럼 추가

### Step 5: 포털
- [ ] `app/portal/page.tsx` — 교육 현황 카드 추가

### Step 6: 검증
- [ ] 학생 목록 필터 동작 확인
- [ ] 학생 상세 수정/저장 확인
- [ ] 포털 표시 확인
- [ ] Excel 내보내기 컬럼 확인

---

## 6. 영향 파일 최종 목록

| 파일 | 변경 유형 | 내용 |
|------|---------|------|
| Supabase (SQL) | DDL | education_phase 컬럼 추가 |
| `lib/constants.ts` | 추가 | EDUCATION_PHASES, COLORS, FLOW |
| `lib/types.ts` | 수정 | Student.education_phase 필드 |
| `app/students/page.tsx` | 수정 | 필터 + 뱃지 + Excel 컬럼 |
| `app/students/[id]/page.tsx` | 수정 | 교육단계 표시 + 편집 |
| `app/portal/page.tsx` | 수정 | 교육 현황 카드 |

---

## 7. 마이그레이션 SQL (전체)

```sql
-- 1. 컬럼 추가
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS education_phase VARCHAR(20) DEFAULT '미시작';

-- 2. 코멘트
COMMENT ON COLUMN students.education_phase IS 
  '교육단계: 미시작|온라인교육중|온라인수료|오프라인교육중|오프라인수료|교육중단';

-- 3. 기존 데이터 기본값
UPDATE students SET education_phase = '미시작' WHERE education_phase IS NULL;

-- 4. 확인
SELECT education_phase, COUNT(*) FROM students GROUP BY education_phase;
```
