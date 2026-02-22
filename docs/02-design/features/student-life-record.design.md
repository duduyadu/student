# Design: 학생 생활기록부 + TOPIK 모의고사 연계

**Feature**: `student-life-record`
**Created**: 2026-02-22
**Status**: Design
**Ref Plan**: `docs/01-plan/features/student-life-record.plan.md`

---

## 1. 아키텍처 개요

```
app/students/[id]/
├── page.tsx                  ← 기존 파일 (탭 구조 확장)
│     tabs: info | consult | exam | evaluation | consent
│
├── _components/              ← 이 페이지 전용 컴포넌트
│   ├── ConsultTimeline.tsx   ← 상담 타임라인
│   ├── ConsultForm.tsx       ← 상담 입력 폼 (확장)
│   ├── EvaluationPanel.tsx   ← 선생님 평가
│   ├── AspirationTracker.tsx ← 희망 대학 이력
│   ├── ExamScorePanel.tsx    ← 시험 성적 + 차트
│   └── PdfExportButton.tsx   ← PDF 생성 버튼

app/api/
├── life-record-pdf/route.ts  ← PDF 생성 API
├── mock-exam-import/route.ts ← 모의고사 Excel 업로드 API
└── evaluation-templates/route.ts ← 평가 항목 목록 API

components/
├── StarRating.tsx            ← 별점 입력 공통 컴포넌트
├── TimelineDot.tsx           ← 타임라인 점 컴포넌트
└── ExamChart.tsx             ← 차트 (업그레이드 가능)
```

---

## 2. DB 스키마 (최종)

### 2-1. consultations 테이블 확장

```sql
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS is_public        boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS topic_category   text,
  -- 'score' | 'attitude' | 'career' | 'visa' | 'life' | 'family' | 'other'
  ADD COLUMN IF NOT EXISTS counselor_name   text,
  ADD COLUMN IF NOT EXISTS counselor_role   text,
  -- 'teacher' | 'manager' | 'director' | 'counselor'
  ADD COLUMN IF NOT EXISTS aspiration_univ  text,
  ADD COLUMN IF NOT EXISTS aspiration_major text,
  ADD COLUMN IF NOT EXISTS extra_data       jsonb    DEFAULT '{}';
```

**extra_data 예약 키 (향후 확장용)**:
```json
{
  "risk_level":      "low|medium|high",
  "embassy_note":    "대사관 제출 시 강조할 내용",
  "follow_up_date":  "YYYY-MM-DD",
  "intervention":    "개입 방법 메모",
  "parent_informed": true
}
```

### 2-2. teacher_evaluations (신규)

```sql
CREATE TABLE IF NOT EXISTS teacher_evaluations (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  eval_date       date        NOT NULL,
  eval_period     text,
  -- 예: '2026-01 월말평가 1차', '2026-02 심층인터뷰'
  evaluator_name  text        NOT NULL,
  evaluator_role  text        DEFAULT 'teacher',
  scores          jsonb       DEFAULT '{}',
  -- { "attendance": 4, "korean_progress": 5, ... }
  overall_comment text,
  internal_memo   text,        -- 비공개 내부 메모
  is_public       boolean     DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_teacher_eval_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_eval_updated
  BEFORE UPDATE ON teacher_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_teacher_eval_timestamp();
```

### 2-3. evaluation_templates (신규 - 동적 항목 관리)

```sql
CREATE TABLE IF NOT EXISTS evaluation_templates (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key   text    UNIQUE NOT NULL,
  label_kr    text    NOT NULL,
  label_vn    text,
  field_type  text    DEFAULT 'rating',  -- 'rating' | 'text' | 'boolean'
  max_value   int     DEFAULT 5,
  is_active   boolean DEFAULT true,
  sort_order  int     DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- 기본 항목 (새 항목은 INSERT만 하면 자동 반영)
INSERT INTO evaluation_templates
  (field_key, label_kr, label_vn, sort_order)
VALUES
  ('attendance',        '출석 성실도',      'Chuyên cần',         1),
  ('korean_progress',   '한국어 습득 속도', 'Tiến độ tiếng Hàn',  2),
  ('class_engagement',  '수업 참여도',      'Tham gia lớp học',   3),
  ('attitude',          '학습 태도',        'Thái độ học tập',    4),
  ('overall_comment',   '종합 의견',        'Nhận xét tổng thể',  5)
ON CONFLICT (field_key) DO NOTHING;
```

### 2-4. aspiration_history (신규)

