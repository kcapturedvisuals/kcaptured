import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export const metadata: Metadata = {
  title: 'KCAPTURED STUDIOS',
  description: 'KCAPTURED offers affordable lifestyle, studio, and portrait photography in Jessup, Maryland and across the DMV. Book KCAPTURED Studios for creative portraits, athlete sessions, and event photography.',
  keywords: [
    'KCAPTURED',
    'Kcaptured Studios',
    'KStudios',
    'DMV photography',
    'Jessup Maryland photography',
    'Maryland photographer',
    'DC photographer',
    'portrait photography',
    'studio photography',
    'cheap photography',
    'free pictures',
    'affordable portraits',
    'lifestyle photography',
  ],
  authors: [{ name: 'KCAPTURED STUDIO' }],
  creator: 'KCAPTURED STUDIO',
  publisher: 'KCAPTURED STUDIO',
  icons: {
    icon: [
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'manifest', url: '/site.webmanifest' },
    ],
  },
  openGraph: {
    title: 'KCAPTURED STUDIOS',
    description: 'Affordable lifestyle, studio, and portrait photography in Jessup, Maryland and the DMV area.',
    url: 'https://kcapturedstudio.com',
    siteName: 'KCAPTURED STUDIOS',
    type: 'website',
    images: [
      {
        url: 'https://res.cloudinary.com/dq4tkpuu4/image/upload/v1773807344/43-1Z7A1338__2_uyue1r.jpg',
        width: 1200,
        height: 630,
        alt: 'KCAPTURED DMV Photography',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KCAPTURED STUDIOS',
    description: 'Affordable lifestyle, studio, and portrait photography in Jessup, Maryland and the DMV area.',
    creator: '@kcaptured',
    images: ['https://res.cloudinary.com/dq4tkpuu4/image/upload/v1773807344/43-1Z7A1338__2_uyue1r.jpg'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased bg-white dark:bg-black text-gray-900 dark:text-white`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
