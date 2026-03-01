# Design: student-portal-enhancement

## 개요
학생 포털(`/portal`)의 서류 탭을 강화하여 파일 업로드, 상태 단계별 시각화, 반려 재제출 플로우를 완성한다.

## 현재 상태 분석

### 이미 구현된 기능 (DocumentTab.tsx)
- ✅ `handleFileUpload`: Supabase Storage → `file_url` 저장 → status `submitted`
- ✅ 반려 사유 (`reject_reason`) 표시
- ✅ 반려 시 재업로드 버튼
- ✅ 진행률 요약 카드 (승인 수/전체, 진행 바)
- ✅ 파일 링크 표시

### 누락된 기능
- ❌ **서류 상태 단계별 진행 바** — 각 서류 카드에 step indicator 없음
- ❌ **알림 배너** — 포털 상단 반려/만료 임박 알림 없음 (P1)

## 구현 설계

### AC-01: 상태 단계 진행 바 (각 서류 카드 상단)

**스텝 정의**:
```
미제출(pending) → 제출됨(submitted) → 검토중(reviewing) → 완료(approved/rejected)
     1                  2                    3                    4
```

**상태별 스텝 매핑**:
| 상태 | 활성 스텝 | 4번 스텝 색상 |
|------|-----------|--------------|
| pending | 1 | - |
| submitted | 2 | - |
| reviewing | 3 | - |
| approved | 4 | green |
| rejected | 4 | red |

**컴포넌트 구조**:
```tsx
<DocStatusStepper status={doc.status} lang={lang} />
// 4개 원형 dot + 연결선 + 라벨
// 활성 스텝: 채워진 원 (blue/green/red)
// 비활성 스텝: 비어있는 원 (slate-200)
```

### AC-02: 파일 업로드 UX 개선
- 현재: 단순 버튼 클릭 → hidden input
- 유지 (이미 잘 동작함)
- 개선: `uploading` 상태 시 로딩 인디케이터 개선

### AC-03: 포털 상단 알림 배너 (P1)
- rejected 서류 있을 때: 빨간 배너
- 만료 임박 서류 있을 때: 주황 배너
- 위치: `app/portal/page.tsx` docs 탭 상단

## 파일 변경 범위

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `app/portal/_components/DocumentTab.tsx` | 수정 | DocStatusStepper 컴포넌트 추가 + 각 카드에 삽입 |
| `app/portal/page.tsx` | 수정 (P1) | 알림 배너 추가 |

## Acceptance Criteria

- [ ] AC-01: 각 서류 카드에 4단계 진행 바 표시
- [ ] AC-01a: 현재 단계 dot이 파란색으로 강조됨
- [ ] AC-01b: approved 시 4번 dot 초록색
- [ ] AC-01c: rejected 시 4번 dot 빨간색
- [ ] AC-02: 파일 업로드 후 진행 바 즉시 업데이트 (loadDocs 호출)
- [ ] AC-03: TypeScript 오류 없음
- [ ] AC-04: KO/VI 라벨 이중언어 지원

## 스텝 라벨 (i18n)

```
Step 1: 미제출 / Chưa nộp
Step 2: 제출 / Đã nộp
Step 3: 검토 / Xem xét
Step 4: 완료 / Hoàn thành
```
