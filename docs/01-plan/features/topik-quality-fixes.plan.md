# Plan: topik-quality-fixes

> AJU E&J 플랫폼 보안·감사·인증 이슈 수정 — 정적 분석 94건 중 CRITICAL/HIGH 우선 처리

**Feature**: topik-quality-fixes
**Created**: 2026-03-30
**Status**: Completed
**Priority**: High
**Estimated Scope**: Medium (8개 파일)

---

## 1. 배경 및 목적

`bkit:code-analyzer` 정적 분석 결과 총 94건(API 36 + Frontend/TOPIK 58) 이슈 확인.
CRITICAL/HIGH 우선순위 항목만 선별하여 즉시 수정.

주요 문제:
- **XSS 취약점**: 이메일 HTML 템플릿에 사용자 데이터 미이스케이프
- **감사 로그 누락**: 클라이언트 CUD 컴포넌트에 `logAudit()` 미호출
- **인증 헤더 누락 (T-001 CRITICAL)**: Excel 업로드 API 항상 401 반환
- **인증 헤더 누락 (F-010)**: AI 분석 API 항상 401 반환
- **parseInt 기수 누락 (T-012)**: `parseInt(roundNumber)` → 8진수 해석 위험

## 2. 범위 및 목표

### IN SCOPE

| ID | 이슈 | 심각도 |
|----|------|--------|
| SEC-1 | `lib/email.ts` HTML XSS | HIGH |
| SEC-2 | `cron/visa-alerts` HTML XSS | HIGH |
| SEC-3 | `cron/document-alerts` HTML XSS | HIGH |
| AUD-1 | `ConsultTimeline.tsx` 감사 로그 누락 | HIGH |
| AUD-2 | `EvaluationPanel.tsx` 감사 로그 누락 | HIGH |
| AUD-3 | `AspirationTracker.tsx` 감사 로그 누락 | HIGH |
| AUD-4 | `page.tsx` exam_results 감사 로그 누락 | MEDIUM |
| T-001 | Excel 업로드 Authorization 헤더 누락 | CRITICAL |
| F-010 | AI 분석 Authorization 헤더 누락 | HIGH |
| T-012 | `parseInt` 기수(radix) 누락 | MEDIUM |

### OUT OF SCOPE
- LOW/INFO 등급 이슈 (94건 중 나머지)
- 컴포넌트 리팩토링 및 새 기능 추가
- i18n 추가 작업

### 완료 기준
- XSS 이스케이프 100% 적용
- CUD 감사 로그 100% 적용 (클라이언트 컴포넌트)
- Excel/AI API 401 오류 해소
- TypeScript 컴파일 에러 0건

## 3. 구현 접근법

### Step 1: 공통 유틸리티 생성
- `lib/auditClient.ts` 생성: 클라이언트 컴포넌트용 감사 로그 헬퍼

### Step 2: XSS 수정
- 각 이메일 빌더 파일에 `escapeHtml()` 추가
- 사용자 제공 데이터를 HTML 삽입 전 이스케이프

### Step 3: 감사 로그 추가
- 각 컴포넌트 handleSave/handleDelete에 `logAudit()` 호출
- Supabase 에러 처리도 함께 보강

### Step 4: 인증 헤더 수정
- `getSession()` 호출 후 `Authorization: Bearer` 헤더 추가

## 4. 리스크

| 리스크 | 대응 |
|--------|------|
| 감사 로그 실패가 메인 작업 중단 | `auditClient.ts`에서 오류 무시(silent fail) |
| 인증 세션 없을 때 fetch 실패 | 세션 없으면 헤더 미포함으로 처리 (기존 동작 유지) |

## 5. 참고

- 정적 분석: 2026-03-30 `bkit:code-analyzer` (94건)
- `lib/auditClient.ts` 신규 생성 (클라이언트 전용)
- CLAUDE.md: "모든 CUD 작업 시 감사 로그 기록"
