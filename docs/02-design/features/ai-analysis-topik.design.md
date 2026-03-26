# Design: AI 분석 & TOPIK 연동

**Feature**: ai-analysis-topik
**Phase**: Design
**Created**: 2026-03-26
**Reference**: `app/api/exam-ai-analysis/route.ts`, `app/api/topik-ai-proxy/route.ts`, `app/api/mock-exam-import/route.ts`

---

## 1. 개요

TOPIK I 성적 데이터를 기반으로 Gemini AI가 학생별 맞춤 분석을 제공하는 시스템. 두 가지 사용 경로가 있다.

1. **관리자 플랫폼 분석** (`/api/exam-ai-analysis`): 학생 상세 페이지에서 누적 성적을 분석해 한국어 단일 리포트 생성 후 DB에 캐시.
2. **TOPIK 앱 프록시** (`/api/topik-ai-proxy`): 별도 Electron 앱이 Gemini 키를 직접 보유하지 않도록 이 서버가 키를 중앙 관리하고 KO/VI 이중 분석을 반환.

모의고사 Excel 일괄 가져오기(`/api/mock-exam-import`)는 두 경로의 데이터 소스가 된다.

---

## 2. Gemini AI 성적 분석

### 2-1. 사용 모델

| 항목 | 값 |
|------|-----|
| 라이브러리 | `@google/generative-ai` |
| 모델 ID | `gemini-2.5-flash` |
| 호출 방식 | `generateContent()` (단일 또는 `Promise.all` 병렬) |

### 2-2. 입력 데이터

**관리자 플랫폼 분석** (`/api/exam-ai-analysis`, GET):

| 파라미터 | 위치 | 필수 | 설명 |
|---------|------|------|------|
| `studentId` | Query String | 필수 | 학생 UUID |
| Bearer 토큰 | Authorization 헤더 | 필수 | Supabase JWT (anon client 검증) |

DB 조회 컬럼:
```
exam_date, exam_type, listening_score, reading_score,
writing_score, total_score, level, section_scores, exam_source
```
정렬: `exam_date ASC` (전체 이력, 오래된 순)

**TOPIK 앱 프록시** (`/api/topik-ai-proxy`, POST):

```typescript
{
  studentName:    string,          // 학생 이름
  agency:         string,          // 유학원명
  listeningScore: number,          // 듣기 점수
  readingScore:   number,          // 읽기 점수
  totalScore:     number,          // 합계
  level:          number,          // 1 | 2 (TOPIK I 등급)
  examDate:       string,          // YYYY-MM-DD
  scoreHistory?:  Array<{          // 이전 회차 이력 (선택)
    examDate: string,
    total:    number,
    level:    number,
  }>
}
```

### 2-3. 출력 형식

**관리자 플랫폼** → `{ analysis: string }` (한국어 단일, 200자 내외)

**TOPIK 앱 프록시** → `{ analysisKo: string, analysisVi: string }` (KO/VI 병렬)

모든 출력: 마크다운·특수기호 없이 일반 텍스트.

### 2-4. 프롬프트 설계

#### 관리자 플랫폼 프롬프트 (KO 단일)

```
당신은 한국어 교육 전문가입니다.
아래는 베트남 유학생의 TOPIK I 시험 성적 이력입니다.
TOPIK I은 듣기+읽기 200점 만점이며, 2급 합격 기준은 140점 이상입니다.

[1회차] YYYY-MM-DD | 듣기: N점 | 읽기: N점 | 총점: N점 | 등급: X급
...

다음 형식으로 한국어로 분석해주세요 (총 200자 내외, 간결하게):
1. 전체 추이 평가 (1-2문장): 성적이 향상/정체/하락 중인지
2. 강점 영역: 듣기와 읽기 중 상대적으로 높은 영역
3. 개선 필요 영역: 낮은 영역과 구체적 학습 방향
4. 2급 달성 예측: 현재 추세로 140점 달성 가능성

마크다운이나 특수기호 없이 일반 텍스트로만 작성하세요.
```

