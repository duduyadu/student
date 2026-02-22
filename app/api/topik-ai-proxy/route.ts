import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * TOPIK 모의고사 분석 AI 프록시
 *
 * 목적: TOPIK Electron 앱이 Gemini API 키를 직접 가지지 않도록
 *       이 서버가 키를 관리하고 분석을 대신 수행.
 *
 * 키 변경 시: Vercel 환경변수 GEMINI_API_KEY 만 수정 → 앱 재빌드 불필요.
 *
 * 인증: 요청 헤더 x-topik-secret 값 확인 (TOPIK_PROXY_SECRET 환경변수와 비교)
 *
 * POST /api/topik-ai-proxy
 * Body: {
 *   studentName: string,
 *   agency: string,
 *   listeningScore: number,
 *   readingScore: number,
 *   totalScore: number,
 *   level: number,          // 1 or 2 (TOPIK I 등급)
 *   examDate: string,       // YYYY-MM-DD
 *   scoreHistory?: Array<{ examDate: string, total: number, level: number }>
 * }
 * Response: { analysisKo: string, analysisVi: string }
 */
export async function POST(req: NextRequest) {
  // ── 1. 프록시 시크릿 인증 ────────────────────────────────
  const secret = process.env.TOPIK_PROXY_SECRET
  if (secret) {
    const clientSecret = req.headers.get('x-topik-secret')
    if (clientSecret !== secret) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }
  }

  // ── 2. Gemini API 키 확인 ─────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY 미설정' }, { status: 500 })
  }

  // ── 3. 요청 데이터 파싱 ───────────────────────────────────
  let body: {
    studentName: string
    agency: string
    listeningScore: number
    readingScore: number
    totalScore: number
    level: number
    examDate: string
    scoreHistory?: Array<{ examDate: string; total: number; level: number }>
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 JSON 형식' }, { status: 400 })
  }

  const { studentName, agency, listeningScore, readingScore, totalScore, level, examDate, scoreHistory } = body
  if (!studentName || totalScore === undefined) {
    return NextResponse.json({ error: 'studentName, totalScore 필수' }, { status: 400 })
  }

  // ── 4. 프롬프트 구성 ──────────────────────────────────────
  const levelLabel = level === 2 ? '2급 합격' : level === 1 ? '1급 합격' : '불합격'
  const historyText = scoreHistory && scoreHistory.length > 1
    ? '\n\n이전 성적 추이:\n' + scoreHistory
        .slice(0, -1)  // 현재 회차 제외
        .map((h, i) => `  ${i + 1}회차: ${h.examDate} | ${h.total}점 | ${h.level === 2 ? '2급' : h.level === 1 ? '1급' : '불합격'}`)
        .join('\n')
    : ''

  const promptKo = `
당신은 한국어 교육 전문가입니다.
TOPIK I 시험 결과를 분석해주세요. (200점 만점: 듣기 100 + 읽기 100)
2급 합격: 140점 이상, 1급 합격: 80점 이상

학생: ${studentName} (유학원: ${agency})
시험일: ${examDate}
듣기: ${listeningScore}점 | 읽기: ${readingScore}점 | 합계: ${totalScore}점 | 결과: ${levelLabel}
${historyText}

다음을 간결하게 한국어로 분석해주세요 (150자 내외):
1. 이번 결과 평가
2. 강점/취약 영역 (듣기 vs 읽기)
3. 다음 목표를 위한 핵심 조언 1가지

마크다운 없이 일반 텍스트로만 작성하세요.
`.trim()

  const promptVi = `
Bạn là chuyên gia giáo dục tiếng Hàn.
Hãy phân tích kết quả thi TOPIK I. (200 điểm: Nghe 100 + Đọc 100)
Cấp 2: từ 140 điểm, Cấp 1: từ 80 điểm

Học sinh: ${studentName} (Trung tâm: ${agency})
Ngày thi: ${examDate}
Nghe: ${listeningScore} | Đọc: ${readingScore} | Tổng: ${totalScore} | Kết quả: ${levelLabel}
${historyText}

Hãy phân tích ngắn gọn bằng tiếng Việt (khoảng 150 từ):
1. Đánh giá kết quả lần này
2. Điểm mạnh/yếu (Nghe vs Đọc)
3. Một lời khuyên quan trọng cho mục tiêu tiếp theo

Chỉ viết văn xuôi, không dùng markdown.
`.trim()

  // ── 5. Gemini 병렬 호출 ───────────────────────────────────
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const [resultKo, resultVi] = await Promise.all([
      model.generateContent(promptKo),
      model.generateContent(promptVi),
    ])

    return NextResponse.json({
      analysisKo: resultKo.response.text().trim(),
      analysisVi: resultVi.response.text().trim(),
    })
  } catch (err) {
    console.error('[topik-ai-proxy] Gemini error:', err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    )
  }
}
