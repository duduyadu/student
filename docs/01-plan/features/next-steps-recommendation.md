# Next Steps Recommendation - Week 9+

> **Current Status**: Step 3 High Priority Features 완료 (97.4% Match Rate)
> **Date**: 2026-02-16
> **Level**: Dynamic
> **Decision Required**: 다음 개발 방향 선택

---

## 1. Current Project Status

### 1.1 Completed Features ✅

| Step | Feature Set | Match Rate | Status |
|------|-------------|------------|--------|
| Step 1 | Critical Features (5개) | - | ✅ 완료 |
| Step 2 | High Priority Features | 93.4% | ✅ 완료 |
| Step 3 | High Priority Features | 97.4% | ✅ 완료 |

**Step 3 세부 현황**:
- ✅ Week 1-2: Analytics (96.7%)
- ✅ Week 3-4: Schedule (96.0%)
- ✅ Week 5-6: FileManager (99.0%)
- ✅ Week 7-8: Bulk Import/Export (98.0%)

**총 코드량**:
- Backend: 3,963 lines
- Frontend: 4,103 lines
- **Total**: 8,066 lines

**품질 지표**:
- APIs: 18개 (모두 100% 구현)
- UI Components: 58개 (56/58 = 97%)
- i18n Keys: 107개 (한국어/베트남어)
- Test Functions: 21개

---

## 2. Next Steps Options

### Option 1: 학생 회원가입 시스템 (추천) 🥇

**Priority**: High
**Complexity**: High
**Estimated Effort**: 3-4주 (21-28일)

#### 2.1.1 Feature Overview

**Schema v2.0 기반 통합 인증 시스템**:

현재 시스템은 **관리자 중심**으로, 학생 데이터를 유학원/관리자가 직접 입력합니다.
**Schema v2.0**에서는 **학생 자체 회원가입**을 지원하여 학생이 직접 계정을 만들고 정보를 입력할 수 있습니다.

**주요 변경사항**:
1. **Users 통합 인증 시트** (NEW)
   - master, agency, student 통합 관리
   - Email 기반 ID/비밀번호 찾기
   - 개인정보 동의 관리

2. **학생 회원가입 기능** (NEW)
   - 회원가입 페이지 (SignUp.html)
   - 이메일 인증 (EmailLogs 시트)
   - 개인정보 동의 (PrivacyConsents 시트)
   - 비밀번호 재설정 (이메일 토큰)

3. **개인정보보호법 준수** (NEW)
   - 개인정보 수집/이용 동의 화면
   - 정기 개인정보 이용 알림 (6개월)
   - 이메일 발송 기록 (EmailLogs)
   - 졸업생 데이터 삭제 정책

#### 2.1.2 Implementation Plan

**Week 9-10: 통합 인증 시스템** (Day 50-63, 14일)
- Day 50-52: Users 시트 생성 및 마이그레이션
- Day 53-56: 통합 인증 로직 (AuthService v2.0)
- Day 57-59: 기존 Login.html 리팩토링
- Day 60-63: Integration & Testing

**Week 11-12: 학생 회원가입** (Day 64-77, 14일)
- Day 64-67: SignUp.html 프론트엔드
- Day 68-71: 이메일 인증 시스템
- Day 72-74: 비밀번호 재설정
- Day 75-77: Integration & Testing

**Week 13: 개인정보보호법 준수** (Day 78-84, 7일)
- Day 78-80: PrivacyConsents, EmailLogs 시트
- Day 81-82: 개인정보 동의 화면
- Day 83-84: 정기 알림 Trigger (6개월)

**총 소요**: 3주 (21일)

#### 2.1.3 Expected Deliverables

**Backend** (예상 1,500+ lines):
- AuthService.gs v2.0 (통합 인증)
- SignUpService.gs (회원가입)
- EmailService.gs (이메일 발송)
- PrivacyService.gs (개인정보 관리)

**Frontend** (예상 1,200+ lines):
- SignUp.html (회원가입 페이지)
- ForgotPassword.html (비밀번호 찾기)
- PrivacyConsent.html (개인정보 동의)
- Login.html (리팩토링)

**Sheets** (3개 신규):
- Users (통합 인증)
- PrivacyConsents (개인정보 동의)
- EmailLogs (이메일 기록)

**i18n Keys**: 40-50개 추가 (한국어/베트남어)

**총 코드**: ~2,700 lines

#### 2.1.4 Benefits

**비즈니스 가치**:
1. ✅ 학생 자율성 증가 (본인이 직접 정보 입력)
2. ✅ 유학원 업무 부담 감소 (데이터 입력 자동화)
3. ✅ 개인정보보호법 완전 준수
4. ✅ 학생 경험 개선 (자기주도적 정보 관리)

**기술적 가치**:
1. ✅ 확장 가능한 인증 아키텍처
2. ✅ 이메일 기반 ID/비밀번호 찾기
3. ✅ 감사 로그 완전성 강화
4. ✅ 법적 리스크 제거

---

### Option 2: 성능 최적화 및 안정화 🥈

**Priority**: Medium
**Complexity**: Medium
**Estimated Effort**: 1-2주 (7-14일)

#### 2.2.1 Optimization Goals

**성능 목표**:
- Analytics: 1000명 데이터 분석 <3초 (현재 예상 <5초)
- 파일 업로드: 10MB <20초 (현재 예상 <30초)
- CSV Import: 100명 <5초 (현재 예상 <10초)

**안정성 목표**:
- 에러 발생률 <0.1%
- 알림 발송 성공률 >98% (현재 >95%)
- 동시 접속 50명 지원

#### 2.2.2 Implementation Plan

