export type UserRole = 'master' | 'agency'

export interface UserMeta {
  role: UserRole
  agency_code: string
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
  topik_level?: string
  status: string
  preferred_lang: string
  notes?: string
  agency_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  agency?: Agency
}

export interface Consultation {
  id: string
  student_id: string
  consult_type?: string
  summary?: string
  improvement?: string
  next_goal?: string
  consult_date: string
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
  created_at: string
}
