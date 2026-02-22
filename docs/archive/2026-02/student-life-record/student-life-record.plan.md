# Plan: 학생 생활기록부 + TOPIK 모의고사 연계

**Feature**: `student-life-record`
**Created**: 2026-02-22
**Status**: Planning
**Priority**: High

---

## 1. 개요 및 목적

단순 메모장을 넘어 **공신력 있는 공식 문서**로서의 학생 생활기록부를 구현한다.
대사관 제출용 PDF 자동 생성 + TOPIK 모의고사 성적 연계를 통해
비자 심사 시 신뢰도를 높이는 통합 플랫폼을 구축한다.

### 핵심 원칙
- **유연성 우선**: 완성 후에도 새 항목/필드가 추가될 수 있음 → 경직된 스키마 금지
- **점진적 업그레이드**: 기능을 단계적으로 확장할 수 있는 구조
- **분리 원칙**: 내부용(비공개) vs 대사관 제출용(공개) 데이터 엄격 분리

---

## 2. 기능 요구사항

### 2-1. 상담 히스토리 (Consultation Timeline)
- [ ] 세로형 타임라인 UI (시간순 누적)
- [ ] 상담 일자, 상담자, 상담 주제 카테고리
- [ ] **공개/비공개 토글** (is_public 필드)
- [ ] **확장 가능한 메타데이터** (JSONB extra_data) - 나중에 필드 추가 시 마이그레이션 불필요
- [ ] 상담 시점 희망 대학/학과 스냅샷 저장

### 2-2. 희망 학교 트래킹 (Aspiration History)
- [ ] 상담 기록 작성 시 희망 대학/학과 드롭다운 선택
- [ ] 변경 이력 자동 생성 (1월→3월→5월 목표 구체화 흐름)
- [ ] 타임라인에서 변경 시점 시각화

### 2-3. 선생님 평가 (Teacher's Evaluation)
- [ ] 정량 지표: 출석 성실도, 한국어 습득 속도, 수업 참여도, 태도 (각 1~5점)
- [ ] 정성 평가: 자유 서술
- [ ] **평가 템플릿 시스템** - 나중에 새 평가 항목 추가 가능 (JSONB scores 활용)
- [ ] 월말 평가 1차/2차 구분

### 2-4. 대사관 제출용 PDF (Embassy Report)
- [ ] **공개(is_public=true) 데이터만** 선별 추출
- [ ] 크림색 배경, 네이비 톤 명조/고딕 혼용 공식 디자인
- [ ] 기관 직인 이미지 자동 삽입
- [ ] 학생 기본 정보 + 상담 이력 + 평가 요약 + 성적 추이

### 2-5. TOPIK 모의고사 연계 (Mock Exam Integration)
- [ ] **Phase 1**: Excel 업로드 방식 (즉시 구현 가능)
- [ ] **Phase 2**: TOPIK 프로그램 API 브릿지 연동
- [ ] 성적 누적 저장 (exam_results 테이블 확장)
- [ ] **업그레이드 가능한 차트 디자인**
  - 기본: 성적 추이 꺾은선 그래프
  - 확장: 레이더 차트(영역별), 분포 히스토그램, 반 내 순위
  - 고급: AI 분석 코멘트, 예상 등급 예측
- [ ] AI 분석 결과 저장 (TOPIK 프로그램의 Gemini 분석 결과 연계)

---

## 3. 유연성 설계 원칙 (Extensibility-First)

### 문제: 완성 후 항목이 추가되는 상황
```
전통적 방식 (나쁨):
  ALTER TABLE consultations ADD COLUMN new_field text;
  → 매번 DB 마이그레이션 필요, 위험

유연한 방식 (좋음):
  extra_data JSONB - 자유롭게 키-값 추가 가능
```

### JSONB 활용 전략
```sql
-- consultations.extra_data 예시
{
  "risk_level": "low",           -- 나중에 추가된 필드
  "embassy_note": "...",         -- 대사관 전용 메모
  "follow_up_date": "2026-03-15" -- 후속 상담 예정일
}

-- teacher_evaluations.scores 예시 (JSONB)
{
  "attendance": 4,
  "korean_progress": 5,
  "class_engagement": 3,
  "attitude": 4,
  "homework": 5         -- 나중에 추가된 항목도 자연스럽게 수용
}
```

### 평가 항목 동적 관리
- `evaluation_templates` 테이블: 어떤 평가 항목이 있는지 정의
- 새 항목 추가 시 테이블에 행 하나만 추가 (코드 변경 없음)

---

## 4. TOPIK 모의고사 디자인 업그레이드 로드맵

### Level 1 (즉시): 기본 성적 카드
```
┌─────────────────────────────┐
│  TOPIK 모의고사 성적         │
│  2026.02.15 (3회차)         │
│  듣기: 78점  읽기: 65점      │
│  총점: 143점  → 3급          │
└─────────────────────────────┘
```

### Level 2 (Sprint 2): 추이 차트
```
성적 추이 (꺾은선 그래프)
  200 ─────────────────────
  150 ──────────●────●────●
  100 ────●────
   50
      1회차  2회차  3회차  4회차
```
- Recharts 사용 (TOPIK 프로그램과 동일 라이브러리)

### Level 3 (Sprint 3): 영역별 레이더 차트
```
      어휘/문법
        ●
    /       \
읽기●         ●듣기
    \       /
      ●─────●
    쓰기   전반적
```
- RadarChart (Recharts 내장)

