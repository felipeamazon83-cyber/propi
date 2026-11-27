import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad | TuPropi',
  description: 'Política de privacidad y protección de datos de TuPropi.',
};

export default function PrivacidadPage() {
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
          Política de Privacidad
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Última actualización: Noviembre de 2026
        </p>

        <div className="mt-8 space-y-6 text-base leading-relaxed text-neutral-700">
          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              1. Responsable del tratamiento
            </h2>
            <p className="mt-2">
              <strong>TuPropi</strong> (accessible en <code>https://tupropi.app</code>) es una
              plataforma digital diseñada para facilitar la gestión y reparto de propinas
              electrónicas entre establecimientos y su equipo de trabajo. Para cualquier consulta
              relacionada con la privacidad, puedes escribirnos a{' '}
              <a href="mailto:soportepropi@gmail.com" className="underline text-neutral-900">
                soportepropi@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              2. Datos que recopilamos
            </h2>
            <p className="mt-2">
              Recopilamos únicamente los datos necesarios para operar el servicio:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong>Datos de cuenta e inicio de sesión (Google OAuth):</strong> Nombre,
                dirección de correo electrónico y foto de perfil proporcionados al iniciar sesión
                con tu cuenta de Google.
              </li>
              <li>
                <strong>Datos del establecimiento y equipo:</strong> Nombre del local, listado
                de empleados registrados por el administrador y reglas de reparto de propinas.
              </li>
              <li>
                <strong>Datos de transacciones:</strong> Importes y fechas de las propinas
                procesadas a través de nuestra pasarela de pago (Stripe). TuPropi no almacena
                números completos de tarjetas bancarias.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              3. Finalidad del uso de los datos
            </h2>
            <p className="mt-2">
              Utilizamos tu información exclusivamente para autenticar tu acceso, administrar tu
              panel de control, calcular el reparto de propinas de tu equipo y cumplir con las
              obligaciones legales y de seguridad de los pagos. No vendemos ni cedemos tus datos
              personales a terceros con fines publicitarios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              4. Proveedores de infraestructura y pagos
            </h2>
            <p className="mt-2">
              Para ofrecer el servicio nos apoyamos en proveedores tecnológicos que cumplen con
              estándares internacionales de seguridad (como Supabase para autenticación y base de
              datos, Vercel para alojamiento web y Stripe para el procesamiento seguro de pagos).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900">
              5. Tus derechos
            </h2>
            <p className="mt-2">
              Puedes solicitar el acceso, rectificación o eliminación de tus datos y de tu cuenta
              en cualquier momento enviando un correo a{' '}
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
