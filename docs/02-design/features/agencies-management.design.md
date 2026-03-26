# 유학원 관리 (Agencies Management) — Design

## 1. 개요

베트남 현지 유학원(파트너사)의 정보를 등록·관리하고, 각 유학원에 로그인 계정을 부여하는 기능이다.
master 역할 전용 페이지(`/agencies`)이며, agency 역할 사용자는 접근 불가.

유학원 레코드와 Supabase Auth 계정은 별도로 관리된다. 유학원 정보(agencies 테이블)는 계정 없이도 생성할 수 있고, 이후 별도로 계정을 연결할 수 있다.

---

## 2. 기능 목록

| 기능 | 설명 |
|------|------|
| 유학원 목록 조회 | agency_number 오름차순 정렬, 전체 건수 표시 |
| 유학원 신규 등록 | 베트남명(필수), 한국명, 담당자, 연락처, 로그인 계정(선택) |
| 유학원 정보 수정 | 인라인 수정 폼 (agency_code, agency_number 변경 불가) |
| 활성/비활성 토글 | is_active 플래그 소프트 삭제 방식 |
| 계정 추가 | 계정 없는 유학원에 이메일+비밀번호 계정 생성 및 연결 |
| 비밀번호 재설정 | 연결된 계정의 비밀번호를 master가 직접 변경 |
| 계정 이메일 표시 | 연결된 Supabase Auth 계정의 이메일 조회 및 표시 |

---

## 3. 데이터 모델 (agencies 테이블 컬럼)

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `id` | UUID | O | PK, 자동 생성 |
| `agency_code` | VARCHAR | O | 3자리 자동 부여 (001, 002, ...) |
| `agency_number` | INTEGER | O | 순번, 코드 계산 기준값 |
| `agency_name_kr` | VARCHAR | O | 한국어 명칭 |
| `agency_name_vn` | VARCHAR | — | 베트남어 명칭 (필수 입력 필드) |
| `contact_person` | VARCHAR | — | 담당자 이름 |
| `contact_phone` | VARCHAR | — | 담당자 연락처 |
| `user_id` | UUID | — | Supabase Auth 연결 계정 ID (FK → auth.users) |
| `is_active` | BOOLEAN | O | 활성 여부 (기본값 true) |
| `created_at` | TIMESTAMPTZ | O | 생성일시 (자동) |

### agency_code 자동 부여 규칙

```
nextNumber = max(agency_number) + 1   // 기존 유학원이 없으면 1
agency_code = String(nextNumber).padStart(3, '0')  // "001", "002", ...
```

---

## 4. API 명세

### 4-1. `GET /api/agency-accounts`

유학원 계정 이메일 일괄 조회 (master 전용)

**Request**
```
Authorization: Bearer {access_token}
Query: user_ids=uuid1,uuid2,...
```

**Response `200`**
```json
{
  "{user_id}": "agency@example.com",
  "{user_id}": "other@example.com"
}
```

**오류 응답**
| 상태 | 조건 |
|------|------|
| 401 | Authorization 헤더 없음 |
| 403 | 호출자 역할이 master가 아님 |

**구현 방식**: `supabaseAdmin.auth.admin.getUserById(uid)` 를 각 user_id별로 병렬 호출.

---

### 4-2. `POST /api/create-agency-user`

유학원 신규 등록 시 계정 동시 생성 (master 전용)

**Request**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```
```json
{
  "email": "agency@example.com",
  "password": "••••••••",
  "agency_code": "003",
  "agency_name_kr": "하노이 유학원"
}
```

**Response `200`**
```json
{ "user_id": "{생성된 auth.users UUID}" }
```

**처리 흐름**
1. 호출자 토큰 검증 → role === 'master' 확인
2. `supabaseAdmin.auth.admin.createUser()` 로 계정 생성
   - `email_confirm: true` (이메일 인증 자동 완료)
   - `app_metadata.role = 'agency'`
   - `app_metadata.agency_code = {agency_code}`
3. 생성된 `user.id` 반환 → 클라이언트에서 agencies 테이블 insert 시 `user_id`로 저장

**오류 응답**
| 상태 | 조건 |
|------|------|
| 400 | email/password/agency_code 누락, 또는 Supabase Auth 오류 |
| 401 | Authorization 헤더 없음 |
| 403 | 호출자 역할이 master가 아님 |

---

### 4-3. `POST /api/add-agency-account`

기존 유학원(계정 없음)에 계정 추가 및 연결 (master 전용)

**Request**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```
```json
{
  "email": "staff@agency.com",
  "password": "••••••••",
  "agency_id": "{agencies.id UUID}",
  "agency_code": "003",
  "agency_name_kr": "하노이 유학원"
}
```

