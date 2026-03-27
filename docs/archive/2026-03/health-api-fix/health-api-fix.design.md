# API 보안 강화 Design

**Feature**: health-api-fix
**Phase**: Design
**Status**: In Progress
**Created**: 2026-03-27

---

## 1. health API 인증 설계

### 현재 문제
```
GET /api/health → 인증 없이 Gemini model.generateContent('ping') 호출
→ 외부에서 반복 호출 시 Gemini API 크레딧 무한 소모
```

### 해결: CRON_SECRET 헤더 인증

```typescript
// 요청 헤더: Authorization: Bearer {CRON_SECRET}
const secret = process.env.CRON_SECRET
const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
if (!secret || token !== secret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

- `CRON_SECRET` 환경변수 사용 (Vercel Cron에서도 동일 방식 사용 중)
- 이미 `vercel.json` Cron 설정에 `CRON_SECRET` 패턴 사용 중 → 일관성 유지
- `/api/health`는 모니터링 도구나 Cron에서만 호출하므로 secret 방식이 적합

---

## 2. register API 서버 검증 설계

### 현재 문제
```
POST /api/register → body에서 값 추출 후 바로 Supabase 호출
→ 서버 측 검증 없음, 클라이언트 우회 시 비정상 데이터 저장 가능
```

### 해결: 필수 필드 + 형식 검증

```typescript
// email 형식 검증
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!email || !emailRegex.test(email)) {
  return NextResponse.json({ error: '유효한 이메일을 입력해주세요.' }, { status: 400 })
}

// 비밀번호 최소 길이
if (!password || password.length < 8) {
  return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
}

// 필수 이름 필드
if (!name_kr || !name_vn) {
  return NextResponse.json({ error: 'name_kr, name_vn은 필수입니다.' }, { status: 400 })
}
```

- Supabase가 기본 검증을 하지만 의미있는 에러 메시지 반환을 위해 사전 검증 추가
- 검증 위치: body 추출 직후, adminClient 호출 전

---

## 3. student-withdraw 역할 검증 설계

### 현재 문제
```
POST /api/student-withdraw → 인증된 모든 역할이 호출 가능
→ master/agency가 실수로 호출 시 본인 auth_user_id와 연결된 학생이 비활성화
```

### 해결: student 역할만 허용

```typescript
const role = (user.app_metadata?.role as string) ?? ''
if (role !== 'student') {
  return NextResponse.json({ error: '학생만 탈퇴할 수 있습니다.' }, { status: 403 })
}
```

- user 인증 후, 비즈니스 로직 실행 전에 추가

---

## 4. 미사용 패키지 제거

```bash
npm uninstall @supabase/auth-helpers-nextjs
```

- `@supabase/ssr`만 사용 (middleware.ts)
- `@supabase/auth-helpers-nextjs`는 코드 어디에서도 import 없음

---

## 5. 완료 기준

- [ ] `/api/health` 인증 없는 GET → 401
- [ ] `/api/health` `Authorization: Bearer {CRON_SECRET}` → 200
- [ ] `/api/register` 이메일 형식 오류 → 400
- [ ] `/api/register` 비밀번호 8자 미만 → 400
- [ ] `/api/register` name_kr 누락 → 400
- [ ] `/api/student-withdraw` master/agency 역할 → 403
- [ ] TypeScript 오류 0개
