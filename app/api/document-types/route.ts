import { getServiceClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

async function getAuthedUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await getServiceClient().auth.getUser(token)
  return user
}

/**
 * GET /api/document-types
 * 서류 유형 목록 (인증 불필요 — RLS SELECT 정책이 전체 허용)
 */
export async function GET(_req: NextRequest) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('document_types')
    .select('*')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/**
 * POST /api/document-types
 * 서류 유형 추가 (master 전용)
 */
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (user.app_metadata?.role as string) ?? ''
  if (role !== 'master') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name_kr, name_vi, category, visa_types, is_required, has_expiry, sort_order } = body
  if (!name_kr || !name_vi || !category) {
    return NextResponse.json({ error: 'name_kr, name_vi, category are required' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('document_types')
    .insert({
      name_kr, name_vi, category,
      visa_types:  visa_types  ?? [],
      is_required: is_required ?? true,
      has_expiry:  has_expiry  ?? false,
      sort_order:  sort_order  ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
