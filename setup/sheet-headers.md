# Google Sheets 헤더 설정 가이드

Phase 1에서 생성해야 할 8개 시트의 헤더(첫 번째 행) 설정입니다.

---

## 1. Students 시트

**시트 이름:** `Students`

**헤더 (A1부터 U1까지, 총 21개):**

```
StudentID	NameKR	NameVN	DOB	Gender	AgencyCode	HomeAddressVN	PhoneKR	PhoneVN	Email	ParentNameVN	ParentPhoneVN	ParentEconomic	HighSchoolGPA	EnrollmentDate	Status	CreatedBy	CreatedAt	UpdatedBy	UpdatedAt	IsActive
```

**복사 방법:**
1. 위 텍스트 전체 복사 (탭으로 구분됨)
2. Students 시트의 A1 셀 클릭
3. 붙여넣기 (Ctrl+V)

**예시 데이터 (2행):**
```
25-AJU-001	홍길동	Nguyen Van A	2005-03-15	M	AJU	123 Le Loi St, Hanoi	010-1234-5678	+84 912345678	student@example.com	Nguyen Van B	+84 987654321	{암호화값}	3.8	2025-03-01	active	admin	2026-02-10 14:00:00	admin	2026-02-10 14:00:00	TRUE
```

---

## 2. Agencies 시트

**시트 이름:** `Agencies`

**헤더 (A1부터 H1까지, 총 8개):**

```
AgencyCode	AgencyName	Role	LoginID	PasswordHash	IsActive	LoginAttempts	LastLogin
```

**예시 데이터 (2행 - MASTER 계정):**
```
MASTER	마스터 관리자	master	admin	{해시값}	TRUE	0
```

**주의:** PasswordHash는 Phase 3에서 생성합니다. 일단 빈칸으로 두세요.

---

## 3. AuditLogs 시트

**시트 이름:** `AuditLogs`

**헤더 (A1부터 J1까지, 총 10개):**

```
Timestamp	UserId	Action	TargetSheet	TargetId	Details	IP	SessionId	ErrorMessage	IsSuccess
```

**예시 데이터 (2행):**
```
2026-02-10 14:00:00	admin	LOGIN	N/A	N/A	Login success	127.0.0.1	session-123	 	TRUE
```

---

## 4. SystemConfig 시트

**시트 이름:** `SystemConfig`

**헤더 (A1부터 E1까지, 총 5개):**

```
ConfigKey	ConfigValue	Description	UpdatedBy	UpdatedAt
```

**초기 데이터 (2행~4행):**

```
copyright_text	© 2026 AJU E&J	저작권 표시	admin	2026-02-10 14:00:00
session_timeout	3600	세션 만료 시간 (초)	admin	2026-02-10 14:00:00
max_login_attempts	5	최대 로그인 시도 횟수	admin	2026-02-10 14:00:00
```

---

## 5. i18n 시트

**시트 이름:** `i18n`

**헤더 (A1부터 E1까지, 총 5개):**

```
Key	Korean	Vietnamese	Category	UpdatedAt
```

**초기 데이터 (60개 키) - 2행부터 입력:**

별도 파일 `i18n-initial-data.tsv` 참조 (다음 단계에서 제공)

---

## 6. Consultations 시트

**시트 이름:** `Consultations`

**헤더 (A1부터 L1까지, 총 12개):**

```
ConsultationID	StudentID	ConsultDate	ConsultType	ConsultantId	Summary	ImprovementArea	NextGoal	CreatedBy	CreatedAt	UpdatedBy	UpdatedAt
```

**예시 데이터 (2행):**
```
C-001	25-AJU-001	2026-02-10	regular	aju_teacher	첫 상담 진행	한국어 회화 연습	TOPIK 3급 목표	aju_teacher	2026-02-10 14:00:00	aju_teacher	2026-02-10 14:00:00
```

---

## 7. ExamResults 시트

**시트 이름:** `ExamResults`

**헤더 (A1부터 J1까지, 총 10개):**

```
ExamResultID	StudentID	ExamDate	ExamType	Listening	Reading	Writing	TotalScore	Grade	CreatedBy	CreatedAt
```

**예시 데이터 (2행):**
```
E-001	25-AJU-001	2026-01-15	TOPIK	80	85	75	240	4급	aju_teacher	2026-02-10 14:00:00
```

---

## 8. TargetHistory 시트

**시트 이름:** `TargetHistory`

**헤더 (A1부터 H1까지, 총 8개):**

```
HistoryID	StudentID	ChangedDate	TargetUniversityKR	TargetUniversityVN	TargetMajorKR	TargetMajorVN	ChangedBy	ChangedAt
```

**예시 데이터 (2행):**
```
H-001	25-AJU-001	2026-02-01	서울대학교	Seoul National University	경영학과	Business Administration	aju_teacher	2026-02-10 14:00:00
```

---

## 빠른 설정 방법

### 방법 1: 수동 입력
1. 각 시트 생성 (하단 + 버튼)
2. 시트 이름 변경
3. A1 셀에 첫 번째 헤더 입력
4. Tab 키로 이동하며 나머지 헤더 입력

### 방법 2: 복사-붙여넣기 (권장)
1. 위 헤더 텍스트 복사 (탭으로 구분됨)
2. A1 셀 클릭 후 붙여넣기
3. 한 번에 모든 컬럼 생성됨

### 방법 3: GAS 스크립트 자동 생성 (고급)
- `setup/create-sheets.gs` 스크립트 실행 (다음 파일 참조)

---

## 체크리스트

- [ ] 1. Students 시트 생성 및 헤더 21개 설정
- [ ] 2. Agencies 시트 생성 및 헤더 9개 설정
- [ ] 3. AuditLogs 시트 생성 및 헤더 10개 설정
- [ ] 4. SystemConfig 시트 생성 및 헤더 5개 설정 + 초기 데이터 3개
- [ ] 5. i18n 시트 생성 및 헤더 5개 설정 (데이터는 별도)
- [ ] 6. Consultations 시트 생성 및 헤더 12개 설정
- [ ] 7. ExamResults 시트 생성 및 헤더 10개 설정
- [ ] 8. TargetHistory 시트 생성 및 헤더 8개 설정

**모든 시트 생성 완료 후 → i18n 초기 데이터 입력으로 진행**
