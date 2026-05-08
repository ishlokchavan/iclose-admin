import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * Layout for unauthenticated routes: /login, /forgot-password.
 * No sidebar, no shell — just a centered full-screen layout.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-fog">
      {children}
    </div>
  )
}
