-- =============================================
-- AJU E&J v3 Migration: Audit Logs + ARC Fields
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. students 테이블에 ARC(외국인등록증) 필드 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS arc_number       text,
  ADD COLUMN IF NOT EXISTS arc_issue_date   date,
  ADD COLUMN IF NOT EXISTS arc_expiry_date  date;

-- 2. audit_logs 테이블 생성
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- 3. audit_logs RLS 정책
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- master만 조회 가능
CREATE POLICY "master_read_audit" ON audit_logs
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role') = 'master');

-- 서버사이드(service role)만 INSERT 가능 — 클라이언트 직접 삽입 차단
-- API Route에서 service role key로만 삽입하므로 별도 INSERT 정책 없음
-- (service role은 RLS를 우회하므로 INSERT 가능)

-- 4. DB 트리거 함수 (INSERT/UPDATE/DELETE 자동 감사)
CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id   text;
  v_user_role text;
BEGIN
  -- JWT에서 사용자 정보 추출 (RLS 컨텍스트에서만 동작)
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

-- 5. 트리거 등록 (students)
DROP TRIGGER IF EXISTS audit_students ON students;
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- 6. 트리거 등록 (consultations)
DROP TRIGGER IF EXISTS audit_consultations ON consultations;
CREATE TRIGGER audit_consultations
  AFTER INSERT OR UPDATE OR DELETE ON consultations
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- 7. 트리거 등록 (exam_results)
DROP TRIGGER IF EXISTS audit_exam_results ON exam_results;
CREATE TRIGGER audit_exam_results
  AFTER INSERT OR UPDATE OR DELETE ON exam_results
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- 8. 인덱스 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_table ON audit_logs(target_table);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id      ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action       ON audit_logs(action);

-- 완료 확인 쿼리
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'students' AND column_name IN ('arc_number','arc_issue_date','arc_expiry_date')) AS arc_fields_added,
  (SELECT count(*) FROM information_schema.tables WHERE table_name = 'audit_logs') AS audit_logs_table,
  (SELECT count(*) FROM information_schema.triggers WHERE trigger_name IN ('audit_students','audit_consultations','audit_exam_results')) AS triggers_created;
