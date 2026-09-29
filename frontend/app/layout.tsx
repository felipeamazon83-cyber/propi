import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Propi — Propinas digitales hechas humanas',
  description: 'La plataforma moderna para recibir propinas sin efectivo. Más reconocimiento para tu equipo, más control para ti.',
  keywords: 'propinas, QR, pagos digitales, restaurante, bar, negocio',
  authors: [{ name: 'Propi' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
