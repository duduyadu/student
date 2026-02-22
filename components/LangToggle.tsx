'use client'

import type { Lang } from '@/lib/i18n'

export function LangToggle({ lang, onToggle }: { lang: Lang; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 text-slate-500 hover:bg-slate-50 font-medium transition-colors"
    >
      {lang === 'ko' ? '🇻🇳 VI' : '🇰🇷 KR'}
    </button>
  )
}
