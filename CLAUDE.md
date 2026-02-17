# AJU E&J 베트남 유학생 통합 관리 플랫폼

> Supabase + Next.js 기반 다국어(KO/VI) 학생 관리 시스템. JWT 인증, RLS 권한 격리, 감사 로그 포함.

**Version**: 3.0 (Supabase Migration)
**Status**: 🔄 마이그레이션 중

---

## Core Principles

### 1. Automation First, Commands are Shortcuts
```
Claude automatically applies PDCA methodology.
Commands are shortcuts for power users.
```

### 2. SoR (Single Source of Truth) Priority
```
1st: Codebase (actual working code - .ts, .tsx files)
2nd: CLAUDE.md / Convention docs
3rd: docs/ design documents
```

### 3. No Guessing
```
Unknown → Check documentation
Not in docs → Ask user
Never guess
```

---

## Tech Stack

| Item | Value |
|------|-------|
| Backend | Supabase (PostgreSQL + PostgREST + Realtime) |
| Database | PostgreSQL with RLS (8 tables) |
| Frontend | Next.js 14 (App Router) + React |
| Language | TypeScript |
| Auth | Supabase Auth (JWT + Email/Password) |
| i18n | PostgreSQL i18n 테이블 (Key-Value 다국어 사전) |
| Notification | 알림톡/SMS API + Email 폴백 (향후) |
| Deployment | Vercel (Frontend) + Supabase (Backend) |
| Level | Dynamic |
| Tier | Tier 2 (BaaS Platform) |

> **Tier 2 (BaaS Platform)**
> - Supabase는 PostgreSQL 기반 Backend-as-a-Service
> - 서버리스, 자동 REST API, Realtime 구독 지원
> - Row Level Security (RLS)로 데이터 격리
> - JWT 기반 인증, 자동 세션 관리
> - PDCA 워크플로우 적용

---

## Development Workflow

### 로컬 개발 환경 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
# → http://localhost:3000

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

### Supabase 로컬 개발
```bash
# Supabase CLI 설치 (선택)
npm install -g supabase

# Supabase 프로젝트 초기화
supabase init

# 로컬 Supabase 실행
supabase start

# 마이그레이션 생성
supabase migration new <migration_name>

# 마이그레이션 적용
supabase migration up
```

### 테스트
```bash
# Jest + React Testing Library
npm run test

# E2E 테스트 (Playwright)
npm run test:e2e

# 타입 체크
npm run type-check
```

---

## Coding Conventions

### Naming Rules

| Target | Convention | Example |
|--------|-----------|---------|
| TypeScript 함수 (public) | camelCase | `getStudentById()`, `saveAuditLog()` |
| TypeScript 함수 (private) | _camelCase | `_validatePermission()`, `_hashPassword()` |
| PostgreSQL 테이블명 | snake_case | `students`, `exam_results`, `audit_logs` |
| PostgreSQL 컬럼명 | snake_case | `name_kr`, `dob`, `agency_id` |
| TypeScript 타입/인터페이스 | PascalCase | `Student`, `ExamResult`, `ConsultationRecord` |
| i18n 키 | snake_case | `login_btn`, `form_name_label`, `err_permission` |
| 상수 | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS`, `SESSION_DURATION` |
| React 컴포넌트 | PascalCase | `StudentForm`, `LoginPage`, `Header` |
| CSS 클래스 (Tailwind) | kebab-case | `student-form`, `lang-toggle-btn` |
| API Route | kebab-case | `/api/students`, `/api/consultations` |

### i18n Key Naming Convention
```
{category}_{element}_{detail}

