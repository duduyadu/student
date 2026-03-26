# 모의고사 일괄 가져오기 (Mock Exam Import) — Design

## 1. 개요

TOPIK 모의고사 결과가 담긴 Excel 파일을 업로드하여 여러 학생의 시험 성적을 `exam_results` 테이블에 일괄 저장하는 API이다.
단일 학생 모드와 다수 학생 일괄 모드를 모두 지원하며, 부분 실패(일부 행 오류)가 발생해도 나머지 행은 계속 처리한다.

- **엔드포인트**: `POST /api/mock-exam-import`
- **Content-Type**: `multipart/form-data`
- **인증**: Bearer 토큰 필수 (master / agency 역할)
- **구현 파일**: `app/api/mock-exam-import/route.ts`
- **라이브러리**: `xlsx` (SheetJS)

---

## 2. 인증 및 권한

| 역할 | 허용 여부 |
|------|-----------|
| master | 허용 |
| agency | 허용 |
| student | 거부 (403) |
| 미인증 | 거부 (401) |

```
Authorization: Bearer {supabase_access_token}
```

역할은 `user.app_metadata.role`에서 읽는다. `user_metadata`는 사용하지 않는다.

---

## 3. 요청 파라미터 (FormData)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `file` | File | 필수 | `.xlsx` 또는 `.xls` Excel 파일 |
| `examDate` | string | 필수 | 시험 날짜 (ISO 형식, 예: `2026-03-15`) |
| `studentId` | string | 선택 | UUID — 설정 시 단일 학생 모드 |
| `roundNumber` | string | 선택 | 회차 번호 (예: `"3"`) |

`file`과 `examDate` 중 하나라도 없으면 400 오류를 반환한다.

---

## 4. 지원 Excel 파일 형식

- **파일 확장자**: `.xlsx`, `.xls` (SheetJS가 지원하는 모든 형식)
- **시트**: 첫 번째 시트(`SheetNames[0]`)만 읽는다
- **헤더 행**: 첫 번째 행이 컬럼명이어야 한다
- **데이터 행**: 헤더 아래 행부터 처리한다
- **빈 셀**: `defval: ''`로 처리 (null 대신 빈 문자열)

### 4-1. 최소 필수 컬럼 구성 (일괄 모드)

| 컬럼 | 필수 여부 | 설명 |
|------|-----------|------|
| student_code (또는 한글/영문 표기) | 필수 | 학번 (학생 조회 기준) |
| listening / 읽기 등 | 권장 | 듣기 점수 |
| reading / 읽기 등 | 권장 | 읽기 점수 |
| total / 합계 등 | 권장 | 총점 (없으면 듣기+읽기 합산) |

### 4-2. 예시 Excel 구조

```
| 학번      | 이름   | 듣기 | 읽기 | 합계 |
|-----------|--------|------|------|------|
| 26-001-001 | 김철수 | 72   | 80   | 152  |
| 26-001-002 | 이영희 | 55   | 60   | 115  |
| 26-001-003 | 박민준 | 38   | 30   | 68   |
```

---

## 5. 컬럼 매핑 규칙

Excel 헤더의 대소문자, 공백을 무시하고 다양한 표기를 동일 내부 키로 정규화한다.

| 내부 키 | 인식하는 헤더 표기 |
|---------|-------------------|
| `student_code` | `studentcode`, `학번`, `학생코드`, `code` |
| `name` | `name`, `이름`, `성명` |
| `listening` | `listening`, `듣기`, `청취` |
| `reading` | `reading`, `읽기`, `독해` |
| `writing` | `writing`, `쓰기`, `작문` |
| `total` | `total`, `합계`, `총점`, `score` |
| `level` | `level`, `등급`, `급` |

**정규화 규칙**: 헤더 문자열을 `trim() → toLowerCase() → 공백 제거` 처리 후 매핑한다.
인식하지 못한 컬럼은 원래 이름을 그대로 키로 사용한다 (무시되지 않고 보존됨).

---

## 6. Student Code 정규화 규칙

Excel에 입력된 학번은 하이픈 유무와 관계없이 동일하게 처리한다.

| 입력값 | 정규화 결과 |
|--------|------------|
| `26-001-001` | `26001001` |
| `26001001` | `26001001` |
| `26 001 001` | `26001001` (공백도 제거) |
| ` 26001001 ` | `26001001` (앞뒤 공백 제거) |

```typescript
function normalizeStudentCode(code: unknown): string {
  return String(code ?? '').replace(/-/g, '').trim()
}
```

정규화된 코드로 `students.student_code` 컬럼을 조회한다. 일치하는 학생이 없으면 해당 행은 오류로 기록하고 건너뛴다.

---

## 7. TOPIK I 등급 자동 계산 로직

시험 유형은 항상 `TOPIK I` 기준이며, 쓰기(writing) 영역이 없다.

### 7-1. 총점 계산

