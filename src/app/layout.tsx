import type { Metadata, Viewport } from 'next';
import { Cutive_Mono, Fraunces } from 'next/font/google';
import './globals.css';

// Display voice: Fraunces — the variable billboard face (wght 100–900 +
// opsz), shared treatment with species-eval's headline and HATCH's masthead:
// giant type that ENTERS THIN AND GROWS (the ink) on a near-critically-
// damped spring. Used for the fullscreen AS ABOVE poster ONLY. opsz is
// requested so the browser's optical sizing serves the display cut at
// poster sizes; wght rides along automatically for a variable font.
// (v3 used Cinzel for a wordmark that never rendered; the poster replaced
// it.) Exposed as the semantic --font-display hook: to audition another
// face, swap the import + constructor here.
const displayFont = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  axes: ['opsz'],
});

// Tablet voice: Cutive Mono — a typewriter-serif monospace whose slab feet
// read as chisel marks, so it engraves into the gem instead of glowing like
// a terminal. Monospace keeps the stone's aligned text layers (carved +
// gold twins, outgoing + incoming — the magical engraving) wrapping
// identically, and keeps the fixed-grid gravitas. (v1 used VT323; the v2 redesign moved the
// tablet from CRT to carved stone.) Keeps the --font-terminal hook name.
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