```sql
CREATE TABLE IF NOT EXISTS aspiration_history (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  changed_date date        NOT NULL DEFAULT CURRENT_DATE,
  university   text,
  major        text,
  reason       text,
  recorded_by  uuid        REFERENCES auth.users(id),
  extra_data   jsonb       DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);
```

### 2-5. exam_results 확장

```sql
ALTER TABLE exam_results
  ADD COLUMN IF NOT EXISTS exam_source    text    DEFAULT 'manual',
  -- 'manual' | 'mock' | 'official' | 'topik-app'
  ADD COLUMN IF NOT EXISTS round_number   int,
  ADD COLUMN IF NOT EXISTS section_scores jsonb   DEFAULT '{}',
  -- { "vocabulary": 45, "grammar": 32, "reading": 65, "listening": 78 }
  ADD COLUMN IF NOT EXISTS ai_analysis    text,
  ADD COLUMN IF NOT EXISTS pdf_url        text,
  ADD COLUMN IF NOT EXISTS extra_data     jsonb   DEFAULT '{}';
```

### 2-6. RLS 정책

```sql
-- teacher_evaluations: master 전체, agency 자기 학생만
ALTER TABLE teacher_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eval_master_all" ON teacher_evaluations
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'master');

CREATE POLICY "eval_agency_own" ON teacher_evaluations
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students
      WHERE agency_id = (
        SELECT id FROM agencies
        WHERE user_id = auth.uid()
      )
    )
  );

-- evaluation_templates: 모든 인증 사용자 읽기, master만 쓰기
ALTER TABLE evaluation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tmpl_read_all" ON evaluation_templates
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "tmpl_write_master" ON evaluation_templates
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'master');

-- aspiration_history: teacher_evaluations와 동일 패턴
ALTER TABLE aspiration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asp_master_all" ON aspiration_history
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'master');

CREATE POLICY "asp_agency_own" ON aspiration_history
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
  );
```

---

## 3. TypeScript 타입 정의

```typescript
// lib/types.ts 에 추가

// consultations 확장
export interface Consultation {
  id: string
  student_id: string
  consult_date: string
  consult_type?: string
  summary?: string
  improvement?: string
  next_goal?: string
  // 신규 필드
  is_public: boolean
  topic_category?: 'score' | 'attitude' | 'career' | 'visa' | 'life' | 'family' | 'other'
  counselor_name?: string
  counselor_role?: 'teacher' | 'manager' | 'director' | 'counselor'
  aspiration_univ?: string
  aspiration_major?: string
  extra_data: Record<string, unknown>
  created_at: string
}

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

export interface TeacherEvaluation {
  id: string
  student_id: string
  eval_date: string
  eval_period?: string
  evaluator_name: string
  evaluator_role: string
  scores: Record<string, number | string>  // JSONB: 동적 구조
  overall_comment?: string
  internal_memo?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

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

// exam_results 확장
export interface ExamResult {
  id: string
  student_id: string
  exam_date: string
  exam_type: string
  reading_score?: number
  listening_score?: number
  writing_score?: number
  total_score: number
  level: string
  // 신규 필드
  exam_source: 'manual' | 'mock' | 'official' | 'topik-app'
  round_number?: number
  section_scores: Record<string, number>
  ai_analysis?: string
  pdf_url?: string
  extra_data: Record<string, unknown>
  created_at: string
}

// PDF 생성용
export interface LifeRecordPdfData {
  student: Student
  consultations: Consultation[]        // is_public=true 만
  evaluations: TeacherEvaluation[]     // is_public=true 만
  aspirationHistory: AspirationHistory[]
  examResults: ExamResult[]
  generatedAt: string
  stampImageUrl?: string
}
```

---

## 4. UI 설계

### 4-1. 학생 상세 탭 구조 (page.tsx 확장)

```
┌──────────────────────────────────────────────────────┐
│  [기본정보] [상담히스토리] [시험성적] [선생님평가] [동의서]  │
└──────────────────────────────────────────────────────┘
                  ↑ 탭 2개 추가: '선생님평가' 탭
                    '상담히스토리' 탭명 변경 (기존: '상담')
```

### 4-2. 상담 히스토리 탭 - 타임라인 UI

