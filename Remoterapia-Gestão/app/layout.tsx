import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
}

export const metadata: Metadata = {
  title: 'Remoterapia',
  description: 'Sistema de gestão da Remoterapia',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-pt">
      <body>
        {children}
      </body>
    </html>
  )
}


