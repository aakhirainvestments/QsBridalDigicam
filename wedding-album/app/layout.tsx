import './globals.css';
import type { Metadata } from 'next';

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
        <div className="flex flex-col min-h-screen overflow-x-hidden">
          {children}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/flowers.png"
            alt=""
            className="mt-8 w-[55%] max-w-[280px] self-start pointer-events-none select-none"
          />
        </div>
      </body>
    </html>
  );
}
