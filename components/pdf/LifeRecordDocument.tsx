import {
  Document, Page, Text, View, StyleSheet, Image, Font
} from '@react-pdf/renderer'
import path from 'path'
import type { Student, Consultation, TeacherEvaluation, ExamResult, AspirationHistory } from '@/lib/types'

// ── 폰트 등록 ──────────────────────────────────────
const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansKR.ttf')
Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: fontPath, fontWeight: 'normal', fontStyle: 'normal' },
    { src: fontPath, fontWeight: 'bold',   fontStyle: 'normal' },
    { src: fontPath, fontWeight: 'normal', fontStyle: 'italic' },
    { src: fontPath, fontWeight: 'bold',   fontStyle: 'italic' },
  ],
})
Font.registerHyphenationCallback(word => [word])

// ── 번역 ──────────────────────────────────────────
const T = {
  ko: {
    title:      '학 생 생 활 기 록 부',
    subtitle:   'STUDENT LIFE RECORD BOOK',
    orgSub:     '베트남 유학생 통합 관리 플랫폼',
    section1:   '1. 학생 기본 정보',
    nameKr:     '이름 (KR)', nameVn: '이름 (VN)',
    dob:        '생년월일', gender: '성별',
    studentCode:'학번',     status: '현재 상태',
    enrollDate: '등록일',   topik:  'TOPIK 등급',
    noTopik:    '미취득',
    langSchool: '재학 어학원', targetUniv: '목표 대학 / 학과',
    visa:       '비자 종류', visaExpiry: '비자 만료일',
    section2:   '2. 상담 이력',
    noConsult:  '공개 상담 기록이 없습니다.',
    goal:       '목표', content: '내용', improvement: '개선사항', nextGoal: '다음 목표',
    section3:   '3. 선생님 종합 평가',
    noEval:     '공개 평가 기록이 없습니다.',
    section4:   '4. TOPIK 모의고사 성적',
    examDate:   '시험일', round: '회차',
    listening:  '듣기', reading: '읽기', total: '총점', level: '등급',
    noExam:     '시험 기록이 없습니다.',
    section5:   '5. 목표 대학 변경 이력',
    noAspiration: '변경 이력이 없습니다.',
    aspDate:    '변경일', aspTarget: '목표 대학 / 학과', aspReason: '변경 사유',
    issuedAt:   '발급일',
    footerDoc:  '학생생활기록부',
    footerOrg:  'AJU E&J Education Co., Ltd.',
    stampLabel: '직인',
    roundSuffix:'회차',
    scoreUnit:  '점',
    genderM:    '남성', genderF: '여성',
    photoPlaceholder: '사진',
    continued:  '(계속)',
  },
  vi: {
    title:      'HỒ SƠ HỌC SINH',
    subtitle:   'STUDENT LIFE RECORD BOOK',
    orgSub:     'Nền tảng quản lý du học sinh Việt Nam',
    section1:   '1. Thông Tin Cơ Bản',
    nameKr:     'Tên (KR)', nameVn: 'Tên (VN)',
    dob:        'Ngày Sinh', gender: 'Giới Tính',
    studentCode:'Mã Học Sinh', status: 'Trạng Thái',
    enrollDate: 'Ngày Nhập Học', topik: 'Cấp Độ TOPIK',
    noTopik:    'Chưa đạt',
    langSchool: 'Trường NN', targetUniv: 'Trường / Ngành Mục Tiêu',
    visa:       'Loại Visa', visaExpiry: 'Hết Hạn Visa',
    section2:   '2. Lịch Sử Tư Vấn',
    noConsult:  'Không có lịch sử tư vấn công khai.',
    goal:       'Mục Tiêu', content: 'Nội Dung', improvement: 'Cải Thiện', nextGoal: 'Mục Tiêu Tiếp',
    section3:   '3. Đánh Giá Tổng Hợp Của Giáo Viên',
    noEval:     'Không có đánh giá công khai.',
    section4:   '4. Kết Quả Thi Thử TOPIK',
    examDate:   'Ngày Thi', round: 'Lần Thi',
    listening:  'Nghe', reading: 'Đọc', total: 'Tổng', level: 'Cấp Độ',
    noExam:     'Không có kết quả thi.',
    section5:   '5. Lịch Sử Trường Mục Tiêu',
    noAspiration: 'Không có lịch sử thay đổi.',
    aspDate:    'Ngày TĐ', aspTarget: 'Trường / Ngành Mục Tiêu', aspReason: 'Lý Do',
    issuedAt:   'Ngày Cấp',
    footerDoc:  'Hồ Sơ Học Sinh',
    footerOrg:  'AJU E&J Education Co., Ltd.',
    stampLabel: 'Con Dấu',
    roundSuffix:'lần',
    scoreUnit:  ' điểm',
    genderM:    'Nam', genderF: 'Nữ',
    photoPlaceholder: 'Ảnh',
    continued:  '(tiếp)',
  },
} as const
type Lang = 'ko' | 'vi'

