-- ============================================================
-- AJU E&J 베트남 유학생 관리 시스템
-- Supabase PostgreSQL Schema v3.0
-- 실행: Supabase Dashboard → SQL Editor → New Query → 붙여넣기 → Run
-- ============================================================

-- 1. Extension 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. 테이블 생성 (FK 의존성 순서대로)
-- ============================================================

-- 2-1. agencies (유학원) - students보다 먼저 생성
CREATE TABLE IF NOT EXISTS agencies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_code       VARCHAR(20)  UNIQUE NOT NULL,   -- 'HANOI', 'DANANG'
  agency_number     INT          UNIQUE NOT NULL,   -- 1, 2, 3 ...
  agency_name_kr    VARCHAR(100) NOT NULL,
  agency_name_vn    VARCHAR(100),
  contact_person    VARCHAR(100),
  contact_phone     VARCHAR(30),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agencies_code   ON agencies(agency_code);
CREATE INDEX IF NOT EXISTS idx_agencies_user   ON agencies(user_id);

-- 2-2. students (학생)
CREATE TABLE IF NOT EXISTS students (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 기본 정보
  name_kr              VARCHAR(100) NOT NULL,
  name_vn              VARCHAR(100) NOT NULL,
  dob                  DATE         NOT NULL,
  gender               CHAR(1)      CHECK (gender IN ('M', 'F')),

  -- 연락처
  phone_kr             VARCHAR(20),
  phone_vn             VARCHAR(20),
  email                VARCHAR(100) UNIQUE,
  address_kr           TEXT,
  home_address_vn      TEXT,

  -- 학부모 정보
  parent_name_vn       VARCHAR(100),
  parent_phone_vn      VARCHAR(20),
  parent_economic      TEXT,   -- pgcrypto로 암호화

  -- 학업 정보
  high_school_name     VARCHAR(200),
  high_school_gpa      DECIMAL(4,2),
  enrollment_date      DATE,
  target_university    VARCHAR(100),
  target_major         VARCHAR(100),

  -- 비자/체류
  visa_type            VARCHAR(20),
  visa_expiry          DATE,
  arc_number           VARCHAR(30),
  sim_info             VARCHAR(100),

  -- 상태
  status               VARCHAR(20) DEFAULT '유학전',
  preferred_lang       VARCHAR(5)  DEFAULT 'vi',
  notes                TEXT,

  -- 관계
  agency_id            UUID REFERENCES agencies(id) ON DELETE SET NULL,

  -- 메타데이터
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_by           UUID REFERENCES auth.users(id),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  is_active            BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_students_agency  ON students(agency_id);
CREATE INDEX IF NOT EXISTS idx_students_status  ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_email   ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_name_kr ON students(name_kr);

-- 2-3. consultations (상담 기록)
CREATE TABLE IF NOT EXISTS consultations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     UUID REFERENCES students(id) ON DELETE CASCADE,
  counselor_id   UUID REFERENCES auth.users(id),

  consult_type   VARCHAR(20),  -- '정기', '비정기', '긴급'
  summary        TEXT,
  improvement    TEXT,
  next_goal      TEXT,
  private_notes  TEXT,         -- Master/Agency만 접근

  consult_date   DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_student ON consultations(student_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date    ON consultations(consult_date);

-- 2-4. exam_results (TOPIK 시험 성적)
CREATE TABLE IF NOT EXISTS exam_results (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID REFERENCES students(id) ON DELETE CASCADE,

  exam_date        DATE NOT NULL,
  exam_type        VARCHAR(20) DEFAULT 'TOPIK',

  reading_score    INT CHECK (reading_score  >= 0 AND reading_score  <= 100),
  listening_score  INT CHECK (listening_score >= 0 AND listening_score <= 100),
  writing_score    INT CHECK (writing_score  >= 0 AND writing_score  <= 100),

  total_score      INT NOT NULL CHECK (total_score >= 0 AND total_score <= 300),
  level            VARCHAR(10) NOT NULL,

  created_at       TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_topik_level CHECK (
    (level = '6급'   AND total_score >= 230) OR
    (level = '5급'   AND total_score >= 190 AND total_score < 230) OR
    (level = '4급'   AND total_score >= 150 AND total_score < 190) OR
    (level = '3급'   AND total_score >= 120 AND total_score < 150) OR
    (level = '2급'   AND total_score >= 80  AND total_score < 120) OR
    (level = '1급'   AND total_score >= 40  AND total_score < 80)  OR
    (level = '불합격' AND total_score < 40)
  )
);

CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_date    ON exam_results(exam_date);
CREATE INDEX IF NOT EXISTS idx_exam_results_level   ON exam_results(level);

COMMENT ON TABLE  exam_results IS 'TOPIK 시험 성적 - 등급은 대학 지원의 핵심 기준';
COMMENT ON COLUMN exam_results.level IS '1급~6급, 불합격';

-- 2-5. target_history (목표 대학 변경 이력)
CREATE TABLE IF NOT EXISTS target_history (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id          UUID REFERENCES students(id) ON DELETE CASCADE,
  target_university   VARCHAR(100),
  target_major        VARCHAR(100),
  changed_at          TIMESTAMPTZ DEFAULT NOW(),
  changed_by          UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_target_history_student ON target_history(student_id);

-- 2-6. audit_logs (감사 로그)
CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES auth.users(id),
  action         VARCHAR(20),   -- 'CREATE','READ','UPDATE','DELETE','LOGIN','LOGOUT'
  resource_type  VARCHAR(50),   -- 'students','agencies','consultations'...
  resource_id    UUID,
  details        JSONB,
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user     ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created  ON audit_logs(created_at);

-- 2-7. system_config (시스템 설정)
CREATE TABLE IF NOT EXISTS system_config (
  key          VARCHAR(100) PRIMARY KEY,
  value        TEXT,
  value_type   VARCHAR(20),   -- 'string','number','boolean','json'
  description  TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2-8. i18n (다국어 사전)
CREATE TABLE IF NOT EXISTS i18n (
  key    VARCHAR(100),
  lang   VARCHAR(5),   -- 'ko', 'vi'
  value  TEXT NOT NULL,
  PRIMARY KEY (key, lang)
);

CREATE INDEX IF NOT EXISTS idx_i18n_lang ON i18n(lang);

-- ============================================================
-- 3. updated_at 자동 갱신 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. Row Level Security (RLS)
-- ============================================================

ALTER TABLE students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE i18n           ENABLE ROW LEVEL SECURITY;

-- ── students RLS ──────────────────────────────────────────

-- Master: 전체 조회
CREATE POLICY "master_select_students" ON students FOR SELECT
  USING (auth.jwt()->>'role' = 'master' OR (auth.jwt()->'user_metadata'->>'role') = 'master');

-- Agency: 자기 학생만 조회
CREATE POLICY "agency_select_own_students" ON students FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM agencies WHERE user_id = auth.uid()
    )
  );

-- Master: 전체 INSERT
CREATE POLICY "master_insert_students" ON students FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'master' OR (auth.jwt()->'user_metadata'->>'role') = 'master');

-- Agency: 자기 소속 학생만 INSERT
CREATE POLICY "agency_insert_own_students" ON students FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT id FROM agencies WHERE user_id = auth.uid()
    )
  );

