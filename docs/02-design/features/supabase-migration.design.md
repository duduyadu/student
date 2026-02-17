# 🎨 Supabase Migration Design

**Feature**: Supabase 백엔드 전환
**Status**: Design
**Created**: 2026-02-16
**Based on**: [supabase-migration.plan.md](../../01-plan/features/supabase-migration.plan.md)

---

## 📊 데이터베이스 스키마 설계

### 1. Core Tables

#### students (학생)
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_kr VARCHAR(100) NOT NULL,
  name_vn VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender CHAR(1) CHECK (gender IN ('M', 'F')),

  -- 연락처
  phone_kr VARCHAR(20),
  phone_vn VARCHAR(20),
  email VARCHAR(100) UNIQUE,
  home_address_vn TEXT,

  -- 학부모 정보
  parent_name_vn VARCHAR(100),
  parent_phone_vn VARCHAR(20),
  parent_economic TEXT,  -- 암호화 필요

  -- 학업 정보
  high_school_gpa DECIMAL(3,2),
  enrollment_date DATE,
  status VARCHAR(20) DEFAULT '유학전',

  -- 관계
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,

  -- 메타데이터
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 인덱스
CREATE INDEX idx_students_agency ON students(agency_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_email ON students(email);
```

#### agencies (유학원)
```sql
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_code VARCHAR(20) UNIQUE NOT NULL,
  agency_number INT UNIQUE NOT NULL,
  agency_name VARCHAR(100) NOT NULL,

  -- Supabase Auth 연동
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 메타데이터
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_agencies_code ON agencies(agency_code);
CREATE INDEX idx_agencies_user ON agencies(user_id);
```

#### consultations (상담 기록)
```sql
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  counselor_id UUID REFERENCES auth.users(id),

  consult_type VARCHAR(20),  -- '정기', '비정기', '긴급'
  summary TEXT,
  improvement TEXT,
  next_goal TEXT,

  consult_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_consultations_student ON consultations(student_id);
CREATE INDEX idx_consultations_date ON consultations(consult_date);
```

#### exam_results (시험 성적)
```sql
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  exam_date DATE NOT NULL,
  exam_type VARCHAR(20) DEFAULT 'TOPIK',

  -- 세부 점수 (선택)
  reading_score INT CHECK (reading_score >= 0 AND reading_score <= 100),
  listening_score INT CHECK (listening_score >= 0 AND listening_score <= 100),
  writing_score INT CHECK (writing_score >= 0 AND writing_score <= 100),

  -- 총점 및 등급 (필수) - 대학 지원 기준
  total_score INT NOT NULL CHECK (total_score >= 0 AND total_score <= 300),
  level VARCHAR(10) NOT NULL,  -- '1급', '2급', '3급', '4급', '5급', '6급', '불합격'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약 조건: 총점과 등급의 일관성 검증
  CONSTRAINT valid_level CHECK (
    (level = '6급' AND total_score >= 230) OR
    (level = '5급' AND total_score >= 190 AND total_score < 230) OR
    (level = '4급' AND total_score >= 150 AND total_score < 190) OR
    (level = '3급' AND total_score >= 120 AND total_score < 150) OR
    (level = '2급' AND total_score >= 80 AND total_score < 120) OR
    (level = '1급' AND total_score >= 40 AND total_score < 80) OR
    (level = '불합격' AND total_score < 40)
  )
);

-- 인덱스
CREATE INDEX idx_exam_results_student ON exam_results(student_id);
CREATE INDEX idx_exam_results_date ON exam_results(exam_date);
CREATE INDEX idx_exam_results_level ON exam_results(level);  -- 등급별 검색용

-- 코멘트
COMMENT ON TABLE exam_results IS 'TOPIK 시험 성적 관리 - 등급은 대학 지원의 핵심 기준';
COMMENT ON COLUMN exam_results.total_score IS '총점 (0-300) - 대학 지원 시 점수 순위 결정';
COMMENT ON COLUMN exam_results.level IS 'TOPIK 등급 (1급~6급) - 대학별 입학 요구 등급 기준';
```

**TOPIK 등급의 중요성**:
- **대학 지원 필수 기준**: 대학마다 TOPIK 등급 요구 (예: 서울대 6급, 연세대 5급)
- **점수도 함께 중요**: 동일 등급 내에서 점수로 우선순위 결정
- **자동 계산 로직**: 총점 입력 시 등급 자동 계산 및 검증

#### target_history (목표 대학 변경 이력)
```sql
CREATE TABLE target_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,

  target_university VARCHAR(100),
  target_major VARCHAR(100),

  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id)
);

