import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pemilihan Ketua dan Wakil Ketua OSIS SMADA 2026',
  description: 'E-Voting OSIS SMA Negeri 2 Sangatta Utara 2026',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