-- Master: 전체 UPDATE
CREATE POLICY "master_update_students" ON students FOR UPDATE
  USING (auth.jwt()->>'role' = 'master' OR (auth.jwt()->'user_metadata'->>'role') = 'master');

-- Agency: 자기 학생만 UPDATE
CREATE POLICY "agency_update_own_students" ON students FOR UPDATE
  USING (
    agency_id IN (
      SELECT id FROM agencies WHERE user_id = auth.uid()
    )
  );

-- ── agencies RLS ─────────────────────────────────────────

-- Master: 전체 조회
CREATE POLICY "master_select_agencies" ON agencies FOR SELECT
  USING (auth.jwt()->>'role' = 'master' OR (auth.jwt()->'user_metadata'->>'role') = 'master');

-- Agency: 본인 정보만 조회
CREATE POLICY "agency_select_self" ON agencies FOR SELECT
  USING (user_id = auth.uid());

-- Master: 전체 INSERT/UPDATE
CREATE POLICY "master_insert_agencies" ON agencies FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'master' OR (auth.jwt()->'user_metadata'->>'role') = 'master');

CREATE POLICY "master_update_agencies" ON agencies FOR UPDATE
  USING (auth.jwt()->>'role' = 'master' OR (auth.jwt()->'user_metadata'->>'role') = 'master');

-- ── consultations RLS ─────────────────────────────────────

