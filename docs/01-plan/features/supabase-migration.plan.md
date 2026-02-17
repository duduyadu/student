# 📋 Supabase Migration Plan

**Feature**: Supabase 백엔드 전환
**Status**: Plan
**Created**: 2026-02-16
**Priority**: 🔴 Critical

---

## 🎯 마이그레이션 목표

### 핵심 문제 (Why)
1. **GAS 제약**: `google.script.run` 호출 제한으로 null 반환 이슈
2. **개발 복잡도**: Standalone/Container-bound 혼란
3. **성능 제한**: 6분 실행 제한, Sheets 느린 읽기/쓰기
4. **보안 취약점**: 커스텀 인증 시스템의 한계

### 목표 (What)
1. ✅ **안정적인 백엔드**: PostgreSQL + Supabase
2. ✅ **보안 강화**: Supabase Auth + RLS (Row Level Security)
3. ✅ **빠른 개발**: RESTful API 자동 생성
4. ✅ **확장성**: 실시간 기능 (~~파일 업로드는 제외 - 용량 제한~~)

### 성공 기준 (Goal)
- [ ] 모든 CRUD 작업 정상 동작
- [ ] 로그인/회원가입 보안 강화
- [ ] 기존 데이터 100% 마이그레이션
- [ ] 응답 속도 < 500ms
- [ ] 문서 정리 완료

---

## 🔄 기술 스택 변경

### Before (GAS Stack)
```yaml
Backend: Google Apps Script (JavaScript)
Database: Google Sheets (8 sheets)
Auth: Custom (SHA-256 + MASTER_SALT)
Session: CacheService (1h TTL)
API: google.script.run
```

### After (Supabase Stack)
```yaml
Backend: Supabase (PostgreSQL + PostgREST)
Database: PostgreSQL (8 tables)
Auth: Supabase Auth (JWT + Email/Password)
Session: JWT Token (7d Access + 30d Refresh)
API: RESTful API (auto-generated)
Frontend: React (Next.js) + TypeScript
```

---

## 📝 단계별 마이그레이션 계획

### Phase 1: 환경 설정 (Day 1)
**목표**: Supabase 프로젝트 생성 및 기본 설정

**작업**:
1. Supabase 프로젝트 생성
   - https://supabase.com → New Project
   - Region: Northeast Asia (Seoul)
   - Plan: Free tier
2. 로컬 개발 환경 설정
   ```bash
   npm install @supabase/supabase-js
   npm install @supabase/auth-helpers-nextjs
   ```
3. 환경 변수 설정
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   ```

**검증**:
- [ ] Supabase Dashboard 접속 가능
- [ ] 로컬에서 Supabase 연결 테스트 성공

---

### Phase 2: 데이터베이스 스키마 마이그레이션 (Day 1-2)
**목표**: Sheets → PostgreSQL 테이블 변환

#### 2.1 스키마 설계

**기존 Sheets → 새 Tables**:
| Sheet | Table | 변경 사항 |
|-------|-------|----------|
| Students | students | id (UUID), timestamps 추가 |
| Agencies | agencies | id (UUID), user_id (FK) 추가 |
| Users | - | **삭제** (Supabase Auth 사용) |
| Consultations | consultations | student_id (FK), counselor_id (FK) |
| ExamResults | exam_results | student_id (FK) |
| TargetHistory | target_history | student_id (FK) |
| AuditLogs | audit_logs | user_id (FK), resource_type |
| SystemConfig | system_config | 유지 |
| i18n | i18n | 유지 |

**핵심 변경**:
1. **Users 테이블 삭제** → Supabase Auth 사용
2. **SmartID 대신 UUID** 사용
3. **Foreign Key 관계** 명확히 정의
4. **RLS (Row Level Security)** 정책 설정

#### 2.2 SQL 마이그레이션 스크립트

```sql
-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Students 테이블
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_kr VARCHAR(100) NOT NULL,
  name_vn VARCHAR(100) NOT NULL,
  dob DATE NOT NULL,
  gender CHAR(1) CHECK (gender IN ('M', 'F')),
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  home_address_vn TEXT,
  phone_kr VARCHAR(20),
  phone_vn VARCHAR(20),
  email VARCHAR(100) UNIQUE,
  parent_name_vn VARCHAR(100),
  parent_phone_vn VARCHAR(20),
  parent_economic TEXT, -- encrypted
  high_school_gpa DECIMAL(3,2),
  enrollment_date DATE,
  status VARCHAR(20) DEFAULT '유학전',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- 3. Agencies 테이블
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_code VARCHAR(20) UNIQUE NOT NULL,
  agency_number INT UNIQUE NOT NULL,
  agency_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Consultations 테이블
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  counselor_id UUID REFERENCES auth.users(id),
  consult_type VARCHAR(20),
  summary TEXT,
  improvement TEXT,
  next_goal TEXT,
  consult_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ExamResults 테이블
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  exam_type VARCHAR(20) DEFAULT 'TOPIK',
  reading_score INT,
  listening_score INT,
  writing_score INT,
  total_score INT,
  level VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS (Row Level Security) 설정
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "Users can view their agency students"
  ON students FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM agencies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Master can view all students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'master'
    )
  );
