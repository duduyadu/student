# AJU E&J 학생관리 시스템 - 현재 상태 & 로드맵

> 작성일: 2026-02-17
> 플랫폼: Next.js 14 App Router + Supabase + Vercel
> 배포 URL: https://aju-ej.vercel.app

---

## ✅ 현재 구현 완료 기능

### 인프라
- [x] Next.js 14 App Router ('use client') + TypeScript + Tailwind CSS v4
- [x] Supabase (PostgreSQL + Auth + RLS)
- [x] Vercel 배포 (프로덕션)
- [x] 환경변수 설정 (.env.local + Vercel)

### 인증 / 권한
- [x] 이메일 로그인 (Supabase Auth)
- [x] 역할 분리: `master` (전체) / `agency` (자기 학생만)
- [x] Row Level Security (RLS) - 유학원은 소속 학생만 조회
- [x] 자동 로그인 세션 유지 / 로그아웃

### 대시보드 (`/`)
- [x] 통계 카드 (전체 학생 수, 유학원 수, 상담 기록, 시험 기록)
- [x] 비자 만료 임박 알림 (30일 이내, D-7 이하 빨간색 강조)
- [x] 빠른 링크 (학생 목록, 학생 등록)

### 학생 관리 (`/students`)
- [x] 학생 목록 테이블 (번호, 이름, 유학원, 상태, 등록일)
- [x] 이름 검색 (한국어/베트남어)
- [x] 유학원 필터 드롭다운
- [x] 엑셀 내보내기 (현재 필터 기준)
- [x] 학생 고유코드 표시 (YY-AAA-NNN 형식)

### 학생 등록 (`/students/new`)
- [x] 기본정보 (이름, 생년월일, 성별, 유학원, 상태)
- [x] 연락처 (한국/베트남 전화, 이메일)
- [x] 학부모 정보 (베트남어 이름/연락처)
- [x] 학업정보 (GPA, 등록일, 목표 대학/학과)
- [x] 비자/체류 (비자 종류, 만료일)
- [x] 비고
- [x] 학생 고유코드 자동 생성 (YY-유학원번호-연도별순번)

### 학생 상세 (`/students/[id]`)
- [x] 3탭 UI: 기본정보 / 상담기록 / 시험성적
- [x] 기본정보 탭: 프로필 + 연락처 + 학업정보 + 비자정보
- [x] 토픽등급 표시 (학업정보 카드)
- [x] 상담기록 탭: 기록 목록 조회
- [x] 시험성적 탭: 성적 목록 조회
- [x] 학생 삭제 (소프트 삭제 - is_active = false)
- [x] 수정 페이지 이동 버튼

### 학생 수정 (`/students/[id]/edit`)
- [x] 기존 데이터 pre-fill
- [x] 토픽등급 선택 (TOPIK 1~6급 드롭다운)
- [x] 전체 필드 수정 후 저장

### 유학원 관리 (`/agencies`) — master 전용
- [x] 유학원 목록 (코드, 이름, 연락처, 학생 수)
- [x] 유학원 등록 (코드 자동 생성: 001, 002...)
- [x] 베트남어 유학원명 필수
- [x] 로그인 계정 동시 생성 (이메일/비밀번호 선택)
- [x] 유학원 소프트 삭제

### API
- [x] `/api/create-agency-user` (Supabase Admin으로 서버사이드 계정 생성)

---

## 🗄️ 데이터베이스 구조 (Supabase)

| 테이블 | 주요 컬럼 |
|--------|-----------|
| `students` | id, student_code, name_kr, name_vn, dob, gender, phone_kr, phone_vn, email, parent_name_vn, parent_phone_vn, high_school_gpa, enrollment_date, target_university, target_major, visa_type, visa_expiry, status, topik_level, agency_id, notes, is_active |
| `agencies` | id, agency_code, agency_number, agency_name_kr, agency_name_vn, contact_person, contact_phone, is_active |
| `consultations` | id, student_id, consult_date, consult_type, content, staff_name, created_at |
| `exam_results` | id, student_id, exam_type, exam_date, score, level, notes, created_at |

---

## 🚀 앞으로 진행할 기능 (우선순위 순)

### 🔴 우선순위 1 — 핵심 기능 완성 (즉시 진행)

#### 1-1. 상담기록 CRUD 완성
현재 상담기록 탭은 **조회만** 가능. 추가/수정/삭제 UI 필요.
- 상담 추가 (날짜, 유형, 내용, 담당자)
- 상담 삭제
- 상담 유형: 비자상담, 학교등록, 생활지원, 기타

#### 1-2. 시험성적 CRUD 완성
현재 시험성적 탭은 **조회만** 가능. 추가/수정/삭제 UI 필요.
- 성적 추가 (시험유형, 날짜, 점수, 등급)
- 성적 삭제
- 시험 유형: TOPIK, TOEIC, 수능, 대학 자체시험

#### 1-3. 학생 목록 상태 필터
현재 유학원 필터만 있음. 상태 필터 추가.
- 상태별 필터: 유학전 / 어학연수 / 대학교 / 취업 / 전체

---

### 🟠 우선순위 2 — 실용성 향상

#### 2-1. 학생 일괄 등록 (Excel 업로드)
Excel 파일로 여러 학생 한번에 등록.
- 템플릿 Excel 다운로드
- 파일 업로드 → 미리보기 → 일괄 저장

#### 2-2. 알림 시스템 확장
대시보드 알림 기능 확장.
- 비자 만료 60일/30일/7일 단계별 알림
- 상태별 학생 카운트
- 이번 달 등록 학생 수

#### 2-3. 학생 상세 - 파일 첨부
학생별 서류 파일 관리 (Supabase Storage 활용).
- 비자 사본, 여권 사본, 입학허가서 등
- 파일 업로드/다운로드/삭제

---

### 🟡 우선순위 3 — 고도화

#### 3-1. 통계/리포트 페이지
- 유학원별 학생 수 차트
- 상태별 분포 차트
- 월별 등록 추이

#### 3-2. 이메일 알림 (Supabase Edge Functions)
- 비자 만료 임박 자동 이메일
- 관리자에게 주간 리포트

#### 3-3. 모바일 최적화
- 현재 PC 위주 레이아웃
- 테이블을 카드 형태로 변환 (모바일)

#### 3-4. 학생 포털 (별도 페이지)
- 학생 본인이 자기 정보 조회
- 비자 만료일 확인
- 상담 신청

---

## 📋 즉시 시작 가능한 작업 순서

```
1단계: 상담기록 추가/삭제 UI      → /students/[id] 탭 개선
2단계: 시험성적 추가/삭제 UI      → /students/[id] 탭 개선
3단계: 학생 목록 상태 필터        → /students 페이지 개선
4단계: Excel 일괄 업로드         → /students/import 새 페이지
5단계: 파일 첨부 기능             → Supabase Storage 설정 필요
```

---

## 💡 권장 다음 단계

**지금 당장 가장 유용한 것**: 상담기록 + 시험성적 추가/삭제 UI

상담기록과 시험성적 탭이 현재 조회만 되고 실제로 데이터를 넣을 수 없어서,
핵심 업무 흐름이 완성되지 않은 상태입니다.

어떤 기능부터 시작할지 말씀해 주세요.
