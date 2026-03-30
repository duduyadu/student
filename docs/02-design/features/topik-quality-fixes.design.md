# Design: 보안·감사·인증 이슈 수정

**Feature**: topik-quality-fixes
**Phase**: Design
**Created**: 2026-03-30
**Reference Plan**: `docs/01-plan/features/topik-quality-fixes.plan.md`

---

## 1. 개요

정적 분석(94건) 중 CRITICAL/HIGH 이슈 10건을 수정한다.
신규 기능 추가 없이 보안 취약점·누락된 감사 로그·인증 오류만 수정한다.

---

## 2. lib/auditClient.ts 설계 (신규)

### 목적
`'use client'` 컴포넌트에서 감사 로그를 기록하기 위한 헬퍼.
기존 `lib/auth.ts`의 서버 전용 감사 로그와 분리.

### 인터페이스

```typescript
// lib/auditClient.ts
export async function logAudit(params: {
  action: string          // 'CREATE' | 'UPDATE' | 'DELETE'
  targetTable?: string
  targetId?: string
  details?: Record<string, unknown>
}): Promise<void>
```

### 동작 방식

```
1. supabase.auth.getSession() → access_token 획득
2. access_token 없으면 조용히 반환 (비로그인 상태)
3. POST /api/audit { action, target_table, target_id, details }
   Authorization: Bearer {access_token}
4. 오류 발생 시 catch로 무시 (감사 실패가 메인 작업 차단 금지)
```

---

## 3. XSS 수정 설계

### 대상 파일

| 파일 | HTML 빌더 위치 |
|------|---------------|
| `lib/email.ts` | `sendDocStatusEmail()` |
| `app/api/cron/visa-alerts/route.ts` | `GET` handler |
| `app/api/cron/document-alerts/route.ts` | `GET` handler |

### escapeHtml 함수

각 파일에 동일한 헬퍼 함수 추가:

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
```

### 적용 패턴

```typescript
// 수정 전 (XSS 취약)
const html = `<p>${student.name_kr}</p>`

// 수정 후 (안전)
const safeName = escapeHtml(student.name_kr ?? '')
const html = `<p>${safeName}</p>`
```

**적용 대상 변수**: 모든 사용자 제공 문자열 (이름, 서류명, 반려 사유 등)

---

## 4. 감사 로그 설계

### 대상 컴포넌트

| 컴포넌트 | 테이블 | 작업 |
|----------|--------|------|
| `ConsultTimeline.tsx` | `consultations` | CREATE / UPDATE / DELETE |
| `EvaluationPanel.tsx` | `teacher_evaluations` | CREATE / UPDATE / DELETE |
| `AspirationTracker.tsx` | `aspiration_history` | CREATE / UPDATE / DELETE |
| `page.tsx` (exam) | `exam_results` | CREATE / UPDATE / DELETE |

### 감사 로그 + 에러 처리 패턴

```typescript
// handleSave (CREATE/UPDATE)
let savedId: string | undefined
if (editId) {
  const { error } = await supabase.from('테이블').update(payload).eq('id', editId)
  if (error) { alert('수정 실패: ' + error.message); setSaving(false); return }
  savedId = editId
} else {
  const { data, error } = await supabase.from('테이블').insert(payload).select('id').single()
  if (error) { alert('저장 실패: ' + error.message); setSaving(false); return }
  savedId = data?.id
}
await logAudit({ action: editId ? 'UPDATE' : 'CREATE', targetTable: '테이블', targetId: savedId })

// handleDelete
const { error } = await supabase.from('테이블').delete().eq('id', id)
if (error) { alert('삭제 실패: ' + error.message); return }
await logAudit({ action: 'DELETE', targetTable: '테이블', targetId: id })
```

---

## 5. 인증 헤더 수정 설계

### T-001: Excel 업로드 (CRITICAL)

**파일**: `app/students/[id]/page.tsx` — `handleExcelUpload`

**문제**: `fetch('/api/mock-exam-import', { method: 'POST', body: fd })` — Authorization 헤더 없음 → 401

**수정**:
```typescript
const { data: { session: excelSession } } = await supabase.auth.getSession()
const res = await fetch('/api/mock-exam-import', {
  method: 'POST',
  headers: excelSession ? { Authorization: `Bearer ${excelSession.access_token}` } : {},
  body: fd,
})
```

### F-010: AI 분석

**파일**: `app/students/[id]/page.tsx` — `handleAiAnalysis`

**문제**: `fetch('/api/exam-ai-analysis?studentId=${id}')` — Authorization 헤더 없음 → 401

**수정**:
```typescript
const { data: { session: aiSession } } = await supabase.auth.getSession()
const res = await fetch(`/api/exam-ai-analysis?studentId=${id}`, {
  headers: aiSession ? { Authorization: `Bearer ${aiSession.access_token}` } : {},
})
```

---

## 6. parseInt 기수 수정 설계

**파일**: `app/api/mock-exam-import/route.ts`

**문제**: `parseInt(roundNumber)` — 기수(radix) 미지정. `"08"` 같은 입력에서 8진수 해석 위험.

**수정**: `parseInt(roundNumber, 10)`

---

## 7. 적용 순서

```
1. lib/auditClient.ts 신규 생성
2. lib/email.ts — escapeHtml 추가, 파라미터 이스케이프
3. app/api/cron/visa-alerts/route.ts — escapeHtml 추가
4. app/api/cron/document-alerts/route.ts — escapeHtml 추가
5. ConsultTimeline.tsx — logAudit 임포트 + handleSave/Delete 수정
6. EvaluationPanel.tsx — logAudit 임포트 + handleSave/Delete 수정
7. AspirationTracker.tsx — logAudit 임포트 + handleSave/Delete 수정
8. app/students/[id]/page.tsx — logAudit + auth 헤더 3곳 수정
9. app/api/mock-exam-import/route.ts — parseInt radix 수정
10. npx tsc --noEmit 확인
```

---

## 8. 리스크

| 리스크 | 대응 |
|--------|------|
| 감사 로그 API 오류 시 UX 저하 | silent fail 처리 (catch 무시) |
| 세션 만료 시 fetch 401 재현 | 헤더 없으면 기존 동작과 동일 |
| INSERT 후 ID 미반환 | `.select('id').single()` 으로 확실히 수신 |
