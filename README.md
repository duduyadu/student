# AJU E&J 베트남 유학생 통합 관리 시스템

베트남 유학생의 학업, 상담, 행정 정보를 체계적으로 관리하는 Google Apps Script 기반 웹 플랫폼

---

## 📋 프로젝트 정보

**개발 기간**: 2026년 2월 ~ (진행 중)
**기술 스택**:
- Backend: Google Apps Script (JavaScript)
- Database: Google Sheets (8개 Sheet)
- Frontend: HTML5, CSS3, Vanilla JavaScript
- 개발 도구: clasp (Command Line Apps Script Projects)

**주요 기능**:
- 👥 역할 기반 인증 시스템 (master, agency, branch)
- 📚 학생 정보 통합 관리 (CRUD)
- 💬 상담 기록 및 시험 결과 관리
- 🌐 다국어 지원 (한국어/베트남어)
- 📊 감사 로그 및 데이터 추적
- 📄 엑셀 업로드/다운로드
- 📑 PDF 생활기록부 생성 (예정)

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────┐
│         사용자 (브라우저)                │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│      Google Apps Script (서버)          │
│  ┌──────────────────────────────────┐   │
│  │ Code.gs (진입점)                 │   │
│  │ Auth.gs (인증/권한)              │   │
│  │ StudentService.gs (학생 CRUD)    │   │
│  │ I18nService.gs (다국어)          │   │
│  │ AuditService.gs (감사 로그)      │   │
│  └──────────────────────────────────┘   │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│       Google Sheets (데이터베이스)      │
│  - Students (학생 정보)                 │
│  - Agencies (사용자/기관)               │
│  - AuditLogs (감사 로그)                │
│  - SystemConfig (시스템 설정)           │
│  - i18n (다국어)                        │
│  - Consultations (상담 기록)            │
│  - ExamResults (시험 결과)              │
│  - TargetHistory (목표 대학 변경 이력)  │
└─────────────────────────────────────────┘
```

---

## 🔐 보안 기능

- **비밀번호 해싱**: SHA-256 + MASTER_SALT
- **세션 관리**: CacheService 기반 (1시간 TTL)
- **감사 로그**: 모든 작업 자동 기록
- **권한 제어**: 역할별 데이터 접근 제한
- **민감 정보 암호화**: XOR 암호화 (학부모 경제 정보)
- **로그인 시도 제한**: 5회 실패 시 계정 잠금

---

## 👥 사용자 역할

| 역할 | 권한 | 설명 |
|------|------|------|
| **master** | 전체 관리 | 시스템 관리자, 모든 기능 접근 가능 |
| **agency** | 소속 학생만 | 유학원 교사, 자신의 유학원 학생만 관리 |
| **branch** | 조회 + 상담/시험 | 한국 지점, 모든 학생 조회 및 상담/시험 추가 |

---

## 🚀 시작하기

### 필수 요구사항

- Node.js v16 이상
- Google 계정
- Google Apps Script API 활성화

### 설치 및 실행

```bash
# 1. 저장소 클론 (또는 다운로드)
cd "C:\Users\dudu\Documents\완성된 프로그램\AJU E&J 학생관리프로그램"

# 2. clasp 전역 설치
npm install -g @google/clasp

# 3. Google 계정 로그인
clasp login

# 4. 파일 업로드
clasp push

