import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * POST /api/topik-ai-proxy
 *
 * TOPIK 프로그램 전용 Gemini AI 프록시.
 * TOPIK 앱이 API 키를 직접 보유하지 않아도 AI 분석을 사용할 수 있도록 중계한다.
 * 키 변경은 Vercel 환경변수(GEMINI_API_KEY)만 수정하면 되고 앱 재빌드가 불필요하다.
 *
 * 인증: Authorization: Bearer <TOPIK_SYNC_SECRET>
 *
 * ── 모드 A (범용 프롬프트) ──────────────────────────────────────────────────────
 * Body: {
 *   contents: string,              // 프롬프트 텍스트
 *   model?: string,                // 기본값: gemini-2.5-flash-lite
 *   responseMimeType?: string,     // 기본값: application/json
 *   responseSchema?: object        // JSON 스키마 (선택)
 * }
 * Response: { text: string }
 *
 * ── 모드 B (간단 학생 분석) ─────────────────────────────────────────────────────
 * Body: {
 *   studentName: string,
 *   agency: string,
 *   listeningScore: number,
 *   readingScore: number,
 *   totalScore: number,
 *   level: number,
 *   examDate: string,
 *   scoreHistory?: Array<{ examDate: string; total: number; level: number }>
 * }
 * Response: { analysisKo: string, analysisVi: string }
 */
export async function POST(req: NextRequest) {
  // ── 인증 ───────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const syncSecret = process.env.TOPIK_SYNC_SECRET

  if (!token || !syncSecret || token !== syncSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI 서비스를 사용할 수 없습니다.' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  // ── 모드 A: 범용 프롬프트 ──────────────────────────────
  if (typeof body.contents === 'string') {
    const {
      contents,
      model = 'gemini-2.5-flash-lite',
      responseMimeType = 'application/json',
      responseSchema,
    } = body as {
      contents: string
      model?: string
      responseMimeType?: string
      responseSchema?: unknown
    }

    try {
      const geminiModel = genAI.getGenerativeModel({
        model: model as string,
        generationConfig: {
          responseMimeType: responseMimeType as string,
          ...(responseSchema ? { responseSchema: normalizeSchema(responseSchema) } : {}),
        } as Record<string, unknown>,
      })

      const result = await geminiModel.generateContent(contents)
      return NextResponse.json({ text: result.response.text() })
    } catch (err) {
      console.error('[topik-ai-proxy] Mode A error:', err)
      return NextResponse.json({ error: 'AI 요청 실패' }, { status: 500 })
    }
  }

  // ── 모드 B: 간단 학생 분석 ─────────────────────────────
  const { studentName, agency, listeningScore, readingScore, totalScore, level, examDate, scoreHistory } = body as {
    studentName: string
    agency: string
    listeningScore: number
    readingScore: number
    totalScore: number
    level: number
    examDate: string
    scoreHistory?: Array<{ examDate: string; total: number; level: number }>
  }

  if (!studentName || totalScore === undefined) {
    return NextResponse.json({ error: 'contents 또는 studentName+totalScore 필수' }, { status: 400 })
  }

  const levelLabel = level === 2 ? '2급 합격' : level === 1 ? '1급 합격' : '불합격'
  const historyText = scoreHistory && scoreHistory.length > 1
    ? '\n\n이전 성적 추이:\n' + scoreHistory
        .slice(0, -1)
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

  try {
    const simpleModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const [resultKo, resultVi] = await Promise.all([
      simpleModel.generateContent(promptKo),
      simpleModel.generateContent(promptVi),
    ])
    return NextResponse.json({
      analysisKo: resultKo.response.text().trim(),
      analysisVi: resultVi.response.text().trim(),
    })
  } catch (err) {
    console.error('[topik-ai-proxy] Mode B error:', err)
    return NextResponse.json({ error: 'AI 분석 요청에 실패했습니다.' }, { status: 500 })
  }
}

/**
 * @google/genai 새 SDK는 소문자 타입('object')을 사용하고
 * @google/generative-ai 구 SDK는 대문자('OBJECT')를 사용한다.
 * TOPIK 프로그램에서 소문자로 보내면 여기서 대문자로 정규화한다.
 */
function normalizeSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema
  const s = { ...(schema as Record<string, unknown>) }
  if (typeof s.type === 'string') s.type = s.type.toUpperCase()
  if (s.properties && typeof s.properties === 'object') {
    s.properties = Object.fromEntries(
      Object.entries(s.properties as Record<string, unknown>).map(
        ([k, v]) => [k, normalizeSchema(v)]
      )
    )
  }
  if (s.items) s.items = normalizeSchema(s.items)
  return s
}
