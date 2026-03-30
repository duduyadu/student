# Plan: admin-multi-account

## 개요
여러 관리자(master 역할)가 각자 계정으로 독립 로그인할 수 있도록 추가 admin 계정 생성.

## 문제 분석

### 동시 로그인이 안 된다고 느끼는 이유
- Supabase Auth는 **기본적으로 동시 로그인을 막지 않음**
- localStorage 기반 세션 저장 → 같은 브라우저의 모든 탭이 동일 세션 공유
- **같은 브라우저 다른 탭**: 이미 로그인된 세션 그대로 유지 (재로그인 불필요)
- **다른 브라우저/기기**: 별개 세션으로 동시 로그인 가능

### 실제 해결책
1개의 master 계정을 여러 명이 공유하는 구조 → **각 담당자별 별도 계정** 생성이 올바른 방법
- 감사 로그(audit_logs)에서 누가 어떤 작업을 했는지 추적 가능
- 비밀번호 독립 관리
- 계정별 접근 제어 가능

## 구현 범위

### Phase 1: 관리자 계정 3개 생성 (즉시)
Supabase admin API로 `role: 'master'` 계정 생성

### Phase 2 (선택, 나중에): 관리자 관리 UI
- `/settings/admins` 페이지: admin 계정 목록/추가/비활성화
- 현재는 Supabase Dashboard에서 직접 관리

## 계정 생성 정보

| 계정 | 이메일 | 역할 |
|------|--------|------|
| 관리자 1 (주) | admin1@aju-ej.com | master |
| 관리자 2 | admin2@aju-ej.com | master |
| 관리자 3 | admin3@aju-ej.com | master |

## 완료 기준
- [ ] 3개 master 계정 생성 완료
- [ ] 각 계정으로 독립 로그인 확인
- [ ] 감사 로그에 각 계정 로그인 기록 확인
