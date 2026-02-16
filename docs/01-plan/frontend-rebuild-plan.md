# 프론트엔드 재구성 계획 (Frontend Rebuild Plan)

**작성일**: 2026-02-15
**버전**: 1.0
**담당**: Claude AI
**목표**: 구글 시트 기반으로 프론트엔드를 완전히 재구성하여 학생/유학원 목록이 정상적으로 표시되도록 수정

---

## 1. 배경 (Background)

### 1.1 문제점
- 기존 웹앱(Login.html + Index.html)에서 학생 목록과 유학원 목록이 표시되지 않음
- 여러 차례 배포 시도했으나 문제 지속
- 백엔드 API는 정상 작동 확인됨 (testLogin, testGetStudentList, testGetAgencyList 모두 성공)

### 1.2 해결 방향
- 복잡한 SPA 구조 대신 **구글 시트를 직접 보여주는 방식**으로 전환
- 깔끔하고 현대적인 "캡춰 스타일" UI 구현
- iframe을 사용하여 구글 시트를 임베드

---

## 2. 기술 스택 (Tech Stack)

| 항목 | 선택 | 이유 |
|------|------|------|
| 프론트엔드 | HTML5 + Vanilla CSS + JavaScript | GAS 네이티브, 별도 빌드 불필요 |
| UI 디자인 | 그라디언트 + 카드 레이아웃 | 현대적이고 깔끔한 느낌 |
| 데이터 표시 | Google Sheets iframe 임베드 | 직접적이고 신뢰할 수 있는 방식 |
| 권한 관리 | Protected Ranges + Filter Views | 서버 없이도 권한 제어 가능 |

---

## 3. 아키텍처 설계 (Architecture Design)

### 3.1 파일 구조
```
src/
├── Code.gs              # doGet() → SimpleWeb.html 반환
├── SimpleWeb.html       # 메인 UI (독립형)
└── SheetsPermissions.gs # 시트 권한 설정 함수
```

### 3.2 UI 구성
```
┌─────────────────────────────────────┐
│  Header: AJU E&J 학생관리 시스템    │
├─────────────────────────────────────┤
│  Card Layout (Grid 3 columns)       │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 학생  │ │유학원│ │Sheets│        │
│  │ 목록  │ │ 목록 │ │ 열기 │        │
│  └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────┤
│  Sheet View (iframe)                │
│  [Google Sheets 임베드 영역]        │
└─────────────────────────────────────┘
```

### 3.3 데이터 흐름
```
사용자 클릭 → showSheet('students')
           → iframe src 설정
           → Google Sheets 직접 표시
```

---

## 4. 구현 세부사항 (Implementation Details)

### 4.1 SimpleWeb.html 핵심 기능
1. **카드 네비게이션**
   - 학생 목록 보기
   - 유학원 목록 보기
   - Google Sheets 직접 열기

2. **시트 임베드**
   ```html
   <iframe src="https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid=0&range=A:U"></iframe>
   ```
   - Students 시트: gid=0, 컬럼 A:U
   - Agencies 시트: gid=1, 컬럼 A:N

3. **UI 스타일**
   - 그라디언트 배경: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
   - 카드 호버 효과: `translateY(-4px)` + `box-shadow`
   - 반응형 디자인: 모바일에서는 1컬럼 레이아웃

### 4.2 SheetsPermissions.gs
1. **setupSheetsPermissions()**
   - Students/Agencies 시트 보호 (duyang22@gmail.com만 수정 가능)
   - HANOI/DANANG 필터 뷰 생성

2. **Code.gs의 onOpen()**
   - 커스텀 메뉴 추가: "📚 학생 관리"
   - "👤 내 학생만 보기" → 유학원별 필터링
   - "👥 전체 학생 보기" → MASTER 전용

---

## 5. 배포 절차 (Deployment Process)

### 5.1 완료된 작업
- [x] SimpleWeb.html 생성
- [x] Code.gs의 doGet() 수정 → SimpleWeb 반환
- [x] clasp push (19개 파일)
- [x] clasp deploy --description "SimpleWeb UI" → @21 버전

### 5.2 다음 단계
1. **GAS 에디터에서 웹앱 배포**
   ```
   1. https://script.google.com/d/1j1tnoI_AHuxe624nn5ET3s7oizWFmOKkkQp7YuoKK02DLr_tOQkmlscN/edit 열기
   2. 우측 상단 "배포" 클릭
   3. "새 배포" 선택
   4. 유형: "웹 앱"
   5. 설명: "SimpleWeb UI - 구글 시트 기반"
   6. 실행 계정: "나"
   7. 액세스 권한: "모든 사용자"
   8. "배포" 클릭
   9. 생성된 웹앱 URL 확인 (예: https://script.google.com/macros/s/AKfycbx.../exec)
   ```

2. **권한 설정 실행**
   ```javascript
   // GAS 에디터에서 실행
   setupSheetsPermissions();
   ```

3. **테스트**
   - 웹앱 URL 접속
   - 학생 목록 카드 클릭 → Students 시트 표시 확인
   - 유학원 목록 카드 클릭 → Agencies 시트 표시 확인
   - Google Sheets 열기 카드 클릭 → 새 탭에서 시트 열림 확인

---

## 6. 예상 결과 (Expected Outcome)

### 6.1 성공 기준
- ✅ 웹앱 URL 접속 시 깔끔한 카드 UI 표시
- ✅ 학생 목록 카드 클릭 시 Students 시트 iframe에 표시
- ✅ 유학원 목록 카드 클릭 시 Agencies 시트 iframe에 표시
- ✅ 모든 학생 데이터가 정상적으로 보임 (두두야두, 박두양)
- ✅ 모든 유학원 데이터가 정상적으로 보임 (HANOI, DANANG)

### 6.2 권한 제어
- duyang22@gmail.com: 모든 시트 수정 가능
- 다른 사용자: 조회만 가능 (Protected Ranges 적용)
- 커스텀 메뉴 통해 유학원별 필터링 가능

---

## 7. 향후 개선 사항 (Future Enhancements)

### 7.1 단기 (1-2주)
- [ ] 다국어 지원 (한국어/베트남어 전환 버튼)
- [ ] 로그인 기능 추가 (역할별 시트 접근 제어)
- [ ] 모바일 반응형 개선

### 7.2 중기 (1-2개월)
- [ ] 학생 상세 정보 모달 추가
- [ ] TOPIK 시험 성적 그래프 시각화
- [ ] 상담 기록 타임라인 뷰

### 7.3 장기 (3개월+)
- [ ] PDF 생활기록부 생성 기능
- [ ] 알림톡/SMS 발송 연동
- [ ] 비자 만료 자동 알림

---

## 8. 참고 자료 (References)

- GAS 웹앱 배포 가이드: https://developers.google.com/apps-script/guides/web
- Google Sheets iframe 임베드: https://support.google.com/docs/answer/183965
- Protected Ranges API: https://developers.google.com/apps-script/reference/spreadsheet/protection

---

**작성자**: Claude AI
**검토자**: 사용자 (duyang22@gmail.com)
**승인 상태**: 진행 중
