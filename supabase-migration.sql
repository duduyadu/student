-- =============================================
-- AJU E&J v2 Migration
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. students 테이블 컬럼 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS photo_url     text,
  ADD COLUMN IF NOT EXISTS is_approved   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auth_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. privacy_consents 테이블 생성
CREATE TABLE IF NOT EXISTS privacy_consents (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id    uuid        REFERENCES students(id) ON DELETE CASCADE,
  consent_date  timestamptz DEFAULT now(),
  consent_type  text        DEFAULT 'signup',  -- 'signup'
  ip_address    text,
  consent_text  text,
  created_at    timestamptz DEFAULT now()
);

-- 3. RLS 정책 — privacy_consents
ALTER TABLE privacy_consents ENABLE ROW LEVEL SECURITY;

-- master 역할만 전체 조회 가능
CREATE POLICY "master_all_consents" ON privacy_consents
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'master'
    OR auth.uid() IN (
      SELECT auth_user_id FROM students WHERE id = privacy_consents.student_id
    )
  );

-- 4. Storage 버킷 생성 (SQL로도 가능)
-- Supabase 대시보드 → Storage → New Bucket 으로도 생성 가능
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS 정책
CREATE POLICY "public_read_photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'student-photos');

CREATE POLICY "auth_upload_photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "auth_update_photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'student-photos');

CREATE POLICY "auth_delete_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'student-photos');

-- 6. 기존 students RLS — auth_user_id 본인 조회 허용 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'students' AND policyname = 'student_self_read'
  ) THEN
    EXECUTE 'CREATE POLICY "student_self_read" ON students
      FOR SELECT TO authenticated
      USING (auth_user_id = auth.uid())';
  END IF;
END $$;

-- 완료 확인 쿼리
SELECT column_name FROM information_schema.columns
WHERE table_name = 'students' AND column_name IN ('photo_url','is_approved','auth_user_id');
