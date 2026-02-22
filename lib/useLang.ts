'use client'

import { useState, useEffect } from 'react'
import type { Lang } from './i18n'

const LANG_KEY = 'app_lang'

export function useLang(): [Lang, () => void] {
  const [lang, setLangState] = useState<Lang>('ko')

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null
    if (saved === 'vi') setLangState('vi')
  }, [])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'vi' : 'ko'
    setLangState(next)
    localStorage.setItem(LANG_KEY, next)
  }

  return [lang, toggleLang]
}