```
┌────────────────────────────────────────────────────┐
│  상담 히스토리                    [+ 상담 추가]      │
│  ○ 공개만 보기  ● 전체 보기                         │
├────────────────────────────────────────────────────┤
│                                                    │
│  ●─── 2026.02.20 (목)  [진로]  👤 이영희 선생님    │
│  │    📌 공개                                      │
│  │    희망대학: A대학 무역학과                      │
│  │    상담 내용: 무역학과 진학 목표 구체화...        │
│  │    개선사항: 영어 성적 향상 필요                  │
│  │    다음목표: 3월 내 토익 응시                    │
│  │                              [수정] [삭제]       │
│  │                                                  │
│  ●─── 2026.01.15 (수)  [성적]  👤 김철수 선생님    │
│  │    🔒 비공개                                     │
│  │    (내부 코멘트: 가정 형편 어려움, 주의 요망)     │
│  │                              [수정] [삭제]       │
│  │                                                  │
│  ●─── 2025.12.10 (화)  [정기]  👤 홍길동 선생님    │
│       📌 공개                                      │
│       희망대학 변경: 서울 소재 대학 → A대학 경영학과 │
│                              [수정] [삭제]          │
└────────────────────────────────────────────────────┘
```

**토글 배지 디자인**:
- `📌 공개` → 초록 배지 (대사관 제출 포함)
- `🔒 비공개` → 회색 배지 (내부용)

**주제 카테고리 색상**:
- `[성적]` → 파랑
- `[태도]` → 주황
- `[진로]` → 보라
- `[비자]` → 빨강
- `[생활]` → 초록
- `[가정]` → 갈색

### 4-3. 상담 입력 폼 (확장)

```
┌────────────────────────────────────────────────────┐
│  새 상담 기록                                       │
├────────────────────────────────────────────────────┤
│  날짜 [2026-02-22]   상담자 [이영희___]             │
│  역할 [선생님 ▼]     주제  [진로 ▼]                │
├────────────────────────────────────────────────────┤
│  공개 여부                                         │
│  ○ 비공개 (내부용)  ● 공개 (대사관 제출 포함)       │
├────────────────────────────────────────────────────┤
│  희망대학 스냅샷 (이 상담 시점)                     │
│  대학 [A대학_______]  학과 [무역학과_____]          │
├────────────────────────────────────────────────────┤
│  상담 내용 [________________________]              │
│  개선사항  [________________________]              │
│  다음 목표 [________________________]              │
├────────────────────────────────────────────────────┤
│                        [취소]  [저장]              │
└────────────────────────────────────────────────────┘
```

### 4-4. 선생님 평가 탭

```
┌────────────────────────────────────────────────────┐
│  선생님 평가                   [+ 평가 추가]        │
├────────────────────────────────────────────────────┤
│  ● 2026-02 월말평가 1차   이영희 선생님  📌 공개   │
│  ┌──────────────────────────────────────────────┐  │
│  │ 출석 성실도       ★★★★☆  (4/5)            │  │
│  │ 한국어 습득 속도  ★★★★★  (5/5)            │  │
│  │ 수업 참여도       ★★★☆☆  (3/5)            │  │
│  │ 학습 태도         ★★★★☆  (4/5)            │  │
│  │ 평균              ★★★★☆  (4.0/5)          │  │
│  ├──────────────────────────────────────────────┤  │
│  │ 종합 의견: 전반적으로 성실하며 한국어 습득이   │  │
│  │ 빠릅니다. 수업 참여도 향상이 필요합니다.       │  │
│  └──────────────────────────────────────────────┘  │
│                              [수정] [삭제]          │
└────────────────────────────────────────────────────┘
```

### 4-5. 시험 성적 탭 - 차트 (업그레이드 가능 구조)

```
[Level 1 - 현재]
┌────────────────────────────────────────────────────┐
│  TOPIK 모의고사 성적                [+ 성적 추가]  │
│                         [Excel 업로드]             │
├────────────────────────────────────────────────────┤
│  📊 성적 추이                                       │
│  200 │                           ●                │
│  150 │              ●────────────                 │
│  100 │   ●────●                                   │
│   50 │                                            │
│      └──────────────────────────────────         │
│      1회  2회  3회  4회 (Recharts LineChart)       │
├────────────────────────────────────────────────────┤
│  회차  │ 날짜       │ 듣기 │ 읽기 │ 합계 │ 등급  │
│  4회차 │ 2026.02.15 │  78  │  65  │  143 │  3급  │
│  3회차 │ 2025.12.10 │  72  │  60  │  132 │  3급  │
│  2회차 │ 2025.10.05 │  65  │  50  │  115 │  2급  │
└────────────────────────────────────────────────────┘

[Level 3 - 업그레이드 후]
┌────────────────────────────────────────────────────┐
│  영역별 분석 레이더 차트                            │
│         어휘/문법                                   │
│           ████                                    │
│       ████    ████                                │
│  읽기 ████    ████ 듣기                            │
│       ████    ████                                │
│           ████                                    │
│         쓰기                                       │
│  (Recharts RadarChart)                            │
└────────────────────────────────────────────────────┘
```

