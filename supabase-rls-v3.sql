-- =============================================
-- AJU E&J v3 — RLS 보안 정비
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- ─────────────────────────────────────────
-- 1. students 테이블 RLS 강화
--    (기존 student_self_read 외에 master/agency 정책 추가)
-- ─────────────────────────────────────────

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- master: 전체 읽기/쓰기
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='master_all_students') THEN
    EXECUTE $p$
      CREATE POLICY "master_all_students" ON students
        FOR ALL TO authenticated
        USING  ((auth.jwt() ->> 'role') = 'master')
        WITH CHECK ((auth.jwt() ->> 'role') = 'master')
    $p$;
  END IF;
END $$;

-- agency: 본인 유학원 학생만 읽기/쓰기
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='agency_own_students') THEN
    EXECUTE $p$
      CREATE POLICY "agency_own_students" ON students
        FOR ALL TO authenticated
        USING (
          (auth.jwt() ->> 'role') = 'agency'
          AND agency_id = (
            SELECT id FROM agencies
            WHERE agency_code = (auth.jwt() ->> 'agency_code')
            LIMIT 1
          )
        )
        WITH CHECK (
          (auth.jwt() ->> 'role') = 'agency'
          AND agency_id = (
            SELECT id FROM agencies
            WHERE agency_code = (auth.jwt() ->> 'agency_code')
            LIMIT 1
          )
        )
    $p$;
  END IF;
END $$;

-- student: 본인 정보만 읽기 (이미 존재하는 student_self_read 유지)
-- student 수정 허용 (전화번호, 비자, 주소만)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='students' AND policyname='student_self_update') THEN
    EXECUTE $p$
      CREATE POLICY "student_self_update" ON students
        FOR UPDATE TO authenticated
        USING  (auth_user_id = auth.uid() AND (auth.jwt() ->> 'role') = 'student')
        WITH CHECK (auth_user_id = auth.uid() AND (auth.jwt() ->> 'role') = 'student')
    $p$;
  END IF;
END $$;


-- ─────────────────────────────────────────
-- 2. consultations 테이블 RLS 추가
-- ─────────────────────────────────────────

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- master: 전체 읽기/쓰기/삭제
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='consultations' AND policyname='master_all_consultations') THEN
    EXECUTE $p$
      CREATE POLICY "master_all_consultations" ON consultations
        FOR ALL TO authenticated
        USING  ((auth.jwt() ->> 'role') = 'master')
        WITH CHECK ((auth.jwt() ->> 'role') = 'master')
    $p$;
  END IF;
END $$;

-- agency: 본인 유학원 학생의 상담기록만
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='consultations' AND policyname='agency_own_consultations') THEN
    EXECUTE $p$
      CREATE POLICY "agency_own_consultations" ON consultations
        FOR ALL TO authenticated
        USING (
          (auth.jwt() ->> 'role') = 'agency'
          AND student_id IN (
            SELECT s.id FROM students s
            JOIN agencies a ON s.agency_id = a.id
            WHERE a.agency_code = (auth.jwt() ->> 'agency_code')
              AND s.is_active = true
          )
        )
        WITH CHECK (
          (auth.jwt() ->> 'role') = 'agency'
          AND student_id IN (
            SELECT s.id FROM students s
            JOIN agencies a ON s.agency_id = a.id
            WHERE a.agency_code = (auth.jwt() ->> 'agency_code')
              AND s.is_active = true
          )
        )
    $p$;
  END IF;
END $$;

-- student: 본인 상담기록 읽기만 (쓰기 불가)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='consultations' AND policyname='student_own_consultations') THEN
    EXECUTE $p$
      CREATE POLICY "student_own_consultations" ON consultations
        FOR SELECT TO authenticated
        USING (
          (auth.jwt() ->> 'role') = 'student'
          AND student_id IN (
            SELECT id FROM students WHERE auth_user_id = auth.uid()
          )
        )
    $p$;
  END IF;
END $$;


-- ─────────────────────────────────────────
-- 3. exam_results 테이블 RLS 추가
-- ─────────────────────────────────────────

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- master: 전체 읽기/쓰기/삭제
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exam_results' AND policyname='master_all_exam_results') THEN
    EXECUTE $p$
      CREATE POLICY "master_all_exam_results" ON exam_results
        FOR ALL TO authenticated
        USING  ((auth.jwt() ->> 'role') = 'master')
        WITH CHECK ((auth.jwt() ->> 'role') = 'master')
    $p$;
  END IF;
END $$;

-- agency: 본인 유학원 학생의 성적만
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exam_results' AND policyname='agency_own_exam_results') THEN
    EXECUTE $p$
      CREATE POLICY "agency_own_exam_results" ON exam_results
        FOR ALL TO authenticated
        USING (
          (auth.jwt() ->> 'role') = 'agency'
          AND student_id IN (
            SELECT s.id FROM students s
            JOIN agencies a ON s.agency_id = a.id
            WHERE a.agency_code = (auth.jwt() ->> 'agency_code')
              AND s.is_active = true
          )
        )
        WITH CHECK (
          (auth.jwt() ->> 'role') = 'agency'
          AND student_id IN (
            SELECT s.id FROM students s
            JOIN agencies a ON s.agency_id = a.id
            WHERE a.agency_code = (auth.jwt() ->> 'agency_code')
              AND s.is_active = true
          )
        )
    $p$;
  END IF;
END $$;

-- student: 본인 성적 읽기만
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exam_results' AND policyname='student_own_exam_results') THEN
    EXECUTE $p$
      CREATE POLICY "student_own_exam_results" ON exam_results
        FOR SELECT TO authenticated
        USING (
          (auth.jwt() ->> 'role') = 'student'
          AND student_id IN (
            SELECT id FROM students WHERE auth_user_id = auth.uid()
          )
        )
    $p$;
  END IF;
END $$;


-- ─────────────────────────────────────────
-- 4. Storage — 삭제 권한 제한
--    기존 auth_delete_photos 정책을 master 또는 본인 사진만 삭제 가능하도록 교체
-- ─────────────────────────────────────────

DROP POLICY IF EXISTS "auth_delete_photos" ON storage.objects;

CREATE POLICY "safe_delete_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND (
      (auth.jwt() ->> 'role') = 'master'
      OR (auth.jwt() ->> 'role') = 'agency'
      OR (
        (auth.jwt() ->> 'role') = 'student'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM students WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

-- 업로드/수정도 동일하게 제한 (기존 정책 교체)
DROP POLICY IF EXISTS "auth_upload_photos" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_photos" ON storage.objects;

CREATE POLICY "safe_upload_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-photos'
    AND (
      (auth.jwt() ->> 'role') IN ('master', 'agency')
      OR (
        (auth.jwt() ->> 'role') = 'student'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM students WHERE auth_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "safe_update_photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND (
      (auth.jwt() ->> 'role') IN ('master', 'agency')
      OR (
        (auth.jwt() ->> 'role') = 'student'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM students WHERE auth_user_id = auth.uid()
        )
      )
    )
  );


-- ─────────────────────────────────────────
-- 5. 완료 확인 쿼리
-- ─────────────────────────────────────────

SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('students', 'consultations', 'exam_results')
ORDER BY tablename, policyname;
