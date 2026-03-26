# security-hardening Gap Analysis

**Feature**: security-hardening
**Phase**: Check
**Date**: 2026-03-26
**Match Rate**: 100% (9/9)
**Status**: PASS

---

## 검증 대상 항목 (9/9 PASS)

### Critical (4/4)

| ID | 파일 | 설계 요구사항 | 구현 증거 | 결과 |
|----|------|--------------|-----------|------|
| C-1 | `app/api/register/route.ts` | `app_metadata: { role: 'student' }`, user_metadata에서 role 제거 | L25-26: `user_metadata: { name_kr }`, `app_metadata: { role: 'student' }` | PASS |
| C-2 | `app/api/audit/route.ts` | user_id는 `user.id`, user_role은 `app_metadata`에서 추출 | L37: `user.id`, L38: `(user.app_metadata as { role?: string })?.role ?? null` | PASS |
| C-4 | `lib/auth.ts` | 기본 role을 `'student'`으로 변경 (최소 권한) | L13: `app.role ?? 'student'` | PASS |
| C-5 | `app/api/student-withdraw/route.ts` | 감사 로그 insert에 `await` 추가 | L29: `await supabaseAdmin.from('audit_logs').insert({...})` | PASS |

### High (4/4)

| ID | 파일 | 설계 요구사항 | 구현 증거 | 결과 |
|----|------|--------------|-----------|------|
| H-1 | `app/api/life-record-pdf/route.ts` | student IDOR 검증: auth_user_id 비교 | L31: `role ?? 'student'`, L40-45: student 분기 403 반환 | PASS |
| H-2 | `app/api/life-record-pdf-bulk/route.ts` | student 역할 일괄 다운로드 차단 | L85-87: `if (role === 'student') return 403` | PASS |
| H-3 | `app/api/exam-ai-analysis/route.ts` | 소유권 검증 + 에러 메시지 정제 | L23-35: 3단 IDOR 검증, L20: 환경변수명 미노출 | PASS |
| H-4 | `app/api/document-types/route.ts` | GET에서 `getAnonClient()` 사용 | L16: `getAnonClient()`, `getAuthedUser`도 교체 완료 | PASS |

### Medium (1/1)

| ID | 파일 | 설계 요구사항 | 구현 증거 | 결과 |
|----|------|--------------|-----------|------|
| M-2 | `next.config.ts` | 보안 헤더 5개 | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control 모두 일치 | PASS |

### 제외 항목 (코드 변경 없음)

| ID | 항목 | 제외 사유 |
|----|------|-----------|
| C-3 | .env.local 시크릿 관리 | 수동 조치 (git history 확인 + key rotation) |
| H-5 | middleware.ts JWT 검증 | Design에서 "미구현 — 향후 스프린트"로 명시 |

---

## 보안 패턴 준수 (6/6)

| 원칙 | 검증 항목 | 결과 |
|------|-----------|------|
| Role은 app_metadata에만 저장 | C-1, C-4 | PASS |
| 감사 로그 user 정보 JWT 추출 | C-2 | PASS |
| 기본 권한 student (최소 권한) | C-4, H-1, H-2, H-3 모두 `?? 'student'` | PASS |
| IDOR 방지 (소유권 검증) | H-1, H-3 | PASS |
| Service Role 최소화 | H-4 anon client 전환 | PASS |
| 에러 메시지 내부 정보 미노출 | H-3, H-4 | PASS |

---

## 최종 점수

```
Match Rate: 100% (9/9 코드 변경 항목)
보안 패턴: 100% (6/6 원칙)
TypeScript: 0 errors
```

## 향후 권고 사항 (Low Priority)

| 항목 | 설명 |
|------|------|
| H-5 middleware.ts | Edge middleware JWT 검증 도입 검토 |
| CSP 헤더 | Report-Only 모드로 단계적 도입 |
| Rate Limiting | Vercel Edge 또는 Upstash Redis |
| npm audit fix | flatted HIGH, ajv MODERATE 패키지 업데이트 |
| C-3 Key Rotation | Supabase/Gemini/Resend 시크릿 주기적 교체 체계 |
