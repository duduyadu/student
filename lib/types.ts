export type UserRole = 'master' | 'agency' | 'student'

export interface UserMeta {
  role: UserRole
  agency_code?: string
  name_kr: string
}

export interface Agency {
  id: string
  agency_code: string
  agency_number: number
  agency_name_kr: string
  agency_name_vn?: string
  contact_person?: string
  contact_phone?: string
  user_id?: string
  is_active: boolean
  created_at: string
}

export interface Student {
  id: string
  student_number: number
  student_code?: string
  name_kr: string
  name_vn: string
  dob: string
  gender: 'M' | 'F'
  phone_kr?: string
  phone_vn?: string
  email?: string
  address_kr?: string
  home_address_vn?: string
  parent_name_vn?: string
  parent_phone_vn?: string
  high_school_gpa?: number
  enrollment_date?: string
  target_university?: string
  target_major?: string
  visa_type?: string
  visa_expiry?: string
  arc_number?: string
  arc_issue_date?: string
  arc_expiry_date?: string
  topik_level?: string
  status: string
  preferred_lang: string
  notes?: string
  agency_id?: string
  language_school?: string
  current_university?: string
  current_company?: string
  is_active: boolean
  created_at: string
  updated_at: string
  photo_url?: string
  is_approved?: boolean
  auth_user_id?: string
  agency?: Agency
}

export type ConsultCategory = 'score' | 'attitude' | 'career' | 'visa' | 'life' | 'family' | 'other'
export type CounselorRole  = 'teacher' | 'manager' | 'director' | 'counselor'

export interface Consultation {
  id: string
  student_id: string
  consult_type?: string
  summary?: string
  improvement?: string
  next_goal?: string
  consult_date: string
  // 생활기록부 확장 필드
  is_public: boolean
  topic_category?: ConsultCategory
  counselor_name?: string
  counselor_role?: CounselorRole
  aspiration_univ?: string
  aspiration_major?: string
  extra_data: Record<string, unknown>
  created_at: string
}

export interface ExamResult {
  id: string
  student_id: string
  exam_date: string
  exam_type: string
  reading_score?: number
  listening_score?: number
  writing_score?: number
  total_score: number
  level: string
  // 모의고사 확장 필드
  exam_source: 'manual' | 'mock' | 'official' | 'topik-app'
  round_number?: number
  section_scores: Record<string, number>
  ai_analysis?: string
  pdf_url?: string
  extra_data: Record<string, unknown>
  created_at: string
}

export interface EvaluationTemplate {
  id: string
  field_key: string
  label_kr: string
  label_vn?: string
  field_type: 'rating' | 'text' | 'boolean'
  max_value: number
  is_active: boolean
  sort_order: number
}

export interface TeacherEvaluation {
  id: string
  student_id: string
  eval_date: string
  eval_period?: string
  evaluator_name: string
  evaluator_role: string
  scores: Record<string, number | string>
  overall_comment?: string
  internal_memo?: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id?: string
  user_role?: string
  user_name?: string
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  target_table?: string
  target_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface AspirationHistory {
  id: string
  student_id: string
  changed_date: string
  university?: string
  major?: string
  reason?: string
  recorded_by?: string
  extra_data: Record<string, unknown>
  created_at: string
}
