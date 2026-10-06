import type { Metadata } from 'next'; import './globals.css';
export const metadata: Metadata={title:'Propi — Propinas digitales con QR y NFC',description:'Propi ayuda a restaurantes, hoteles y equipos de servicio a recibir propinas digitales de forma sencilla y segura.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