카테고리:
- btn_   : 버튼 텍스트       (btn_save, btn_cancel, btn_login)
- label_ : 폼 라벨           (label_name_kr, label_dob)
- msg_   : 일반 메시지        (msg_save_success, msg_confirm_delete)
- err_   : 에러 메시지        (err_required_field, err_permission_denied)
- nav_   : 네비게이션         (nav_student_list, nav_dashboard)
- title_ : 페이지/섹션 제목   (title_student_form, title_login)
- legal_ : 법률/약관 문구     (legal_privacy_consent, legal_copyright)
- noti_  : 알림 문구          (noti_visa_expiry, noti_exam_reminder)
```

### 프로젝트 구조
```
project/
├── pages/                      # Next.js Pages Router
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
│   ├── services/              # Service Layer
│   │   ├── studentService.ts
│   │   ├── agencyService.ts
│   │   ├── consultService.ts
│   │   └── auditService.ts
│   └── hooks/                 # Custom Hooks
│       ├── useAuth.ts
│       ├── useStudents.ts
│       └── useI18n.ts
│
├── types/                      # TypeScript Types
│   ├── database.ts            # DB 타입 (Supabase 생성)
│   └── api.ts                 # API 타입
│
├── styles/                     # Styles
│   └── globals.css            # Tailwind CSS
│
├── public/                     # Static files
│
├── .env.local                  # 환경 변수 (로컬)
├── next.config.js              # Next.js 설정
├── tsconfig.json               # TypeScript 설정
└── package.json                # 의존성
```

### Service Layer 패턴
```typescript
// lib/services/studentService.ts
import { supabase } from '../supabaseClient'
import type { Student, StudentFilters } from '@/types/database'

export const studentService = {
  // 학생 목록 조회 (RLS 자동 적용)
  async getAll(filters?: StudentFilters) {
    let query = supabase
      .from('students')
      .select('*, agency:agencies(agency_code, agency_name)')
      .eq('is_active', true)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error

    // 감사 로그 (읽기는 선택적)
    // await auditService.log('READ', 'students', null)

    return data
  },

  // 학생 생성 (권한은 RLS에서 자동 검증)
  async create(student: Omit<Student, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single()

    if (error) throw error

    // 감사 로그 (쓰기는 필수)
    await auditService.log('CREATE', 'students', data.id)

    return data
  },

  // ... update, delete
}
```

### 에러 처리 패턴
```typescript
// pages/students/index.tsx
import { studentService } from '@/lib/services/studentService'

export default function StudentsPage() {
  const [students, setStudents] = useState([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const data = await studentService.getAll()
      setStudents(data)
      setError(null)
    } catch (err) {
      console.error('Failed to load students:', err)
      setError(err.message || 'err_unknown')
    }
  }

  if (error) {
    return <ErrorMessage errorKey={error} />
  }

  return <StudentTable students={students} />
}
```

### 반드시 지켜야 할 규칙

#### MUST DO
- 모든 UI 텍스트는 **i18n 테이블**에서 참조 (하드코딩 절대 금지)
- 모든 데이터 접근은 **RLS 정책**을 통해 권한 검증 (자동)
- 모든 CUD 작업 시 **감사 로그** 기록 (Create, Update, Delete)
- 민감 정보(학부모 경제상황) **암호화** 저장 (PostgreSQL pgcrypto)
- 저작권/소유권 문구는 **system_config 테이블**에서 동적 로드
- TypeScript **strict 모드** 사용 (타입 안정성)

#### MUST NOT
- Supabase Service Role Key를 클라이언트에 노출 금지 (서버 전용)
- 하드코딩 UI 텍스트 사용 금지
- 클라이언트에서 RLS 우회 시도 금지
- SQL Injection 취약점 방지 (Supabase SDK 사용)
- API Key를 git에 커밋 금지 (.env.local은 .gitignore)

---

## PostgreSQL Database Structure

| Table | Purpose | Key |
|-------|---------|-----|
| **students** | 학생 통합 정보 | id (UUID) |
| **agencies** | 유학원 정보 및 인증 | id (UUID) |
| **consultations** | 상담 기록 | id (UUID) |
| **exam_results** | TOPIK 시험 성적 (등급 중요!) | id (UUID) |
| **target_history** | 목표대학 변경 이력 | id (UUID) |
| **audit_logs** | 감사 기록 | id (UUID) |
| **system_config** | 시스템 설정 (KR/VN) | key (VARCHAR) |
| **i18n** | 다국어 사전 | (key, lang) PK |

### RLS (Row Level Security) 정책
- **students**: 유학원은 자기 학생만 조회/수정, Master는 전체 조회/수정
- **consultations**: 자기 학생의 상담 기록만 조회/수정
- **exam_results**: 자기 학생의 시험 성적만 조회/수정
- **agencies**: 본인 정보만 조회/수정, Master는 전체 조회/수정

---

## PDCA Auto Behavior

### On New Feature Request
```
User: "상담 기록 기능 만들어줘"
Claude: 1. Check docs/02-design/ → Create design if missing
        2. i18n 키 목록 먼저 정의
        3. Service 레이어 구현 (consultService.ts)
        4. React 컴포넌트 구현 (ConsultationForm.tsx)
        5. API Route 구현 (선택)
        6. RLS 정책 확인
        7. Suggest Gap analysis after completion
