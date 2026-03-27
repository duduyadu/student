# 쿼리 성능 개선 Plan

**Feature**: performance-query-fix
**Phase**: Plan
**Status**: In Progress
**Created**: 2026-03-27

---

## 1. 목표

N+1 쿼리 패턴 및 순차 쿼리를 병렬/일괄 처리로 개선한다.
- PDF 일괄 생성 속도 향상 (50명 기준 최대 50x)
- Cron 실행 DB 쿼리 수 감소 (Vercel 타임아웃 위험 감소)
- 대시보드 로딩 속도 소폭 개선

---

## 2. 수정 범위

| # | 파일 | 문제 | 조치 |
|---|------|------|------|
| 1 | `app/api/life-record-pdf-bulk/route.ts:106-108` | `for...of` 순차 루프, 학생당 6쿼리 | `Promise.all` 병렬 처리 |
| 2 | `app/page.tsx:211-226` | `loadTopikDist` 2개 쿼리 순차 실행 | `Promise.all` 병렬 실행 |
| 3 | `app/api/cron/visa-alerts/route.ts:63-70` | 루프 내 `visa_alert_logs` 조회 | 사전 일괄 조회 후 Set으로 체크 |
| 4 | `app/api/cron/document-alerts/route.ts` | 루프 내 `alreadySent()` 반복 호출 | 사전 일괄 조회 후 Set으로 체크 |

---

## 3. 완료 기준

- [ ] PDF 일괄: `Promise.all`로 병렬 fetchStudentData
- [ ] 대시보드: exam_results + students 동시 조회
- [ ] visa-alerts: 루프 전 `visa_alert_logs` 일괄 조회
- [ ] document-alerts: 루프 전 `document_alert_logs` 일괄 조회
- [ ] 기능 동일성 유지 (결과 변경 없음)
- [ ] TypeScript 오류 0개
