-- =============================================
-- AJU E&J — 보안 패치: user_metadata → app_metadata
-- ⚠️  TypeScript 코드 배포 전에 먼저 실행하세요
-- Supabase SQL Editor에서 실행
-- =============================================

-- ─────────────────────────────────────────────
-- STEP 1. 기존 유저 마이그레이션
--   user_metadata의 role, agency_code를
--   app_metadata로 복사 (기존 유저 권한 유지)
-- ─────────────────────────────────────────────
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
  'role',        raw_user_meta_data->>'role',
  'agency_code', raw_user_meta_data->>'agency_code'
)
WHERE raw_user_meta_data->>'role' IS NOT NULL;

-- 확인
SELECT id, email,
  raw_app_meta_data->>'role'        AS app_role,
  raw_user_meta_data->>'role'       AS user_role,
  raw_app_meta_data->>'agency_code' AS app_agency_code
FROM auth.users
ORDER BY created_at;


-- ─────────────────────────────────────────────
-- STEP 2. students RLS 재설정
-- ─────────────────────────────────────────────
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 기존 정책 전부 삭제
DROP POLICY IF EXISTS "master_select_students"  ON students;
DROP POLICY IF EXISTS "master_insert_students"  ON students;
DROP POLICY IF EXISTS "master_update_students"  ON students;
DROP POLICY IF EXISTS "master_all_students"     ON students;
DROP POLICY IF EXISTS "agency_own_students"     ON students;
DROP POLICY IF EXISTS "student_self_read"       ON students;
DROP POLICY IF EXISTS "student_self_update"     ON students;
DROP POLICY IF EXISTS "agency_select_students"  ON students;
DROP POLICY IF EXISTS "agency_insert_students"  ON students;
DROP POLICY IF EXISTS "agency_update_students"  ON students;

-- master: 전체 접근
CREATE POLICY "master_all_students" ON students
  FOR ALL TO authenticated
  USING     ((auth.jwt()->'app_metadata'->>'role') = 'master')
  WITH CHECK((auth.jwt()->'app_metadata'->>'role') = 'master');

-- agency: 본인 유학원 학생만
CREATE POLICY "agency_own_students" ON students
  FOR ALL TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND agency_id = (
      SELECT id FROM agencies
      WHERE agency_code = (auth.jwt()->'app_metadata'->>'agency_code')
      LIMIT 1
    )
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND agency_id = (
      SELECT id FROM agencies
      WHERE agency_code = (auth.jwt()->'app_metadata'->>'agency_code')
      LIMIT 1
    )
  );

-- student: 본인 정보만 읽기
CREATE POLICY "student_self_read" ON students
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() AND (auth.jwt()->'app_metadata'->>'role') = 'student');

-- student: 본인 정보 제한 수정 (전화번호, 비자, 주소)
CREATE POLICY "student_self_update" ON students
  FOR UPDATE TO authenticated
  USING     (auth_user_id = auth.uid() AND (auth.jwt()->'app_metadata'->>'role') = 'student')
  WITH CHECK(auth_user_id = auth.uid() AND (auth.jwt()->'app_metadata'->>'role') = 'student');


-- ─────────────────────────────────────────────
-- STEP 3. agencies RLS 재설정
-- ─────────────────────────────────────────────
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master_select_agencies" ON agencies;
DROP POLICY IF EXISTS "master_insert_agencies" ON agencies;
DROP POLICY IF EXISTS "master_update_agencies" ON agencies;
DROP POLICY IF EXISTS "master_all_agencies"    ON agencies;
DROP POLICY IF EXISTS "agency_self_read"       ON agencies;
DROP POLICY IF EXISTS "agency_select_agencies" ON agencies;

-- master: 전체 접근
CREATE POLICY "master_all_agencies" ON agencies
  FOR ALL TO authenticated
  USING     ((auth.jwt()->'app_metadata'->>'role') = 'master')
  WITH CHECK((auth.jwt()->'app_metadata'->>'role') = 'master');

-- agency: 본인 유학원 정보만 조회
CREATE POLICY "agency_self_read" ON agencies
  FOR SELECT TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND agency_code = (auth.jwt()->'app_metadata'->>'agency_code')
  );


-- ─────────────────────────────────────────────
-- STEP 4. consultations RLS 재설정
-- ─────────────────────────────────────────────
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_consultations"        ON consultations;
DROP POLICY IF EXISTS "insert_consultations"        ON consultations;
DROP POLICY IF EXISTS "master_all_consultations"    ON consultations;
DROP POLICY IF EXISTS "agency_own_consultations"    ON consultations;

