import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'] })

// Google AdSense publisher ID. It is public: it also appears in public/ads.txt.
const ADSENSE_CLIENT = 'ca-pub-1596225556845351'

export const metadata: Metadata = {
  title: 'GoodsMandi | Buy and sell on campus',
  description: 'A marketplace for college students to buy and sell secondhand books, electronics, cycles and room essentials.',
  // Lets Google AdSense confirm that this site belongs to our AdSense account
  other: { 'google-adsense-account': ADSENSE_CLIENT },
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
          <div className="flex flex-col min-h-screen">
            {children}
          </div>
        </ToastProvider>
        {/* Google AdSense. No ad slots yet: ads appear only once the account is approved
            and Auto ads are turned on in the AdSense dashboard. */}
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  )
}
