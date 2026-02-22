# PDF 베트남어 + 일괄 다운로드 설계 문서

**Feature**: pdf-vi-bulk
**Status**: Do (구현 완료)
**Created**: 2026-02-22

---

## 1. 기능 요약

생활기록부 PDF에 베트남어(VI) 버전을 추가하고, 학생 목록에서 여러 학생을 선택하여 ZIP으로 일괄 다운로드하는 기능.

---

## 2. 구현 범위 (5개 파일)

### 2-1. `components/pdf/LifeRecordDocument.tsx`
- `lang?: 'ko' | 'vi'` prop을 `LifeRecordData` 인터페이스에 추가
- 번역 딕셔너리 `T` 객체 추가 (ko/vi 텍스트 매핑)
- 모든 하드코딩 한국어 텍스트 → `T[lang][key]` 참조로 교체
- 베트남어 번역 항목:
  - 문서 제목: "학 생 생 활 기 록 부" → "HỒ SƠ HỌC SINH"
  - 섹션 헤더: "1. 학생 기본 정보" → "1. Thông Tin Cơ Bản"
  - "2. 상담 이력" → "2. Lịch Sử Tư Vấn"
  - "3. 선생님 종합 평가" → "3. Đánh Giá Tổng Hợp Của Giáo Viên"
  - "4. TOPIK 모의고사 성적" → "4. Kết Quả Thi Thử TOPIK"
  - 라벨: 이름(KR), 생년월일, 성별, 학번, 현재상태 등 전부
  - 푸터 텍스트, 직인 레이블

### 2-2. `app/api/life-record-pdf/route.ts`
- `lang` 쿼리 파라미터 읽기 (`ko` | `vi`, default `ko`)
- `LifeRecordDocument`에 `lang` prop 전달
- 파일명 변경: `lang=vi`일 때 `생활기록부VI_이름_날짜.pdf`

### 2-3. `app/api/life-record-pdf-bulk/route.ts` (신규)
- POST 메서드: `{ studentIds: string[], lang: 'ko' | 'vi' | 'both' }` 받기
- jszip으로 ZIP 생성
- 각 studentId 순회 → PDF 생성 → ZIP에 추가
- `생활기록부_일괄_YYYYMMDD.zip` 반환
- 파일 구조: `학생명_KO_날짜.pdf`, `학생명_VI_날짜.pdf` (both 시)

### 2-4. `app/students/[id]/page.tsx`
- `handleExportPdf`: KO와 VI 두 API 병렬 호출 (`Promise.all`) 후 순차 다운로드
- 버튼 텍스트: "생활기록부 PDF (KO+VI)"

### 2-5. `app/students/page.tsx`
- `selectedIds: Set<string>` state 추가
- `bulkPdfLoading: boolean` state 추가
- `toggleSelect(id)`, `toggleSelectAll()` 함수 추가
- `handleBulkPdf()`: `/api/life-record-pdf-bulk` POST 요청 → ZIP 다운로드
- 체크박스 컬럼 추가 (PC 테이블, thead 전체 선택 + tbody 행별)
- "PDF 일괄 다운로드 (N명)" 버튼 (selectedIds.size > 0일 때 표시)
- 선택된 행 배경: `bg-indigo-50`

---

## 3. 설치 패키지
- `jszip`: ZIP 생성 라이브러리

---

## 4. 번역 딕셔너리 필수 키

| 키 | 한국어 | 베트남어 |
|----|--------|----------|
| title | 학 생 생 활 기 록 부 | HỒ SƠ HỌC SINH |
| subtitle | STUDENT LIFE RECORD BOOK | STUDENT LIFE RECORD BOOK |
| section1 | 1. 학생 기본 정보 | 1. Thông Tin Cơ Bản |
| nameKr | 이름 (KR) | Tên (KR) |
| nameVn | 이름 (VN) | Tên (VN) |
| dob | 생년월일 | Ngày Sinh |
| gender | 성별 | Giới Tính |
| studentCode | 학번 | Mã Học Sinh |
| status | 현재 상태 | Trạng Thái |
| enrollDate | 등록일 | Ngày Nhập Học |
| topik | TOPIK 등급 | Cấp Độ TOPIK |
| noTopik | 미취득 | Chưa đạt |
| langSchool | 재학 어학원 | Trường Ngôn Ngữ |
| targetUniv | 목표 대학 | Trường Mục Tiêu |
| visa | 비자 | Visa |
| visaExpiry | 만료 | Hết Hạn |
| section2 | 2. 상담 이력 | 2. Lịch Sử Tư Vấn |
| noConsult | 공개 상담 기록이 없습니다. | Không có lịch sử tư vấn công khai. |
| goal | 목표 | Mục Tiêu |
| content | 내용 | Nội Dung |
| improvement | 개선 | Cải Thiện |
| nextGoal | 목표 | Mục Tiêu Tiếp |
| section3 | 3. 선생님 종합 평가 | 3. Đánh Giá Tổng Hợp Của Giáo Viên |
| section4 | 4. TOPIK 모의고사 성적 | 4. Kết Quả Thi Thử TOPIK |
| examDate | 모의고사 일자 | Ngày Thi |
| round | 회차 | Lần Thi |
| listening | 듣기 | Nghe |
| reading | 읽기 | Đọc |
| total | 총점 | Tổng Điểm |
| level | 등급 | Cấp Độ |
| issuedAt | 발급일 | Ngày Cấp |
| footerMain | 본 문서는... | Tài liệu này được cấp... |
| footerSub | This document is... | This document is... |
| stampLabel | 직인 | Con Dấu |
| roundSuffix | 회차 | lần |
| pointSuffix | 점 | điểm |

---

## 5. 검증 기준

- [ ] `LifeRecordData` 인터페이스에 `lang?: 'ko' | 'vi'` 추가됨
- [ ] 번역 딕셔너리 T 객체 ko/vi 두 언어 모두 정의됨
- [ ] 모든 하드코딩 텍스트가 T[lang][key]로 교체됨
- [ ] `/api/life-record-pdf?lang=ko|vi` 파라미터 처리됨
- [ ] `lang=vi`일 때 파일명에 VI 포함됨
- [ ] `/api/life-record-pdf-bulk` POST route 존재함
- [ ] jszip import 및 ZIP 생성 로직 포함됨
- [ ] `both` lang 옵션 시 KO+VI 모두 ZIP에 포함됨
- [ ] 학생 상세 페이지: KO+VI 병렬 호출 (`Promise.all`)
- [ ] 버튼 텍스트: "생활기록부 PDF (KO+VI)"
- [ ] 학생 목록: `selectedIds` state 존재함
- [ ] 학생 목록: `toggleSelect`, `toggleSelectAll` 함수 존재함
- [ ] 학생 목록: 체크박스 컬럼 (thead + tbody)
- [ ] 학생 목록: "PDF 일괄 다운로드 (N명)" 버튼 (조건부 표시)
- [ ] 학생 목록: `handleBulkPdf` 함수 존재함
- [ ] TypeScript 타입 오류 없음 (`npx tsc --noEmit` 통과)
