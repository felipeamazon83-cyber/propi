import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
export const metadata: Metadata={title:'Propi — Propinas digitales con QR y NFC',description:'Propi ayuda a restaurantes, hoteles y equipos de servicio a recibir propinas digitales de forma sencilla y segura.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body className={`${inter.variable} ${plusJakarta.variable}`}>{children}</body></html>}
