-- teacher_evaluations RLS 수정
DROP POLICY IF EXISTS "eval_master_all" ON teacher_evaluations;
CREATE POLICY "eval_master_all" ON teacher_evaluations
  FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'master');

DROP POLICY IF EXISTS "eval_agency_own" ON teacher_evaluations;
CREATE POLICY "eval_agency_own" ON teacher_evaluations
  FOR ALL TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
  );

-- aspiration_history RLS 수정
DROP POLICY IF EXISTS "asp_master_all" ON aspiration_history;
CREATE POLICY "asp_master_all" ON aspiration_history
  FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'master');

DROP POLICY IF EXISTS "asp_agency_own" ON aspiration_history;
CREATE POLICY "asp_agency_own" ON aspiration_history
  FOR ALL TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students WHERE agency_id = (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
  );

-- evaluation_templates RLS 수정
DROP POLICY IF EXISTS "tmpl_write_master" ON evaluation_templates;
CREATE POLICY "tmpl_write_master" ON evaluation_templates
  FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'master');

-- 확인
SELECT tablename, policyname, qual FROM pg_policies
WHERE tablename IN ('teacher_evaluations', 'evaluation_templates', 'aspiration_history')
ORDER BY tablename, policyname;
