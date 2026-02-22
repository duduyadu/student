-- =============================================
-- AJU E&J 학생 생활기록부 + TOPIK 모의고사 연계
-- Supabase SQL Editor에서 실행하세요
-- 생성일: 2026-02-22
-- =============================================

-- 1. consultations 테이블 확장 (유연성: extra_data JSONB)
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS is_public        boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS topic_category   text,
  ADD COLUMN IF NOT EXISTS counselor_name   text,
  ADD COLUMN IF NOT EXISTS counselor_role   text,
  ADD COLUMN IF NOT EXISTS aspiration_univ  text,
  ADD COLUMN IF NOT EXISTS aspiration_major text,
  ADD COLUMN IF NOT EXISTS extra_data       jsonb    DEFAULT '{}';

-- 2. 선생님 평가 테이블 (scores JSONB로 동적 항목 지원)
CREATE TABLE IF NOT EXISTS teacher_evaluations (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  eval_date       date        NOT NULL,
  eval_period     text,
  evaluator_name  text        NOT NULL,
  evaluator_role  text        DEFAULT 'teacher',
  scores          jsonb       DEFAULT '{}',
  overall_comment text,
  internal_memo   text,
  is_public       boolean     DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 자동 updated_at 트리거
CREATE OR REPLACE FUNCTION update_teacher_eval_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teacher_eval_updated ON teacher_evaluations;
CREATE TRIGGER teacher_eval_updated
  BEFORE UPDATE ON teacher_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_teacher_eval_timestamp();

-- 3. 평가 항목 템플릿 (새 항목 추가 시 INSERT만 하면 됨 - 코드 변경 불필요)
CREATE TABLE IF NOT EXISTS evaluation_templates (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key   text        UNIQUE NOT NULL,
  label_kr    text        NOT NULL,
  label_vn    text,
  field_type  text        DEFAULT 'rating',
  max_value   int         DEFAULT 5,
  is_active   boolean     DEFAULT true,
  sort_order  int         DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO evaluation_templates (field_key, label_kr, label_vn, sort_order)
VALUES
  ('attendance',        '출석 성실도',      'Chuyên cần',          1),
  ('korean_progress',   '한국어 습득 속도', 'Tiến độ tiếng Hàn',   2),
  ('class_engagement',  '수업 참여도',      'Tham gia lớp học',    3),
  ('attitude',          '학습 태도',        'Thái độ học tập',     4)
ON CONFLICT (field_key) DO NOTHING;

-- 4. 희망 대학 변경 이력
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

-- 5. exam_results 확장 (모의고사 누적)
ALTER TABLE exam_results
  ADD COLUMN IF NOT EXISTS exam_source    text    DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS round_number   int,
  ADD COLUMN IF NOT EXISTS section_scores jsonb   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_analysis    text,
  ADD COLUMN IF NOT EXISTS pdf_url        text,
  ADD COLUMN IF NOT EXISTS extra_data     jsonb   DEFAULT '{}';

-- 6. RLS 정책 적용

-- teacher_evaluations
ALTER TABLE teacher_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eval_master_all" ON teacher_evaluations;
CREATE POLICY "eval_master_all" ON teacher_evaluations
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'master');

DROP POLICY IF EXISTS "eval_agency_own" ON teacher_evaluations;
CREATE POLICY "eval_agency_own" ON teacher_evaluations
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
  );

-- evaluation_templates
ALTER TABLE evaluation_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tmpl_read_all" ON evaluation_templates;
CREATE POLICY "tmpl_read_all" ON evaluation_templates
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "tmpl_write_master" ON evaluation_templates;
CREATE POLICY "tmpl_write_master" ON evaluation_templates
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'master');

-- aspiration_history
ALTER TABLE aspiration_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asp_master_all" ON aspiration_history;
CREATE POLICY "asp_master_all" ON aspiration_history
  FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'master');

DROP POLICY IF EXISTS "asp_agency_own" ON aspiration_history;
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

-- 완료 확인
SELECT
  (SELECT COUNT(*) FROM evaluation_templates) AS template_count,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'consultations' AND column_name = 'is_public') AS consult_is_public,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'exam_results' AND column_name = 'exam_source') AS exam_source_added;
