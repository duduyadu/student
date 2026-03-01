# Plan: student-portal-enhancement

## 개요
학생 자가 등록 포털(`/portal`)을 강화하여 학생이 직접 서류를 업로드하고, 비자·서류 진행 상태를 실시간으로 확인할 수 있게 한다.

## 목표
- 학생이 포털에서 직접 서류 파일 업로드
- 서류 상태(대기/제출/검토중/승인/반려) 실시간 시각화
- 반려 사유 확인 및 재제출 플로우
- 포털 UI/UX 개선 (모바일 친화적)

## 현재 상태 분석
- `/portal` 페이지 존재: 학생 로그인 → 기본 정보 + 서류 탭 확인 가능
- `DocumentTab.tsx`: 서류 목록 조회, 자가 체크(self_checked) 기능
- 파일 업로드 기능 없음 (관리자만 가능)
- 반려 사유 표시 없음

## 구현 범위

### P0 (필수)
1. **서류 파일 업로드** — 포털에서 학생이 직접 PDF/이미지 업로드
   - Supabase Storage 버킷 활용 (`student-documents`)
   - 파일 업로드 → `student_documents.file_url` 저장
   - 업로드 시 상태 자동 `submitted`로 변경
2. **서류 상태 시각화** — 단계별 진행 바 (대기→제출→검토→승인)
3. **반려 사유 표시** — rejected 상태일 때 `reject_reason` 표시 + 재업로드 유도

### P1 (권장)
4. **알림 배너** — 포털 상단에 반려/승인/만료 임박 알림 표시
5. **포털 모바일 UI 개선** — 터치 친화적 레이아웃

## 관련 파일
- `app/portal/page.tsx`
- `app/portal/_components/DocumentTab.tsx`
- `app/api/student-documents/[id]/route.ts` (PATCH — 학생 역할)
- `lib/types.ts` (StudentDocument, DocStatus)

## 완료 기준
- [ ] 포털에서 파일 업로드 후 관리자 화면에 반영됨
- [ ] 서류 상태가 단계별 진행 바로 표시됨
- [ ] 반려 사유 확인 + 재업로드 가능
- [ ] TypeScript 오류 없음
