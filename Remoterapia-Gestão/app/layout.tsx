import LocalPreviewNotice from '@/components/ui/LocalPreviewNotice'
﻿import type { Metadata, Viewport } from 'next'
import './globals.css'
import './desktop.css'
import './design-system.css'
import './workspaces.css'
import './mobile-refinement.css'
import './visual-content.css'
import './visual-custom.css'
import {VisualContentProvider} from '@/components/ui/VisualContent'
import VisualPreviewBridge from '@/components/ui/VisualPreviewBridge'
import DialogAccessibility from '@/components/ui/DialogAccessibility'

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
    <html lang="pt-BR">
      <body>
        <LocalPreviewNotice/><VisualContentProvider>{children}</VisualContentProvider><DialogAccessibility/>{process.env.NODE_ENV === 'development' && <VisualPreviewBridge/>}
      </body>
    </html>
  )
}


