-- =============================================
-- AJU E&J - Audit Logs 수정 SQL (기존 테이블 재생성)
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. 기존 audit_logs 테이블 완전 삭제 (CASCADE로 정책/인덱스 함께 제거)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 2. audit_logs 테이블 재생성 (올바른 스키마)
CREATE TABLE audit_logs (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       text,
  user_role     text,
  user_name     text,
  action        text        NOT NULL,  -- 'INSERT','UPDATE','DELETE','LOGIN','LOGOUT'
  target_table  text,
  target_id     text,
  details       jsonb,
  ip_address    text,
  created_at    timestamptz DEFAULT now()
);

-- 3. RLS 정책
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_read_audit" ON audit_logs
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role') = 'master');

-- 4. 트리거 함수 재생성
CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id   text;
  v_user_role text;
BEGIN
  BEGIN
    v_user_id   := auth.uid()::text;
    v_user_role := auth.jwt() ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_user_id   := 'system';
    v_user_role := 'system';
  END;

  INSERT INTO audit_logs (user_id, user_role, action, target_table, target_id, details)
  VALUES (
    v_user_id,
    v_user_role,
    TG_OP,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    CASE
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object(
        'name_kr', NEW.name_kr,
        'name_vn', NEW.name_vn,
        'status',  NEW.status
      )
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'changed_fields', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(row_to_json(NEW)::jsonb) AS n(key, value)
          WHERE n.value IS DISTINCT FROM (row_to_json(OLD)::jsonb -> key)
          AND key NOT IN ('updated_at')
        )
      )
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object(
        'name_kr', OLD.name_kr,
        'name_vn', OLD.name_vn
      )
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 트리거 재등록
DROP TRIGGER IF EXISTS audit_students ON students;
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_consultations ON consultations;
CREATE TRIGGER audit_consultations
  AFTER INSERT OR UPDATE OR DELETE ON consultations
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_exam_results ON exam_results;
CREATE TRIGGER audit_exam_results
  AFTER INSERT OR UPDATE OR DELETE ON exam_results
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- 6. 인덱스
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_table ON audit_logs(target_table);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id      ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action       ON audit_logs(action);

-- 7. students 테이블 ARC 컬럼 추가 (없으면)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS arc_number      text,
  ADD COLUMN IF NOT EXISTS arc_issue_date  date,
  ADD COLUMN IF NOT EXISTS arc_expiry_date date;

-- 완료 확인
SELECT
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'audit_logs' AND column_name = 'target_table') AS target_table_col_exists,
  (SELECT count(*) FROM information_schema.columns
   WHERE table_name = 'students'
   AND column_name IN ('arc_number','arc_issue_date','arc_expiry_date')) AS arc_fields_added,
  (SELECT count(*) FROM information_schema.triggers
   WHERE trigger_name IN ('audit_students','audit_consultations','audit_exam_results')) AS triggers_created;