| 조건 | 총점 계산 방법 |
|------|---------------|
| `total` 컬럼이 있고 값이 있음 | 해당 값을 총점으로 사용 |
| `total` 컬럼이 없거나 비어있음 | `듣기 점수 + 읽기 점수` 합산 |

점수 없는 영역은 0으로 계산한다.

### 7-2. 등급 판정 기준 (200점 만점)

| 총점 범위 | 등급 |
|-----------|------|
| 140점 이상 | 2급 |
| 80점 이상 ~ 139점 | 1급 |
| 79점 이하 | 불합격 |

```typescript
function calcLevel(total: number): string {
  if (total >= 140) return '2급'
  if (total >= 80)  return '1급'
  return '불합격'
}
```

### 7-3. 등급 수동 지정

Excel에 `level` / `등급` / `급` 컬럼이 있고 값이 채워져 있으면 자동 계산 없이 해당 값을 그대로 사용한다.
(자동 계산은 level 컬럼이 비어있거나 없을 때만 적용)

---

## 8. 처리 모드

### 8-1. 단일 학생 모드 (`studentId` 있음)

- FormData에 `studentId` (UUID)를 전달하면 단일 학생 모드로 동작한다.
- Excel의 **첫 번째 데이터 행만** 처리한다.
- `student_code` 컬럼이 없어도 된다.
- 학생 상세 페이지에서 개별 성적을 업로드할 때 사용한다.

### 8-2. 일괄 모드 (`studentId` 없음)

- `studentId`가 없으면 일괄 모드로 동작한다.
- Excel의 모든 행을 순차 처리한다.
- 각 행의 `student_code`로 학생을 조회하여 `student_id`를 결정한다.
- TOPIK 모의고사 프로그램에서 내보낸 결과 파일을 그대로 업로드할 때 사용한다.

---

## 9. DB 저장 구조

`exam_results` 테이블에 아래 형식으로 INSERT한다.

| 컬럼 | 값 |
|------|-----|
| `student_id` | 조회 또는 직접 전달된 UUID |
| `exam_date` | FormData의 `examDate` |
| `exam_type` | 고정값 `'TOPIK 모의고사'` |
| `exam_source` | 고정값 `'mock'` |
| `round_number` | FormData의 `roundNumber` (없으면 null) |
| `listening_score` | Excel 듣기 점수 (없으면 null) |
| `reading_score` | Excel 읽기 점수 (없으면 null) |
| `writing_score` | 항상 null (TOPIK I에 쓰기 없음) |
| `total_score` | 총점 (계산 또는 Excel 값) |
| `level` | 등급 (자동 계산 또는 Excel 값) |
| `section_scores` | `{}` (빈 JSON) |
| `extra_data` | `{ uploaded_name: "이름" }` (Excel의 이름 컬럼) |

---

## 10. 에러 처리 및 부분 실패

### 10-1. 전체 실패 (400/401/403/500)

| 조건 | HTTP 코드 | 메시지 |
|------|-----------|--------|
| 인증 토큰 없음 | 401 | `Unauthorized` |
| 역할 미허용 | 403 | `Forbidden` |
| `file` 또는 `examDate` 누락 | 400 | `file, examDate 필수` |
| Excel 데이터가 비어있음 | 400 | `Excel 데이터가 비어 있습니다.` |
| 서버 내부 오류 | 500 | 오류 메시지 문자열 |

### 10-2. 행별 부분 실패 (200 반환, errors 배열에 기록)

개별 행 처리 중 오류가 발생해도 전체 요청을 중단하지 않는다. 성공한 행은 저장하고, 실패한 행은 `errors` 배열에 이유를 기록한다.

| 원인 | errors 메시지 예시 |
|------|-------------------|
| `student_code` 컬럼 없음 | `student_code 없음, 행 건너뜀: {...}` |
| 학번에 해당하는 학생 없음 | `student_code '26001099' 에 해당하는 학생 없음` |
| 총점을 숫자로 읽을 수 없음 | `총점을 읽을 수 없는 행 건너뜀: {...}` |
| DB INSERT 오류 | Supabase 오류 메시지 그대로 |

### 10-3. 성공 응답 구조

```json
{
  "inserted": 18,
  "errors": [
    "student_code '26001099' 에 해당하는 학생 없음"
  ],
  "message": "18건 저장 완료, 1건 오류"
}
```

- `inserted`: 실제 DB에 저장된 행 수
- `errors`: 실패한 행의 오류 메시지 목록 (빈 배열이면 전체 성공)
- `message`: 사람이 읽을 수 있는 요약 문자열

---

## 11. 환경변수 의존성

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 연결 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 토큰 검증 (`getAnonClient`) |
| `SUPABASE_SERVICE_ROLE_KEY` | DB INSERT (`getServiceClient`) |

---

**작성일**: 2026-03-26
**구현 파일**: `app/api/mock-exam-import/route.ts`
