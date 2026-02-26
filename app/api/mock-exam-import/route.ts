import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getServiceClient, getAnonClient } from '@/lib/supabaseServer'

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

// 총점 → 등급 자동 계산 (TOPIK I 기준: 200점 만점)
function calcLevel(total: number): string {
  if (total >= 140) return '2급'
  if (total >= 80)  return '1급'
  return '불합격'
}

// student_code 정규화: 다양한 포맷 허용 (26-001-001 → 26001001)
function normalizeStudentCode(code: unknown): string {
  return String(code ?? '').replace(/-/g, '').trim()
}

export async function POST(req: NextRequest) {
  try {
    // Bearer 토큰 인증 + 역할 확인 (master/agency만 허용)
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authErr } = await getAnonClient().auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = (user.app_metadata as { role?: string })?.role
    if (!role || !['master', 'agency'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData    = await req.formData()
    const file        = formData.get('file') as File | null
    const studentId   = formData.get('studentId') as string | null   // 단일 학생 모드 (선택)
    const examDate    = formData.get('examDate') as string | null
    const roundNumber = formData.get('roundNumber') as string | null

    if (!file || !examDate) {
      return NextResponse.json(
        { error: 'file, examDate 필수' },
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

    // ── 2. 컬럼 매핑 ──────────────────────────────────
    const firstRow  = rows[0]
    const headerMap: Record<string, string> = {}
    for (const key of Object.keys(firstRow)) {
      headerMap[key] = normalizeHeader(key)
    }

    // ── 3. 처리 모드 결정 ─────────────────────────────
    // - studentId 있음: 단일 학생 모드 (UI에서 사용, 첫 행만 처리)
    // - studentId 없음: student_code 모드 (TOPIK 프로그램 Excel, 전체 행 처리)
    const isSingleMode = Boolean(studentId)

    const supabase = getServiceClient()
    const inserted: unknown[] = []
    const errors:   string[]  = []

    for (const row of rows) {
      // 정규화된 키-값으로 변환
      const norm: Record<string, unknown> = {}
      for (const [origKey, val] of Object.entries(row)) {
        norm[headerMap[origKey] ?? origKey] = val
      }

      // ── student_id 결정 ──────────────────────────
      let resolvedStudentId: string | null = studentId

      if (!resolvedStudentId) {
        // student_code로 학생 조회
        const rawCode = norm.student_code
        if (!rawCode || String(rawCode).trim() === '') {
          errors.push(`student_code 없음, 행 건너뜀: ${JSON.stringify(norm)}`)
          continue
        }
        const code = normalizeStudentCode(rawCode)
        const { data: studentRow, error: lookupErr } = await supabase
          .from('students')
          .select('id')
          .eq('student_code', code)
          .single()

        if (lookupErr || !studentRow) {
          errors.push(`student_code '${code}' 에 해당하는 학생 없음`)
          continue
        }
        resolvedStudentId = studentRow.id
      }

      // ── 점수 계산 ──────────────────────────────────
      const listening = norm.listening !== '' ? Number(norm.listening) : null
      const reading   = norm.reading   !== '' ? Number(norm.reading)   : null
      const totalRaw  = norm.total
      // TOPIK I: 듣기 + 읽기만 (쓰기 없음), 200점 만점
      const total     = totalRaw !== '' ? Number(totalRaw) : (
        (listening ?? 0) + (reading ?? 0)
      )
      const level     = (norm.level as string) || calcLevel(total)

      if (isNaN(total)) {
        errors.push(`총점을 읽을 수 없는 행 건너뜀: ${JSON.stringify(norm)}`)
        continue
      }

      const payload = {
        student_id:      resolvedStudentId,
        exam_date:       examDate,
        exam_type:       'TOPIK 모의고사',
        exam_source:     'mock',
        round_number:    roundNumber ? parseInt(roundNumber) : null,
        listening_score: listening,
        reading_score:   reading,
        writing_score:   null,  // TOPIK I: 쓰기 없음
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

      // 단일 학생 모드: 첫 행만 처리
      if (isSingleMode) break
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
