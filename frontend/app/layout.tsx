import type { Metadata } from 'next'; import './globals.css';
export const metadata: Metadata={title:'TIP — Propinas digitales con QR y NFC',description:'Recibe propinas digitales fácilmente. Tus clientes escanean, eligen a quién agradecer y pagan con tarjeta.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
