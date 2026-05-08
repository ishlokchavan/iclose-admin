import type { Metadata } from 'next'
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google'
import './globals.css'

// ─── Font setup ───────────────────────────────────────────────────────────────

const fontDisplay = Inter_Tight({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
})

const fontSans = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'iClose Admin',
    template: '%s — iClose Admin',
  },
  description: 'Admin panel, CMS, and agent portal for iClose.',
  robots: {
    index: false,
    follow: false,
  },
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-fog font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
