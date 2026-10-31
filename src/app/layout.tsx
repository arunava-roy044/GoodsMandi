import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GoodsMandi | Buy and sell at UPES',
  description: 'A marketplace for UPES students to buy and sell secondhand books, electronics, cycles and room essentials.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen antialiased`}>
        <ToastProvider>
          <main className="flex flex-col min-h-screen">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  )
}
