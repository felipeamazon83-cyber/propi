import Image from 'next/image'
import Link from 'next/link'

const steps = [
  { number: '01', title: 'Crea tu negocio', text: 'Configura tu perfil en minutos.', image: '/propi-dashboard.png' },
  { number: '02', title: 'Añade tu equipo', text: 'Cada persona recibe sus propinas.', image: '/propi-team.png' },
  { number: '03', title: 'Comparte y recibe', text: 'QR y NFC listos para usar.', image: '/propi-qr.png' },
]

export default function Home() {
  return <main className="site-shell">
    <nav className="nav container"><Link className="brand" href="/">PROPI<span>.</span></Link><div className="nav-links"><a href="#como">Cómo funciona</a><a href="#beneficios">Beneficios</a><Link className="btn btn-secondary" href="/login">Entrar</Link></div></nav>
    <section className="hero container"><div className="hero-copy"><div className="eyebrow"><span /> PROPINA DIGITAL, HECHA FÁCIL</div><h1>Las propinas digitales, <em>sin complicaciones.</em></h1><p className="hero-text">Recibe propinas con QR o NFC. Tus clientes eligen a quién agradecer y pagan en segundos.</p><div className="hero-actions"><Link className="btn btn-primary" href="/register">Probar gratis <span>→</span></Link><a className="btn btn-ghost" href="#como">Ver cómo funciona <span>↓</span></a></div><div className="trust"><div className="avatars"><span>AM</span><span>JL</span><span>RG</span></div><div><strong>+2.000 equipos</strong><small>ya reciben propinas con Propi</small></div></div></div><div className="hero-visual"><div className="visual-glow" /><Image src="/propi-qr.png" alt="Código QR de Propi para recibir propinas" width={520} height={520} priority /><div className="float-card"><span className="pulse" /> QR + NFC <small>listos para agradecer</small></div></div></section>
    <section id="beneficios" className="benefits"><div className="container benefit-grid"><div><span className="section-kicker">TODO LO QUE NECESITAS</span><h2>Una forma más <em>simple</em> de agradecer.</h2></div><p>Propi conecta a tus clientes con tu equipo en un gesto rápido, seguro y transparente.</p></div></section>
    <section id="como" className="steps container"><div className="section-heading"><div><span className="section-kicker">EN TRES PASOS</span><h2>Empieza en minutos.</h2></div><p>Sin instalaciones. Sin cambiar tu forma de trabajar.</p></div><div className="step-grid">{steps.map((step) => <article className="step-card" key={step.number}><div className="step-image"><Image src={step.image} alt={step.title} width={520} height={300} /><b>{step.number}</b></div><div className="step-content"><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div></section>
    <section className="cta container"><div><span className="section-kicker">HAZLO POSIBLE</span><h2>Tu equipo lo va a notar.</h2><p>Más agradecimientos. Menos fricción. Todo con Propi.</p></div><Link className="btn btn-primary" href="/register">Crear mi cuenta <span>→</span></Link></section>
    <footer className="footer container"><Link className="brand" href="/">PROPI<span>.</span></Link><span>Propinas digitales para equipos reales.</span></footer>
  </main>
}
