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
