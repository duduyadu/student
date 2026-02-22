import {
  Document, Page, Text, View, StyleSheet, Image, Font
} from '@react-pdf/renderer'
import path from 'path'
import type { Student, Consultation, TeacherEvaluation, ExamResult, AspirationHistory } from '@/lib/types'

// ── 한글 폰트 등록 ──────────────────────
const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansKR.ttf')
Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: fontPath, fontWeight: 'normal',  fontStyle: 'normal' },
    { src: fontPath, fontWeight: 'bold',    fontStyle: 'normal' },
    { src: fontPath, fontWeight: 'normal',  fontStyle: 'italic' },
    { src: fontPath, fontWeight: 'bold',    fontStyle: 'italic' },
  ],
})
Font.registerHyphenationCallback(word => [word]) // 한글 줄바꿈 방지

// ── 번역 딕셔너리 ──────────────────────
const T = {
  ko: {
    title: '학 생 생 활 기 록 부',
    subtitle: 'STUDENT LIFE RECORD BOOK',
    orgSub: '베트남 유학생 통합 관리 플랫폼',
    section1: '1. 학생 기본 정보',
    nameKr: '이름 (KR)', nameVn: '이름 (VN)',
    dob: '생년월일', gender: '성별',
    studentCode: '학번', status: '현재 상태',
    enrollDate: '등록일', topik: 'TOPIK 등급',
    noTopik: '미취득',
    langSchool: '재학 어학원', targetUniv: '목표 대학',
    visa: '비자', visaExpiry: '만료',
    section2: '2. 상담 이력',
    noConsult: '공개 상담 기록이 없습니다.',
    goal: '목표', content: '내용', improvement: '개선', nextGoal: '목표',
    section3: '3. 선생님 종합 평가',
    section4: '4. TOPIK 모의고사 성적',
    examDate: '모의고사 일자', round: '회차',
    listening: '듣기', reading: '읽기', total: '총점', level: '등급',
    issuedAt: '발급일',
    footerMain: '본 문서는 AJU E&J Education Co., Ltd.에서 공식 발급한 학생 생활기록부입니다.',
    footerSub: 'This document is officially issued by AJU E&J Education Co., Ltd.',
    stampLabel: '직인',
    roundSuffix: '회차',
    pointSuffix: '점',
  },
  vi: {
    title: 'HỒ SƠ HỌC SINH',
    subtitle: 'STUDENT LIFE RECORD BOOK',
    orgSub: 'Nền tảng quản lý du học sinh Việt Nam',
    section1: '1. Thông Tin Cơ Bản',
    nameKr: 'Tên (KR)', nameVn: 'Tên (VN)',
    dob: 'Ngày Sinh', gender: 'Giới Tính',
    studentCode: 'Mã Học Sinh', status: 'Trạng Thái',
    enrollDate: 'Ngày Nhập Học', topik: 'Cấp Độ TOPIK',
    noTopik: 'Chưa đạt',
    langSchool: 'Trường Ngôn Ngữ', targetUniv: 'Trường Mục Tiêu',
    visa: 'Visa', visaExpiry: 'Hết Hạn',
    section2: '2. Lịch Sử Tư Vấn',
    noConsult: 'Không có lịch sử tư vấn công khai.',
    goal: 'Mục Tiêu', content: 'Nội Dung', improvement: 'Cải Thiện', nextGoal: 'Mục Tiêu Tiếp',
    section3: '3. Đánh Giá Tổng Hợp Của Giáo Viên',
    section4: '4. Kết Quả Thi Thử TOPIK',
    examDate: 'Ngày Thi', round: 'Lần Thi',
    listening: 'Nghe', reading: 'Đọc', total: 'Tổng Điểm', level: 'Cấp Độ',
    issuedAt: 'Ngày Cấp',
    footerMain: 'Tài liệu này được cấp chính thức bởi AJU E&J Education Co., Ltd.',
    footerSub: 'This document is officially issued by AJU E&J Education Co., Ltd.',
    stampLabel: 'Con Dấu',
    roundSuffix: 'lần',
    pointSuffix: 'điểm',
  },
} as const

