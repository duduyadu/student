# Design: topik-schedule-sync

## 개요
TOPIK 시험 일정 DB 관리 및 학생 상세 시험 탭에 D-day 카드, 관리자 일정 관리 UI를 제공한다.

## 구현 파일
- Supabase: `topik_schedules` 테이블 (Migration)
- `lib/types.ts` — TopikSchedule 인터페이스
- `app/students/[id]/page.tsx` — 시험 탭 D-day 카드
- `app/reports/page.tsx` — TOPIK 일정 관리 탭

## DB 스키마
```sql
CREATE TABLE topik_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round       INTEGER NOT NULL,
  exam_date   DATE NOT NULL,
  reg_start   DATE,
  reg_end     DATE,
  region      TEXT NOT NULL DEFAULT '전국',
  exam_type   TEXT NOT NULL DEFAULT 'TOPIK I',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Acceptance Criteria

| AC | 항목 | 기준 |
|----|------|------|
| AC-01 | topik_schedules 테이블 | Supabase에 생성 완료 |
| AC-02 | RLS 정책 | SELECT: authenticated, INSERT/UPDATE/DELETE: master만 |
| AC-03 | TopikSchedule 타입 | lib/types.ts에 인터페이스 정의 |
| AC-04 | 학생 상세 D-day 카드 | 시험 탭 상단에 다음 시험일 카운트다운 표시 |
| AC-05 | D-day 색상 | 7일 이내=빨강, 30일 이내=주황, 이상=파랑 |
| AC-06 | D-day 접수기간 | reg_start/reg_end 있으면 표시 |
| AC-07 | 관리자 일정 관리 탭 | reports 페이지에 TOPIK 탭 추가 (master 전용) |
| AC-08 | 일정 추가 폼 | round/exam_date/exam_type/reg_start/reg_end/region 입력 |
| AC-09 | 일정 삭제 | 삭제 버튼으로 제거 가능 |
| AC-10 | TypeScript 오류 없음 | npx tsc --noEmit 통과 |

## 관련 함수

| 위치 | 함수 | 역할 |
|------|------|------|
| student [id] page | `loadNextTopik()` | 오늘 이후 가장 가까운 시험일 조회 |
| reports page | `loadTopikList()` | 전체 일정 조회 |
| reports page | `handleTopikSave()` | 일정 추가 저장 |
| reports page | `handleTopikDelete()` | 일정 삭제 |