#### TOPIK 앱 프록시 프롬프트 (KO/VI 병렬)

KO 프롬프트 구조:
```
당신은 한국어 교육 전문가입니다.
TOPIK I 시험 결과를 분석해주세요. (200점 만점: 듣기 100 + 읽기 100)
2급 합격: 140점 이상, 1급 합격: 80점 이상

학생: {studentName} (유학원: {agency})
시험일: {examDate}
듣기: N점 | 읽기: N점 | 합계: N점 | 결과: {levelLabel}
[이전 성적 추이 (있을 경우)]

다음을 간결하게 한국어로 분석해주세요 (150자 내외):
1. 이번 결과 평가
2. 강점/취약 영역 (듣기 vs 읽기)
3. 다음 목표를 위한 핵심 조언 1가지
```

VI 프롬프트: 동일 구조, 베트남어로 작성 요청 (150 từ 내외).

두 프롬프트를 `Promise.all`로 병렬 호출 → 응답 시간 최적화.

### 2-5. DB 캐시 (관리자 플랫폼 전용)

분석 성공 시 가장 최신 회차 `exam_results` 행의 `ai_analysis` 컬럼에 저장:

```sql
UPDATE exam_results
SET    ai_analysis = '{AI 분석 텍스트}'
WHERE  student_id  = '{studentId}'
AND    exam_date   = '{최신 exam_date}';
```

캐시 목적: 동일 학생 반복 조회 시 재호출 비용 절감 (클라이언트에서 기존 값 존재 시 호출 스킵 구현).

---

## 3. TOPIK 앱 API 프록시

### 3-1. 목적

별도 배포되는 TOPIK Electron 데스크톱 앱이 `GEMINI_API_KEY`를 직접 번들에 포함하지 않도록 이 Next.js 서버가 키를 중앙 관리한다.

- 키 변경 시 Vercel 환경변수만 수정 → 앱 재빌드 불필요
- 키 노출 위험 제거

### 3-2. 엔드포인트

| 항목 | 값 |
|------|-----|
| Method | POST |
| Path | `/api/topik-ai-proxy` |
| 인증 방식 | 커스텀 시크릿 헤더 |
| 인증 헤더 | `x-topik-secret: {TOPIK_PROXY_SECRET}` |
| Content-Type | `application/json` |

인증 로직: `req.headers.get('x-topik-secret')` 값이 서버의 `TOPIK_PROXY_SECRET` 환경변수와 일치해야 함. 불일치 시 `401`.

Supabase JWT 인증 없음 — TOPIK 앱은 Supabase 세션을 보유하지 않으므로 별도 시크릿으로 인증.

---

## 4. 모의고사 일괄 가져오기 (Excel)

### 4-1. 엔드포인트

| 항목 | 값 |
|------|-----|
| Method | POST |
| Path | `/api/mock-exam-import` |
| Content-Type | `multipart/form-data` |
| 인증 | Bearer 토큰 (Supabase JWT, master/agency 역할만 허용) |

### 4-2. FormData 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `file` | 필수 | `.xlsx` / `.xls` 파일 |
| `examDate` | 필수 | 시험 날짜 (`YYYY-MM-DD`) |
| `studentId` | 선택 | 있으면 단일 학생 모드 (첫 행만 처리) |
| `roundNumber` | 선택 | 회차 번호 (정수) |

### 4-3. Excel 파일 형식

허용 컬럼명 (대소문자·공백·한영 모두 허용, 정규화 처리):

| 정규화 키 | 허용 표기 |
|-----------|----------|
| `student_code` | studentCode, 학번, 학생코드, code |
| `name` | name, 이름, 성명 |
| `listening` | listening, 듣기, 청취 |
| `reading` | reading, 읽기, 독해 |
| `writing` | writing, 쓰기, 작문 |
| `total` | total, 합계, 총점, score |
| `level` | level, 등급, 급 |

