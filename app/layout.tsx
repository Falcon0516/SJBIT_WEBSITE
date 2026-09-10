import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import SmoothScrollProvider from '@/components/providers/SmoothScrollProvider';
import IntroLoader from '@/components/ui/IntroLoader';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport = {
  themeColor: '#050506',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://sjbit-website.vercel.app'),
  title: 'SJBIT Silver Jubilee TechFest | Ideas Today, Solutions Tomorrow',
  description:
    'Skills. Ideas. Impact. For a Brighter Tomorrow. 8 flagship events, ₹4,00,000 prize pool.',
  openGraph: {
    title: 'SJBIT Silver Jubilee TechFest',
    description: 'Skills. Ideas. Impact. For a Brighter Tomorrow. 8 flagship events, ₹4,00,000 prize pool.',
    images: ['/images/hero-poster.jpg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SJBIT Silver Jubilee TechFest',
    description: 'Skills. Ideas. Impact. For a Brighter Tomorrow. 8 flagship events, ₹4,00,000 prize pool.',
    images: ['/images/hero-poster.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-[#D4AF7A] focus:text-black focus:rounded-md">
          Skip to content
        </a>
        <main id="main-content" className="flex-grow flex flex-col">
          <IntroLoader />
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </main>
      </body>
    </html>
  );
}
