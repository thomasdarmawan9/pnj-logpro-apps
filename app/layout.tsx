import type { Metadata } from 'next'
import './globals.css'
import { ReduxProvider } from '@/components/providers/ReduxProvider'

export const metadata: Metadata = {
  title: 'PNJ Control - Sistem Manajemen Logistik',
  description: 'Aplikasi Manajemen Logistik PT. Pelangi Nuansa Jaya',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  )
}
