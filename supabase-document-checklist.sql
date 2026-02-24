-- ================================================================
-- 비자 서류 체크리스트 마이그레이션
-- Feature: visa-document-checklist
-- Created: 2026-02-22
-- ================================================================

-- ----------------------------------------------------------------
-- 1. document_types (서류 유형 템플릿)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_kr     VARCHAR(100) NOT NULL,
  name_vi     VARCHAR(100) NOT NULL,
  category    VARCHAR(30)  NOT NULL
              CHECK (category IN ('identity','school','financial','health')),
  visa_types  TEXT[]       NOT NULL DEFAULT '{}',
  is_required BOOLEAN      NOT NULL DEFAULT true,
  has_expiry  BOOLEAN      NOT NULL DEFAULT false,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_types_read"  ON document_types;
DROP POLICY IF EXISTS "document_types_write" ON document_types;

-- 전체 역할 읽기 허용
CREATE POLICY "document_types_read" ON document_types
  FOR SELECT USING (true);

-- master만 쓰기
CREATE POLICY "document_types_write" ON document_types
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'master'
  );

-- ----------------------------------------------------------------
-- 2. student_documents (학생별 서류 현황)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_type_id     UUID NOT NULL REFERENCES document_types(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','submitted','reviewing','approved','rejected')),
  self_checked    BOOLEAN     NOT NULL DEFAULT false,
  self_checked_at TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  expiry_date     DATE,
  file_url        TEXT,
  file_name       VARCHAR(255),
  reviewer_id     UUID,
  reviewer_name   VARCHAR(100),
  reviewed_at     TIMESTAMPTZ,
  reject_reason   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, doc_type_id)
);

-- updated_at 자동 갱신 트리거 (이미 존재하면 재사용)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_documents_updated_at ON student_documents;
CREATE TRIGGER student_documents_updated_at
  BEFORE UPDATE ON student_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_docs_student_read"   ON student_documents;
DROP POLICY IF EXISTS "student_docs_student_update" ON student_documents;
DROP POLICY IF EXISTS "student_docs_agency_select"  ON student_documents;
DROP POLICY IF EXISTS "student_docs_agency_update"  ON student_documents;
DROP POLICY IF EXISTS "student_docs_master"         ON student_documents;

-- 학생: 본인 서류 SELECT
CREATE POLICY "student_docs_student_read" ON student_documents
  FOR SELECT USING (
    student_id = (
      SELECT id FROM students WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

-- 학생: 본인 서류 UPDATE (reviewer 컬럼 변경 불가)
CREATE POLICY "student_docs_student_update" ON student_documents
  FOR UPDATE USING (
    student_id = (
      SELECT id FROM students WHERE auth_user_id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    reviewer_id IS NOT DISTINCT FROM reviewer_id
  );

-- agency: 자기 학생 서류 SELECT
CREATE POLICY "student_docs_agency_select" ON student_documents
  FOR SELECT USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students
      WHERE agency_id = (
        SELECT id FROM agencies WHERE user_id = auth.uid() LIMIT 1
      )
    )
  );

-- agency: 자기 학생 서류 UPDATE
CREATE POLICY "student_docs_agency_update" ON student_documents
  FOR UPDATE USING (
    (auth.jwt()->'app_metadata'->>'role') = 'agency'
    AND student_id IN (
      SELECT id FROM students
      WHERE agency_id = (
        SELECT id FROM agencies WHERE user_id = auth.uid() LIMIT 1
      )
    )
  );

-- master: 전체 CRUD
CREATE POLICY "student_docs_master" ON student_documents
  FOR ALL USING (
    (auth.jwt()->'app_metadata'->>'role') = 'master'
  );

-- ----------------------------------------------------------------
-- 3. document_alert_logs (알림 발송 이력)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_alert_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_type_id  UUID REFERENCES document_types(id),
  alert_type   VARCHAR(30) NOT NULL
               CHECK (alert_type IN ('missing','expiry_warning','status_changed')),
  days_before  INT,
  channel      VARCHAR(20) NOT NULL DEFAULT 'email'
               CHECK (channel IN ('email','in_app')),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE document_alert_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_alert_logs_master_read" ON document_alert_logs;

-- master: 읽기만
CREATE POLICY "doc_alert_logs_master_read" ON document_alert_logs
  FOR SELECT USING (
    (auth.jwt()->'app_metadata'->>'role') = 'master'
  );

-- ----------------------------------------------------------------
-- 4. 초기 데이터 (서류 유형 10개)
-- ----------------------------------------------------------------
INSERT INTO document_types (name_kr, name_vi, category, visa_types, is_required, has_expiry, sort_order)
VALUES
  ('여권',               'Hộ chiếu',                     'identity',  '{}',       true,  true,  1),
  ('외국인등록증 (ARC)', 'Thẻ cư trú ngoại quốc',        'identity',  '{}',       true,  true,  2),
  ('증명사진 (3x4)',     'Ảnh thẻ (3×4)',                 'identity',  '{}',       true,  false, 3),
  ('건강진단서',         'Giấy khám sức khỏe',            'health',    '{}',       true,  true,  4),
  ('건강보험 카드',      'Thẻ bảo hiểm y tế',             'health',    '{}',       true,  true,  5),
  ('재학증명서',         'Giấy xác nhận đang học',        'school',    '{D-4}',    true,  true,  6),
  ('입학허가서',         'Thư chấp nhận nhập học',        'school',    '{D-2}',    true,  true,  7),
  ('성적증명서',         'Bảng điểm học tập',             'school',    '{D-2}',    true,  false, 8),
  ('통장 잔액증명',      'Sao kê tài khoản ngân hàng',    'financial', '{}',       true,  false, 9),
  ('보증인 서류',        'Giấy bảo lãnh',                 'financial', '{}',       false, false, 10)
ON CONFLICT DO NOTHING;