-- 인덱스
CREATE INDEX idx_target_history_student ON target_history(student_id);
```

#### audit_logs (감사 로그)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(20),  -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
  resource_type VARCHAR(50),  -- 'students', 'agencies', ...
  resource_id UUID,

  details JSONB,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

#### system_config (시스템 설정)
```sql
CREATE TABLE system_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  value_type VARCHAR(20),  -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### i18n (다국어)
```sql
CREATE TABLE i18n (
  key VARCHAR(100),
  lang VARCHAR(5),  -- 'ko', 'vi'
  value TEXT NOT NULL,

  PRIMARY KEY (key, lang)
);

-- 인덱스
CREATE INDEX idx_i18n_lang ON i18n(lang);
```

---

### 2. Row Level Security (RLS) 정책

#### students 테이블 RLS
```sql
-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy 1: 유학원은 자기 학생만 조회
CREATE POLICY "agencies_view_own_students"
  ON students FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM agencies WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Master는 모든 학생 조회
CREATE POLICY "master_view_all_students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'master'
    )
  );

-- Policy 3: 유학원은 자기 학생만 수정
CREATE POLICY "agencies_update_own_students"
  ON students FOR UPDATE
  USING (
    agency_id IN (
      SELECT id FROM agencies WHERE user_id = auth.uid()
    )
  );

-- Policy 4: Master는 모든 학생 수정
CREATE POLICY "master_update_all_students"
  ON students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'master'
    )
  );

-- Policy 5: 유학원은 자기 학생만 생성
CREATE POLICY "agencies_insert_own_students"
  ON students FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT id FROM agencies WHERE user_id = auth.uid()
    )
  );

-- Policy 6: Master는 모든 학생 생성
CREATE POLICY "master_insert_all_students"
  ON students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'master'
    )
  );
```

#### consultations 테이블 RLS
```sql
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- 자기 학생의 상담 기록만 조회
CREATE POLICY "view_own_student_consultations"
  ON consultations FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE agency_id IN (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'master'
    )
  );
```

#### exam_results 테이블 RLS
```sql
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- 자기 학생의 시험 성적만 조회
CREATE POLICY "view_own_student_exams"
  ON exam_results FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students
      WHERE agency_id IN (
        SELECT id FROM agencies WHERE user_id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'master'
    )
  );
```

---

## 🔐 인증 시스템 설계

### 1. Supabase Auth 설정

#### 사용자 역할 구조
```typescript
// auth.users 테이블의 raw_user_meta_data
{
  "role": "master" | "agency" | "branch",
  "agency_code": "MASTER" | "HANOI" | "DANANG",
  "name_kr": "홍길동",
  "name_vn": "Nguyen Van A"
}
```

#### 회원가입 플로우
```typescript
// Admin만 사용자 생성 가능 (일반 회원가입 비활성화)
async function createUser(userData: CreateUserData) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,  // 이메일 인증 스킵
    user_metadata: {
      role: userData.role,
      agency_code: userData.agencyCode,
      name_kr: userData.nameKr,
      name_vn: userData.nameVn
    }
  })

  // agencies 테이블에도 레코드 생성
  if (userData.role === 'agency') {
    await supabase.from('agencies').insert({
      agency_code: userData.agencyCode,
      agency_name: userData.agencyName,
      user_id: data.user.id
    })
  }

  return data
}
```

#### 로그인 플로우
```typescript
async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error

  // JWT 토큰 자동 저장됨 (localStorage)
  // Access Token: 7일
  // Refresh Token: 30일

  return {
    user: data.user,
    session: data.session,
    role: data.user.user_metadata.role,
    agencyCode: data.user.user_metadata.agency_code
  }
}
```

#### 세션 유지
```typescript
// 자동 토큰 갱신 (Supabase SDK가 자동 처리)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('로그인 완료')
  }
  if (event === 'TOKEN_REFRESHED') {
    console.log('토큰 자동 갱신')
  }
  if (event === 'SIGNED_OUT') {
    console.log('로그아웃')
  }
})
```

