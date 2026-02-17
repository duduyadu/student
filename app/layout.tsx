import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AJU E&J 학생관리',
  description: '베트남 유학생 통합 관리 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
