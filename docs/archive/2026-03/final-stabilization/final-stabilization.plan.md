# Plan: final-stabilization
> AJU E&J 베트남 유학생 관리 플랫폼 — 최종 완료 정리 및 테스트 가이드

**Created**: 2026-03-02
**Status**: Plan
**Priority**: High
**Scope**: 프로젝트 최종 안정화 + 사용자 가이드 문서 작성

---

## 1. 목표 (Objective)

지금까지 개발·완료된 기능 전체를 최종 정리하고, 베트남 현지 직원이 처음부터 독립적으로 테스트할 수 있도록 한국어/베트남어 가이드 문서를 제공한다.

---

## 2. 현재 완료된 기능 목록 (Completed Features)

| # | 기능 | 담당 화면 | 상태 |
|---|------|-----------|------|
| 1 | 학생 CRUD (목록/상세/추가/수정/소프트삭제) | /students | ✅ |
| 2 | 유학원 관리 (계정생성/비밀번호초기화/이메일확인) | /agencies | ✅ |
| 3 | 비자 만료 알림 Cron (매일 01:00 UTC) | /api/cron/visa-alerts | ✅ |
| 4 | 서류 체크리스트 알림 Cron (매일 01:10 UTC) | /api/cron/document-alerts | ✅ |
| 5 | Excel 학생 일괄 등록 | /students/import | ✅ |
| 6 | 통계/리포트 페이지 | /reports | ✅ |
| 7 | 학생 자가 등록 포털 | /portal | ✅ |
| 8 | 생활기록부 PDF (KO+VI 동시) | /api/life-record-pdf | ✅ |
| 9 | 생활기록부 PDF 일괄 ZIP 다운로드 | /api/life-record-pdf-bulk | ✅ |
| 10 | 상담 타임라인 CRUD | 학생상세 > 상담탭 | ✅ |
| 11 | 시험 성적 CRUD (TOPIK I, 200점 만점) | 학생상세 > 시험탭 | ✅ |
| 12 | 선생님 평가 | 학생상세 > 평가탭 | ✅ |
| 13 | 성적 차트 (추이/레이더) | 학생상세 > 시험탭 | ✅ |
| 14 | AI 분석 (Gemini 2.5-flash) | 학생상세 > 시험탭 | ✅ |
| 15 | 비자 서류 체크리스트 (관리자+포털) | 학생상세 + /portal | ✅ |
| 16 | 학생 프로필 사진 업로드 | 학생상세/수정폼 | ✅ |
| 17 | 대시보드 — 서류현황/비자경보/TOPIK분포/최근활동 | / | ✅ |
| 18 | 서류 상태 이메일 알림 (Resend) | 관리자 서류승인/반려 시 | ✅ |
| 19 | 학생 목록 사진 썸네일 | /students | ✅ |
| 20 | TOPIK 시험 일정 동기화 | 학생상세 > 시험탭 | ✅ |
| 21 | 학생 포털 개선 (서류탭, 비밀번호변경, 탈퇴) | /portal | ✅ |

---

## 3. 코드 안정화 — 잔여 권고사항 (Remaining Recommendations)

아래는 즉각 필수는 아니지만 운영 전 권고되는 사항들이다.

### 3.1 낮은 우선순위 개선 (Optional)
- [ ] TypeScript `any` 타입 제거 → 명확한 타입 지정
- [ ] 미사용 import 정리
- [ ] API 응답 일관성 검토 (모든 API가 동일한 에러 형식 반환하는지)
- [ ] 콘솔 `console.error` → 프로덕션에서 외부 로그 서비스 연동 고려

### 3.2 운영 전 필수 확인 (Must-Check Before Go-Live)
- [ ] Vercel 환경변수 설정 확인: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `GEMINI_API_KEY`
- [ ] Supabase RLS 정책 최종 확인 (master/agency/student 역할 격리)
- [ ] 이메일 발송 도메인 인증 (Resend 대시보드에서 도메인 추가)
- [ ] Cron 작업 Vercel Hobby 제한 확인 (Pro 플랜 권고)

### 3.3 향후 기능 추가 후보 (Future Roadmap)
- 알림톡/SMS 연동 (현재는 이메일만)
- 학부모 연락처 포털
- 파일 첨부 업로드 (Supabase Storage 활용)
- 다중 시험 회차 일괄 등록

---

## 4. 산출물 (Deliverables)

| 파일 | 설명 |
|------|------|
| `docs/05-guides/테스트_가이드_한국어.txt` | 한국어 전체 테스트 가이드 |
| `docs/05-guides/Huong_dan_kiem_tra_tieng_Viet.txt` | 베트남어 전체 테스트 가이드 |

---

## 5. 성공 기준 (Success Criteria)

- 베트남 현지 직원이 가이드만으로 전체 기능을 독립적으로 테스트할 수 있다.
- master / agency / student 3개 역할 전체 테스트 시나리오 포함.
- 각 테스트 항목에 기대 결과(Expected Result) 명시.
