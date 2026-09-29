import Link from 'next/link';

const steps = [
  ['01', 'Crea tu perfil', 'Configura tu negocio en minutos.'],
  ['02', 'Comparte tu QR', 'Ponlo en tu mesa, barra o recibo.'],
  ['03', 'Recibe al instante', 'Tus clientes agradecen sin efectivo.'],
];

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="nav-wrap" aria-label="Navegación principal">
        <Link className="brand" href="/">propi<span>.</span></Link>
        <div className="nav-actions">
          <Link className="nav-link" href="#como-funciona">Cómo funciona</Link>
          <Link className="btn btn-dark" href="/login">Iniciar sesión</Link>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">LA NUEVA FORMA DE AGRADECER</p>
          <h1>Haz que cada <em>gracias</em> cuente.</h1>
          <p className="hero-text">Propi ayuda a tu equipo a recibir propinas de forma sencilla, segura y sin efectivo. Más reconocimiento para ellos, más control para ti.</p>
          <div className="hero-actions">
            <Link className="btn btn-coral" href="/register">Empezar gratis <span aria-hidden="true">→</span></Link>
            <Link className="text-link" href="#como-funciona">Descubre cómo funciona <span aria-hidden="true">↓</span></Link>
          </div>
          <p className="trust-note"><span className="trust-dot" aria-hidden="true" /> Sin permanencia · Configuración en 5 minutos</p>
        </div>
        <div className="hero-card" aria-label="Vista previa de propina recibida">
          <div className="hero-card-top"><span className="mini-brand">propi.</span><span className="status-pill">Activo</span></div>
          <div className="portrait" aria-hidden="true"><span>MC</span></div>
          <p className="card-kicker">PROPINA RECIBIDA</p>
          <p className="amount">12,00 €</p>
          <p className="card-muted">Para María · Gracias por tu atención</p>
          <div className="card-divider" />
          <p className="card-foot"><span className="check-mark">✓</span> Pago seguro y confirmado</p>
        </div>
      </section>

      <section className="proof-strip" aria-label="Beneficios de Propi">
        <span>Diseñado para equipos que cuidan cada detalle</span>
        <div className="proof-items"><span>✓ Fácil de usar</span><span>✓ Sin efectivo</span><span>✓ Pagos seguros</span></div>
      </section>

      <section id="como-funciona" className="steps-section">
        <div className="section-heading"><p className="eyebrow">EMPIEZA EN TRES PASOS</p><h2>Más simple para todos.</h2><p>Una experiencia pensada para que agradecer sea tan fácil como escanear.</p></div>
        <div className="steps-grid">{steps.map(([number, title, description]) => <article className="step-card" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="closing-banner"><div><p className="eyebrow">TU EQUIPO LO MERECE</p><h2>Convierte un buen servicio<br />en un gran recuerdo.</h2></div><Link className="btn btn-light" href="/register">Crear mi cuenta <span aria-hidden="true">→</span></Link></section>
      <footer><Link className="brand" href="/">propi<span>.</span></Link><span>Propinas digitales hechas humanas.</span></footer>
    </main>
  );
}
