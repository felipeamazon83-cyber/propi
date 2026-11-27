import Link from 'next/link';

export const metadata = {
  title: 'Condiciones del Servicio | TuPropi',
  description: 'Términos y condiciones de uso de la plataforma TuPropi.',
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            ← Volver a TuPropi
          </Link>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Condiciones del Servicio
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Última actualización: Noviembre de 2026
        </p>

        <div className="mt-8 space-y-6 text-base leading-relaxed text-neutral-700">
          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              1. Aceptación de los términos
            </h2>
            <p className="mt-2">
              Al acceder o utilizar <strong>TuPropi</strong> (<code>https://tupropi.app</code>),
              aceptas quedar vinculado por estas Condiciones del Servicio. Si utilizas la
              plataforma en nombre de un establecimiento o empresa, declaras contar con la
              autorización necesaria para representarlo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              2. Descripción del servicio
            </h2>
            <p className="mt-2">
              TuPropi proporciona herramientas digitales (incluyendo códigos QR, enlaces NFC y un
              panel de administración) para que los clientes puedan dejar propinas digitales y los
              establecimientos puedan organizar su registro y distribución entre su personal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              3. Cuentas y seguridad
            </h2>
            <p className="mt-2">
              El acceso a la administración se realiza mediante autenticación segura (como Google
              OAuth). Eres responsable de mantener la seguridad de tu cuenta y de la veracidad de
              los datos del equipo y cuentas de cobro configuradas en tu perfil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              4. Pagos y responsabilidad fiscal
            </h2>
            <p className="mt-2">
              Los pagos de propinas se procesan a través de Stripe. Cada establecimiento o
              usuario receptor es responsable de cumplir con las obligaciones fiscales, laborales y
              contables aplicables en su jurisdicción respecto a las propinas recibidas y
              repartidas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              5. Uso aceptable y contacto
            </h2>
            <p className="mt-2">
              Queda prohibido utilizar TuPropi para actividades fraudulentas o ilícitas. Nos
              reservamos el derecho de suspender cuentas que incumplan estas condiciones. Para
              soporte técnico o consultas legales, contáctanos en{' '}
              <a href="mailto:soportepropi@gmail.com" className="underline text-neutral-900">
                soportepropi@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
