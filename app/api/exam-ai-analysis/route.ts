import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getServiceClient, getAnonClient } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  // Bearer 토큰 인증
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: { user }, error: authErr } = await getAnonClient().auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = req.nextUrl.searchParams.get('studentId')
  if (!studentId) {
    return NextResponse.json({ error: 'studentId 필수' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY 미설정' }, { status: 500 })
  }

  // ── 1. 시험 데이터 로드 ──────────────────────────────
  const supabase = getServiceClient()
  const { data: exams } = await supabase
    .from('exam_results')
    .select('exam_date, exam_type, listening_score, reading_score, writing_score, total_score, level, section_scores, exam_source')
    .eq('student_id', studentId)
    .order('exam_date', { ascending: true })

  if (!exams || exams.length === 0) {
    return NextResponse.json({ error: '시험 데이터가 없습니다.' }, { status: 404 })
  }

  // ── 2. 프롬프트 구성 ──────────────────────────────────
  const examSummary = exams.map((e, i) =>
    `[${i + 1}회차] ${e.exam_date} | 듣기: ${e.listening_score ?? '-'}점 | 읽기: ${e.reading_score ?? '-'}점 | 총점: ${e.total_score}점 | 등급: ${e.level}`
  ).join('\n')

  const prompt = `
당신은 한국어 교육 전문가입니다.
아래는 베트남 유학생의 TOPIK I 시험 성적 이력입니다.
TOPIK I은 듣기+읽기 200점 만점이며, 2급 합격 기준은 140점 이상입니다.

${examSummary}

다음 형식으로 한국어로 분석해주세요 (총 200자 내외, 간결하게):

1. 전체 추이 평가 (1-2문장): 성적이 향상/정체/하락 중인지
2. 강점 영역: 듣기와 읽기 중 상대적으로 높은 영역
3. 개선 필요 영역: 낮은 영역과 구체적 학습 방향
4. 2급 달성 예측: 현재 추세로 140점 달성 가능성

마크다운이나 특수기호 없이 일반 텍스트로만 작성하세요.
`.trim()

  // ── 3. Gemini 호출 ────────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // ── 4. DB에 캐시 저장 (최신 시험에 ai_analysis 업데이트) ──
    const latestExam = exams[exams.length - 1]
    await supabase
      .from('exam_results')
      .update({ ai_analysis: text })
      .eq('student_id', studentId)
      .eq('exam_date', latestExam.exam_date)

    return NextResponse.json({ analysis: text })
  } catch (err) {
    console.error('[exam-ai-analysis] Gemini error:', err)
    return NextResponse.json({ error: 'AI 분석 요청에 실패했습니다.' }, { status: 500 })
  }
}