### 4-4. 처리 로직

```
1. Bearer 토큰 검증 (master/agency만 허용)
2. FormData 파싱 (file, examDate 필수 확인)
3. xlsx 라이브러리로 첫 번째 시트 파싱
4. 컬럼 헤더 정규화 (normalizeHeader)
5. 처리 모드 결정:
   - studentId 있음 → 단일 학생 모드 (첫 행만 처리)
   - studentId 없음 → 일괄 모드 (student_code로 학생 조회)
6. 각 행 처리:
   a. student_code 정규화 (하이픈 제거: 26-001-001 → 26001001)
   b. students 테이블에서 student_code로 UUID 조회
   c. 총점 계산: total 컬럼 있으면 사용, 없으면 listening + reading
   d. 등급 자동 계산: ≥140 → '2급', ≥80 → '1급', else '불합격'
   e. exam_results INSERT (exam_type: 'TOPIK 모의고사', exam_source: 'mock')
7. 결과 반환: { inserted: N, errors: [...], message: '...' }
```

### 4-5. exam_results 저장 페이로드

```typescript
{
  student_id:      string,          // 조회된 UUID
  exam_date:       string,          // FormData의 examDate
  exam_type:       'TOPIK 모의고사',
  exam_source:     'mock',
  round_number:    number | null,   // roundNumber (선택)
  listening_score: number | null,
  reading_score:   number | null,
  writing_score:   null,            // TOPIK I: 쓰기 없음
  total_score:     number,
  level:           string,          // '2급' | '1급' | '불합격'
  section_scores:  {},
  extra_data:      { uploaded_name: string | null }
}
```

---

## 5. 환경변수

| 변수명 | 용도 | 노출 범위 |
|--------|------|---------|
| `GEMINI_API_KEY` | Gemini API 인증 | 서버 전용 |
| `TOPIK_PROXY_SECRET` | TOPIK 앱 프록시 인증 | 서버 전용 |

두 변수 모두 클라이언트(`NEXT_PUBLIC_` 접두사) 노출 불가. Vercel 환경변수로 관리.

---

## 6. 에러 처리

### 6-1. 공통 에러 응답

| 상황 | HTTP | 응답 |
|------|------|------|
| 인증 실패 (토큰 없음/무효) | 401 | `{ error: 'Unauthorized' }` |
| 역할 부족 (master/agency 아님) | 403 | `{ error: 'Forbidden' }` |
| 필수 파라미터 누락 | 400 | `{ error: '...' }` |
| GEMINI_API_KEY 미설정 | 500 | `{ error: 'GEMINI_API_KEY 미설정' }` |
| Gemini 호출 실패 | 500 | `{ error: 'AI 분석 요청에 실패했습니다.' }` |

### 6-2. API별 에러

**exam-ai-analysis**:
- `studentId` 없음 → 400
- 해당 학생 시험 데이터 없음 → 404 (`{ error: '시험 데이터가 없습니다.' }`)

**topik-ai-proxy**:
- `x-topik-secret` 불일치 → 401
- `studentName` 또는 `totalScore` 누락 → 400
- JSON 파싱 실패 → 400

**mock-exam-import**:
- Excel 데이터 비어 있음 → 400
- `student_code` 없는 행 → 해당 행 건너뜀, errors 배열에 추가
- `student_code` 매핑 실패 → 해당 행 건너뜀, errors 배열에 추가
- 총점 파싱 불가 → 해당 행 건너뜀, errors 배열에 추가
- 일부 성공/일부 실패 → 200 응답, `errors` 배열에 실패 사유 포함

### 6-3. 에러 격리 원칙

모의고사 일괄 가져오기는 행 단위로 에러를 격리한다. 한 행의 실패가 나머지 행 처리를 중단하지 않는다. 최종 응답에 성공/실패 건수를 모두 반환한다.
