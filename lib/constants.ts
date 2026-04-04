export const STUDENT_STATUSES = ['유학전', '어학연수', '대학교', '취업'] as const
export type StudentStatus = typeof STUDENT_STATUSES[number]

export const STATUS_COLORS: Record<string, string> = {
  '유학전':   'bg-slate-100 text-slate-600',
  '어학연수': 'bg-blue-100 text-blue-700',
  '대학교':   'bg-violet-100 text-violet-700',
  '취업':     'bg-emerald-100 text-emerald-700',
}

export const TOPIK_LEVELS = ['2급', '1급', '불합격'] as const

export const CONSULT_TYPES = ['정기', '비정기', '긴급'] as const

export const EDUCATION_PHASES = [
  '미시작', '온라인교육중', '온라인수료', '오프라인교육중', '오프라인수료', '교육중단'
] as const
export type EducationPhase = typeof EDUCATION_PHASES[number]

export const EDUCATION_PHASE_FLOW: Record<string, string[]> = {
  '미시작':        ['온라인교육중'],
  '온라인교육중':  ['온라인수료', '교육중단'],
  '온라인수료':    ['오프라인교육중'],
  '오프라인교육중':['오프라인수료', '교육중단'],
  '오프라인수료':  [],
  '교육중단':      ['온라인교육중'],
}

export const EDUCATION_PHASE_COLORS: Record<string, string> = {
  '미시작':        'bg-slate-100 text-slate-500',
  '온라인교육중':  'bg-blue-100 text-blue-700',
  '온라인수료':    'bg-cyan-100 text-cyan-700',
  '오프라인교육중':'bg-amber-100 text-amber-700',
  '오프라인수료':  'bg-emerald-100 text-emerald-700',
  '교육중단':      'bg-red-100 text-red-600',
}
