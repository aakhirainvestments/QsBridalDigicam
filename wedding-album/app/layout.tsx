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
          href="https://fonts.googleapis.com/css2?family=Allura&family=Cormorant+Garamond:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper text-leaf min-h-screen font-serif">{children}</body>
    </html>
  );
}
