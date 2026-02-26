'use client'

import Link from 'next/link'
import { LangToggle } from '@/components/LangToggle'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { UserMeta } from '@/lib/types'

export type ActiveNav = 'dashboard' | 'students' | 'reports' | 'agencies'

interface AppLayoutProps {
  user: UserMeta | null
  lang: Lang
  onToggleLang: () => void
  onLogout: () => void
  activeNav: ActiveNav
  children: React.ReactNode
}

const navClass = (active: boolean) =>
  `py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
    active
      ? 'text-blue-600 border-blue-600'
      : 'text-slate-500 hover:text-slate-800 border-transparent'
  }`

export function AppLayout({ user, lang, onToggleLang, onLogout, activeNav, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-bold">AE</span>
            </div>
            <span className="font-bold text-slate-800">{t('appTitle', lang)}</span>
          </div>
          <div className="flex items-center gap-4">
            <LangToggle lang={lang} onToggle={onToggleLang} />
            <span className="text-sm text-slate-500">{user?.name_kr}</span>
            <button
              onClick={onLogout}
              className="text-sm text-slate-500 hover:text-red-500"
            >
              {t('logout', lang)}
            </button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto">
          <Link href="/" className={navClass(activeNav === 'dashboard')}>
            {t('navDashboard', lang)}
          </Link>
          <Link href="/students" className={navClass(activeNav === 'students')}>
            {t('navStudents', lang)}
          </Link>
          <Link href="/reports" className={navClass(activeNav === 'reports')}>
            {t('navReports', lang)}
          </Link>
          {user?.role === 'master' && (
            <Link href="/agencies" className={navClass(activeNav === 'agencies')}>
              {t('navAgencies', lang)}
            </Link>
          )}
        </div>
      </nav>

      {/* Page Content */}
      {children}
    </div>
  )
}