// ── 색상 팔레트 ────────────────────────────────────
const C = {
  white:     '#FFFFFF',
  pageBg:    '#FFFFFF',
  navyDark:  '#1A237E',   // 섹션 헤더 배경
  navy:      '#283593',   // 강조 텍스트
  body:      '#1A1A1A',   // 본문
  muted:     '#5F6368',   // 보조 텍스트
  labelBg:   '#F1F3F4',   // 정보 테이블 라벨 배경
  stripe:    '#F8F9FA',   // 홀수 행 배경
  border:    '#DADCE0',   // 테두리
  borderDark:'#9AA0A6',   // 헤더 구분선
  green:     '#137333',   // 2급
  greenBg:   '#E6F4EA',
  blue:      '#1967D2',   // 1급
  blueBg:    '#E8F0FE',
  red:       '#C5221F',   // 불합격
  redBg:     '#FCE8E6',
  gray:      '#5F6368',   // 미응시 등
  grayBg:    '#F1F3F4',
  barFill:   '#3949AB',   // 점수 막대 채움
  barEmpty:  '#E8EAED',   // 점수 막대 빈칸
  amber:     '#B45309',
  amberBg:   '#FEF3C7',
}

// ── 스타일 ─────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    backgroundColor: C.pageBg,
    paddingTop: 36, paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 11,
    color: C.body,
    fontFamily: 'NotoSansKR',
  },

  // ── 1페이지 헤더 ──
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottom: `2.5px solid ${C.navyDark}`,
  },
  mainHeaderLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.navyDark,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 9,
    color: C.muted,
    marginTop: 3,
    letterSpacing: 1,
  },
  headerOrg: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.navy,
    marginTop: 8,
  },
  headerOrgSub: {
    fontSize: 9,
    color: C.muted,
    marginTop: 2,
  },
  photoBox: {
    width: 72,
    height: 90,
    border: `1px solid ${C.border}`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.labelBg,
    marginLeft: 16,
    flexShrink: 0,
  },
  photoImg: {
    width: 72,
    height: 90,
    objectFit: 'cover',
  },
  photoLabel: {
    fontSize: 8,
    color: C.muted,
  },

  // ── 섹션 ──
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    backgroundColor: C.navyDark,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: C.white,
    letterSpacing: 0.5,
  },

  // ── 기본정보 테이블 ──
  infoTable: {
    border: `1px solid ${C.border}`,
  },
  infoRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${C.border}`,
  },
  infoRowLast: {
    flexDirection: 'row',
  },
  infoCell: {
    flex: 1,
    flexDirection: 'row',
    borderRight: `1px solid ${C.border}`,
  },
  infoCellLast: {
    flex: 1,
    flexDirection: 'row',
  },
  infoCellFull: {
    flex: 2,
    flexDirection: 'row',
  },
  infoLabel: {
    width: 90,
    backgroundColor: C.labelBg,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 9,
    color: C.muted,
    fontWeight: 'bold',
    borderRight: `1px solid ${C.border}`,
  },
  infoValue: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 10,
    color: C.body,
    fontWeight: 'bold',
  },

  // ── 상담 이력 ──
  consultItem: {
    borderLeft: `3px solid ${C.navyDark}`,
    paddingLeft: 12,
    paddingTop: 6,
    paddingBottom: 8,
    marginTop: 8,
    marginLeft: 2,
  },
  consultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  consultDate: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.navy,
  },
  consultTag: {
    backgroundColor: C.amberBg,
    color: C.amber,
    fontSize: 8,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  consultCounselor: {
    fontSize: 9,
    color: C.muted,
  },
  aspBadge: {
    backgroundColor: '#EDE7F6',
    color: '#4527A0',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  consultLine: {
    fontSize: 10,
    color: C.body,
    lineHeight: 1.6,
    marginBottom: 2,
  },
  consultLineLabel: {
    fontWeight: 'bold',
    color: C.navy,
  },
  consultDivider: {
    borderBottom: `0.5px solid ${C.border}`,
    marginVertical: 6,
  },

  // ── 선생님 평가 ──
  evalBlock: {
    border: `1px solid ${C.border}`,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  evalHeader: {
    backgroundColor: C.labelBg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottom: `1px solid ${C.border}`,
  },
  evalDate: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.navy,
  },
  evalBy: {
    fontSize: 9,
    color: C.muted,
  },
  evalBody: {
    padding: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  scoreLabel: {
    fontSize: 9,
    color: C.muted,
    width: 100,
  },
  barWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: C.barEmpty,
    borderRadius: 4,
  },
  barFill: {
    height: 8,
    backgroundColor: C.barFill,
    borderRadius: 4,
  },
  scoreNum: {
    fontSize: 9,
    color: C.muted,
    width: 30,
    textAlign: 'right',
  },
  evalComment: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: `0.5px solid ${C.border}`,
    fontSize: 10,
    color: C.body,
    lineHeight: 1.6,
  },

  // ── 시험 성적 테이블 ──
  examTable: {
    border: `1px solid ${C.border}`,
    marginTop: 4,
  },
  examTHead: {
    flexDirection: 'row',
    backgroundColor: C.labelBg,
    borderBottom: `1px solid ${C.borderDark}`,
  },
  examTBody: {
    flexDirection: 'row',
  },
  examTBodyStripe: {
    flexDirection: 'row',
    backgroundColor: C.stripe,
  },
  examTh: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9,
    color: C.muted,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRight: `0.5px solid ${C.border}`,
  },
  examTd: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 10,
    color: C.body,
    textAlign: 'center',
    borderRight: `0.5px solid ${C.border}`,
  },
  examTdDate: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 10,
    color: C.body,
    textAlign: 'left',
    borderRight: `0.5px solid ${C.border}`,
  },
  examTdLast: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 10,
    color: C.body,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── 등급 뱃지 ──
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },

  // ── 희망대학 이력 테이블 ──
  aspTable: {
    border: `1px solid ${C.border}`,
    marginTop: 4,
  },
  aspTHead: {
    flexDirection: 'row',
    backgroundColor: C.labelBg,
    borderBottom: `1px solid ${C.borderDark}`,
  },
  aspTBody: {
    flexDirection: 'row',
  },
  aspTBodyStripe: {
    flexDirection: 'row',
    backgroundColor: C.stripe,
  },
  aspTh: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9,
    color: C.muted,
    fontWeight: 'bold',
    borderRight: `0.5px solid ${C.border}`,
  },
  aspTd: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 10,
    color: C.body,
    borderRight: `0.5px solid ${C.border}`,
  },
  aspTdLast: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 10,
    color: C.muted,
  },

  // ── 헤더 로고 박스 ──
  logoBox: {
    width: 28,
    height: 28,
    backgroundColor: C.navyDark,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  // ── 빈 데이터 ──
  noData: {
    fontSize: 10,
    color: C.muted,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontStyle: 'italic',
  },

  // ── 고정 푸터 ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTop: `1px solid ${C.border}`,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    flex: 1,
  },
  footerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  footerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 8,
    color: C.muted,
  },
  footerPageNum: {
    fontSize: 9,
    color: C.muted,
  },
  stampArea: {
    alignItems: 'center',
  },
  stampText: {
    fontSize: 8,
    color: C.muted,
    marginTop: 3,
  },
})

// ── 유틸 컴포넌트 ──────────────────────────────────

/** 점수 막대 그래프 */
function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  return (
    <View style={s.barWrap}>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
      <Text style={s.scoreNum}>{value}/{max}</Text>
    </View>
  )
}

/** 등급 뱃지 */
function GradeBadge({ level }: { level: string }) {
  const is2 = level.includes('2급')
  const is1 = level.includes('1급')
  const isFail = level === '불합격' || level === 'Không đạt'
  const bg    = is2 ? C.greenBg : is1 ? C.blueBg : isFail ? C.redBg : C.grayBg
  const color = is2 ? C.green  : is1 ? C.blue   : isFail ? C.red   : C.gray
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{level}</Text>
    </View>
  )
}

/** 카테고리 레이블 */
const CATEGORY_LABELS: Record<string, { ko: string; vi: string }> = {
  score:    { ko: '성적', vi: 'Điểm số' },
  attitude: { ko: '태도', vi: 'Thái độ' },
  career:   { ko: '진로', vi: 'Nghề nghiệp' },
  visa:     { ko: '비자', vi: 'Visa' },
  life:     { ko: '생활', vi: 'Sinh hoạt' },
  family:   { ko: '가정', vi: 'Gia đình' },
  other:    { ko: '기타', vi: 'Khác' },
}

// ── 타입 ──────────────────────────────────────────
export interface LifeRecordData {
  student: Student
  consultations: Consultation[]
  evaluations: TeacherEvaluation[]
  examResults: ExamResult[]
  aspirationHistory: AspirationHistory[]
  templates: Array<{ field_key: string; label_kr: string; max_value: number }>
  generatedAt: string
  stampImageUrl?: string
  lang?: 'ko' | 'vi'
}

// ── 메인 컴포넌트 ──────────────────────────────────
export default function LifeRecordDocument({
  student, consultations, evaluations, examResults,
  aspirationHistory, templates, generatedAt, stampImageUrl, lang = 'ko',
}: LifeRecordData) {
  const tx = T[lang as Lang] ?? T.ko
  const publicConsults  = consultations.filter(c => c.is_public)
  const publicEvals     = evaluations.filter(e => e.is_public)
  const ratingTemplates = templates.filter(t => t.field_key !== 'overall_comment')
  const sortedExams     = [...examResults].sort((a, b) => a.exam_date.localeCompare(b.exam_date))

  return (
    <Document title={`학생생활기록부_${student.name_kr}`} author="AJU E&J Education">
      <Page size="A4" style={s.page}>

        {/* ─── 고정 푸터 (모든 페이지) ─── */}
        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerText}>{tx.footerDoc} | {student.name_kr} ({student.student_code ?? '-'})</Text>
            <Text style={[s.footerText, { marginTop: 2 }]}>{tx.issuedAt}: {generatedAt}</Text>
          </View>
          <View style={s.footerCenter}>
            <Text
              style={s.footerPageNum}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
          <View style={s.footerRight}>
            <View style={s.stampArea}>
              {stampImageUrl ? (
                <Image src={stampImageUrl} style={{ width: 44, height: 44, opacity: 0.85 }} />
              ) : (
                <View style={{
                  width: 44, height: 44, borderRadius: 22,
                  border: `1.5px solid ${C.navyDark}`,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 6.5, color: C.navyDark, textAlign: 'center', lineHeight: 1.4 }}>
                    AJU E&amp;J{'\n'}EDU{'\n'}{tx.stampLabel}
                  </Text>
                </View>
              )}
              <Text style={s.stampText}>{tx.footerOrg}</Text>
            </View>
          </View>
        </View>

        {/* ─── 1페이지 메인 헤더 ─── */}
        <View style={s.mainHeader}>
          <View style={s.mainHeaderLeft}>
            <Text style={s.headerTitle}>{tx.title}</Text>
            <Text style={s.headerSubtitle}>{tx.subtitle}</Text>
            <View style={s.headerRow}>
              <View style={s.logoBox}>
                <Text style={s.logoText}>AE</Text>
              </View>
              <View>
                <Text style={s.headerOrg}>AJU E&amp;J Education Co., Ltd.</Text>
                <Text style={s.headerOrgSub}>{tx.orgSub}</Text>
              </View>
            </View>
          </View>
          {/* 학생 사진 */}
          <View style={s.photoBox}>
            {student.photo_url ? (
              <Image src={student.photo_url} style={s.photoImg} />
            ) : (
              <Text style={s.photoLabel}>{tx.photoPlaceholder}</Text>
            )}
          </View>
        </View>

        {/* ─── 1. 기본 정보 ─── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{tx.section1}</Text>
          </View>
          <View style={s.infoTable}>
            {/* 이름 행 */}
            <View style={s.infoRow}>
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>{tx.nameKr}</Text>
                <Text style={[s.infoValue, { fontSize: 12, color: C.navyDark }]}>{student.name_kr}</Text>
              </View>
              <View style={s.infoCellLast}>
                <Text style={s.infoLabel}>{tx.nameVn}</Text>
                <Text style={[s.infoValue, { fontSize: 12 }]}>{student.name_vn}</Text>
              </View>
            </View>
            {/* 생년월일 / 성별 */}
            <View style={s.infoRow}>
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>{tx.dob}</Text>
                <Text style={s.infoValue}>{student.dob ?? '-'}</Text>
              </View>
              <View style={s.infoCellLast}>
                <Text style={s.infoLabel}>{tx.gender}</Text>
                <Text style={s.infoValue}>{student.gender === 'M' ? tx.genderM : tx.genderF}</Text>
              </View>
            </View>
            {/* 학번 / 현재상태 */}
            <View style={s.infoRow}>
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>{tx.studentCode}</Text>
                <Text style={[s.infoValue, { fontFamily: 'NotoSansKR', letterSpacing: 1 }]}>
                  {student.student_code ?? '-'}
                </Text>
              </View>
              <View style={s.infoCellLast}>
                <Text style={s.infoLabel}>{tx.status}</Text>
                <Text style={s.infoValue}>{student.status}</Text>
              </View>
            </View>
            {/* 등록일 / TOPIK */}
            <View style={s.infoRow}>
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>{tx.enrollDate}</Text>
                <Text style={s.infoValue}>{student.enrollment_date ?? '-'}</Text>
              </View>
              <View style={s.infoCellLast}>
                <Text style={s.infoLabel}>{tx.topik}</Text>
                <Text style={[s.infoValue, { color: student.topik_level ? C.blue : C.muted }]}>
                  {student.topik_level ?? tx.noTopik}
                </Text>
              </View>
            </View>
            {/* 목표 대학 / 학과 */}
            {student.target_university && (
              <View style={s.infoRow}>
                <View style={s.infoCellFull}>
                  <Text style={s.infoLabel}>{tx.targetUniv}</Text>
                  <Text style={s.infoValue}>
                    {[student.target_university, student.target_major].filter(Boolean).join('  ·  ')}
                  </Text>
                </View>
              </View>
            )}
            {/* 재학 어학원 */}
            {student.language_school && (
              <View style={s.infoRow}>
                <View style={s.infoCellFull}>
                  <Text style={s.infoLabel}>{tx.langSchool}</Text>
                  <Text style={s.infoValue}>{student.language_school}</Text>
                </View>
              </View>
            )}
            {/* 비자 */}
            <View style={s.infoRowLast}>
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>{tx.visa}</Text>
                <Text style={s.infoValue}>{student.visa_type ?? '-'}</Text>
              </View>
              <View style={s.infoCellLast}>
                <Text style={s.infoLabel}>{tx.visaExpiry}</Text>
                <Text style={s.infoValue}>{student.visa_expiry ?? '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── 2. 상담 이력 ─── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{tx.section2}  ({publicConsults.length})</Text>
          </View>
          {publicConsults.length === 0 ? (
            <Text style={s.noData}>{tx.noConsult}</Text>
          ) : (
            publicConsults.map((c, idx) => (
              <View key={c.id} style={s.consultItem} wrap={false}>
                <View style={s.consultMeta}>
                  <Text style={s.consultDate}>{c.consult_date}</Text>
                  {c.topic_category && (
                    <Text style={s.consultTag}>
                      {CATEGORY_LABELS[c.topic_category]?.[lang as Lang] ?? c.topic_category}
                    </Text>
                  )}
                  {c.counselor_name && (
                    <Text style={s.consultCounselor}>{c.counselor_name}</Text>
                  )}
                </View>
                {(c.aspiration_univ || c.aspiration_major) && (
                  <Text style={s.aspBadge}>
                    {tx.goal}: {[c.aspiration_univ, c.aspiration_major].filter(Boolean).join('  ·  ')}
                  </Text>
                )}
                {c.summary && (
                  <Text style={s.consultLine}>
                    <Text style={s.consultLineLabel}>{tx.content}  </Text>
                    {c.summary}
                  </Text>
                )}
                {c.improvement && (
                  <Text style={s.consultLine}>
                    <Text style={s.consultLineLabel}>{tx.improvement}  </Text>
                    {c.improvement}
                  </Text>
                )}
                {c.next_goal && (
                  <Text style={s.consultLine}>
                    <Text style={s.consultLineLabel}>{tx.nextGoal}  </Text>
                    {c.next_goal}
                  </Text>
                )}
                {idx < publicConsults.length - 1 && <View style={s.consultDivider} />}
              </View>
            ))
          )}
        </View>

        {/* ─── 3. 선생님 평가 ─── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{tx.section3}  ({publicEvals.length})</Text>
          </View>
          {publicEvals.length === 0 ? (
            <Text style={s.noData}>{tx.noEval}</Text>
          ) : (
            publicEvals.map(ev => {
              const scoreEntries = ratingTemplates
                .map(t => ({ label: t.label_kr, value: Number(ev.scores[t.field_key] ?? 0), max: t.max_value }))
                .filter(entry => entry.value > 0)
              return (
                <View key={ev.id} style={s.evalBlock} wrap={false}>
                  <View style={s.evalHeader}>
                    <Text style={s.evalDate}>
                      {ev.eval_date}{ev.eval_period ? `  ·  ${ev.eval_period}` : ''}
                    </Text>
                    <Text style={s.evalBy}>{ev.evaluator_name}</Text>
                  </View>
                  <View style={s.evalBody}>
                    {scoreEntries.map(entry => (
                      <View key={entry.label} style={s.scoreRow}>
                        <Text style={s.scoreLabel}>{entry.label}</Text>
                        <ScoreBar value={entry.value} max={entry.max} />
                      </View>
                    ))}
                    {ev.overall_comment && (
                      <Text style={s.evalComment}>{ev.overall_comment}</Text>
                    )}
                  </View>
                </View>
              )
            })
          )}
        </View>

        {/* ─── 4. TOPIK 모의고사 ─── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{tx.section4}  ({sortedExams.length})</Text>
          </View>
          {sortedExams.length === 0 ? (
            <Text style={s.noData}>{tx.noExam}</Text>
          ) : (
            <View style={s.examTable}>
              {/* 테이블 헤더 */}
              <View style={s.examTHead}>
                <Text style={[s.examTh, { width: '20%', textAlign: 'left' }]}>{tx.examDate}</Text>
                <Text style={[s.examTh, { width: '16%' }]}>{tx.round}</Text>
                <Text style={[s.examTh, { width: '16%' }]}>{tx.listening}</Text>
                <Text style={[s.examTh, { width: '16%' }]}>{tx.reading}</Text>
                <Text style={[s.examTh, { width: '16%' }]}>{tx.total}</Text>
                <Text style={[s.examTh, { width: '16%', borderRight: 'none' }]}>{tx.level}</Text>
              </View>
              {/* 테이블 바디 */}
              {sortedExams.map((e, idx) => (
                <View key={e.id} style={idx % 2 === 0 ? s.examTBody : s.examTBodyStripe} wrap={false}>
                  <Text style={[s.examTdDate, { width: '20%' }]}>{e.exam_date}</Text>
                  <Text style={[s.examTd, { width: '16%' }]}>
                    {e.round_number ? `${e.round_number}${tx.roundSuffix}` : (e.exam_type ?? '-')}
                  </Text>
                  <Text style={[s.examTd, { width: '16%' }]}>{e.listening_score ?? '-'}</Text>
                  <Text style={[s.examTd, { width: '16%' }]}>{e.reading_score ?? '-'}</Text>
                  <Text style={[s.examTd, { width: '16%', fontWeight: 'bold', color: C.navy }]}>
                    {e.total_score}{tx.scoreUnit}
                  </Text>
                  <View style={[s.examTdLast, { width: '16%' }]}>
                    <GradeBadge level={e.level} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── 5. 목표 대학 변경 이력 ─── */}
        {aspirationHistory.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{tx.section5}  ({aspirationHistory.length})</Text>
            </View>
            {aspirationHistory.length === 0 ? (
              <Text style={s.noData}>{tx.noAspiration}</Text>
            ) : (
              <View style={s.aspTable}>
                {/* 헤더 */}
                <View style={s.aspTHead}>
                  <Text style={[s.aspTh, { width: '20%' }]}>{tx.aspDate}</Text>
                  <Text style={[s.aspTh, { width: '45%' }]}>{tx.aspTarget}</Text>
                  <Text style={[s.aspTh, { width: '35%', borderRight: 'none' }]}>{tx.aspReason}</Text>
                </View>
                {/* 바디 */}
                {aspirationHistory.map((a, idx) => (
                  <View key={a.id} style={idx % 2 === 0 ? s.aspTBody : s.aspTBodyStripe} wrap={false}>
                    <Text style={[s.aspTd, { width: '20%' }]}>{a.changed_date}</Text>
                    <Text style={[s.aspTd, { width: '45%' }]}>
                      {[a.university, a.major].filter(Boolean).join('  ·  ') || '-'}
                    </Text>
                    <Text style={[s.aspTdLast, { width: '35%' }]}>{a.reason ?? '-'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

      </Page>
    </Document>
  )
}
