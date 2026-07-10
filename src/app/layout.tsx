import type { Metadata, Viewport } from 'next';
import { Cinzel, VT323 } from 'next/font/google';
import './globals.css';

// Display voice: Cinzel — carved Roman capitals, the lapidary voice. Used for
// the AS ABOVE wordmark ONLY. Exposed as the semantic --font-display hook:
// to audition another face, swap the import + constructor here.
const displayFont = Cinzel({
  variable: '--font-display',
  subsets: ['latin'],
});

// Phosphor/terminal voice: VT323 — a true CRT face (DEC VT320 lineage).
// The tablet's text, console labels, hints, and reality tags all speak it.
const terminalFont = VT323({
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
  themeColor: '#8f5e3a',
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
