'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '../context/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

export default function Home() {
  const { t } = useTranslation();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pasos de "Cómo funciona" usando traducciones
  const steps = [
    ['01', t('Landing.step1Title') || 'Crea tu negocio', t('Landing.step1Desc') || 'Configura tu perfil y deja todo listo en minutos.'],
    ['02', t('Landing.step2Title') || 'Añade tu equipo', t('Landing.step2Desc') || 'Invita a las personas que hacen especial cada servicio.'],
    ['03', t('Landing.step3Title') || 'Recibe propinas', t('Landing.step3Desc') || 'Comparte tu QR o NFC y recibe agradecimientos al instante.'],
  ];

  // Lista de características traducidas
  const features = [
    t('Landing.feature1') || 'Panel de control en vivo',
    t('Landing.feature2') || 'Diseño de QR listo para mesa',
    t('Landing.feature3') || 'Sin límites de camareros o plantilla',
    t('Landing.feature4') || 'Reparto personalizado de propinas',
    t('Landing.feature5') || 'Asignación flexible de la comisión',
    t('Landing.feature6') || 'Cobro ágil con Bizum y Wallet',
    t('Landing.feature7') || 'Pagos automáticos a tu banco',
    t('Landing.feature8') || 'Asistencia 24/7',
  ];

  // Construcción dinámica de la URL para Gmail
  const subject = encodeURIComponent(`Consulta de ${nombre || 'Usuario'} - Landing Propi`);
  const body = encodeURIComponent(`Nombre: ${nombre}\nEmail: ${email}\n\nMensaje:\n${mensaje}`);
  const mailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=soportepropi@gmail.com&su=${subject}&body=${body}`;

  return (
    <main className="glow min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <nav className="landing-header flex items-center justify-between">
          <Link href="/" className="brand-logo brand-logo-hero" aria-label="Propi">
            <img src="/propi-landing-logo.png" alt="Propi · Propinas que hacen la diferencia" />
          </Link>

          <div className="landing-header-actions flex items-center gap-3">
            <div className="mobile-menu-wrap">
              <button
                type="button"
                className="mobile-menu-button"
                aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen((open) => !open)}
              >
                <span /><span /><span />
              </button>

              {isMobileMenuOpen && (
                <div className="mobile-menu-panel">
                  <Link href="#precios" onClick={() => setIsMobileMenuOpen(false)}>
                    {t('Landing.pricing') || 'Precios'}
                  </Link>
                  <LanguageSelector />
                  <Link
                    className="mobile-menu-login btn btn-primary"
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t('Landing.login') || 'Iniciar sesión'}
                  </Link>
                </div>
              )}
            </div>

            <div className="desktop-language">
              <LanguageSelector />
            </div>

            <Link
              className="desktop-pricing hidden btn btn-secondary w-auto sm:inline-flex"
              href="#precios"
            >
              {t('Landing.pricing') || 'Precios'}
            </Link>

            <Link className="desktop-login btn btn-primary w-auto" href="/login">
              {t('Landing.login') || 'Iniciar sesión'}
            </Link>
          </div>
        </nav>

        {/* HERO SECTION */}
        <section className="py-20 text-center sm:py-28">
          <p className="mb-5 text-sm font-black tracking-[.2em] text-orange-300">
            {t('Landing.badge') || 'AGRADECER TAMBIÉN ES PARTE DEL SERVICIO'}
          </p>
          <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[.98] sm:text-7xl">
            {t('Landing.title') || 'Haz que cada gracias cuente.'}
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            {t('Landing.subtitle') || 'Propi ayuda a restaurantes, hoteles y equipos de servicio a recibir propinas digitales con una experiencia sencilla y segura.'}
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="btn btn-primary w-auto" href="/register">
              {t('Landing.createAccount') || 'Crear mi cuenta'}
            </Link>
            <a className="btn btn-secondary w-auto" href="#como">
              {t('Landing.discover') || 'Descubrir Propi'}
            </a>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como" className="py-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
                {t('Landing.howItWorks') || 'Cómo funciona'}
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                {t('Landing.simpleTitle') || 'Simple para todos.'}
              </h2>
            </div>
            <span className="hidden text-sm text-slate-400 sm:block">
              {t('Landing.simpleSubtitle') || 'QR + NFC · Sin fricción'}
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

        {/* SECCIÓN DESTACADOS */}
        <section className="my-20 grid gap-5 md:grid-cols-2">
          <div className="card border-orange-400/25 bg-orange-400/10">
            <p className="text-2xl font-black">
              {t('Landing.mobileExperienceTitle') || 'Escanea. Elige. Agradece.'}
            </p>
            <p className="mt-3 leading-7 text-slate-300">
              {t('Landing.mobileExperienceDesc') || 'Una experiencia móvil pensada para completarse en segundos, sin apps ni registros.'}
            </p>
          </div>
          <div className="card">
            <p className="text-2xl font-black">
              {t('Landing.teamTitle') || 'Más que una propina.'}
            </p>
            <p className="mt-3 leading-7 text-slate-400">
              {t('Landing.teamDesc') || 'Haz visible el trabajo de tu equipo y convierte cada agradecimiento en motivación.'}
            </p>
          </div>
        </section>

        {/* FOOTER TEXTO DE MARCA */}
        <footer className="border-t border-white/10 py-8 text-sm text-slate-500">
          {t('Landing.footerBrand') || 'Propi · Propinas digitales para equipos que dejan huella.'}
        </footer>

        {/* PRECIOS */}
        <section id="precios" className="my-20 scroll-mt-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
              {t('Landing.pricing') || 'Precios claros'}
            </p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              {t('Landing.pricingTitle') || 'Todo lo que necesitas para recibir más gracias.'}
            </h2>
            <p className="mt-3 leading-7 text-slate-400">
              {t('Landing.pricingSubtitle') || 'Sin cuotas ocultas. Empieza con una comisión sencilla y configurable para que elijas quién la asume.'}
            </p>
          </div>

          <div className="card relative overflow-hidden border-orange-400/30 bg-gradient-to-br from-[#0f2d55] to-[#0b2344] p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-orange-400/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
                  {t('Landing.feeTitle') || 'Comisión por propina recibida'}
                </p>
                <div className="pricing-amount-row mt-3 flex items-end gap-2">
                  <span className="pricing-amount text-5xl font-black text-white">
                    {t('Landing.feeAmount') || '0,10 €'}
                  </span>
                  <span className="pricing-processing mb-1 text-sm text-slate-400">
                    {t('Landing.feeExtra') || '+ comisión de procesamiento'}
                  </span>
                </div>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
                  {t('Landing.feeConfigurable') || 'Configurable: la asume el cliente o el negocio.'}
                </p>
                <Link className="btn btn-primary mt-6 w-full sm:w-auto" href="/register">
                  {t('Landing.createAccount') || 'Crear mi cuenta'} <span>→</span>
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

        {/* CONTACTO */}
        <section
          id="contacto"
          className="my-20 grid gap-8 rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-10 md:grid-cols-[.8fr_1.2fr] md:items-center"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-orange-300">
              {t('Landing.contactTitle') || 'Hablemos'}
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              {t('Landing.contactSubtitle') || '¿Tienes alguna pregunta?'}
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              {t('Landing.contactSubtitle') || 'Escríbenos y te responderemos directamente. También puedes contactarnos por WhatsApp.'}
            </p>
            <a
              className="btn btn-primary mt-6 w-full sm:w-auto"
              href="https://wa.me/34613312550?text=Hola%20Propi%2C%20quiero%20más%20información"
              target="_blank"
              rel="noreferrer"
            >
              {t('Landing.whatsappBtn') || 'Hablar por WhatsApp'} <span>→</span>
            </a>
          </div>

          <form className="grid gap-3" onSubmit={(e) => e.preventDefault()}>
            <label className="text-sm font-bold text-slate-200">
              {t('Landing.namePlaceholder') || 'Tu nombre'}
              <input
                className="field mt-1"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Nombre y apellido"
              />
            </label>
            <label className="text-sm font-bold text-slate-200">
              {t('Landing.emailPlaceholder') || 'Tu email'}
              <input
                className="field mt-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
              />
            </label>
            <label className="text-sm font-bold text-slate-200">
              {t('Landing.msgPlaceholder') || 'Mensaje'}
              <textarea
                className="field mt-1 min-h-28 resize-y"
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                required
                placeholder="¿En qué podemos ayudarte?"
              />
            </label>

            <a
              href={mailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary mt-2 w-full sm:w-auto text-center inline-flex items-center justify-center gap-2"
            >
              {t('Landing.sendMsg') || 'Enviar mensaje'} <span>→</span>
            </a>

            <p className="text-xs leading-5 text-slate-500">
              {t('Landing.mailNotice') || 'Al hacer clic se abrirá Gmail con los datos completados listos para enviar.'}
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