### Level 4 (Sprint 4): AI 분석 + 예측
- Google Gemini API 연동 (TOPIK 프로그램 ai-service.ts 재활용)
- 약점 분석, 학습 추천, 목표 등급 달성 예상 시점

---

## 5. DB 스키마 (확장성 반영)

```sql
-- ① consultations 확장
ALTER TABLE consultations
  ADD COLUMN is_public        boolean DEFAULT false,
  ADD COLUMN topic_category   text,      -- 'score'|'attitude'|'career'|'visa'|'life'
  ADD COLUMN counselor_name   text,
  ADD COLUMN counselor_role   text,      -- 'teacher'|'manager'|'director'
  ADD COLUMN aspiration_univ  text,      -- 상담 시점 스냅샷
  ADD COLUMN aspiration_major text,
  ADD COLUMN extra_data       jsonb DEFAULT '{}';  -- 확장 필드

-- ② 선생님 평가 (JSONB scores로 유연하게)
CREATE TABLE teacher_evaluations (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id     uuid REFERENCES students(id) ON DELETE CASCADE,
  eval_date      date NOT NULL,
  eval_period    text,           -- '2026-01 월말평가 1차'
  evaluator_name text NOT NULL,
  evaluator_role text,
  scores         jsonb DEFAULT '{}',   -- 유연한 점수 구조
  overall_comment text,
  internal_memo  text,           -- 내부 전용 (비공개)
  is_public      boolean DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ③ 평가 항목 템플릿 (동적 관리)
CREATE TABLE evaluation_templates (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key    text UNIQUE NOT NULL,  -- 'attendance', 'korean_progress'
  label_kr     text NOT NULL,
  label_vn     text,
  field_type   text DEFAULT 'rating', -- 'rating'|'text'|'boolean'
  max_value    int DEFAULT 5,
  is_active    boolean DEFAULT true,
  sort_order   int DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- 기본 항목 삽입
INSERT INTO evaluation_templates (field_key, label_kr, label_vn, sort_order) VALUES
  ('attendance',       '출석 성실도',      'Chuyên cần',     1),
  ('korean_progress',  '한국어 습득 속도', 'Tiến độ học',    2),
  ('class_engagement', '수업 참여도',      'Tham gia lớp',   3),
  ('attitude',         '학습 태도',        'Thái độ học tập',4);

-- ④ 희망 대학 변경 이력
CREATE TABLE aspiration_history (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   uuid REFERENCES students(id) ON DELETE CASCADE,
  changed_date date NOT NULL DEFAULT CURRENT_DATE,
  university   text,
  major        text,
  reason       text,
  recorded_by  uuid REFERENCES auth.users(id),
  extra_data   jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

-- ⑤ exam_results 확장 (모의고사 누적)
ALTER TABLE exam_results
  ADD COLUMN IF NOT EXISTS exam_source    text DEFAULT 'topik',
  ADD COLUMN IF NOT EXISTS round_number   int,
  ADD COLUMN IF NOT EXISTS section_scores jsonb DEFAULT '{}',  -- 영역별 점수
  ADD COLUMN IF NOT EXISTS ai_analysis    text,
  ADD COLUMN IF NOT EXISTS pdf_url        text,
  ADD COLUMN IF NOT EXISTS extra_data     jsonb DEFAULT '{}';
```

---

## 6. 기술 스택 결정

| 기능 | 기술 | 이유 |
|------|------|------|
| PDF 생성 | `@react-pdf/renderer` | React 컴포넌트로 PDF 설계 가능, 디자인 수정 용이 |
| 차트 | `recharts` | TOPIK 프로그램과 동일, 재사용 가능 |
| 타임라인 UI | 직접 구현 (Tailwind) | 의존성 최소화 |
| TOPIK 연계 (1단계) | Excel 업로드 | xlsx 라이브러리 활용 |
| AI 분석 | Google Gemini API | TOPIK 프로그램 `ai-service.ts` 재활용 |

---

## 7. 구현 우선순위

```
Sprint 1 (핵심 기능):
  ✅ DB 스키마 변경 (위 SQL)
  ✅ 상담 타임라인 UI (공개/비공개)
  ✅ 선생님 평가 폼 (JSONB 기반)
  ✅ 희망 대학 이력 추적

Sprint 2 (PDF 출력):
  ✅ @react-pdf/renderer 통합
  ✅ 대사관 제출용 PDF 템플릿
  ✅ 직인 이미지 삽입

Sprint 3 (모의고사 기본):
  ✅ Excel 업로드 → exam_results 저장
  ✅ 성적 카드 UI
  ✅ 기본 추이 차트 (Recharts)

Sprint 4 (모의고사 업그레이드):
  ✅ 레이더 차트 (영역별)
  ✅ AI 분석 연동
  ✅ TOPIK 앱 API 브릿지
```

---

## 8. 성공 기준

- [ ] 상담 기록 100개 이상 누적 시에도 타임라인 성능 유지 (가상화 처리)
- [ ] PDF 생성 시간 < 3초
- [ ] 새 평가 항목 추가 시 코드 변경 없이 DB만 수정으로 가능
- [ ] 모의고사 성적 Excel 업로드 → 30초 내 차트 반영
- [ ] 공개/비공개 분리 100% 보장 (RLS 정책 포함)