CREATE POLICY "master_all_consultations" ON consultations
  FOR ALL TO authenticated
  USING     ((auth.jwt()->'app_metadata'->>'role') = 'master')
  WITH CHECK((auth.jwt()->'app_metadata'->>'role') = 'master');

CREATE POLICY "agency_own_consultations" ON consultations
  FOR ALL TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies
        WHERE agency_code = (auth.jwt()->'app_metadata'->>'agency_code')
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies
        WHERE agency_code = (auth.jwt()->'app_metadata'->>'agency_code')
        LIMIT 1
      )
    )
  );


-- ─────────────────────────────────────────────
-- STEP 5. exam_results RLS 재설정
-- ─────────────────────────────────────────────
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_exam_results"      ON exam_results;
DROP POLICY IF EXISTS "insert_exam_results"      ON exam_results;
DROP POLICY IF EXISTS "master_all_exam_results"  ON exam_results;
DROP POLICY IF EXISTS "agency_own_exam_results"  ON exam_results;

CREATE POLICY "master_all_exam_results" ON exam_results
  FOR ALL TO authenticated
  USING     ((auth.jwt()->'app_metadata'->>'role') = 'master')
  WITH CHECK((auth.jwt()->'app_metadata'->>'role') = 'master');

CREATE POLICY "agency_own_exam_results" ON exam_results
  FOR ALL TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies
        WHERE agency_code = (auth.jwt()->'app_metadata'->>'agency_code')
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies
        WHERE agency_code = (auth.jwt()->'app_metadata'->>'agency_code')
        LIMIT 1
      )
    )
  );


-- ─────────────────────────────────────────────
-- STEP 6. target_history / aspirations RLS 재설정
-- ─────────────────────────────────────────────
ALTER TABLE target_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_target_history"     ON target_history;
DROP POLICY IF EXISTS "master_all_target_history" ON target_history;
DROP POLICY IF EXISTS "agency_own_target_history" ON target_history;

CREATE POLICY "master_all_target_history" ON target_history
  FOR ALL TO authenticated
  USING     ((auth.jwt()->'app_metadata'->>'role') = 'master')
  WITH CHECK((auth.jwt()->'app_metadata'->>'role') = 'master');

CREATE POLICY "agency_own_target_history" ON target_history
  FOR ALL TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies
        WHERE agency_code = (auth.jwt()->'app_metadata'->>'agency_code')
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies
        WHERE agency_code = (auth.jwt()->'app_metadata'->>'agency_code')
        LIMIT 1
      )
    )
  );


-- ─────────────────────────────────────────────
-- STEP 7. visa_alert_logs RLS 활성화
--   서버(service_role)만 접근 — 클라이언트 완전 차단
--   service_role은 RLS를 자동 우회하므로 정책 불필요
-- ─────────────────────────────────────────────
ALTER TABLE visa_alert_logs ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = authenticated/anon 전체 차단
-- cron API(supabaseAdmin)는 service_role 사용 → 영향 없음


-- ─────────────────────────────────────────────
-- STEP 9. audit_logs RLS 재설정
-- ─────────────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs"  ON audit_logs;
DROP POLICY IF EXISTS "master_read_audit"  ON audit_logs;

CREATE POLICY "master_read_audit" ON audit_logs
  FOR SELECT TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'master');


-- ─────────────────────────────────────────────
-- STEP 10. system_config / i18n RLS 재설정
-- ─────────────────────────────────────────────
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master_write_system_config"  ON system_config;
DROP POLICY IF EXISTS "master_update_system_config" ON system_config;
DROP POLICY IF EXISTS "all_read_system_config"      ON system_config;

CREATE POLICY "all_read_system_config" ON system_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "master_write_system_config" ON system_config
  FOR INSERT TO authenticated
  WITH CHECK((auth.jwt()->'app_metadata'->>'role') = 'master');

CREATE POLICY "master_update_system_config" ON system_config
  FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'master');

ALTER TABLE i18n ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_read_i18n"   ON i18n;
DROP POLICY IF EXISTS "master_write_i18n" ON i18n;

CREATE POLICY "all_read_i18n" ON i18n
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "master_write_i18n" ON i18n
  FOR INSERT TO authenticated
  WITH CHECK((auth.jwt()->'app_metadata'->>'role') = 'master');


-- ─────────────────────────────────────────────
-- 완료 확인
-- ─────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
