# 희망 대학 변경 이력 설계 문서

**Feature**: aspiration-history
**Status**: 구현 완료
**컴포넌트**: `app/students/[id]/_components/AspirationTracker.tsx`
**타입 정의**: `lib/types.ts` — `AspirationHistory`

---

## 1. 개요

학생의 희망 대학/학과가 변경될 때마다 이력을 기록한다. 타임라인 형태로 시각화하여 목표 변화 추이를 파악할 수 있다. 생활기록부 PDF 섹션5에 전체 이력이 표 형태로 포함된다.

### 상담 기록의 희망 대학 스냅샷과의 차이

| 구분 | aspiration_history | consultations.aspiration_univ/major |
|------|-------------------|--------------------------------------|
| 목적 | 공식 목표 변경 이력 관리 | 상담 시점 맥락 기록 |
| 기록 주체 | 명시적으로 이력 추가 | 상담 기록 작성 시 선택 입력 |
| PDF 섹션 | 섹션5 (목표 대학 변경 이력) | 섹션2 (상담 기록) 내 배지 |

---

## 2. 데이터 모델

### `aspiration_history` 테이블

```sql
aspiration_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  changed_date DATE NOT NULL,          -- 변경 일자
  university   TEXT,                   -- 희망 대학명
  major        TEXT,                   -- 희망 학과명
  reason       TEXT,                   -- 변경 사유
  recorded_by  TEXT,                   -- 기록자 (선택)
  extra_data   JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
)
```

### TypeScript 인터페이스

```typescript
export interface AspirationHistory {
  id: string
  student_id: string
  changed_date: string
  university?: string
  major?: string
  reason?: string
  recorded_by?: string
  extra_data: Record<string, unknown>
  created_at: string
}
```

---

## 3. 최신 항목 하이라이트 로직

부모 컴포넌트에서 `changed_date` 내림차순으로 정렬하여 전달한다. 컴포넌트 내부에서는 배열의 `idx === 0` 인 항목이 최신 이력이다.

### 시각적 구분

| 항목 | 타임라인 점 | 배지 |
|------|------------|------|
| 최신 (`idx === 0`) | 인디고 채움 (`bg-indigo-600 border-indigo-600`) | `최신` 배지 (`bg-indigo-100 text-indigo-600`) |
| 이전 (`idx > 0`) | 흰 배경 인디고 테두리 (`bg-white border-indigo-300`) | 없음 |

```tsx
// AspirationTracker.tsx
<div className={`absolute left-0 top-3 w-5 h-5 rounded-full border-2 ...
  ${idx === 0 ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-indigo-300'}`}>
  <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-white' : 'bg-indigo-300'}`} />
</div>

{idx === 0 && (
  <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">최신</span>
)}
```

### 세로 연결선

항목이 2개 이상일 때만 세로 인디고 연결선(`bg-indigo-100`)을 렌더링한다.

```tsx
{aspirations.length > 1 && (
  <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-indigo-100" />
)}
```

---

## 4. CRUD API 패턴

Supabase 클라이언트를 컴포넌트에서 직접 호출한다. 별도 API Route 없음.

### 조회 (부모 컴포넌트에서 로드)

```typescript
const { data, error } = await supabase
  .from('aspiration_history')
  .select('*')
  .eq('student_id', studentId)
  .order('changed_date', { ascending: false })
```

결과 배열을 `AspirationTracker`의 `aspirations` prop으로 전달한다.
내림차순 정렬이므로 `aspirations[0]`이 항상 최신 이력이다.

### 생성

```typescript
const payload = {
  student_id:   studentId,
  changed_date: form.changed_date,
  university:   form.university || null,
  major:        form.major || null,
  reason:       form.reason || null,
}
await supabase.from('aspiration_history').insert(payload)
```

### 수정

```typescript
await supabase.from('aspiration_history').update(payload).eq('id', editId)
```

### 삭제

```typescript
await supabase.from('aspiration_history').delete().eq('id', id)
```

저장/수정/삭제 완료 후 부모 컴포넌트의 `onRefresh()` 콜백으로 데이터를 재조회한다.

---

## 5. PDF 섹션5에서의 활용 방식

생활기록부 PDF의 섹션5 "목표 대학 변경 이력"에 전체 이력을 표 형태로 렌더링한다.

### 포함 조건

- `aspiration_history` 배열에 항목이 1개 이상 있을 때만 섹션5 자체를 렌더링한다.
- `is_public` 필드 없음. 모든 이력이 PDF에 포함된다.

```tsx
// LifeRecordDocument.tsx
{aspirationHistory.length > 0 && (
  <View style={s.section}>
    <Text style={s.sectionTitle}>{tx.section5}  ({aspirationHistory.length})</Text>
    ...
  </View>
)}
```

### PDF 표 구조

| 컬럼 | 너비 | 필드 |
|------|------|------|
| 날짜 | 20% | `changed_date` |
| 희망 대학/학과 | 45% | `university · major` (없으면 `-`) |
| 변경 사유 | 35% | `reason` (없으면 `-`) |

```tsx
{aspirationHistory.map((a, idx) => (
  <View key={a.id} style={idx % 2 === 0 ? s.aspTBody : s.aspTBodyStripe} wrap={false}>
    <Text style={[s.aspTd, { width: '20%' }]}>{a.changed_date}</Text>
    <Text style={[s.aspTd, { width: '45%' }]}>
      {[a.university, a.major].filter(Boolean).join('  ·  ') || '-'}
    </Text>
    <Text style={[s.aspTdLast, { width: '35%' }]}>{a.reason ?? '-'}</Text>
  </View>
))}
```

홀수/짝수 행을 `aspTBody` / `aspTBodyStripe` 스타일로 교차 적용하여 가독성을 높인다.

### 이중언어 섹션 제목

```typescript
// LifeRecordDocument.tsx
section5:     { ko: '5. 목표 대학 변경 이력',        vi: '5. Lịch Sử Trường Mục Tiêu' }
noAspiration: { ko: '변경 이력이 없습니다.',           vi: 'Không có lịch sử thay đổi.' }
aspDate:      { ko: '변경일',                         vi: 'Ngày' }
aspTarget:    { ko: '희망 대학 / 학과',               vi: 'Trường / Ngành' }
aspReason:    { ko: '변경 사유',                      vi: 'Lý do' }
```

---

## 6. UI 컴포넌트 구조

```
AspirationTracker
├── 헤더 (🎯 희망 대학 변경 이력 + + 이력 추가 버튼)
├── 입력 폼 (showForm = true 시 렌더, 인디고 배경)
│   ├── 변경 날짜 (필수)
│   ├── 희망 대학 / 희망 학과 (2열)
│   └── 변경 사유
└── 이력 목록 (aspirations 배열)
    ├── 세로 연결선 (2개 이상 시)
    └── 항목 카드
        ├── 타임라인 점 (최신: 인디고 채움, 이전: 흰 배경)
        ├── 변경 날짜 + 최신 배지 (idx === 0 시)
        ├── 희망 대학 · 학과 (굵게)
        ├── 변경 사유 (있을 경우)
        └── 수정 / 삭제 버튼
```