### 4-6. PDF 출력 버튼 (생활기록부 탭 상단)

```
┌────────────────────────────────────────────────────┐
│  [PDF 미리보기]  [대사관 제출용 PDF 다운로드]       │
│  공개 항목만 포함 | 생성일: 2026-02-22              │
└────────────────────────────────────────────────────┘
```

---

## 5. PDF 디자인 명세 (@react-pdf/renderer)

### 5-1. 페이지 레이아웃

```
A4 세로 (210mm × 297mm), 여백 20mm

┌─────────────────────────────────────────────┐ ← 크림색 배경 #FDFAF5
│  [로고 이미지]    AJU E&J Education Co.     │
│              학생 생활 기록부                │  ← 네이비 #1A237E, 나눔명조
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
├─────────────────────────────────────────────┤
│  기본 정보                                  │  ← 섹션 헤더: 배경 #E8EAF6
│  이름(KR): 홍길동        이름(VN): Hồng Cát │
│  생년월일: 1998.05.15    성별: 남            │
│  입학일:   2025.09.01    현재상태: 어학연수  │
│  소속유학원: AJU 1호점                       │
├─────────────────────────────────────────────┤
│  상담 이력 (공개 항목)                       │  ← 섹션 헤더
│  ●  2026.02.20  [진로]  이영희 선생님        │
│     희망대학: A대학 무역학과                 │
│     내용: 무역학과 진학 목표 구체화...       │
│                                             │
│  ●  2025.12.10  [정기]  홍길동 선생님        │
│     내용: 정기 상담, 한국 생활 적응 중...    │
├─────────────────────────────────────────────┤
│  선생님 평가 요약 (공개)                     │
│  평가일: 2026-02-01   평가자: 이영희 선생님  │
│  출석 성실도     ★★★★☆               │
│  한국어 습득     ★★★★★               │
│  수업 참여도     ★★★☆☆               │
│  종합: 전반적으로 성실하며...               │
├─────────────────────────────────────────────┤
│  TOPIK 성적 추이                             │
│  2025.10 → 2급 (115점)                      │
│  2025.12 → 3급 (132점)                      │
│  2026.02 → 3급 (143점)  ▲ 향상 중          │
├─────────────────────────────────────────────┤
│                [직인 이미지]                 │
│  발급일: 2026년 2월 22일                    │
│  발급기관: AJU E&J Education Co., Ltd.      │
└─────────────────────────────────────────────┘
```

### 5-2. 색상 팔레트 (공식 문서 스타일)

```typescript
const PDF_COLORS = {
  background:    '#FDFAF5',   // 크림 배경
  headerBg:      '#E8EAF6',   // 섹션 헤더 배경 (연한 인디고)
  navyText:      '#1A237E',   // 제목 텍스트
  bodyText:      '#212121',   // 본문 텍스트
  mutedText:     '#757575',   // 보조 텍스트
  borderColor:   '#C5CAE9',   // 구분선
  publicBadge:   '#388E3C',   // 공개 배지 초록
  accentLine:    '#3949AB',   // 타임라인 점 색상
}
```

---

## 6. API 설계

### 6-1. GET /api/life-record-pdf?studentId=xxx

```typescript
// 공개 데이터만 조회 후 PDF 반환
Response: application/pdf (Buffer)

처리 흐름:
1. studentId로 학생 기본정보 조회
2. consultations WHERE is_public=true 조회
3. teacher_evaluations WHERE is_public=true 조회
4. aspiration_history 전체 조회 (공개/비공개 없음)
5. exam_results 조회
6. @react-pdf/renderer로 PDF 생성
7. Buffer 반환
```

### 6-2. POST /api/mock-exam-import

```typescript
// 모의고사 Excel 업로드 → exam_results 일괄 저장
Request: FormData { file: Excel, studentId: string, examDate: string, roundNumber: number }

처리 흐름:
1. xlsx 파싱 (이미 패키지 설치됨)
2. 학생 성적 추출 (듣기/읽기/영역별)
3. exam_results INSERT (exam_source='mock')
4. 성공 응답

Excel 형식 (TOPIK 프로그램 출력 형식 호환):
| 학생코드 | 이름 | 듣기 | 읽기 | 합계 | 등급 |
```

### 6-3. GET /api/evaluation-templates

