import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabaseServer'

// student_code 정규화 (26-001-001 → 26001001)
function normalizeCode(code: unknown): string {
  return String(code ?? '').replace(/-/g, '').trim()
}

// 총점 → 등급 자동 계산 (TOPIK I 기준: 200점 만점)
function calcLevel(total: number): string {
  if (total >= 140) return '2급'
  if (total >= 80)  return '1급'
  return '불합격'
}

interface ScoreEntry {
  student_code: string
  student_name?: string
  agency?: string
  listening: number
  reading: number
  total?: number
  level?: number | string
}

interface SyncRequest {
  examDate: string        // 'YYYY-MM-DD'
  examRound: string       // '1', '2', ...
  examTitle?: string      // '3월 모의고사' (optional)
  scores: ScoreEntry[]
}

/**
 * POST /api/topik-sync
 * TOPIK 로컬 프로그램 → AJU 플랫폼 성적 자동 동기화
 * 인증: Authorization: Bearer <TOPIK_SYNC_SECRET>
 */
export async function POST(req: NextRequest) {
  // ── 1. 인증 ───────────────────────────────────────
  const secret = process.env.TOPIK_SYNC_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'TOPIK_SYNC_SECRET not configured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. 요청 파싱 ───────────────────────────────────
  let body: SyncRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { examDate, examRound, examTitle, scores } = body
  if (!examDate || !examRound || !Array.isArray(scores) || scores.length === 0) {
    return NextResponse.json(
      { error: 'examDate, examRound, scores[] 필수' },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()
  let synced = 0
  let skipped = 0
  const unmatched: { student_code: string; name?: string }[] = []

  // ── 3. 학생별 처리 ────────────────────────────────
  for (const entry of scores) {
    const code = normalizeCode(entry.student_code)
    if (!code) {
      unmatched.push({ student_code: '', name: entry.student_name })
      continue
    }

    // student_code → student_id 매핑
    const { data: studentRow, error: lookupErr } = await supabase
      .from('students')
      .select('id')
      .eq('student_code', code)
      .single()

    if (lookupErr || !studentRow) {
      unmatched.push({ student_code: code, name: entry.student_name })
      continue
    }

    const listening = Number(entry.listening) || 0
    const reading   = Number(entry.reading)   || 0
    const total     = entry.total != null ? Number(entry.total) : listening + reading
    const levelNum  = typeof entry.level === 'number' ? entry.level : null
    const levelStr  = levelNum != null
      ? (levelNum === 2 ? '2급' : levelNum === 1 ? '1급' : '불합격')
      : calcLevel(total)

    // 중복 확인 (같은 날, 같은 학생, 같은 회차)
    const roundNum = parseInt(examRound)
    const { data: existing } = await supabase
      .from('exam_results')
      .select('id, total_score')
      .eq('student_id', studentRow.id)
      .eq('exam_date', examDate)
      .eq('round_number', roundNum)
      .eq('exam_source', 'topik-app')
      .maybeSingle()

    if (existing) {
      // 동일 데이터면 skip, 점수가 다르면 update
      if (existing.total_score === total) {
        skipped++
        continue
      }
      await supabase
        .from('exam_results')
        .update({
          listening_score: listening,
          reading_score:   reading,
          total_score:     total,
          level:           levelStr,
          extra_data:      { synced_name: entry.student_name, agency: entry.agency, exam_title: examTitle },
        })
        .eq('id', existing.id)
      synced++
      continue
    }

    // 신규 insert
    const { error: insertErr } = await supabase
      .from('exam_results')
      .insert({
        student_id:      studentRow.id,
        exam_date:       examDate,
        exam_type:       examTitle ?? 'TOPIK 모의고사',
        exam_source:     'topik-app',
        round_number:    roundNum,
        listening_score: listening,
        reading_score:   reading,
        writing_score:   null,
        total_score:     total,
        level:           levelStr,
        section_scores:  {},
        extra_data:      { synced_name: entry.student_name, agency: entry.agency, exam_title: examTitle },
      })

    if (insertErr) {
      unmatched.push({ student_code: code, name: entry.student_name })
    } else {
      synced++
    }
  }

  return NextResponse.json({
    synced,
    skipped,
    unmatched,
    total: scores.length,
    message: `${synced}건 동기화 완료${skipped ? `, ${skipped}건 스킵` : ''}${unmatched.length ? `, ${unmatched.length}건 매핑 실패` : ''}`,
  })
}