**Response `200`**
```json
{ "user_id": "{생성된 auth.users UUID}" }
```

**처리 흐름**
1. 호출자 토큰 검증 → role === 'master' 확인
2. `supabaseAdmin.auth.admin.createUser()` 로 계정 생성 (create-agency-user와 동일 방식)
3. 대상 유학원의 `user_id` 가 null인 경우에만 `agencies.user_id` 업데이트 (첫 번째 계정 연결)

**create-agency-user와의 차이점**
- `agency_id` 파라미터를 받아 agencies 테이블의 `user_id` 컬럼을 서버 측에서 직접 업데이트
- 기존 agencies 레코드가 이미 존재하는 상태에서 계정을 후속 연결할 때 사용

---

### 4-4. `POST /api/reset-agency-password`

연결된 계정의 비밀번호 재설정 (master 전용)

**Request**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```
```json
{
  "user_id": "{auth.users UUID}",
  "new_password": "newpass123"
}
```

**Response `200`**
```json
{ "success": true }
```

**유효성 검증**
- `new_password` 길이 8자 미만 → 400 오류

**처리 방식**: `supabaseAdmin.auth.admin.updateUserById(user_id, { password })`

---

## 5. RLS 정책

agencies 테이블에 대한 RLS는 역할 기반으로 적용된다.

| 역할 | SELECT | INSERT | UPDATE | DELETE |
|------|:------:|:------:|:------:|:------:|
| master | 전체 | O | 전체 | X |
| agency | 본인 행만 (`user_id = auth.uid()`) | X | 본인 행만 | X |
| 미인증 | X | X | X | X |

계정 생성·비밀번호 재설정 API는 Supabase Auth Admin API를 사용하므로 RLS 우회 (서버 전용 Service Role Key 사용). 클라이언트에서는 RLS가 적용된 anon key만 사용.

---

## 6. UI 구성

### 레이아웃 (`/agencies`)

```
[유학원 관리 (N개)]                    [+ 유학원 등록] ← master만
────────────────────────────────────────────────────────

▼ [신규 등록 폼] (showForm === true 시 표시)
  ┌─────────────────────────────────────────────────────┐
  │ 코드: 자동 부여 (003)                                │
  │ 베트남 명칭* │ 한국 명칭                             │
  │ 담당자       │ 연락처                                │
  │ ─── 로그인 계정 생성 (선택) ───                     │
  │ 이메일       │ 비밀번호                              │
  │ [취소] [유학원 등록]                                 │
  └─────────────────────────────────────────────────────┘

▼ 유학원 목록 (카드 리스트, agency_number 오름차순)
┌────────────────────────────────────────────────────────┐
│ 001  Trung tâm du học Hà Nội   담당자   연락처         │
│      하노이 유학원              [활성]  [계정있음]      │
│                                 이메일: agency@ex.com   │
│              [수정] [비밀번호 재설정] [비활성화]        │
│ ─ (비밀번호 재설정 인라인 패널: 보라색 배경) ──────── │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│ 002  Công ty ABC                담당자   연락처         │
│                                 [활성]  [계정없음]      │
│              [수정] [계정 추가] [비활성화]              │
│ ─ (계정 추가 인라인 패널: 파란색 배경) ─────────────  │
└────────────────────────────────────────────────────────┘
```

### 상태 뱃지

| 상태 | 색상 |
|------|------|
| 활성 | 초록 (`emerald`) |
| 비활성 | 회색 (`slate`) |
| 계정있음 | 파란 (`blue`) |
| 계정없음 | 회색 (`slate`) |

### 인라인 패널

- **계정 추가 패널**: 파란색(`bg-blue-50`) 배경, 이메일+비밀번호 입력
- **비밀번호 재설정 패널**: 보라색(`bg-violet-50`) 배경, 현재 연결 이메일 표시 + 새 비밀번호 입력
- **수정 패널**: 흰색 배경, 4개 필드 수정 (agency_code는 읽기 전용 뱃지로 표시)

---

## 7. 역할별 접근 권한

| 기능 | master | agency | student |
|------|:------:|:------:|:-------:|
| `/agencies` 페이지 접근 | O | X (→ `/` 리디렉트) | X |
| 유학원 목록 조회 | O | X | X |
| 유학원 신규 등록 | O | X | X |
| 유학원 정보 수정 | O | X | X |
| 활성/비활성 토글 | O | X | X |
| 계정 추가 | O | X | X |
| 비밀번호 재설정 | O | X | X |
| 계정 이메일 조회 (`/api/agency-accounts`) | O | X | X |

접근 제어는 페이지 진입 시 `user.role !== 'master'` 조건으로 `/` 리디렉트 처리.
API는 모두 Bearer 토큰으로 호출자 역할을 서버 측에서 재검증.
