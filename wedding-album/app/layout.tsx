import './globals.css';
import type { Metadata } from 'next';
import BuiltBy from '@/components/BuiltBy';

export const metadata: Metadata = {
  title: 'Shared camera roll',
  description: 'A shared camera roll — nobody sees a photo until the reveal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sacramento&family=Cormorant+Garamond:wght@400;600&family=Montserrat:wght@300;400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper text-leaf font-serif">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flowers.png"
          alt=""
          className="fixed bottom-0 left-0 z-0 w-[40%] max-w-[200px] pointer-events-none select-none"
        />
        <div className="relative z-10 flex flex-col min-h-[100dvh] overflow-x-hidden">{children}</div>
        <BuiltBy />
      </body>
    </html>
  );
}