```

**작업 순서**:
1. SQL 스크립트 작성
2. Supabase Dashboard → SQL Editor에서 실행
3. 테이블 생성 확인
4. RLS 정책 테스트

**검증**:
- [ ] 8개 테이블 생성 완료
- [ ] Foreign Key 관계 정상
- [ ] RLS 정책 작동 확인

---

### Phase 3: 인증 시스템 마이그레이션 (Day 2-3)
**목표**: 커스텀 Auth → Supabase Auth 전환

#### 3.1 Supabase Auth 설정

**기존 시스템**:
```javascript
// GAS Custom Auth
- SHA-256 + MASTER_SALT
- CacheService 세션 (1h)
- 수동 권한 검증
```

**새 시스템**:
```javascript
// Supabase Auth
- JWT Token (자동)
- Email/Password 인증
- RLS 자동 권한 관리
```

#### 3.2 사용자 마이그레이션

**단계**:
1. 기존 Users 시트 데이터 추출
2. Supabase Auth에 사용자 생성
   ```javascript
   // 관리자 계정 생성
   const { data, error } = await supabase.auth.admin.createUser({
     email: 'admin@ajuenj.com',
     password: 'secure-password',
     email_confirm: true,
     user_metadata: {
       role: 'master',
       agency_code: 'MASTER'
     }
   })
   ```
3. 유학원 계정 생성 (같은 방식)

#### 3.3 프론트엔드 Auth 통합

**로그인 페이지**:
```typescript
// pages/login.tsx
import { supabase } from '@/lib/supabaseClient'

const handleLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    alert('로그인 실패: ' + error.message)
    return
  }

  // JWT 토큰 자동 저장됨
  router.push('/dashboard')
}
```

**보안 개선**:
1. ✅ 비밀번호 해싱 자동 (bcrypt)
2. ✅ JWT 토큰 자동 갱신
3. ✅ CSRF 보호
4. ✅ Rate Limiting (Supabase 내장)

**검증**:
- [ ] 로그인/로그아웃 정상 작동
- [ ] JWT 토큰 자동 갱신
- [ ] RLS 정책 권한 검증

---

### Phase 4: API 레이어 마이그레이션 (Day 3-4)
**목표**: GAS 함수 → Supabase API 전환

#### 4.1 API 자동 생성

**Supabase의 장점**: RESTful API 자동 생성!

**예시**:
```typescript
// 학생 목록 조회 (기존 GAS)
google.script.run.getStudentList(sessionToken, filters)

// 학생 목록 조회 (새 Supabase)
const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('agency_id', agencyId)
  .order('created_at', { ascending: false })
```

#### 4.2 CRUD 함수 변환 매핑

| GAS 함수 | Supabase Query | 변경 사항 |
|----------|----------------|----------|
| `getStudentList()` | `.from('students').select('*')` | RLS 자동 필터 |
| `createStudent()` | `.from('students').insert()` | UUID 자동 생성 |
| `updateStudent()` | `.from('students').update()` | 권한 검증 자동 |
| `deleteStudent()` | `.from('students').delete()` | Soft delete 유지 |
| `getAgencyList()` | `.from('agencies').select('*')` | - |
| `login()` | `supabase.auth.signInWithPassword()` | **삭제** |

#### 4.3 프론트엔드 Service 레이어

**파일 구조**:
```
lib/
  ├── supabaseClient.ts       # Supabase 클라이언트
  ├── services/
  │   ├── studentService.ts   # 학생 CRUD
  │   ├── agencyService.ts    # 유학원 CRUD
  │   ├── consultService.ts   # 상담 CRUD
  │   └── examService.ts      # 시험 CRUD
```

**예시 (studentService.ts)**:
```typescript
import { supabase } from '@/lib/supabaseClient'