type Lang = 'ko' | 'vi'

// ── 색상 팔레트 (공식 문서 스타일) ──────────────────────
const C = {
  bg:        '#FDFAF5',   // 크림 배경
  headerBg:  '#E8EAF6',   // 섹션 헤더 배경 (연한 인디고)
  navy:      '#1A237E',   // 제목 텍스트
  body:      '#212121',   // 본문
  muted:     '#757575',   // 보조
  border:    '#C5CAE9',   // 구분선
  green:     '#2E7D32',   // 공개 배지
  accent:    '#3949AB',   // 타임라인 강조
  white:     '#FFFFFF',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    paddingTop: 36, paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: 9,
    color: C.body,
    fontFamily: 'NotoSansKR',
  },
  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 10,
    borderBottom: `2px solid ${C.navy}`,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.navy,
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 8,
    color: C.muted,
    marginTop: 2,
  },
  orgName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.navy,
    textAlign: 'right',
  },
  // 섹션
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    backgroundColor: C.headerBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
    borderLeft: `3px solid ${C.accent}`,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: C.navy,
    letterSpacing: 0.5,
  },
  // 기본정보 그리드
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  infoCell: {
    width: '50%',
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottom: `0.5px solid ${C.border}`,
  },
  infoLabel: {
    width: 80,
    color: C.muted,
    fontSize: 8,
  },
  infoValue: {
    flex: 1,
    color: C.body,
    fontWeight: 'bold',
    fontSize: 8,
  },
  // 타임라인
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginTop: 2,
    marginRight: 8,
    flexShrink: 0,
  },
  timelineContent: {
    flex: 1,
    borderLeft: `1px solid ${C.border}`,
    paddingLeft: 8,
    paddingBottom: 6,
  },
  timelineDate: {
    fontWeight: 'bold',
    fontSize: 8,
    color: C.navy,
    marginBottom: 1,
  },
  timelineMeta: {
    fontSize: 7.5,
    color: C.muted,
    marginBottom: 2,
  },
  timelineBody: {
    fontSize: 8,
    color: C.body,
    lineHeight: 1.5,
  },
  aspBadge: {
    backgroundColor: '#EDE7F6',
    color: '#4527A0',
    fontSize: 7.5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
    marginBottom: 3,
    alignSelf: 'flex-start',
  },
  // 평가 별점
  evalBlock: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: C.white,
    border: `0.5px solid ${C.border}`,
    borderRadius: 3,
  },
  evalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  evalDate: {
    fontWeight: 'bold',
    fontSize: 8,
    color: C.navy,
  },
  evalBy: {
    fontSize: 7.5,
    color: C.muted,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: 8,
    color: C.muted,
    width: 90,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 9,
    lineHeight: 1,
  },
  evalComment: {
    marginTop: 4,
    fontSize: 8,
    color: C.body,
    lineHeight: 1.5,
    paddingTop: 4,
    borderTop: `0.5px solid ${C.border}`,
  },
  // 성적 추이
  examRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottom: `0.5px solid ${C.border}`,
    alignItems: 'center',
  },
  examDate:  { width: 70,  fontSize: 8, color: C.body },
  examType:  { width: 60,  fontSize: 8, color: C.muted },
  examScore: { width: 40,  fontSize: 8, color: C.body, textAlign: 'center' },
  examLevel: {
    width: 40,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.navy,
    textAlign: 'center',
  },
  examArrow: { flex: 1, fontSize: 7.5, color: C.muted },
  examTableHeader: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottom: `1px solid ${C.navy}`,
    marginBottom: 2,
  },
  examTableLabel: {
    fontSize: 7.5,
    color: C.muted,
    fontWeight: 'bold',
  },
  // 직인 / 푸터
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTop: `1px solid ${C.border}`,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7.5,
    color: C.muted,
  },
  stampArea: {
    alignItems: 'center',
  },
  stampText: {
    fontSize: 8,
    color: C.muted,
    marginTop: 4,
  },
  noData: {
    fontSize: 8,
    color: C.muted,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
})

