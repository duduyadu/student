# AJU E&J 베트남 유학생 통합 관리 시스템

> Supabase + Next.js 기반 다국어(KO/VI) 학생 관리 시스템

**Version**: 3.0 (Supabase Migration)
**Status**: 🔄 마이그레이션 중
**Tech Stack**: Supabase, PostgreSQL, Next.js, TypeScript, React

---

## 🎯 프로젝트 개요

베트남 유학생의 학업, 상담, 행정 정보를 체계적으로 관리하는 웹 플랫폼

### 핵심 기능
- ✅ **학생 관리**: CRUD, 검색, 필터링, 상세 정보
- ✅ **상담 기록**: 정기/비정기 상담 이력 관리
- ✅ **시험 성적**: TOPIK 시험 성적 추적
- ✅ **유학원 관리**: 다중 유학원 지원
- ✅ **권한 관리**: Master, Agency, Branch 역할 기반
- ✅ **다국어**: 한국어/베트남어 지원
- ✅ **감사 로그**: 모든 작업 자동 기록

---

## 🏗️ 기술 스택

### Backend
- **Supabase**: PostgreSQL + PostgREST + Realtime
- **Auth**: Supabase Auth (JWT)
- **Storage**: PostgreSQL (8 tables)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React + Tailwind CSS
- **State**: React Hooks

### 배포
- **Frontend**: Vercel
- **Database**: Supabase (PostgreSQL)
- **CI/CD**: GitHub Actions → Vercel

---

## 📂 프로젝트 구조

```
project/
├── pages/                      # Next.js Pages
│   ├── login.tsx              # 로그인
│   ├── index.tsx              # 대시보드
│   └── students/              # 학생 관리
├── components/                 # React 컴포넌트
├── lib/
│   ├── supabaseClient.ts      # Supabase 클라이언트
│   └── services/              # API Service Layer
├── types/                      # TypeScript 타입
├── docs/                       # 설계 문서
│   ├── 01-plan/               # 계획
│   └── 02-design/             # 설계
└── README.md
```

---

## 🚀 Quick Start

### 1. 환경 설정

```bash
# 저장소 클론
git clone <repository-url>
cd "AJU E&J 학생관리프로그램"

# 의존성 설치
npm install
```

### 2. 환경 변수 설정

```bash
# .env.local 생성
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### 3. 개발 서버 실행

```bash
npm run dev
# http://localhost:3000
```

---

## 📚 주요 문서

| 문서 | 설명 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | 개발 가이드 (Claude 전용) |
| [Plan](./docs/01-plan/features/supabase-migration.plan.md) | 마이그레이션 계획 |
| [Design](./docs/02-design/features/supabase-migration.design.md) | 상세 설계 |

---

## 🔐 권한 체계

| 역할 | 권한 |
|------|------|
| **Master** | 모든 기능 + 유학원 관리 |
| **Agency** | 소속 학생 관리 + 상담 기록 |
| **Branch** | 모든 학생 조회 + 상담 추가 |

---

## 📊 데이터베이스

### 테이블 구조
- `students`: 학생 정보
- `agencies`: 유학원 정보
- `consultations`: 상담 기록
- `exam_results`: 시험 성적
- `target_history`: 목표 대학 변경 이력
- `audit_logs`: 감사 로그
- `system_config`: 시스템 설정
- `i18n`: 다국어 사전

### RLS (Row Level Security)
- 유학원: 자기 학생만 접근
- Master: 모든 데이터 접근
- 자동 권한 검증

---

## 🔄 마이그레이션 히스토리

### v2.0 (Google Apps Script)
- Backend: GAS
- Database: Google Sheets
- Auth: Custom (SHA-256)
- **문제**: `google.script.run` 제한, 성능 이슈

### v3.0 (Supabase) ← **현재**
- Backend: Supabase (PostgreSQL)
- Database: PostgreSQL (RLS)
- Auth: Supabase Auth (JWT)
- **개선**: 안정성, 보안, 성능 대폭 향상

---

## 📞 지원

**개발자**: Claude (AI Assistant)
**이메일**: duyang22@gmail.com
**문서**: [docs/](./docs/)

---

**Last Updated**: 2026-02-16
**License**: Proprietary
