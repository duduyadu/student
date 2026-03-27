# 쿼리 성능 개선 Design

**Feature**: performance-query-fix
**Phase**: Design
**Created**: 2026-03-27

---

## 1. PDF 일괄 — Promise.all 병렬화

```typescript
// Before: 순차 for...of (50명 × 6쿼리 = 최대 300 순차 실행)
for (const studentId of allowedIds) {
  const data = await fetchStudentData(supabase, studentId)
  ...
}

// After: Promise.all 병렬 (모든 학생 데이터 동시 조회)
const allStudentData = await Promise.all(
  allowedIds.map(id => fetchStudentData(supabase, id))
)
for (const { student, consultations, evaluations, examResults, aspirationHistory, templates } of allStudentData) {
  if (!student) continue
  ...
}
```

---

## 2. 대시보드 — 병렬 쿼리

```typescript
// Before: 순차 실행
const { data } = await supabase.from('exam_results')...
// ... 클라이언트 처리 후 ...
const { data: students } = await supabase.from('students')...

// After: Promise.all 병렬
const [{ data }, { data: students }] = await Promise.all([
  supabase.from('exam_results')
    .select('student_id, level, exam_date')
    .order('exam_date', { ascending: false }),
  supabase.from('students')
    .select('id').eq('is_active', true),
])
```

---

## 3. visa-alerts Cron — 사전 일괄 조회

```typescript
// Before: 루프 내 개별 조회
for (const student of students) {
  const { data: existing } = await supabaseAdmin
    .from('visa_alert_logs').select('id')
    .eq('student_id', student.id)
    .eq('days_before', daysLeft)
    .eq('year', currentYear)
    .maybeSingle()
  if (existing) continue
}

// After: 루프 전 일괄 조회
const targetStudents = students.filter(s => [7, 30, 90].includes(
  Math.ceil((new Date(s.visa_expiry).getTime() - today.getTime()) / 86400000)
))
const { data: sentLogs } = await supabaseAdmin
  .from('visa_alert_logs')
  .select('student_id, days_before')
  .in('student_id', targetStudents.map(s => s.id))
  .eq('year', currentYear)
const sentSet = new Set((sentLogs ?? []).map(l => `${l.student_id}-${l.days_before}`))

for (const student of students) {
  if (sentSet.has(`${student.id}-${daysLeft}`)) continue
  ...
}
```

---

## 4. document-alerts Cron — 사전 일괄 조회

```typescript
// Before: alreadySent() 루프 내 반복 호출 (DB 쿼리)

// After: 루프 전 오늘 발송 이력 전체 조회
const today = new Date().toISOString().split('T')[0]
const { data: todayLogs } = await supabaseAdmin
  .from('document_alert_logs')
  .select('student_id, alert_type, doc_type_id')
  .gte('sent_at', `${today}T00:00:00Z`)

const sentMissing = new Set((todayLogs ?? [])
  .filter(l => l.alert_type === 'missing')
  .map(l => l.student_id))
const sentExpiry = new Set((todayLogs ?? [])
  .filter(l => l.alert_type === 'expiry_warning')
  .map(l => `${l.student_id}-${l.doc_type_id}`))

// 루프 내 체크
if (sentMissing.has(student.id)) continue
if (sentExpiry.has(`${student.id}-${doc.doc_type_id}`)) continue
```

---

## 5. 완료 기준

- [ ] PDF 일괄: Promise.all 병렬 처리
- [ ] 대시보드: 두 쿼리 동시 실행
- [ ] visa-alerts: 루프 전 일괄 조회
- [ ] document-alerts: 루프 전 일괄 조회, alreadySent() 함수 제거 또는 미사용
- [ ] TypeScript 오류 0개
