import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wondera Web',
  description: 'Dreamscape companion on web'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="ambient" aria-hidden>
          <div className="glow glow-a" />
          <div className="glow glow-b" />
          <div className="glow glow-c" />
          <div className="grain" />
        </div>
        {children}
      </body>
    </html>
  );
}