CREATE POLICY "select_consultations" ON consultations FOR SELECT
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'master'
    OR student_id IN (
      SELECT id FROM students WHERE agency_id IN (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "insert_consultations" ON consultations FOR INSERT
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'master'
    OR student_id IN (
      SELECT id FROM students WHERE agency_id IN (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
  );

-- ── exam_results RLS ──────────────────────────────────────

CREATE POLICY "select_exam_results" ON exam_results FOR SELECT
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'master'
    OR student_id IN (
      SELECT id FROM students WHERE agency_id IN (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "insert_exam_results" ON exam_results FOR INSERT
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role') = 'master'
    OR student_id IN (
      SELECT id FROM students WHERE agency_id IN (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
  );

-- ── target_history RLS ────────────────────────────────────

CREATE POLICY "select_target_history" ON target_history FOR SELECT
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'master'
    OR student_id IN (
      SELECT id FROM students WHERE agency_id IN (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
  );

-- ── audit_logs RLS ────────────────────────────────────────

-- Master만 전체 조회, 일반 사용자는 본인 로그만
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  USING (
    (auth.jwt()->'user_metadata'->>'role') = 'master'
    OR user_id = auth.uid()
  );

-- 모든 인증 사용자 INSERT 가능 (서비스에서 자동 기록)
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── system_config RLS ─────────────────────────────────────

-- 전체 읽기 허용 (i18n 처럼 공개 설정)
CREATE POLICY "all_read_system_config" ON system_config FOR SELECT
  USING (true);

-- Master만 수정
CREATE POLICY "master_write_system_config" ON system_config FOR INSERT
  WITH CHECK ((auth.jwt()->'user_metadata'->>'role') = 'master');

CREATE POLICY "master_update_system_config" ON system_config FOR UPDATE
  USING ((auth.jwt()->'user_metadata'->>'role') = 'master');

-- ── i18n RLS ──────────────────────────────────────────────

-- 전체 읽기 허용 (UI 텍스트는 공개)
CREATE POLICY "all_read_i18n" ON i18n FOR SELECT
  USING (true);

-- Master만 수정
CREATE POLICY "master_write_i18n" ON i18n FOR INSERT
  WITH CHECK ((auth.jwt()->'user_metadata'->>'role') = 'master');

-- ============================================================
-- 5. 기본 데이터 입력
-- ============================================================

-- system_config 기본값
INSERT INTO system_config (key, value, value_type, description) VALUES
  ('site_name_kr',                  'AJU E&J 학생관리',     'string',  '사이트명 (한국어)'),
  ('site_name_vn',                  'Quan ly sinh vien AJU E&J', 'string', '사이트명 (베트남어)'),
  ('copyright_kr',                  'ⓒ 2026 AJU E&J. All rights reserved.', 'string', '저작권'),
  ('privacy_notice_interval_days',  '180',  'number', '개인정보 알림 주기 (일)'),
  ('consent_expiry_days',           '365',  'number', '동의 유효기간 (일)'),
  ('max_login_attempts',            '5',    'number', '최대 로그인 시도 횟수')
ON CONFLICT (key) DO NOTHING;

-- i18n 기본 한국어/베트남어 데이터
INSERT INTO i18n (key, lang, value) VALUES
  -- 버튼
  ('btn_login',           'ko', '로그인'),
  ('btn_login',           'vi', 'Dang nhap'),
  ('btn_logout',          'ko', '로그아웃'),
  ('btn_logout',          'vi', 'Dang xuat'),
  ('btn_save',            'ko', '저장'),
  ('btn_save',            'vi', 'Luu'),
  ('btn_cancel',          'ko', '취소'),
  ('btn_cancel',          'vi', 'Huy'),
  ('btn_add_student',     'ko', '학생 추가'),
  ('btn_add_student',     'vi', 'Them sinh vien'),
  ('btn_search',          'ko', '검색'),
  ('btn_search',          'vi', 'Tim kiem'),
  -- 네비게이션
  ('nav_dashboard',       'ko', '대시보드'),
  ('nav_dashboard',       'vi', 'Tong quan'),
  ('nav_students',        'ko', '학생 관리'),
  ('nav_students',        'vi', 'Quan ly sinh vien'),
  ('nav_agencies',        'ko', '유학원 관리'),
  ('nav_agencies',        'vi', 'Quan ly trung tam'),
  ('nav_settings',        'ko', '설정'),
  ('nav_settings',        'vi', 'Cai dat'),
  -- 라벨
  ('label_name_kr',       'ko', '한국 이름'),
  ('label_name_kr',       'vi', 'Ten Han Quoc'),
  ('label_name_vn',       'ko', '베트남 이름'),
  ('label_name_vn',       'vi', 'Ten Viet Nam'),
  ('label_dob',           'ko', '생년월일'),
  ('label_dob',           'vi', 'Ngay sinh'),
  ('label_email',         'ko', '이메일'),
  ('label_email',         'vi', 'Email'),
  ('label_phone',         'ko', '연락처'),
  ('label_phone',         'vi', 'So dien thoai'),
  ('label_status',        'ko', '상태'),
  ('label_status',        'vi', 'Trang thai'),
  ('label_agency',        'ko', '유학원'),
  ('label_agency',        'vi', 'Trung tam'),
  -- 메시지
  ('msg_save_success',    'ko', '저장되었습니다.'),
  ('msg_save_success',    'vi', 'Da luu thanh cong.'),
  ('msg_delete_confirm',  'ko', '정말 삭제하시겠습니까?'),
  ('msg_delete_confirm',  'vi', 'Ban co chac chan muon xoa?'),
  -- 에러
  ('err_required',        'ko', '필수 입력 항목입니다.'),
  ('err_required',        'vi', 'Truong nay la bat buoc.'),
  ('err_login_fail',      'ko', '이메일 또는 비밀번호가 올바르지 않습니다.'),
  ('err_login_fail',      'vi', 'Email hoac mat khau khong dung.'),
  ('err_permission',      'ko', '권한이 없습니다.'),
  ('err_permission',      'vi', 'Ban khong co quyen truy cap.')
ON CONFLICT (key, lang) DO NOTHING;

-- ============================================================
-- 완료
-- ============================================================
-- 테이블 생성 확인:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