```typescript
// 활성화된 평가 항목 목록 반환
Response: EvaluationTemplate[]

// 새 항목 추가 시 이 API만 호출하면 프론트 자동 반영
// 코드 변경 없음 - DB INSERT만으로 확장
```

---

## 7. 컴포넌트 상세 설계

### 7-1. ConsultTimeline.tsx

```typescript
interface Props {
  consultations: Consultation[]
  userRole: UserRole
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

// 기능:
// - 공개/전체 필터 토글
// - 날짜 내림차순 정렬
// - 카테고리별 색상 배지
// - 공개/비공개 배지
// - 희망대학 스냅샷 표시
// - 100개 이상 시 가상화 (기본 20개 표시 + 더보기)
```

### 7-2. EvaluationPanel.tsx

```typescript
interface Props {
  evaluations: TeacherEvaluation[]
  templates: EvaluationTemplate[]  // DB에서 동적 로드
  studentId: string
  userRole: UserRole
}

// 기능:
// - 템플릿 기반 동적 렌더링 (templates 배열 순회)
// - 별점 표시 (StarRating 공통 컴포넌트)
// - 평균 점수 계산 및 표시
// - 평가 이력 목록
```

### 7-3. ExamChart.tsx (업그레이드 가능 구조)

```typescript
// chartLevel prop으로 단계별 차트 선택
type ChartLevel = 'basic' | 'trend' | 'radar' | 'ai'

interface Props {
  exams: ExamResult[]
  chartLevel?: ChartLevel  // 기본값: 'trend'
}

// Level별 렌더링:
// 'basic'  → 성적 카드 목록 (recharts 불필요)
// 'trend'  → LineChart (recharts)
// 'radar'  → RadarChart (recharts)
// 'ai'     → trend + radar + AI 코멘트

// recharts는 클라이언트 컴포넌트 - dynamic import 사용
// const LineChart = dynamic(() => import('recharts').then(m => m.LineChart))
```

---

## 8. 의존성 추가

```bash
# Sprint 1: 차트
npm install recharts
npm install @types/recharts --save-dev  # 타입이 내장되어 있으므로 불필요할 수 있음

# Sprint 2: PDF
npm install @react-pdf/renderer

# (xlsx 이미 설치됨 - 모의고사 Excel 업로드에 재사용)
```

---

## 9. 구현 순서 (Sprint별)

### Sprint 1: 생활기록부 핵심 (5~7일)

```
Day 1: DB 마이그레이션
  □ Supabase SQL Editor에서 스키마 실행
  □ RLS 정책 적용
  □ evaluation_templates 기본 데이터 삽입

Day 2-3: 타입 + 컴포넌트
  □ lib/types.ts 업데이트
  □ ConsultTimeline.tsx 구현
  □ ConsultForm.tsx 확장 (공개토글, 카테고리, 상담자)

Day 4-5: 평가 시스템
  □ EvaluationPanel.tsx 구현
  □ StarRating.tsx 공통 컴포넌트
  □ /api/evaluation-templates route
  □ 선생님 평가 CRUD

Day 6-7: 탭 통합
  □ app/students/[id]/page.tsx 탭 추가
  □ AspirationTracker 연동
  □ 전체 테스트
```

### Sprint 2: PDF 출력 (3~4일)

```
Day 1: PDF 환경 설정
  □ @react-pdf/renderer 설치
  □ PDF 컬러/폰트 설정

Day 2-3: PDF 템플릿
  □ LifeRecordDocument.tsx (PDF 컴포넌트)
  □ /api/life-record-pdf route
  □ PdfExportButton.tsx

Day 4: 직인 + 테스트
  □ 직인 이미지 public/ 폴더 추가
  □ PDF 디자인 polish
```

### Sprint 3: 모의고사 연계 (3~4일)

```
Day 1: Excel 업로드
  □ /api/mock-exam-import route
  □ xlsx 파싱 로직 (TOPIK 앱 형식 호환)

Day 2: 차트 구현
  □ recharts 설치
  □ ExamChart.tsx (Level 1+2)
  □ ExamScorePanel.tsx 통합

Day 3-4: 업그레이드
  □ RadarChart (Level 3)
  □ 성적 카드 디자인 polish
```

---

## 10. 마이그레이션 SQL 파일

최종 실행 파일: `supabase-life-record.sql`

```
(위 2. DB 스키마 섹션의 모든 SQL을 하나의 파일로 합친 것)
실행 위치: Supabase Dashboard → SQL Editor
순서: consultations → teacher_evaluations → evaluation_templates
      → aspiration_history → exam_results 확장
```