export const studentService = {
  async getAll(filters?: StudentFilters) {
    let query = supabase
      .from('students')
      .select(`
        *,
        agency:agencies(agency_name),
        consultations(count),
        exam_results(count)
      `)

    if (filters?.agencyCode) {
      query = query.eq('agency.agency_code', filters.agencyCode)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async create(student: Omit<Student, 'id'>) {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, student: Partial<Student>) {
    const { data, error } = await supabase
      .from('students')
      .update(student)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('students')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  }
}
```

**검증**:
- [ ] 학생 CRUD 정상 작동
- [ ] 유학원 CRUD 정상 작동
- [ ] 상담 기록 정상 작동
- [ ] 시험 성적 정상 작동

---

### Phase 5: 데이터 마이그레이션 (Day 4-5)
**목표**: Sheets 데이터 → PostgreSQL 이전

#### 5.1 데이터 추출 스크립트

```javascript
// GAS에서 실행 (마지막!)
function exportAllDataToJson() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  const data = {
    students: sheetToJson(ss.getSheetByName('Students')),
    agencies: sheetToJson(ss.getSheetByName('Agencies')),
    consultations: sheetToJson(ss.getSheetByName('Consultations')),
    examResults: sheetToJson(ss.getSheetByName('ExamResults')),
    targetHistory: sheetToJson(ss.getSheetByName('TargetHistory')),
    auditLogs: sheetToJson(ss.getSheetByName('AuditLogs')),
    systemConfig: sheetToJson(ss.getSheetByName('SystemConfig')),
    i18n: sheetToJson(ss.getSheetByName('i18n'))
  }

  // JSON 파일로 저장
  DriveApp.createFile('migration-data.json', JSON.stringify(data, null, 2))
  Logger.log('✅ Data exported to migration-data.json')
}

function sheetToJson(sheet) {
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  return data.slice(1).map(row => {
    const obj = {}
    headers.forEach((header, index) => {
      obj[header] = row[index]
    })
    return obj
  })
}
```

#### 5.2 데이터 변환 및 Import

```typescript
// scripts/migrate-data.ts
import { supabase } from '@/lib/supabaseClient'
import migrationData from './migration-data.json'

async function migrateData() {
  console.log('🚀 Starting data migration...')

  // 1. Agencies 먼저 (FK 의존성)
  console.log('1️⃣ Migrating agencies...')
  const agencyMap = new Map()
  for (const agency of migrationData.agencies) {
    const { data, error } = await supabase
      .from('agencies')
      .insert({
        agency_code: agency.AgencyCode,
        agency_number: agency.AgencyNumber,
        agency_name: agency.AgencyName,
        is_active: agency.IsActive
      })
      .select()
      .single()

    if (error) {
      console.error('Agency error:', error)
      continue
    }
    agencyMap.set(agency.AgencyCode, data.id)
  }
  console.log(`✅ ${agencyMap.size} agencies migrated`)

  // 2. Students
  console.log('2️⃣ Migrating students...')
  const studentMap = new Map()
  for (const student of migrationData.students) {
    const { data, error } = await supabase
      .from('students')
      .insert({
        name_kr: student.NameKR,
        name_vn: student.NameVN,
        dob: student.DOB,
        gender: student.Gender,
        agency_id: agencyMap.get(student.AgencyCode),
        email: student.Email,
        phone_kr: student.PhoneKR,
        phone_vn: student.PhoneVN,
        parent_name_vn: student.ParentNameVN,
        parent_phone_vn: student.ParentPhoneVN,
        high_school_gpa: student.HighSchoolGPA,
        enrollment_date: student.EnrollmentDate,
        status: student.Status,
        is_active: student.IsActive
      })
      .select()
      .single()

    if (error) {
      console.error('Student error:', error)
      continue
    }
    studentMap.set(student.StudentID, data.id)
  }
  console.log(`✅ ${studentMap.size} students migrated`)

  // 3. Consultations, ExamResults... (같은 방식)

  console.log('🎉 Migration completed!')
}

migrateData()
```

**검증**:
- [ ] 모든 학생 데이터 이전 완료
- [ ] 유학원 관계 정상
- [ ] 상담 기록 이전 완료
- [ ] 시험 성적 이전 완료
- [ ] 데이터 무결성 검증

---

### Phase 6: 프론트엔드 전환 (Day 5-7)
**목표**: HTML → React (Next.js) 전환

#### 6.1 프로젝트 구조

```
project/
  ├── pages/
  │   ├── _app.tsx              # App wrapper
  │   ├── index.tsx             # 대시보드
  │   ├── login.tsx             # 로그인
  │   ├── students/
  │   │   ├── index.tsx         # 학생 목록
  │   │   ├── [id].tsx          # 학생 상세
  │   │   └── new.tsx           # 학생 등록
  │   ├── agencies/
  │   │   └── index.tsx         # 유학원 관리
  │   └── analytics/
  │       └── index.tsx         # 분석 대시보드
  ├── components/
  │   ├── Layout.tsx
  │   ├── StudentTable.tsx
  │   ├── StudentForm.tsx
  │   └── ...
  ├── lib/
  │   ├── supabaseClient.ts
  │   └── services/
  └── styles/
      └── globals.css
```

#### 6.2 핵심 페이지 전환

**우선순위**:
1. 로그인 페이지 (login.tsx)
2. 학생 목록 (students/index.tsx)
3. 학생 등록/수정 (students/new.tsx, students/[id].tsx)
4. 대시보드 (index.tsx)

**기존 HTML 재사용**:
- CSS 스타일 → Tailwind CSS 변환
- JavaScript 로직 → TypeScript 함수 변환
- HTML 구조 → React 컴포넌트 변환

**검증**:
- [ ] 로그인 페이지 작동
- [ ] 학생 CRUD UI 정상
- [ ] 반응형 디자인 유지
- [ ] 다국어 (i18n) 유지

---

### Phase 7: 문서 정리 및 배포 (Day 7)
**목표**: 불필요한 문서 삭제, 새 문서 작성, 배포

#### 7.1 문서 정리 계획

**삭제할 문서** (GAS 관련):
```bash
# 삭제 대상
docs/
  ├── DIAGNOSTIC-STEPS.md        # GAS 진단 가이드
  ├── FindSpreadsheet.gs 관련 문서
  ├── SetupScriptProperties.gs 관련 문서
  └── clasp 관련 가이드
```

**유지/수정할 핵심 문서**:
```bash
# 유지 + 업데이트
├── README.md                    # 프로젝트 개요 (Supabase 버전)
├── CLAUDE.md                    # 개발 가이드 (Supabase 버전)
├── docs/
│   ├── 01-plan/
│   │   └── supabase-migration.plan.md
│   ├── 02-design/
│   │   └── supabase-migration.design.md
│   └── API.md                   # Supabase API 가이드 (새)
```

**새로 작성할 문서**:
1. **SETUP.md**: Supabase 프로젝트 설정 가이드
2. **API.md**: Supabase API 사용법
3. **DEPLOY.md**: Vercel 배포 가이드
4. **MIGRATION.md**: 데이터 마이그레이션 로그

#### 7.2 배포

**배포 플랫폼**: Vercel (Next.js 최적화)

**단계**:
1. Vercel 프로젝트 생성
2. GitHub 저장소 연결
3. 환경 변수 설정
   ```env
   NEXT_PUBLIC_SUPABASE_URL=xxx
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   ```
4. 자동 배포 확인
5. 커스텀 도메인 설정 (선택)

**검증**:
- [ ] 프로덕션 배포 성공
- [ ] 모든 기능 정상 작동
- [ ] 성능 테스트 (< 500ms)
- [ ] 문서 정리 완료

---

## ⚠️ 리스크 분석

### 기술 리스크
| 리스크 | 확률 | 영향 | 대응 방안 |
|--------|------|------|----------|
| 데이터 손실 | 낮음 | 높음 | 백업 + 단계별 검증 |
| RLS 정책 오류 | 중간 | 중간 | 충분한 테스트 |
| JWT 토큰 이슈 | 낮음 | 낮음 | Supabase 문서 참고 |
| 성능 저하 | 낮음 | 중간 | PostgreSQL 인덱싱 |

### 일정 리스크
| 리스크 | 확률 | 영향 | 대응 방안 |
|--------|------|------|----------|
| 데이터 마이그레이션 지연 | 중간 | 중간 | 자동화 스크립트 |
| 프론트엔드 전환 지연 | 높음 | 낮음 | 점진적 전환 |

---

## 📅 타임라인

| Day | Phase | 작업 | 예상 시간 |
|-----|-------|------|----------|
| 1 | Phase 1-2 | 환경 설정 + 스키마 마이그레이션 | 6h |
| 2-3 | Phase 3 | 인증 시스템 마이그레이션 | 8h |
| 3-4 | Phase 4 | API 레이어 마이그레이션 | 8h |
| 4-5 | Phase 5 | 데이터 마이그레이션 | 6h |
| 5-7 | Phase 6 | 프론트엔드 전환 | 12h |
| 7 | Phase 7 | 문서 정리 + 배포 | 4h |

**총 예상 시간**: 40-50 시간 (1주일)

---

## ✅ 체크리스트

### Pre-Migration
- [ ] 기존 데이터 백업 완료
- [ ] Supabase 프로젝트 생성
- [ ] 개발 환경 설정 완료

### Migration
- [ ] 데이터베이스 스키마 생성
- [ ] RLS 정책 설정
- [ ] 인증 시스템 전환
- [ ] API 레이어 전환
- [ ] 데이터 마이그레이션
- [ ] 프론트엔드 전환

### Post-Migration
- [ ] 모든 기능 테스트
- [ ] 성능 테스트
- [ ] 문서 정리
- [ ] 배포 완료
- [ ] GAS 프로젝트 아카이브

---

## 📚 참고 자료

- Supabase Docs: https://supabase.com/docs
- Next.js + Supabase: https://supabase.com/docs/guides/with-nextjs
- RLS 정책 가이드: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL 마이그레이션: https://supabase.com/docs/guides/database/migrating-to-supabase

---

**다음 단계**: Design 문서 작성 (`/pdca design supabase-migration`)