**Week 9: 성능 측정 및 분석** (Day 50-56, 7일)
- Day 50-51: 실제 배포 환경 성능 테스트
- Day 52-53: 병목 지점 식별 (Profiling)
- Day 54-55: 최적화 방안 수립
- Day 56: 보고서 작성

**Week 10: 최적화 구현** (Day 57-63, 7일)
- Day 57-59: 캐싱 전략 구현 (CacheService 활용)
- Day 60-61: 쿼리 최적화 (Sheets 읽기/쓰기)
- Day 62-63: Integration & Testing

**총 소요**: 2주 (14일)

#### 2.2.3 Expected Deliverables

**최적화 항목**:
- CacheService 전략 강화
- Sheets 읽기 최적화 (batch read)
- 중복 API 호출 제거
- 프론트엔드 렌더링 최적화

**문서**:
- 성능 테스트 보고서
- 최적화 가이드
- 모니터링 대시보드 (선택)

---

### Option 3: 추가 기능 개발 (Step 4) 🥉

**Priority**: Low
**Complexity**: Varies
**Estimated Effort**: Depends on features

#### 2.3.1 Candidate Features

**데이터 분석 확장**:
- 예측 분석 (TOPIK 성적 예측 AI)
- 대학 매칭 추천 시스템
- 학생 성공률 예측 모델

**커뮤니케이션 강화**:
- 학생 포털 (본인 정보 조회)
- 학부모 포털 (자녀 정보 조회)
- 실시간 채팅 (유학원 ↔ 학생)

**업무 자동화**:
- 대학 지원서 자동 생성
- 추천서 템플릿 시스템
- 비자 연장 자동 알림

**모바일 앱**:
- React Native 앱 개발
- 푸시 알림
- 오프라인 모드

#### 2.3.2 Recommendation

현재 단계에서는 **Option 3는 추천하지 않습니다**.

**이유**:
1. 기존 기능 안정화 우선
2. 사용자 피드백 수집 필요
3. ROI (투자 대비 효과) 불명확

---

## 3. Recommended Decision Tree

```
사용자 유형 확인
├─ 학생 직접 사용 필요? → YES → Option 1 (학생 회원가입) 🥇
│                          → NO  → Option 2 (성능 최적화) 🥈
│
└─ 현재 성능 문제 있음? → YES → Option 2 (성능 최적화) 🥈
                        → NO  → 배포 및 사용자 피드백 수집 → Option 3
```

---

## 4. Final Recommendation

### 4.1 Recommended Path: **Option 1 (학생 회원가입)** 🥇

**근거**:
1. **Schema v2.0 이미 계획됨**: 프로젝트 초기부터 학생 회원가입 고려
2. **법적 준수**: 개인정보보호법 완전 준수 (리스크 제거)
3. **확장성**: 향후 학생 포털, 학부모 포털 기반 마련
4. **사용자 경험**: 학생 자율성 증가, 유학원 업무 감소

**실행 계획**:
1. Week 9-10: 통합 인증 시스템 (14일)
2. Week 11-12: 학생 회원가입 (14일)
3. Week 13: 개인정보보호법 준수 (7일)
4. **총 3주 (21일)**

**예상 성과**:
- ~2,700 lines 코드 추가
- 3개 신규 Sheet (Users, PrivacyConsents, EmailLogs)
- 40-50개 i18n 키 추가
- 법적 리스크 제거
- 학생 경험 대폭 개선

---

### 4.2 Alternative Path: **Option 2 (성능 최적화)** 🥈

**적용 조건**:
- 학생 직접 사용 불필요
- 현재 성능 문제 발생
- 빠른 배포 필요

**실행 계획**:
1. Week 9: 성능 측정 및 분석 (7일)
2. Week 10: 최적화 구현 (7일)
3. **총 2주 (14일)**

**예상 성과**:
- 30-50% 성능 향상
- 안정성 개선
- 모니터링 대시보드

---

## 5. Next Actions

### 5.1 If Option 1 Selected

**Immediate**:
1. Schema v2.0 상세 설계 (Users, PrivacyConsents, EmailLogs)
2. AuthService v2.0 마이그레이션 계획
3. 이메일 발송 API 선정 (Gmail API 확인)

**Week 9-10**:
- 통합 인증 시스템 구현
- 기존 시스템 마이그레이션

**Week 11-12**:
- 학생 회원가입 구현
- 이메일 인증 시스템

**Week 13**:
- 개인정보보호법 준수 기능
- 배포 및 테스트

---

### 5.2 If Option 2 Selected

**Immediate**:
1. 배포 환경 구성
2. 성능 테스트 도구 준비
3. Profiling 계획 수립

**Week 9**:
- 실제 성능 측정
- 병목 지점 식별

**Week 10**:
- 최적화 구현
- 재테스트

---

## 6. Decision Required

**질문**: 다음 개발 방향을 선택해 주세요.

**Options**:
1. 🥇 **Option 1: 학생 회원가입 시스템** (추천)
   - 3주 (21일)
   - ~2,700 lines
   - 법적 준수 + 사용자 경험 개선

2. 🥈 **Option 2: 성능 최적화 및 안정화**
   - 2주 (14일)
   - 30-50% 성능 향상
   - 안정성 개선

3. 🥉 **Option 3: 배포 및 사용자 피드백 수집**
   - 1주 (7일)
   - 실제 사용 환경 검증
   - 피드백 기반 개선 계획

**또는**:
- **"옵션 1 해줘"** - 학생 회원가입 시스템 시작
- **"옵션 2 해줘"** - 성능 최적화 시작
- **"배포부터 해줘"** - 배포 및 테스트 먼저

---

**Generated by**: bkit Planning System
**Date**: 2026-02-16
**Project**: AJU E&J 학생관리 프로그램
**Level**: Dynamic
