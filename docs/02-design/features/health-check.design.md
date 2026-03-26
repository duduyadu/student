# 헬스 체크 API (Health Check) — Design

## 1. 개요

플랫폼의 핵심 외부 의존성 및 주요 API 라우트 생존 여부를 단일 엔드포인트로 확인하는 헬스 체크 시스템이다.
Vercel 헬스체크, 외부 모니터링 서비스, 또는 운영자가 브라우저에서 직접 호출하여 플랫폼 상태를 즉시 파악할 수 있다.

- **엔드포인트**: `GET /api/health`
- **인증**: 불필요 (공개 접근 허용)
- **구현 파일**: `app/api/health/route.ts`

---

## 2. 체크 항목

| 순서 | 이름 | 체크 방법 | 타임아웃 기준 |
|------|------|-----------|--------------|
| 1 | Supabase DB | `students` 테이블 COUNT 쿼리 (head: true) | 2,000ms 초과 시 warn |
| 2 | Gemini AI | `gemini-2.5-flash` 모델에 'ping' 콘텐츠 생성 요청 | 5,000ms 초과 시 warn |
| 3 | PDF 생성 API | `GET /api/life-record-pdf?studentId=health-check` HEAD 요청 | fetch AbortSignal 5,000ms |
| 4 | Excel 업로드 API | `GET /api/mock-exam-import` HEAD 요청 | fetch AbortSignal 5,000ms |
| 5 | AI 분석 API | `GET /api/exam-ai-analysis?studentId=health-check` HEAD 요청 | fetch AbortSignal 5,000ms |
| 6 | 비자 알림 Cron | `GET /api/cron/visa-alerts` HEAD 요청 | fetch AbortSignal 5,000ms |

### 2-1. Supabase DB 체크 상세

```
sb.from('students').select('id', { count: 'exact', head: true })
```

- 실제 행 데이터를 가져오지 않고 COUNT만 요청하여 DB 연결 상태를 최소 비용으로 확인한다.
- RLS를 우회하는 Service Role 클라이언트(`getServiceClient()`)를 사용하므로 권한 오류가 발생하지 않는다.
- 오류 발생 시 → `error`, 응답에 2,000ms 초과 시 → `warn`, 정상 시 → `ok`

### 2-2. Gemini AI 체크 상세

- `GEMINI_API_KEY` 환경변수가 미설정이면 즉시 `error` 상태로 기록한다 (네트워크 요청 없음).
- API 키가 있으면 실제 `generateContent('ping')` 호출로 API 연결 가능 여부를 검증한다.
- 응답에 5,000ms 초과 시 → `warn`

### 2-3. API 라우트 체크 상세

- 각 라우트에 `GET` 요청을 보내 HTTP 상태 코드를 확인한다.
- 라우트가 존재하지만 파라미터 부족으로 400/404/500을 반환하는 경우는 `warn`으로 처리한다 (라우트 자체는 살아있음을 의미).
- `AbortSignal.timeout(5000)`으로 응답 대기를 5초로 제한한다.
- 베이스 URL은 `NEXT_PUBLIC_SITE_URL` 환경변수를 사용하며, 미설정 시 `http://localhost:3000`으로 폴백한다.

---

## 3. 응답 형식

### 3-1. 상태값 정의

| 상태 | 의미 |
|------|------|
| `ok` | 정상 동작 |
| `warn` | 동작하지만 응답이 느리거나 예상 외 HTTP 코드 반환 |
| `error` | 완전 실패 (연결 불가, API 키 미설정, 예외 발생) |

### 3-2. 응답 JSON 구조

```json
{
  "ok": true,
  "checkedAt": "2026-03-26T12:00:00.000Z",
  "checks": [
    { "name": "Supabase DB",      "status": "ok",   "ms": 120 },
    { "name": "Gemini AI",        "status": "ok",   "ms": 843 },
    { "name": "PDF 생성 API",     "status": "warn", "ms": 210 },
    { "name": "Excel 업로드 API", "status": "ok",   "ms": 98  },
    { "name": "AI 분석 API",      "status": "warn", "ms": 195 },
    { "name": "비자 알림 Cron",   "status": "ok",   "ms": 88  }
  ]
}
```

### 3-3. 최상위 `ok` 필드

- 모든 체크가 `ok` 또는 `warn`이면 → `true`
- 하나라도 `error`이면 → `false`

### 3-4. `detail` 필드 의도적 제거

응답에서 `detail` 필드를 제거한다. 이는 내부 오류 메시지, API 키 설정 상태 등 민감 정보가 외부에 노출되는 것을 방지하기 위함이다. 오류 상세는 서버 로그에서만 확인한다.

---

## 4. 보안 — 인증 없이 접근 가능한 이유

헬스 체크 API는 의도적으로 인증을 요구하지 않는다.

| 이유 | 설명 |
|------|------|
| 모니터링 도구 호환 | Vercel, UptimeRobot 등 외부 모니터링 서비스는 인증 헤더를 추가하기 어렵다 |
| 노출 정보 최소화 | `detail` 필드를 제거하여 민감 정보는 응답에 포함되지 않는다 |
| 읽기 전용 | DB에 쓰기 작업을 수행하지 않으므로 악용 가능성이 낮다 |
| 내부 오류 불노출 | 에러 메시지/스택트레이스는 서버 로그에만 기록된다 |

노출되는 정보는 각 체크 이름, `ok/warn/error` 상태, 응답 시간(ms)뿐이다.

---

## 5. 모니터링 활용 방안

### 5-1. Vercel 헬스체크 설정

`vercel.json`에 헬스체크 경로를 등록하면 배포 시 자동으로 상태를 확인한다.

```json
{
  "crons": [...],
  "healthCheck": {
    "path": "/api/health"
  }
}
```

### 5-2. 외부 모니터링 서비스

| 서비스 | 설정 방법 |
|--------|-----------|
| UptimeRobot | HTTP(S) 모니터 → URL: `https://{도메인}/api/health` → `"ok":true` 키워드 감지 |
| Better Uptime | HTTP 모니터 → 상태 코드 200 + JSON 키 `ok = true` |
| Vercel Monitoring | 자동 (위 `healthCheck` 설정 시) |

### 5-3. 알림 기준 권고

| 조건 | 권고 행동 |
|------|-----------|
| `ok: false` (error 포함) | 즉시 알림 (PagerDuty, 슬랙 등) |
| Supabase DB `warn` (ms > 2000) | 경고 알림 + DB 연결 수 확인 |
| Gemini AI `warn` (ms > 5000) | 경고 알림 + Gemini API 할당량 확인 |
| 모든 체크 `ok` | 정상 (알림 불필요) |

### 5-4. 로컬 개발 시 직접 확인

```bash
curl http://localhost:3000/api/health | jq .
```

---

## 6. 환경변수 의존성

| 변수 | 필수 여부 | 용도 |
|------|-----------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 필수 | Supabase DB 체크 |
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 | Supabase 연결 |
| `GEMINI_API_KEY` | 선택 | 미설정 시 Gemini 체크 → error |
| `NEXT_PUBLIC_SITE_URL` | 권장 | API 라우트 체크 베이스 URL (미설정 시 localhost:3000) |

---

**작성일**: 2026-03-26
**구현 파일**: `app/api/health/route.ts`
