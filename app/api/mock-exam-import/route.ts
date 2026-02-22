import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Excel 컬럼명 정규화 (다양한 표기 허용)
function normalizeHeader(h: string): string {
  const s = String(h).trim().toLowerCase().replace(/\s/g, '')
  if (['studentcode','학번','학생코드','code'].includes(s)) return 'student_code'
  if (['name','이름','성명'].includes(s)) return 'name'
  if (['listening','듣기','청취'].includes(s)) return 'listening'
  if (['reading','읽기','독해'].includes(s)) return 'reading'
  if (['writing','쓰기','작문'].includes(s)) return 'writing'
  if (['total','합계','총점','score'].includes(s)) return 'total'
  if (['level','등급','급'].includes(s)) return 'level'
  return s
}

// 총점 → 등급 자동 계산
function calcLevel(total: number): string {
  if (total >= 230) return '6급'
  if (total >= 190) return '5급'
  if (total >= 150) return '4급'
  if (total >= 120) return '3급'
  if (total >= 80)  return '2급'
  if (total >= 40)  return '1급'
  return '불합격'
}

export async function POST(req: NextRequest) {
  try {
    const formData    = await req.formData()
    const file        = formData.get('file') as File | null
    const studentId   = formData.get('studentId') as string | null
    const examDate    = formData.get('examDate') as string | null
    const roundNumber = formData.get('roundNumber') as string | null

    if (!file || !studentId || !examDate) {
      return NextResponse.json(
        { error: 'file, studentId, examDate 필수' },
        { status: 400 },
      )
    }

    // ── 1. Excel 파싱 ──────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer())
    const wb     = XLSX.read(buffer, { type: 'buffer' })
    const ws     = wb.Sheets[wb.SheetNames[0]]
    const rows   = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Excel 데이터가 비어 있습니다.' }, { status: 400 })
    }

    // ── 2. 첫 행으로 컬럼 매핑 확인 ──────────────────
    const firstRow  = rows[0]
    const headerMap: Record<string, string> = {}
    for (const key of Object.keys(firstRow)) {
      headerMap[key] = normalizeHeader(key)
    }

    // ── 3. 단일 학생 업로드 모드 vs 전체 학생 모드 ──
    // studentId가 있으면 해당 학생 1명만 저장
    const supabase = getServiceClient()
    const inserted: unknown[] = []
    const errors:   string[]  = []

    for (const row of rows) {
      // 정규화된 키-값으로 변환
      const norm: Record<string, unknown> = {}
      for (const [origKey, val] of Object.entries(row)) {
        norm[headerMap[origKey] ?? origKey] = val
      }

      const listening = norm.listening !== '' ? Number(norm.listening) : null
      const reading   = norm.reading   !== '' ? Number(norm.reading)   : null
      const writing   = norm.writing   !== '' ? Number(norm.writing)   : null
      const totalRaw  = norm.total
      const total     = totalRaw !== '' ? Number(totalRaw) : (
        (listening ?? 0) + (reading ?? 0) + (writing ?? 0)
      )
      const level     = (norm.level as string) || calcLevel(total)

      if (isNaN(total)) {
        errors.push(`총점을 읽을 수 없는 행 건너뜀: ${JSON.stringify(norm)}`)
        continue
      }

      const payload = {
        student_id:      studentId,
        exam_date:       examDate,
        exam_type:       'TOPIK 모의고사',
        exam_source:     'mock',
        round_number:    roundNumber ? parseInt(roundNumber) : null,
        listening_score: listening,
        reading_score:   reading,
        writing_score:   writing,
        total_score:     total,
        level,
        section_scores:  {},
        extra_data:      { uploaded_name: norm.name ?? null },
      }

      const { data, error } = await supabase
        .from('exam_results')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        errors.push(error.message)
      } else {
        inserted.push(data)
      }

      // 단일 학생 모드 → 첫 행만 처리
      break
    }

    return NextResponse.json({
      inserted: inserted.length,
      errors,
      message: `${inserted.length}건 저장 완료${errors.length ? `, ${errors.length}건 오류` : ''}`,
    })
  } catch (err) {
    console.error('[mock-exam-import]', err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    )
  }
}