# 5. 이후 단계는 SESSION-CONTINUITY.md 참조
```

**상세 가이드**: [SESSION-CONTINUITY.md](./SESSION-CONTINUITY.md)

---

## 📁 프로젝트 구조

```
AJU E&J 학생관리프로그램/
├── src/
│   ├── Code.gs              # GAS 진입점
│   ├── Config.gs            # 설정 및 헬퍼
│   ├── Helpers.gs           # 유틸리티 함수
│   ├── Auth.gs              # 인증 시스템
│   ├── AuditService.gs      # 감사 로그
│   ├── I18nService.gs       # 다국어 지원
│   ├── StudentService.gs    # 학생 CRUD
│   ├── SetupSheets.gs       # 초기 설정
│   ├── Login.html           # 로그인 페이지
│   └── Index.html           # 메인 대시보드
├── setup/
│   └── i18n-initial-data.tsv  # 다국어 초기 데이터
├── .clasp.json              # clasp 설정
├── appsscript.json          # GAS 설정
├── README.md                # 프로젝트 개요 (이 파일)
├── PROGRESS.md              # 진행 상황
└── SESSION-CONTINUITY.md    # 세션 연속성 가이드
```

---

## 🎯 개발 로드맵

### Phase 1: 환경 설정 (80% 완료)
- ✅ clasp 개발 환경 구축
- ✅ 인증 시스템 구현
- ✅ 다국어 엔진 구현
- 🔄 초기 설정 작업 중

### Phase 4: 학생 CRUD UI (대기 중)
- 학생 목록 조회
- 학생 등록/수정/삭제
- 엑셀 업로드/다운로드

### Phase 5-9: 추가 기능 (계획 중)
- 상담 기록 관리
- 시험 결과 관리
- 행정 정보 관리
- UI/UX 개선
- 통합 테스트
- 배포 및 문서화

**자세한 일정**: [PROGRESS.md](./PROGRESS.md)

---

## 💾 데이터베이스 스키마

### Students (학생 정보)
- StudentID (Smart ID: YY-AGENCY-SEQ)
- NameKR, NameVN
- DOB, Gender
- AgencyCode (소속 유학원)
- 연락처, 주소, 학부모 정보
- 등록일, 상태

### Agencies (사용자/기관)
- AgencyCode
- AgencyName
- Role (master, agency, branch)
- LoginID, PasswordHash
- IsActive, LoginAttempts, LastLogin

### 기타 Sheet
- AuditLogs: 모든 작업 감사 로그
- SystemConfig: 시스템 설정값
- i18n: 다국어 텍스트 (75개 키)
- Consultations: 상담 기록
- ExamResults: 시험 결과
- TargetHistory: 목표 대학 변경 이력

---

## 🌐 다국어 지원

**지원 언어**: 한국어 (ko), 베트남어 (vi)

**번역 키 예시**:
```javascript
// 한국어
btn_login: "로그인"
label_password: "비밀번호"
err_login_failed: "로그인에 실패했습니다."

// 베트남어
btn_login: "Đăng nhập"
label_password: "Mật khẩu"
err_login_failed: "Đăng nhập thất bại."
```

**총 75개 번역 키** 제공 (버튼, 라벨, 오류 메시지 등)

---

## 🧪 테스트

### 테스트 계정

**마스터 관리자**:
- ID: `admin`
- 비밀번호: `admin123`
- 권한: 모든 기능 접근 가능

### 테스트 시나리오

1. **로그인 테스트**
   - admin/admin123로 로그인
   - 언어 전환 (한국어 ↔ 베트남어)
   - 로그아웃

2. **학생 관리 테스트** (Phase 4 완료 후)
   - 학생 등록
   - 학생 목록 조회
   - 학생 정보 수정
   - 학생 삭제

3. **권한 테스트** (Phase 4 완료 후)
   - agency 계정으로 타 유학원 학생 접근 차단 확인
   - branch 계정으로 학생 생성 불가 확인

---

## 📖 문서

- **[README.md](./README.md)**: 프로젝트 개요 (이 파일)
- **[PROGRESS.md](./PROGRESS.md)**: 진행 상황 빠른 참조
- **[SESSION-CONTINUITY.md](./SESSION-CONTINUITY.md)**: 세션 연속성 가이드 (상세 단계)

---

## 🔧 기술 스택 상세

### Backend
- **Google Apps Script**: 서버리스 JavaScript 런타임
- **V8 Engine**: 최신 JavaScript 지원

### Database
- **Google Sheets**: NoSQL 방식의 데이터 저장
- **CacheService**: 세션 및 i18n 캐싱 (TTL: 5분)

### Frontend
- **HTML5**: 시맨틱 마크업
- **CSS3**: 반응형 디자인
- **Vanilla JavaScript**: 프레임워크 없는 순수 JS
- **google.script.run**: GAS 서버 함수 호출

### Development Tools
- **clasp**: 로컬 개발 및 배포
- **Node.js**: clasp 실행 환경

---

## 🤝 기여

이 프로젝트는 현재 단독 개발 중입니다.

---

## 📄 라이선스

Copyright © 2026 AJU E&J. All rights reserved.

---

## 📞 연락처

프로젝트 관련 문의: (추후 추가)

---

## 🙏 감사의 말

이 프로젝트는 베트남 유학생들의 성공적인 한국 유학 생활을 지원하기 위해 개발되었습니다.

---

**마지막 업데이트**: 2026-02-10
**버전**: 1.0.0
**상태**: Phase 1 진행 중 (80% 완료)
