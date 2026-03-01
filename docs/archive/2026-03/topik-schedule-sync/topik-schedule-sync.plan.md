# Plan: topik-schedule-sync

## 개요
TOPIK(한국어능력시험) 공식 시험 일정을 자동으로 등록하고, 학생 상세 페이지에서 다음 시험일까지 D-day 카운트다운과 시험 일정 목록을 제공한다.

## 목표
- TOPIK 시험 일정 DB 관리 (관리자 수동 등록)
- 학생 상세 페이지에 다음 시험 D-day 표시
- 시험 일정 목록 뷰 (전체 일정 캘린더)
- 시험 30일 전 알림 (기존 Cron 활용)

## 현재 상태 분석
- `exam_results` 테이블: 실제 응시 결과 저장
- 시험 일정 테이블 없음 (수동 입력만)
- 비자 알림 Cron 존재 (`/api/cron/visa-alerts`) — 패턴 재활용 가능

## 구현 범위

### P0 (필수)
1. **DB 테이블**: `topik_schedules` (시험일, 접수기간, 시험 회차, 지역)
   - Supabase Migration으로 생성
2. **관리자 시험 일정 관리** — 학생 목록 또는 리포트 페이지에 일정 관리 탭
   - 일정 추가/수정/삭제
3. **학생 상세 D-day 카드** — 다음 시험일까지 D-xx 표시 (시험 탭 상단)

### P1 (권장)
4. **시험 일정 목록 페이지** — `/students` 또는 별도 페이지
5. **30일 전 알림 Cron** — 기존 `visa-alerts` Cron 패턴 활용
6. **이중언어 지원** — KO/VI

## DB 스키마 (신규)
```sql
CREATE TABLE topik_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round       INTEGER NOT NULL,          -- 시험 회차 (예: 91)
  exam_date   DATE NOT NULL,             -- 시험일
  reg_start   DATE,                      -- 접수 시작일
  reg_end     DATE,                      -- 접수 종료일
  region      TEXT DEFAULT '전국',       -- 지역
  exam_type   TEXT DEFAULT 'TOPIK I',    -- TOPIK I / TOPIK II
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

## 관련 파일
- `app/students/[id]/page.tsx` (D-day 카드 추가)
- `app/api/cron/visa-alerts/route.ts` (Cron 패턴 참고)
- `lib/types.ts` (TopikSchedule 타입 추가)
- `vercel.json` (Cron 등록)

## 완료 기준
- [ ] `topik_schedules` 테이블 생성 (Migration)
- [ ] 관리자가 일정 추가/삭제 가능
- [ ] 학생 상세 시험 탭에 D-day 카드 표시
- [ ] TypeScript 오류 없음
