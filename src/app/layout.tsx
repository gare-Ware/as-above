import type { Metadata, Viewport } from 'next';
import { Cinzel, Cutive_Mono } from 'next/font/google';
import './globals.css';

// Display voice: Cinzel — carved Roman capitals, the lapidary voice. Used for
// the AS ABOVE wordmark ONLY. Exposed as the semantic --font-display hook:
// to audition another face, swap the import + constructor here.
const displayFont = Cinzel({
  variable: '--font-display',
  subsets: ['latin'],
});

// Tablet voice: Cutive Mono — a typewriter-serif monospace whose slab feet
// read as chisel marks, so it engraves into the gem instead of glowing like
// a terminal. Monospace is load-bearing: the decode boil depends on stable
// word-wrap while characters churn. (v1 used VT323; the v2 redesign moved
// the tablet from CRT to carved stone.) Keeps the --font-terminal hook name.
const terminalFont = Cutive_Mono({
  variable: '--font-terminal',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'AS ABOVE',
  description:
    'One key, one emerald tablet, one thing in the sky. Press the key — the tablet decodes a conspiracy about whatever hangs above. Real lore, honestly filed.',
};

export const viewport: Viewport = {
  themeColor: '#472515',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${terminalFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