// ── 별점 렌더링 (★) ──────────────────────
function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: max }, (_, i) => (
        <Text key={i} style={[styles.star, { color: i < value ? '#F59E0B' : '#D1D5DB' }]}>
          ★
        </Text>
      ))}
    </View>
  )
}

// ── 카테고리 레이블 ──────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  score: '성적', attitude: '태도', career: '진로',
  visa: '비자', life: '생활', family: '가정', other: '기타',
}

// ── 메인 PDF 문서 컴포넌트 ──────────────────────
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

export default function LifeRecordDocument({
  student, consultations, evaluations, examResults,
  aspirationHistory, templates, generatedAt, stampImageUrl, lang = 'ko',
}: LifeRecordData) {
  const tx = T[lang as Lang] ?? T.ko
  const publicConsults   = consultations.filter(c => c.is_public)
  const publicEvals      = evaluations.filter(e => e.is_public)
  const ratingTemplates  = templates.filter(t => t.field_key !== 'overall_comment')

  return (
    <Document title={`학생생활기록부_${student.name_kr}`} author="AJU E&J Education">
      <Page size="A4" style={styles.page}>

        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{tx.title}</Text>
            <Text style={styles.headerSub}>{tx.subtitle}</Text>
          </View>
          <View>
            <Text style={styles.orgName}>AJU E&amp;J Education Co., Ltd.</Text>
            <Text style={[styles.headerSub, { textAlign: 'right' }]}>{tx.orgSub}</Text>
          </View>
        </View>

        {/* ── 기본 정보 ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{tx.section1}</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{tx.nameKr}</Text>
              <Text style={styles.infoValue}>{student.name_kr}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{tx.nameVn}</Text>
              <Text style={styles.infoValue}>{student.name_vn}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{tx.dob}</Text>
              <Text style={styles.infoValue}>{student.dob}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{tx.gender}</Text>
              <Text style={styles.infoValue}>{student.gender === 'M' ? '남 / Nam' : '여 / Nữ'}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{tx.studentCode}</Text>
              <Text style={styles.infoValue}>{student.student_code ?? '-'}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{tx.status}</Text>
              <Text style={styles.infoValue}>{student.status}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{tx.enrollDate}</Text>
              <Text style={styles.infoValue}>{student.enrollment_date ?? '-'}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{tx.topik}</Text>
              <Text style={styles.infoValue}>{student.topik_level ?? tx.noTopik}</Text>
            </View>
            {student.language_school && (
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>{tx.langSchool}</Text>
                <Text style={styles.infoValue}>{student.language_school}</Text>
              </View>
            )}
            {student.target_university && (
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>{tx.targetUniv}</Text>
                <Text style={styles.infoValue}>
                  {[student.target_university, student.target_major].filter(Boolean).join(' · ')}
                </Text>
              </View>
            )}
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>{tx.visa}</Text>
              <Text style={styles.infoValue}>
                {student.visa_type ?? '-'}{student.visa_expiry ? ` (${tx.visaExpiry}: ${student.visa_expiry})` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 상담 이력 ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{tx.section2} ({publicConsults.length})</Text>
          </View>
          {publicConsults.length === 0 ? (
            <Text style={styles.noData}>{tx.noConsult}</Text>
          ) : (
            publicConsults.map(c => (
              <View key={c.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDate}>
                    {c.consult_date}
                    {c.topic_category ? `  [${CATEGORY_LABELS[c.topic_category] ?? c.topic_category}]` : ''}
                    {c.counselor_name ? `  ·  ${c.counselor_name}` : ''}
                  </Text>
                  {(c.aspiration_univ || c.aspiration_major) && (
                    <Text style={styles.aspBadge}>
                      {tx.goal}: {[c.aspiration_univ, c.aspiration_major].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  {c.summary     && <Text style={styles.timelineBody}>{tx.content}: {c.summary}</Text>}
                  {c.improvement && <Text style={styles.timelineBody}>{tx.improvement}: {c.improvement}</Text>}
                  {c.next_goal   && <Text style={styles.timelineBody}>{tx.nextGoal}: {c.next_goal}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── 선생님 평가 ── */}
        {publicEvals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{tx.section3} ({publicEvals.length})</Text>
            </View>
            {publicEvals.map(ev => {
              const scoreEntries = ratingTemplates
                .map(t => ({ label: t.label_kr, value: Number(ev.scores[t.field_key] ?? 0), max: t.max_value }))
                .filter(s => s.value > 0)
              return (
                <View key={ev.id} style={styles.evalBlock}>
                  <View style={styles.evalHeader}>
                    <Text style={styles.evalDate}>
                      {ev.eval_date}{ev.eval_period ? `  ${ev.eval_period}` : ''}
                    </Text>
                    <Text style={styles.evalBy}>{ev.evaluator_name}</Text>
                  </View>
                  {scoreEntries.map(s => (
                    <View key={s.label} style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>{s.label}</Text>
                      <Stars value={s.value} max={s.max} />
                      <Text style={{ fontSize: 7.5, color: C.muted, marginLeft: 4 }}>
                        {s.value}/{s.max}
                      </Text>
                    </View>
                  ))}
                  {ev.overall_comment && (
                    <Text style={styles.evalComment}>{ev.overall_comment}</Text>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {/* ── 시험 성적 ── */}
        {examResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{tx.section4} ({examResults.length})</Text>
            </View>
            {/* 테이블 헤더 */}
            <View style={styles.examTableHeader}>
              <Text style={[styles.examTableLabel, { width: 70 }]}>{tx.examDate}</Text>
              <Text style={[styles.examTableLabel, { width: 60 }]}>{tx.round}</Text>
              <Text style={[styles.examTableLabel, { width: 40, textAlign: 'center' }]}>{tx.listening}</Text>
              <Text style={[styles.examTableLabel, { width: 40, textAlign: 'center' }]}>{tx.reading}</Text>
              <Text style={[styles.examTableLabel, { width: 50, textAlign: 'center' }]}>{tx.total}</Text>
              <Text style={[styles.examTableLabel, { width: 40, textAlign: 'center' }]}>{tx.level}</Text>
            </View>
            {[...examResults].sort((a, b) => a.exam_date.localeCompare(b.exam_date)).map(e => (
              <View key={e.id} style={styles.examRow}>
                <Text style={styles.examDate}>{e.exam_date}</Text>
                <Text style={styles.examType}>{e.round_number ? `${e.round_number}${tx.roundSuffix}` : (e.exam_type ?? '-')}</Text>
                <Text style={[styles.examScore]}>{e.listening_score ?? '-'}</Text>
                <Text style={[styles.examScore]}>{e.reading_score ?? '-'}</Text>
                <Text style={[styles.examScore, { width: 50, fontWeight: 'bold' }]}>
                  {e.total_score}{tx.pointSuffix}
                </Text>
                <Text style={styles.examLevel}>{e.level}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 푸터 / 직인 ── */}
        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerText}>{tx.issuedAt}: {generatedAt}</Text>
            <Text style={[styles.footerText, { marginTop: 2 }]}>
              {tx.footerMain}
            </Text>
            <Text style={[styles.footerText, { marginTop: 1 }]}>
              {tx.footerSub}
            </Text>
          </View>
          <View style={styles.stampArea}>
            {stampImageUrl ? (
              <Image src={stampImageUrl} style={{ width: 60, height: 60, opacity: 0.85 }} />
            ) : (
              <View style={{
                width: 60, height: 60, borderRadius: 30,
                border: `2px solid ${C.navy}`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 7, color: C.navy, textAlign: 'center', lineHeight: 1.4 }}>
                  AJU E&amp;J{'\n'}EDUCATION{'\n'}{tx.stampLabel}
                </Text>
              </View>
            )}
            <Text style={styles.stampText}>AJU E&amp;J Education</Text>
          </View>
        </View>

      </Page>
    </Document>
  )
}