```

### On Bug Fix / Refactoring
```
Claude: 1. Compare code with design documents
        2. RLS 정책 누락 여부 확인
        3. 감사 로그 누락 여부 확인
        4. i18n 하드코딩 여부 확인
        5. TypeScript 타입 안정성 확인
        6. Fix and update documentation
```

---

## Key Commands

| Command | Description |
|---------|-------------|
| `/pdca status` | 현재 PDCA 진행 상황 확인 |
| `/pdca plan {feature}` | Plan 문서 생성 |
| `/pdca design {feature}` | Design 문서 생성 |
| `/pdca analyze {feature}` | Gap 분석 실행 |
| `/pdca next` | 다음 단계 안내 |

---

## Environment Configuration

### .env.local (로컬 개발)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # 서버 전용

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Vercel (프로덕션)
- Vercel Dashboard → Settings → Environment Variables
- `NEXT_PUBLIC_*` 변수만 클라이언트에 노출됨
- `SUPABASE_SERVICE_ROLE_KEY`는 Server-Side Only

### Supabase Dashboard
- https://supabase.com/dashboard
- Project Settings → API
  - **URL**: Project URL
  - **anon/public key**: 클라이언트용 (RLS 적용)
  - **service_role key**: 서버용 (RLS 우회, 조심!)

---

## Document Structure

### docs/01-plan/ (계획)
```
- features/
  ├── supabase-migration.plan.md  # 마이그레이션 계획
  └── student-data-fields.plan.md  # 학생 정보 필드 분류
- schema.md : 데이터 구조 정의 (Supabase 버전)
- conventions.md : 코딩 규칙 정의
```

### docs/02-design/ (설계)
```
- features/
  └── supabase-migration.design.md  # 상세 설계 (DB, API, RLS)
```

### docs/03-analysis/ (분석)
```
- Gap 분석 결과 문서
```

### docs/04-report/ (보고서)
```
- PDCA 완료 보고서
```

---

## Migration Notes

### v2.0 (GAS) → v3.0 (Supabase) 주요 변경사항

| 항목 | v2.0 (GAS) | v3.0 (Supabase) |
|------|------------|-----------------|
| Backend | Google Apps Script | Supabase (PostgreSQL + PostgREST) |
| Database | Google Sheets | PostgreSQL |
| Auth | Custom (SHA-256) | Supabase Auth (JWT) |
| 권한 | 서버 함수 검증 | RLS (Row Level Security) |
| API | `google.script.run` | REST API (자동 생성) |
| 세션 | CacheService (1h) | JWT (Access: 7d, Refresh: 30d) |
| ID 체계 | SmartID (YY-AGENCY-SEQ) | UUID |
| 파일 업로드 | 제외 (용량 문제) | 제외 (용량 문제) |

### 마이그레이션 이유
- `google.script.run`의 null 반환 문제 해결
- Standalone script 제약 제거
- 더 안정적이고 확장 가능한 아키텍처
- 표준 웹 기술 스택 사용 (TypeScript, React, PostgreSQL)

---

**Generated by**: bkit PDCA System
**Project Level**: Dynamic
**Template Version**: 1.3.0 (Supabase Migration)
