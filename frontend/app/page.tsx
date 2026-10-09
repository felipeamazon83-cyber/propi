import Link from 'next/link';

const steps = [
  ['01', 'Crea tu negocio', 'Configura tu perfil y deja todo listo en minutos.'],
  ['02', 'Añade tu equipo', 'Invita a las personas que hacen especial cada servicio.'],
  ['03', 'Recibe propinas', 'Comparte tu QR o NFC y recibe agradecimientos al instante.'],
];

const features = [
  'Panel de control en vivo',
  'Diseño de QR listo para mesa',
  'Sin límites de camareros o plantilla',
  'Reparto personalizado de propinas',
  'Asignación flexible de la comisión',
  'Cobro ágil con Bizum y Wallet',
  'Pagos automáticos a tu banco',
  'Asistencia 24/7',
];

export default function Home() {
  return (
    <main className="glow min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="brand-logo brand-logo-hero" aria-label="Propi">
            <img src="/propi-logo.png" alt="Propi · Propinas que hacen la diferencia" />
          </Link>
          <div className="landing-header-actions flex items-center gap-2">
            <Link className="hidden btn btn-secondary w-auto sm:inline-flex" href="#precios">
              Precios
            </Link>
            <Link className="btn btn-primary w-auto" href="/login">
              Iniciar sesión
            </Link>
          </div>
        </nav>

        <section className="py-20 text-center sm:py-28">
          <p className="mb-5 text-sm font-black tracking-[.2em] text-orange-300">
            AGRADECER TAMBIÉN ES PARTE DEL SERVICIO
          </p>
          <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[.98] sm:text-7xl">
            Haz que cada<br />
            <span className="text-orange-400">gracias cuente.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            Propi ayuda a restaurantes, hoteles y equipos de servicio a recibir propinas digitales con una experiencia sencilla y segura.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="btn btn-primary w-auto" href="/register">
              Crear mi cuenta
            </Link>
            <a className="btn btn-secondary w-auto" href="#como">
              Descubrir Propi
            </a>
          </div>
        </section>

        <section id="como" className="py-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
                Cómo funciona
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">Simple para todos.</h2>
            </div>
            <span className="hidden text-sm text-slate-400 sm:block">
              QR + NFC · Sin fricción
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <article className="card" key={number}>
                <span className="text-4xl font-black text-orange-400">{number}</span>
                <h3 className="mt-8 text-xl font-black">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="my-20 grid gap-5 md:grid-cols-2">
          <div className="card border-orange-400/25 bg-orange-400/10">
            <p className="text-2xl font-black">Escanea. Elige. Agradece.</p>
            <p className="mt-3 leading-7 text-slate-300">
              Una experiencia móvil pensada para completarse en segundos, sin apps ni registros.
            </p>
          </div>
          <div className="card">
            <p className="text-2xl font-black">Más que una propina.</p>
            <p className="mt-3 leading-7 text-slate-400">
              Haz visible el trabajo de tu equipo y convierte cada agradecimiento en motivación.
            </p>
          </div>
        </section>

        <footer className="border-t border-white/10 py-8 text-sm text-slate-500">
          Propi · Propinas digitales para equipos que dejan huella.
        </footer>

        <section id="precios" className="my-20 scroll-mt-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
              Precios claros
            </p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              Todo lo que necesitas para recibir más gracias.
            </h2>
            <p className="mt-3 leading-7 text-slate-400">
              Sin cuotas ocultas. Empieza con una comisión sencilla y configurable para que elijas quién la asume.
            </p>
          </div>

          <div className="card relative overflow-hidden border-orange-400/30 bg-gradient-to-br from-[#0f2d55] to-[#0b2344] p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-orange-400/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
                  Comisión por propina recibida
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-black text-white">0,10 €</span>
                  <span className="mb-1 text-sm text-slate-400">+ comisión de procesamiento</span>
                </div>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
                  Configurable: la asume el cliente o el negocio.
                </p>
                <Link className="btn btn-primary mt-6 w-full sm:w-auto" href="/register">
                  Crear mi cuenta <span>→</span>
                </Link>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2">
                {features.map((feature) => (
                  <li
                    className="flex gap-3 rounded-xl border border-white/10 bg-white/[.04] p-3 text-sm leading-5 text-slate-200"
                    key={feature}
                  >
                    <span className="font-black text-orange-300">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="contacto"
          className="my-20 grid gap-8 rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-10 md:grid-cols-[.8fr_1.2fr] md:items-center"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
              Hablemos
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">¿Tienes alguna pregunta?</h2>
            <p className="mt-4 leading-7 text-slate-300">
              Escríbenos y te responderemos directamente. También puedes contactarnos por WhatsApp.
            </p>
            <a
              className="btn btn-primary mt-6 w-full sm:w-auto"
              href="https://wa.me/34613312550?text=Hola%20Propi%2C%20quiero%20más%20información"
              target="_blank"
              rel="noreferrer"
            >
              Hablar por WhatsApp <span>→</span>
            </a>
          </div>

          <form
            className="grid gap-3"
            action="mailto:felipeamazon83@gmail.com"
            method="post"
            encType="text/plain"
          >
            <label className="text-sm font-bold text-slate-200">
              Tu nombre
              <input className="field mt-1" name="Nombre" required placeholder="Nombre y apellido" />
            </label>
            <label className="text-sm font-bold text-slate-200">
              Tu email
              <input className="field mt-1" name="Email" type="email" required placeholder="tu@email.com" />
            </label>
            <label className="text-sm font-bold text-slate-200">
              Mensaje
              <textarea
                className="field mt-1 min-h-28 resize-y"
                name="Mensaje"
                required
                placeholder="¿En qué podemos ayudarte?"
              />
            </label>
            <button className="btn btn-primary mt-2 w-full sm:w-auto" type="submit">
              Enviar mensaje <span>→</span>
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Al enviar se abrirá tu aplicación de correo con el mensaje preparado.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