---

## 🌐 API 설계

### 1. Supabase Client 설정

```typescript
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 2. Service Layer 구조

```typescript
// lib/services/studentService.ts
import { supabase } from '../supabaseClient'
import type { Student, StudentFilters } from '@/types/database'

export const studentService = {
  // 학생 목록 조회
  async getAll(filters?: StudentFilters) {
    let query = supabase
      .from('students')
      .select(`
        *,
        agency:agencies(id, agency_code, agency_name),
        consultations(count),
        exam_results(count)
      `)
      .eq('is_active', true)

    // 필터 적용
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.agencyCode) {
      query = query.eq('agency.agency_code', filters.agencyCode)
    }
    if (filters?.search) {
      query = query.or(`name_kr.ilike.%${filters.search}%,name_vn.ilike.%${filters.search}%`)
    }

    // 정렬
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // 학생 상세 조회
  async getById(id: string) {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        agency:agencies(id, agency_code, agency_name),
        consultations(*, counselor:auth.users(email)),
        exam_results(*),
        target_history(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // 학생 생성
  async create(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single()

    if (error) throw error

    // 감사 로그
    await auditService.log('CREATE', 'students', data.id)

    return data
  },

  // 학생 수정
  async update(id: string, student: Partial<Student>) {
    const { data, error } = await supabase
      .from('students')
      .update({
        ...student,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // 감사 로그
    await auditService.log('UPDATE', 'students', id)

    return data
  },

  // 학생 삭제 (Soft Delete)
  async delete(id: string) {
    const { error } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    // 감사 로그
    await auditService.log('DELETE', 'students', id)
  }
}
```

### 3. API 엔드포인트 매핑

| 기존 GAS 함수 | Supabase Query | HTTP Method |
|--------------|----------------|-------------|
| `getStudentList()` | `supabase.from('students').select()` | GET |
| `getStudentById()` | `supabase.from('students').select().eq('id')` | GET |
| `createStudent()` | `supabase.from('students').insert()` | POST |
| `updateStudent()` | `supabase.from('students').update()` | PATCH |
| `deleteStudent()` | `supabase.from('students').update({is_active: false})` | DELETE |
| `getAgencyList()` | `supabase.from('agencies').select()` | GET |
| `login()` | `supabase.auth.signInWithPassword()` | POST |
| `logout()` | `supabase.auth.signOut()` | POST |

---

## 🎨 프론트엔드 설계

### 1. 프로젝트 구조

```
project/
├── pages/                      # Next.js Pages
│   ├── _app.tsx               # Global App wrapper
│   ├── index.tsx              # Dashboard (/)
│   ├── login.tsx              # Login page (/login)
│   └── students/
│       ├── index.tsx          # Student list (/students)
│       ├── [id].tsx           # Student detail (/students/:id)
│       └── new.tsx            # Create student (/students/new)
│
├── components/                 # React Components
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── Student/
│   │   ├── StudentTable.tsx
│   │   ├── StudentForm.tsx
│   │   └── StudentCard.tsx
│   └── Common/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── Loading.tsx
│
├── lib/                        # Business Logic
│   ├── supabaseClient.ts      # Supabase client
│   ├── services/
│   │   ├── studentService.ts
│   │   ├── agencyService.ts
│   │   ├── consultService.ts
│   │   └── auditService.ts
│   └── hooks/
│       ├── useAuth.ts
│       ├── useStudents.ts
│       └── useI18n.ts
│
├── types/                      # TypeScript Types
│   ├── database.ts
│   └── api.ts
│
├── styles/                     # Styles
│   └── globals.css
│
└── public/                     # Static files
    └── images/
```

### 2. 핵심 컴포넌트 설계

#### Login Page
```typescript
// pages/login.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      router.push('/')
    } catch (error) {
      alert('로그인 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
```

#### Student List Page
```typescript
// pages/students/index.tsx
import { useEffect, useState } from 'react'
import { studentService } from '@/lib/services/studentService'
import StudentTable from '@/components/Student/StudentTable'
import Layout from '@/components/Layout'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const data = await studentService.getAll()
      setStudents(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <h1>학생 목록</h1>
      {loading ? (
        <p>로딩 중...</p>
      ) : (
        <StudentTable students={students} onRefresh={loadStudents} />
      )}
    </Layout>
  )
}
```

---

## 📦 데이터 마이그레이션 전략

### 1. 데이터 추출 (GAS)

```javascript
// GAS에서 실행
function exportAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  const data = {
    agencies: exportSheet(ss.getSheetByName('Agencies')),
    students: exportSheet(ss.getSheetByName('Students')),
    consultations: exportSheet(ss.getSheetByName('Consultations')),
    examResults: exportSheet(ss.getSheetByName('ExamResults')),
    targetHistory: exportSheet(ss.getSheetByName('TargetHistory')),
    systemConfig: exportSheet(ss.getSheetByName('SystemConfig')),
    i18n: exportSheet(ss.getSheetByName('i18n'))
  }

  const json = JSON.stringify(data, null, 2)
  DriveApp.createFile('migration-data.json', json)
  Logger.log('✅ Export complete: migration-data.json')
}

function exportSheet(sheet) {
  const values = sheet.getDataRange().getValues()
  const headers = values[0]
  return values.slice(1).map(row => {
    const obj = {}
    headers.forEach((header, i) => obj[header] = row[i])
    return obj
  })
}
```

### 2. 데이터 변환 및 Import (Node.js)

```typescript
// scripts/migrate-data.ts
import { supabase } from '@/lib/supabaseClient'
import migrationData from './migration-data.json'

async function migrate() {
  console.log('🚀 Starting migration...')

  // 1. Agencies
  const agencyMap = new Map()
  for (const agency of migrationData.agencies) {
    const { data } = await supabase
      .from('agencies')
      .insert({
        agency_code: agency.AgencyCode,
        agency_number: agency.AgencyNumber,
        agency_name: agency.AgencyName,
        is_active: agency.IsActive === 'TRUE'
      })
      .select()
      .single()

    agencyMap.set(agency.AgencyCode, data.id)
  }

  // 2. Students
  const studentMap = new Map()
  for (const student of migrationData.students) {
    const { data } = await supabase
      .from('students')
      .insert({
        name_kr: student.NameKR,
        name_vn: student.NameVN,
        dob: student.DOB,
        gender: student.Gender,
        agency_id: agencyMap.get(student.AgencyCode),
        phone_kr: student.PhoneKR,
        phone_vn: student.PhoneVN,
        email: student.Email,
        parent_name_vn: student.ParentNameVN,
        parent_phone_vn: student.ParentPhoneVN,
        high_school_gpa: parseFloat(student.HighSchoolGPA) || null,
        enrollment_date: student.EnrollmentDate,
        status: student.Status,
        is_active: student.IsActive === 'TRUE'
      })
      .select()
      .single()

    // SmartID → UUID 매핑 저장
    studentMap.set(student.StudentID, data.id)
  }

  // 3. Consultations, ExamResults, ...

  console.log('✅ Migration complete!')
}

migrate()
```

---

## 🚀 배포 전략

### 1. Vercel 배포 설정

```yaml
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### 2. 환경 변수

```env
# .env.local (개발)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Vercel (프로덕션)
# Vercel Dashboard → Settings → Environment Variables
```

---

## ✅ 구현 체크리스트

### Phase 1-2: 데이터베이스
- [ ] Supabase 프로젝트 생성
- [ ] 8개 테이블 생성
- [ ] RLS 정책 설정
- [ ] 인덱스 생성

### Phase 3: 인증
- [ ] Supabase Auth 설정
- [ ] 사용자 마이그레이션
- [ ] 로그인 페이지 구현

### Phase 4: API
- [ ] Service 레이어 작성
- [ ] studentService
- [ ] agencyService
- [ ] consultService
- [ ] examService
- [ ] auditService

### Phase 5: 데이터
- [ ] GAS 데이터 추출
- [ ] 데이터 변환 스크립트
- [ ] PostgreSQL Import
- [ ] 데이터 검증

### Phase 6: 프론트엔드
- [ ] Login 페이지
- [ ] Dashboard 페이지
- [ ] Student List 페이지
- [ ] Student Form 페이지

### Phase 7: 배포
- [ ] Vercel 배포
- [ ] 환경 변수 설정
- [ ] 프로덕션 테스트

---

**다음 단계**: 문서 정리 후 구현 시작!
